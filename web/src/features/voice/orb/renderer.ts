/**
 * WebGPU renderer for the liquid glass orb. Ported from LerSent001/orb
 * (https://github.com/LerSent001/orb, MIT, commit 8d1736e) with three
 * changes: English errors, the frame loop sleeps while the tab is hidden, and
 * WebGPU objects are typed loosely so the app doesn't need @webgpu/types.
 */
import { particleRibbonInstanceCount } from "./particle-ribbon";
import { styleFlowIndexes, type OrbParams } from "./presets";
import { createOrbTransitionController, type OrbRenderTarget } from "./states";
import { orbUniformFloatCount, writeOrbUniforms } from "./uniforms";
import { orbShaderSource } from "./shader";
import { applyAudioUniforms, type AudioBands } from "./audio";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not in lib.dom yet. */
type Gpu = any;

// GPUBufferUsage / GPUTextureUsage flag values (stable in the WebGPU spec).
const BUFFER_UNIFORM = 0x40;
const BUFFER_COPY_DST = 0x08;
const TEXTURE_BINDING = 0x04;
const TEXTURE_RENDER_ATTACHMENT = 0x10;

export type OrbRendererOptions = {
  canvas: HTMLCanvasElement;
  getTarget: () => OrbRenderTarget;
  getAudioBands?: (dt: number) => AudioBands;
  onError: (error: Error) => void;
  onReady: () => void;
};

export const webgpuAvailable = () => typeof navigator !== "undefined" && Boolean((navigator as Gpu).gpu);

const premultipliedOver = {
  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
};

export function createOrbRenderer({ canvas, getTarget, getAudioBands, onError, onReady }: OrbRendererOptions) {
  let disposed = false;
  let animationFrame = 0;
  let device: Gpu = null;
  // Held for the renderer's lifetime: if the adapter is garbage-collected,
  // Chromium's GPU process can drop the instance and lose the device.
  let adapter: Gpu = null;
  let ribbonTarget: Gpu = null;
  let readyNotified = false;
  let failed = false;
  let lastFrameAt: number | null = null;
  let motionPhase = 0;
  let loop: ((now: number) => void) | null = null;

  function fail(error: Error) {
    if (disposed || failed) return;
    failed = true;
    cancelAnimationFrame(animationFrame);
    ribbonTarget?.destroy();
    device?.destroy();
    onError(error);
  }

  const onVisibility = () => {
    if (!loop || disposed || failed) return;
    cancelAnimationFrame(animationFrame);
    if (!document.hidden) {
      lastFrameAt = null;
      animationFrame = requestAnimationFrame(loop);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  async function start() {
    const gpu: Gpu = (navigator as Gpu).gpu;
    if (!gpu) throw new Error("WebGPU is not supported in this browser");
    adapter = await gpu.requestAdapter({ powerPreference: "low-power" });
    if (!adapter) throw new Error("No WebGPU adapter available");
    device = await adapter.requestDevice();
    if (disposed) {
      device.destroy();
      return;
    }
    const context: Gpu = canvas.getContext("webgpu" as "2d");
    if (!context) throw new Error("Could not create a WebGPU canvas context");

    const format = gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });

    const shader = device.createShaderModule({ label: "orb-glass-liquid", code: orbShaderSource });
    const compilation = await shader.getCompilationInfo();
    const errors = compilation.messages.filter((message: Gpu) => message.type === "error");
    if (errors.length) {
      throw new Error(errors.map((m: Gpu) => `${m.lineNum}:${m.linePos} ${m.message}`).join("\n"));
    }

    const pipeline = device.createRenderPipeline({
      label: "orb-glass-liquid-pipeline",
      layout: "auto",
      vertex: { module: shader, entryPoint: "vs_main" },
      fragment: { module: shader, entryPoint: "fs_main", targets: [{ format, blend: premultipliedOver }] },
      primitive: { topology: "triangle-list" },
    });
    const ribbonPipeline = device.createRenderPipeline({
      label: "particle-ribbon-pipeline",
      layout: "auto",
      vertex: { module: shader, entryPoint: "ribbon_vs_main" },
      fragment: {
        module: shader,
        entryPoint: "ribbon_fs_main",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: premultipliedOver.alpha,
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
    const ribbonCompositePipeline = device.createRenderPipeline({
      label: "particle-ribbon-glass-composite-pipeline",
      layout: "auto",
      vertex: { module: shader, entryPoint: "vs_main" },
      fragment: {
        module: shader,
        entryPoint: "ribbon_composite_fs_main",
        targets: [{ format, blend: premultipliedOver }],
      },
      primitive: { topology: "triangle-list" },
    });

    const values = new Float32Array(orbUniformFloatCount);
    const uniformBuffer = device.createBuffer({ size: values.byteLength, usage: BUFFER_UNIFORM | BUFFER_COPY_DST });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });
    const ribbonBindGroup = device.createBindGroup({
      layout: ribbonPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });
    const ribbonSampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
    });
    let ribbonCompositeBindGroup: Gpu = null;
    const transition = createOrbTransitionController(getTarget());

    device.lost.then((info: Gpu) => fail(new Error(`WebGPU device lost: ${info.message || info.reason}`)));
    device.addEventListener("uncapturederror", (event: Gpu) => {
      event.preventDefault();
      fail(new Error(`WebGPU error: ${event.error.message}`));
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        ribbonTarget?.destroy();
        ribbonTarget = null;
        ribbonCompositeBindGroup = null;
      }
    };

    const ensureRibbonTarget = () => {
      if (ribbonTarget && ribbonCompositeBindGroup) return;
      ribbonTarget = device.createTexture({
        label: "particle-ribbon-offscreen-texture",
        size: { width: canvas.width, height: canvas.height },
        format,
        usage: TEXTURE_RENDER_ATTACHMENT | TEXTURE_BINDING,
      });
      ribbonCompositeBindGroup = device.createBindGroup({
        layout: ribbonCompositePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: ribbonTarget.createView() },
          { binding: 2, resource: ribbonSampler },
        ],
      });
    };

    loop = (now: number) => {
      if (disposed || failed || !device) return;
      try {
        resize();
        const params: OrbParams = transition.sample(getTarget(), now);
        const frameDelta = lastFrameAt === null ? 0 : Math.min(0.1, Math.max(0, (now - lastFrameAt) / 1000));
        lastFrameAt = now;
        writeOrbUniforms(values, canvas.width, canvas.height, 0, params);
        if (getAudioBands) applyAudioUniforms(values, getAudioBands(frameDelta));
        // Integrate phase so speed changes (state blends, audio) never jump the animation.
        motionPhase += frameDelta * Math.max(values[3], 0);
        values[2] = motionPhase / Math.max(values[3], 0.001);
        device.queue.writeBuffer(uniformBuffer, 0, values);

        const isParticleRibbon = styleFlowIndexes[params.style] === styleFlowIndexes.particleRibbon;
        const encoder = device.createCommandEncoder();
        if (isParticleRibbon) {
          ensureRibbonTarget();
          const particlePass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: ribbonTarget.createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store",
              },
            ],
          });
          particlePass.setPipeline(ribbonPipeline);
          particlePass.setBindGroup(0, ribbonBindGroup);
          particlePass.draw(6, particleRibbonInstanceCount, 0, 0);
          particlePass.end();
        }
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(isParticleRibbon ? ribbonCompositePipeline : pipeline);
        pass.setBindGroup(0, isParticleRibbon ? ribbonCompositeBindGroup : bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();
        device.queue.submit([encoder.finish()]);
        if (!readyNotified) {
          readyNotified = true;
          onReady();
        }
        if (!document.hidden) animationFrame = requestAnimationFrame(loop!);
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    };
    animationFrame = requestAnimationFrame(loop);
  }

  start().catch((error: unknown) => fail(error instanceof Error ? error : new Error(String(error))));

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    document.removeEventListener("visibilitychange", onVisibility);
    ribbonTarget?.destroy();
    device?.destroy();
    adapter = null;
  };
}

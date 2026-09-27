/**
 * A 3D model the tutor built, live on the stage. Drag to spin, pinch or
 * scroll to zoom, tap a part to read about it (and ask the tutor about it).
 * The tutor points at parts while it talks and can zoom, spin or reset the
 * view by voice. AR mode puts the model over the camera feed, so it floats
 * in the learner's room.
 */
import { AnimatePresence, motion } from "motion/react";
import { Camera, CameraOff, MessageCircleQuestion, Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Scene, StageView } from "@shared/voice";
import { cx, spring } from "@/components/ui";
import { useMotion } from "@/store/app";
import { SceneView } from "./scene3d";

function ControlButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        "flex size-9 items-center justify-center rounded-full backdrop-blur-md transition-colors",
        active ? "bg-signal text-white" : "bg-black/35 text-white/80 hover:bg-black/55 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

export default function StageScene({
  scene,
  focus,
  view,
  onAsk,
}: {
  scene: Scene;
  focus: string | null;
  view: { view: StageView; nonce: number } | null;
  onAsk: (text: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const engine = useRef<SceneView | null>(null);
  const motionOn = useMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const [rotating, setRotating] = useState(motionOn);
  const [ar, setAr] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    try {
      engine.current = new SceneView(host.current, scene, { motion: motionOn, onSelect: setSelected });
    } catch (error) {
      console.warn("3D stage unavailable", error);
      setFailed(true);
    }
    return () => {
      engine.current?.dispose();
      engine.current = null;
    };
    // One engine per scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    engine.current?.focus(focus);
    if (focus) setSelected(null);
  }, [focus]);

  useEffect(() => {
    if (!view) return;
    if (view.view === "ar") setAr(true);
    else {
      engine.current?.view(view.view);
      if (view.view === "rotate") setRotating(true);
      if (view.view === "stop") setRotating(false);
      if (view.view === "reset") setRotating(motionOn);
    }
    // Only a new command moves the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.nonce]);

  // Camera passthrough for AR.
  useEffect(() => {
    engine.current?.setAr(ar);
    if (!ar) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setArError("This browser can't open the camera here.");
      setAr(false);
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    setArError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video.current) {
          video.current.srcObject = media;
          void video.current.play().catch(() => undefined);
        }
      })
      .catch(() => {
        setArError("Camera access was blocked. Allow it in your browser to see the model in your room.");
        setAr(false);
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [ar]);

  const part = scene.objects.find((object) => object.id === selected);

  if (failed) {
    return (
      <div className="flex h-[min(58vh,540px)] items-center justify-center rounded-[1.4rem] bg-black/30 p-8 text-center text-sm text-fog-400">
        This device can't show 3D right now. Ask the tutor to draw it as a diagram instead.
      </div>
    );
  }

  return (
    <figure className="relative">
      <div
        className={cx(
          "stage-scene relative h-[min(58vh,560px)] overflow-hidden rounded-[1.4rem]",
          ar
            ? "bg-black"
            : scene.mood === "space"
              ? "bg-[#03040a]"
              : scene.mood === "blueprint"
                ? "bg-[#06101f]"
                : "bg-[#0b0b0f]",
        )}
      >
        <video
          ref={video}
          playsInline
          muted
          aria-hidden
          className={cx(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            ar ? "opacity-100" : "opacity-0",
          )}
        />
        <div ref={host} className="absolute inset-0" />

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <ControlButton
            label={rotating ? "Stop spinning" : "Spin"}
            onClick={() => {
              engine.current?.view(rotating ? "stop" : "rotate");
              setRotating(!rotating);
            }}
          >
            {rotating ? <Pause className="size-4" /> : <Play className="size-4" />}
          </ControlButton>
          <ControlButton label="Reset view" onClick={() => engine.current?.view("reset")}>
            <RotateCcw className="size-4" />
          </ControlButton>
          <ControlButton label={ar ? "Turn off camera" : "See it in your room"} onClick={() => setAr(!ar)} active={ar}>
            {ar ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
          </ControlButton>
        </div>

        <AnimatePresence>
          {part && (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={spring}
              className="liquid-glass absolute bottom-3 left-3 max-w-[min(22rem,calc(100%-5rem))] rounded-2xl p-3.5 pr-9"
            >
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="absolute top-2 right-2 rounded-full p-1 text-fog-500 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
              <div className="font-display text-sm text-white">{part.label ?? part.id}</div>
              {part.info && <p className="mt-1 text-xs leading-relaxed text-fog-300">{part.info}</p>}
              <button
                onClick={() => onAsk(`Tell me about the ${part.label ?? part.id} in this model.`)}
                className="mt-2.5 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/16"
              >
                <MessageCircleQuestion className="size-3.5" /> Ask about this
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {!part && (
          <div className="pointer-events-none absolute bottom-3 left-4 text-[0.7rem] text-white/40">
            Drag to spin · pinch to zoom · tap a part
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex items-center gap-2 px-1 text-xs text-fog-400">
        <span className="text-fog-200">{scene.title}</span>
        <span>· {scene.objects.length} parts</span>
        {arError && <span className="ml-auto text-red-300">{arError}</span>}
      </figcaption>
    </figure>
  );
}

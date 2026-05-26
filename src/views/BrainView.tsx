import React, { useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useStore } from '../store';
import { BookOpen, CircleDot, Library, Target } from 'lucide-react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { db } from '../memory/longterm.memory';
import { useLiveQuery } from 'dexie-react-hooks';

// Global cache for WebGL assets to prevent memory leaks
const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.Material>();
const textureCache = new Map<string, THREE.CanvasTexture>();
const spriteMaterialCache = new Map<string, THREE.SpriteMaterial>();

const getGeometry = (key: string, creator: () => THREE.BufferGeometry) => {
  if (!geometryCache.has(key)) geometryCache.set(key, creator());
  return geometryCache.get(key)!;
};

const getMaterial = (key: string, creator: () => THREE.Material) => {
  if (!materialCache.has(key)) materialCache.set(key, creator());
  return materialCache.get(key)!;
};

function createTextSprite(text: string, color: string) {
  const cacheKey = `${text}_${color}`;
  
  if (!textureCache.has(cacheKey)) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 42;
    const padding = 24;
    
    if (context) {
      context.font = `600 ${fontSize}px "Space Grotesk", Inter, sans-serif`;
      const textWidth = context.measureText(text).width;
      canvas.width = Math.max(textWidth + padding * 2, 128); 
      canvas.height = fontSize + padding * 2;

      context.fillStyle = 'rgba(10, 10, 15, 0.85)';
      context.beginPath();
      context.roundRect(0, 0, canvas.width, canvas.height, 12);
      context.fill();

      context.fillStyle = color;
      context.fillRect(0, 0, canvas.width, 6);

      context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      context.lineWidth = 2;
      context.stroke();

      context.font = `600 ${fontSize}px "Space Grotesk", Inter, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#f4f4f5';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    textureCache.set(cacheKey, texture);
    
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    spriteMaterialCache.set(cacheKey, spriteMaterial);
  }

  const texture = textureCache.get(cacheKey)!;
  const spriteMaterial = spriteMaterialCache.get(cacheKey)!;
  
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(texture.image.width * 0.12, texture.image.height * 0.12, 1);
  return sprite;
}

export function BrainView() {
  const learnerName = useStore(state => state.learnerName) || 'Learner';
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const learningBooks = useLiveQuery(() => db.learningBooks.orderBy('updatedAt').reverse().toArray(), []) || [];
  const learningBookConcepts = useLiveQuery(() => db.learningBookConcepts.orderBy('updatedAt').reverse().toArray(), []) || [];
  const fallbackConcepts = useLiveQuery(() => db.concepts.orderBy('lastReviewedAt').reverse().limit(80).toArray(), []) || [];

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const bookConceptsByBook = learningBookConcepts.reduce<Record<string, typeof learningBookConcepts>>((acc, concept) => {
    acc[concept.bookId] = acc[concept.bookId] || [];
    acc[concept.bookId].push(concept);
    return acc;
  }, {});

  const totalLearningConcepts = learningBookConcepts.length || fallbackConcepts.length;
  const latestBook = learningBooks[0];
  const latestChapters = latestBook?.chapters?.slice(-3) || [];
  const rootId = `learner:${learnerName}`;
  const hasLearningBooks = learningBooks.length > 0;
  const fallbackBookId = `${rootId}:book:general`;
  const graphData = hasLearningBooks
    ? {
        nodes: [
          { id: rootId, name: learnerName, type: 'learner', val: 1, summary: 'User virtual brain' },
          ...learningBooks.map(book => ({
            id: book.id,
            name: book.title,
            type: 'book',
            val: Math.max(0.35, Math.min(1, (bookConceptsByBook[book.id]?.length || 1) / 8)),
            summary: book.knowledgeSummary || book.summary,
          })),
          ...learningBookConcepts.map(concept => ({
            id: concept.id,
            name: concept.name,
            type: 'concept',
            val: Math.max(0.12, concept.confidence || concept.mastery || 0.35),
            summary: concept.summary,
          }))
        ],
        links: [
          ...learningBooks.map(book => ({ source: rootId, target: book.id, kind: 'owns' })),
          ...learningBookConcepts.map(concept => ({ source: concept.bookId, target: concept.id, kind: 'learned' })),
          ...learningBookConcepts.flatMap(concept =>
            (concept.childConcepts || [])
              .map(childName => learningBookConcepts.find(other => other.bookId === concept.bookId && other.name.toLowerCase() === childName.toLowerCase()))
              .filter(Boolean)
              .map(child => ({ source: concept.id, target: child!.id, kind: 'branches' }))
          )
        ]
      }
    : {
        nodes: [
          { id: rootId, name: learnerName, type: 'learner', val: 1, summary: 'User virtual brain' },
          { id: fallbackBookId, name: 'General Study', type: 'book', val: 0.4, summary: 'Concepts captured before learning books were enabled.' },
          ...fallbackConcepts.map(concept => ({
            id: `fallback:${concept.id}`,
            name: concept.name,
            type: 'concept',
            val: Math.max(0.1, concept.confidence || concept.mastery || 0.25),
            summary: concept.description,
          }))
        ],
        links: [
          { source: rootId, target: fallbackBookId, kind: 'owns' },
          ...fallbackConcepts.map(concept => ({ source: fallbackBookId, target: `fallback:${concept.id}`, kind: 'learned' }))
        ]
      };

  useEffect(() => {
    if (fgRef.current) {
      // Add cinematic fog and ambient lighting
      const scene = fgRef.current.scene();
      scene.fog = new THREE.FogExp2('#030303', 0.003);
      
      const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
      scene.add(ambientLight);

      // Add a subtle directional light for geometry shading
      const directionalLight = new THREE.DirectionalLight('#ffffff', 0.8);
      directionalLight.position.set(100, 200, 50);
      scene.add(directionalLight);

      // Clean up memory cache on unmount to prevent GPU leaks
      return () => {
        geometryCache.forEach(g => g.dispose());
        geometryCache.clear();
        materialCache.forEach(m => m.dispose());
        materialCache.clear();
        textureCache.forEach(t => t.dispose());
        textureCache.clear();
        spriteMaterialCache.forEach(m => m.dispose());
        spriteMaterialCache.clear();
      };
    }
  }, [fgRef.current]);

  const handleNodeClick = (node: any) => {
    const distance = 80;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        2000
      );
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#030303] relative overflow-hidden font-['Space_Grotesk']">
      <div className="absolute top-20 left-5 right-5 xl:right-auto xl:w-[720px] z-10 pointer-events-none">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sr-only"
        >
          {learnerName}'s Brain
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
          className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0a0a0a]/88 p-6 md:p-7 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
        >
          <div className="absolute -right-16 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-7 top-7 grid grid-cols-5 gap-2 opacity-60">
            {Array.from({ length: 15 }).map((_, index) => (
              <motion.span
                key={index}
                className={`h-3.5 w-3.5 rounded-full ${index % 4 === 0 ? 'border border-white/80 bg-transparent' : 'bg-white'}`}
                animate={{ opacity: [0.28, 0.88, 0.28], scale: [0.82, 1.08, 0.82] }}
                transition={{ repeat: Infinity, duration: 2.6 + (index % 5) * 0.18, delay: index * 0.045 }}
              />
            ))}
          </div>

          <div className="relative ml-0 md:ml-28">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                Virtual Brain Map
              </span>
              <span className="rounded-full bg-[#ff6e00]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb066]">
                Session Learning Book
              </span>
            </div>
            <div className="text-[34px] md:text-[46px] font-medium leading-[0.98] tracking-tight text-white">
              {learnerName}'s Brain
            </div>
            <p className="mt-4 max-w-[58ch] text-[15px] md:text-[17px] font-light leading-relaxed tracking-tight text-zinc-300">
              {latestBook?.overview || latestBook?.knowledgeSummary || 'A living map of the learner, their current session book, and the concepts the tutor is extracting after each conversation.'}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/6 p-3">
                <Library size={16} className="mb-2 text-blue-300" />
                <div className="text-2xl font-medium text-white">{learningBooks.length}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Books</div>
              </div>
              <div className="rounded-2xl bg-white/6 p-3">
                <CircleDot size={16} className="mb-2 text-violet-300" />
                <div className="text-2xl font-medium text-white">{totalLearningConcepts}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Concepts</div>
              </div>
              <div className="rounded-2xl bg-white/6 p-3">
                <BookOpen size={16} className="mb-2 text-orange-300" />
                <div className="text-2xl font-medium text-white">{latestBook?.chapters?.length || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Chapters</div>
              </div>
            </div>
            {latestChapters.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {latestChapters.map(chapter => (
                  <span key={chapter.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">
                    {chapter.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="absolute right-8 bottom-8 z-10 pointer-events-auto">
        <button 
          onClick={() => {
            if (fgRef.current) fgRef.current.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1500);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-white text-xs font-medium transition-all focus:outline-none shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          <Target size={14} /> Re-center
        </button>
      </div>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
        backgroundColor="#030303"
        nodeRelSize={7}
        nodeResolution={32}
        nodeThreeObject={(node: any) => {
          const rawVal = node.val || 0;
          const val = Math.max(0.05, rawVal); // Ensure even 0-confidence nodes have a physical 3D presence
          const nodeType = node.type || 'concept';
          const color = nodeType === 'learner'
            ? '#f97316'
            : nodeType === 'book'
              ? '#3b82f6'
              : rawVal > 0.7 ? '#22c55e' : rawVal > 0.4 ? '#a855f7' : '#f59e0b';
          const scaleBoost = nodeType === 'learner' ? 1.45 : nodeType === 'book' ? 1.18 : 1;
          
          const group = new THREE.Group();

          // 1. Cyber Core
          const coreGeom = getGeometry(`core_${nodeType}_${val.toFixed(2)}`, () => new THREE.IcosahedronGeometry(Math.sqrt(val) * 4 * scaleBoost, 0));
          const coreMat = getMaterial('core', () => new THREE.MeshBasicMaterial({ color: '#ffffff' }));
          const core = new THREE.Mesh(coreGeom, coreMat);
          group.add(core);

          // Pseudo-random based on node id
          let hash = 0;
          const idStr = String(node.id || node.name || 'a');
          for (let i = 0; i < idStr.length; i++) hash = Math.imul(31, hash) + idStr.charCodeAt(i) | 0;
          const prand = () => { hash = Math.imul(31, hash) + 12345 | 0; return (hash >>> 0) / 4294967296; };

          // 2. Wireframe shell
          const shellGeom = getGeometry(`shell_${nodeType}_${val.toFixed(2)}`, () => new THREE.IcosahedronGeometry(Math.sqrt(val) * 7.5 * scaleBoost, 1));
          const shellMat = getMaterial(`shell_${color}`, () => new THREE.MeshPhongMaterial({
            color, transparent: true, opacity: 0.25, wireframe: true,
          }));
          const shell = new THREE.Mesh(shellGeom, shellMat);
          shell.rotation.x = prand() * Math.PI;
          shell.rotation.y = prand() * Math.PI;
          group.add(shell);

          // 3. Orbital Ring
          const ringGeom = getGeometry(`ring_${nodeType}_${val.toFixed(2)}`, () => new THREE.TorusGeometry(Math.sqrt(val) * 11 * scaleBoost, 0.2, 16, 64));
          const ringMat = getMaterial(`ring_${color}`, () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }));
          const ring = new THREE.Mesh(ringGeom, ringMat);
          ring.rotation.x = Math.PI / 2 + (prand() * 0.4 - 0.2);
          ring.rotation.y = prand() * 0.4 - 0.2;
          group.add(ring);

          // 4. Subtle additive glow
          const glowIntensity = val > 0.7 ? 0.2 : val > 0.4 ? 0.12 : 0.08;
          const glowMultiplier = 1 + (val * 0.5);
          const glowGeom = getGeometry(`glow_${nodeType}_${val.toFixed(2)}`, () => new THREE.SphereGeometry(Math.sqrt(val) * 14 * glowMultiplier * scaleBoost, 32, 32));
          const glowMat = getMaterial(`glow_${color}_${glowIntensity}`, () => new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: glowIntensity, blending: THREE.AdditiveBlending, depthWrite: false
          }));
          const glow = new THREE.Mesh(glowGeom, glowMat);
          group.add(glow);

          // Sprite Label
          const textSprite = createTextSprite(node.name || 'Concept', color);
          textSprite.position.set(0, Math.sqrt(val) * 11 * scaleBoost + 10, 0); 
          group.add(textSprite);

          return group;
        }}
        onNodeClick={handleNodeClick}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleResolution={16}
        linkDirectionalParticleColor={(link: any) => {
          const target = link.target as any;
          const val = target.val || 0.5;
          if (target.type === 'book') return '#60a5fa';
          if (target.type === 'learner') return '#fb923c';
          return val > 0.7 ? '#4ade80' : val > 0.4 ? '#c084fc' : '#fbbf24';
        }}
        linkColor={(link: any) => {
          const target = link.target as any;
          const val = target.val || 0.5;
          if (target.type === 'book') return 'rgba(59, 130, 246, 0.44)';
          if (target.type === 'learner') return 'rgba(249, 115, 22, 0.44)';
          return val > 0.7 ? 'rgba(34, 197, 94, 0.4)' : val > 0.4 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(245, 158, 11, 0.4)';
        }}
        linkWidth={1.5}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />
      )}
      
      {/* Vignette Overlay for Cinematic Depth */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_120px_rgba(3,3,3,1)] overflow-hidden" />
    </div>
  );
}

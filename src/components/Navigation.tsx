import React, { useState } from "react";
import { useStore, ViewState } from "../store";
import { BookOpen, Brain, Zap, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Navigation() {
  const { activeView, setActiveView } = useStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringContainer, setIsHoveringContainer] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const navItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: "study", label: "Study", icon: <BookOpen size={16} /> },
    { id: "brain", label: "Brain Map", icon: <Brain size={16} /> },
    { id: "analytics", label: "Analytics", icon: <Activity size={16} /> },
    { id: "revision", label: "Revision", icon: <Zap size={16} /> },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHoveringContainer(true)}
        onMouseLeave={() => setIsHoveringContainer(false)}
        className="relative flex items-center gap-1 p-1.5 rounded-full overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          background:
            activeView === "revision"
              ? "rgba(10, 10, 12, 0.85)"
              : "rgba(28, 28, 30, 0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow:
            "0 20px 50px -10px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.1)",
        }}
      >
        {/* Animated Liquid Metal Border */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
          style={{
            padding: "1px",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-[-50%] w-[200%] h-[200%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.1) 60%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
        </div>

        {/* Mouse Tracking Metallic Spotlight Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute inset-0 transition-opacity duration-300 mix-blend-screen"
            animate={{ opacity: isHoveringContainer ? 1 : 0 }}
            style={{
              background: `radial-gradient(150px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.15), transparent 100%)`,
            }}
          />
          <motion.div
            className="absolute inset-0 transition-opacity duration-300 mix-blend-overlay"
            animate={{ opacity: isHoveringContainer ? 1 : 0 }}
            style={{
              background: `radial-gradient(100px circle at ${mousePos.x}px ${mousePos.y}px, rgba(10,61,207,0.4), transparent 100%)`,
            }}
          />
        </div>

        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative z-10 flex items-center gap-2 px-3 sm:px-5 py-2 rounded-full text-[12px] sm:text-[13px] font-medium transition-colors focus:outline-none ${
                isActive
                  ? "text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 bg-white/10 border border-white/10 rounded-full mix-blend-screen"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-[15] flex items-center gap-1.5 sm:gap-2">
                {item.icon}
                <span className="hidden sm:inline-block">{item.label}</span>
                <span className="sm:hidden">{item.label.split(" ")[0]}</span>
              </span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

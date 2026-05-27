import React from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Compass,
  Clock,
  Settings,
  FolderClosed,
  Plus,
} from "lucide-react";

export function Sidebar() {
  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed left-0 top-0 bottom-0 w-[260px] bg-[var(--color-canvas-base)] z-40 flex flex-col pt-6 font-sans select-none border-r border-[var(--color-border-subtle)]"
    >
      <div className="px-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-medium tracking-tight text-[15px]">
          <div className="w-5 h-5 rounded-[6px] bg-gradient-to-tr from-[#1a1a24] to-[#3a3a4a] border border-white/10 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <span className="text-[10px] text-white/90">L</span>
          </div>
          Liquid Meta
        </div>
        <button className="text-[#8E8E93] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none">
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 space-y-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="space-y-1">
          <div className="px-2 text-[11px] font-medium text-[#555555] uppercase tracking-wider mb-2">
            Explore
          </div>
          <SidebarItem icon={<Compass size={15} />} label="Discover" isActive />
          <SidebarItem icon={<BookOpen size={15} />} label="Library" />
          <SidebarItem icon={<Clock size={15} />} label="Recent" />
        </div>

        <div className="space-y-1">
          <div className="px-2 text-[11px] font-medium text-[#555555] uppercase tracking-wider mb-2">
            Notebooks
          </div>
          <SidebarItem
            icon={<FolderClosed size={15} />}
            label="Quantum Physics Concept"
          />
          <SidebarItem
            icon={<FolderClosed size={15} />}
            label="Design Systems 2024"
          />
          <SidebarItem
            icon={<FolderClosed size={15} />}
            label="React Architectural Patterns"
          />
        </div>
      </div>

      <div className="p-3 border-t border-[var(--color-border-subtle)] mt-auto">
        <SidebarItem icon={<Settings size={15} />} label="Settings" />
      </div>
    </motion.div>
  );
}

function SidebarItem({
  icon,
  label,
  isActive = false,
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none ${isActive ? "bg-[var(--color-canvas-elevated)] text-[var(--color-text-primary)] border border-white/[0.05]" : "text-[var(--color-text-secondary)] hover:bg-[#ffffff05] hover:text-[var(--color-text-primary)] border border-transparent"}`}
    >
      <span
        className={
          isActive
            ? "text-[var(--color-text-primary)]"
            : "text-[var(--color-text-secondary)]"
        }
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {isActive && (
        <span className="ml-auto w-1 h-1 rounded-full bg-[var(--color-text-primary)]" />
      )}
    </button>
  );
}

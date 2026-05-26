import React from "react";
import { Code2, Play } from "lucide-react";

export function PracticeMode() {
  return (
    <div className="w-full h-full flex flex-col pt-8 px-8 overflow-y-auto bg-[var(--color-canvas-base)] relative">
      <div className="max-w-[800px] w-full mx-auto pb-32">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Practice Mode</h2>
          <p className="text-[var(--color-text-secondary)] mt-1.5 text-sm">Solve coding challenges based on prior concepts to solidify your understanding.</p>
        </div>

        <div className="p-6 rounded-[24px] bg-[var(--color-canvas-elevated)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-elevation-low)] mt-8">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-[10px] bg-[#0a84ff]/10 text-[#0a84ff]">
                 <Code2 size={18} />
              </div>
              <h3 className="text-[15px] font-medium text-[var(--color-text-primary)]">Challenge: Implement a Context Provider</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-[#1A1C23] text-[var(--color-text-secondary)] text-[10px] font-mono uppercase border border-[var(--color-border-subtle)]">React Fundamentals</span>
           </div>
           
           <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed mb-6">
              Create a `ThemeProvider` component that uses React Context to provide a `theme` string ("light" or "dark") and a `toggleTheme` function to its children.
           </p>

           <div className="w-full rounded-[12px] bg-[#0F0F10] border border-[var(--color-border-strong)] flex flex-col overflow-hidden font-mono text-[13px]">
              <div className="px-4 py-2 border-b border-[#2A2A2A] bg-[#151515] flex items-center text-[#8E8E93]">
                 <span>index.tsx</span>
                 <div className="ml-auto flex items-center gap-2">
                    <button className="flex items-center gap-1 text-[#0a84ff] hover:text-[#4da6ff] transition-colors focus:outline-none bg-[#0a84ff]/10 px-2 py-0.5 rounded text-[11px] font-sans">
                       <Play size={10} />
                       Run Output
                    </button>
                 </div>
              </div>
              <div className="p-4 text-[#ECECEC] whitespace-pre-wrap outline-none" contentEditable suppressContentEditableWarning>
{`import React, { createContext, useContext, useState } from 'react';

// 1. Create Context
// TODO: Implement ThemeContext

export function ThemeProvider({ children }) {
  // 2. Add State
  
  // 3. Return Provider
  return (
    <div>{children}</div>
  );
}`}
              </div>
           </div>
        </div>

        <div className="mt-8">
           <button className="w-full px-4 py-3 rounded-[12px] bg-[var(--color-canvas-glass)] border border-[var(--color-border-subtle)] text-[#ECECEC] hover:bg-[#2A2D35] transition-colors font-medium text-[14px]">
              Generate New Challenge
           </button>
        </div>
      </div>
    </div>
  );
}

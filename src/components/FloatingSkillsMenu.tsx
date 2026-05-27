import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, Minus, Plus } from 'lucide-react';

const SKILLS = [
  "Search"
];

export function FloatingSkillsMenu({ isOpen, onClose, onSelectSkill }: { isOpen: boolean; onClose: () => void; onSelectSkill?: (skill: string) => void }) {
  const [activeTab, setActiveTab] = useState<'skills'>('skills');
  const [isFetching, setIsFetching] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Simulate fetching when switching tabs
  useEffect(() => {
    setIsFetching(true);
    setItems([]);
    
    const timer = setTimeout(() => {
      setItems(SKILLS);
      setIsFetching(false);
    }, 400); // 400ms fake loading delay

    return () => clearTimeout(timer);
  }, [activeTab]);

  const displayedItems = showAll ? items : items.slice(0, 4);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute bottom-full mb-4 left-0 w-[280px] sm:w-[320px] max-w-[calc(100vw-32px)] bg-[#fdfdfd] text-[#050505] dark:bg-[#121214] dark:text-zinc-100 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-black/5 dark:border-white/10 overflow-hidden z-50 origin-bottom-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <motion.h3 
              layout="position"
              className="text-sm font-bold tracking-tight"
            >
              Skills
            </motion.h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-zinc-400"
            >
              <Minus size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* List Area */}
          <motion.div layout className="relative min-h-[160px]">
            <AnimatePresence mode="wait">
              {isFetching ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3 pt-2"
                >
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-black/5 dark:bg-white/5 animate-pulse" />
                      <div className="h-3 bg-black/5 dark:bg-white/5 rounded-full w-3/4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-1"
                >
                  <AnimatePresence>
                    {items.map((item, idx) => (
                      <motion.button
                        key={item}
                        onClick={() => {
                          if (onSelectSkill) onSelectSkill(item);
                          onClose();
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 text-left p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        <div className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                          <Sparkles size={12} />
                        </div>
                        <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                          {item}
                        </span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useEffect } from 'react';
import { useStore } from './store';
import { Navigation } from './components/Navigation';
import { SettingsButton } from './components/SettingsModal';
import { StudyView } from './views/StudyView';
import { BrainView } from './views/BrainView';
import { AnalyticsView } from './views/AnalyticsView';
import { RevisionView } from './views/RevisionView';
import { AdminView } from './views/AdminView';
import { AnimatePresence, motion } from 'motion/react';
import { BrainRenderProfiler } from './brain-runtime/RenderProfiler';
import { recordBrainRuntime } from './brain-runtime/runtimeTelemetry';

export default function App() {
  const activeView = useStore(state => state.activeView);
  const setActiveView = useStore(state => state.setActiveView);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement || 
        target.isContentEditable ||
        e.ctrlKey || e.metaKey || e.altKey
      ) {
        return;
      }
      
      if (e.key === '1') setActiveView('study');
      if (e.key === '2') setActiveView('brain');
      if (e.key === '3') setActiveView('revision');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  useEffect(() => {
    recordBrainRuntime({ type: "route", name: activeView, metadata: { source: "App.activeView" } });
  }, [activeView]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-100 relative">
      {activeView !== 'admin' && (
        <>
          <Navigation />
          <SettingsButton />
        </>
      )}
      
      <main className="h-full w-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'study' && (
            <motion.div
              key="study"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <BrainRenderProfiler id="route:study">
                <StudyView />
              </BrainRenderProfiler>
            </motion.div>
          )}
          {activeView === 'brain' && (
            <motion.div
              key="brain"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <BrainRenderProfiler id="route:brain">
                <BrainView />
              </BrainRenderProfiler>
            </motion.div>
          )}
          {activeView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <BrainRenderProfiler id="route:analytics">
                <AnalyticsView />
              </BrainRenderProfiler>
            </motion.div>
          )}
          {activeView === 'revision' && (
            <motion.div
              key="revision"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <BrainRenderProfiler id="route:revision">
                <RevisionView />
              </BrainRenderProfiler>
            </motion.div>
          )}
          {activeView === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <BrainRenderProfiler id="route:admin">
                <AdminView />
              </BrainRenderProfiler>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

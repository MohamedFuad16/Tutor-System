import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../memory/longterm.memory';
import { Terminal, Database, Activity, Server, Clock, ChevronRight, X, Menu, BookOpen, Network, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';

export function AdminView() {
  const { setActiveView, learnerName } = useStore();
  const logs = useLiveQuery(() => db.traceLogs.orderBy('timestamp').reverse().toArray());
  const learningBooks = useLiveQuery(() => db.learningBooks.orderBy('updatedAt').reverse().toArray(), []) || [];
  const learningBookConcepts = useLiveQuery(() => db.learningBookConcepts.orderBy('updatedAt').reverse().toArray(), []) || [];
  const learningEntries = useLiveQuery(() => db.learningEntries.orderBy('timestamp').reverse().limit(25).toArray(), []) || [];
  const [serverLogs, setServerLogs] = useState<{type: string, msg: string, time: number}[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [serverLogs]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When running under Vite dev server (e.g. port 5173), hardcode the server port to 3000
    // When running under production build, use the same host and port.
    const hostPort = import.meta.env.DEV ? `${window.location.hostname}:3000` : window.location.host;
    const ws = new WebSocket(`${protocol}//${hostPort}/ws/debug`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setServerLogs(prev => [...prev.slice(-99), {
          type: data.type || 'log',
          msg: data.msg || '',
          time: data.timestamp || Date.now()
        }]);
      } catch (e) {
        // Fallback for non-JSON logs
        setServerLogs(prev => [...prev.slice(-99), {
          type: 'log',
          msg: event.data,
          time: Date.now()
        }]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'traces'|'console'>('traces');
  const conceptsByBook = learningBookConcepts.reduce<Record<string, typeof learningBookConcepts>>((acc, concept) => {
    acc[concept.bookId] = acc[concept.bookId] || [];
    acc[concept.bookId].push(concept);
    return acc;
  }, {});
  const latestEntryByBook = learningEntries.reduce<Record<string, typeof learningEntries[number]>>((acc, entry) => {
    if (!acc[entry.bookId]) acc[entry.bookId] = entry;
    return acc;
  }, {});

  return (
    <div className="w-full h-full bg-[#faf9f6] text-zinc-900 flex flex-col overflow-y-auto custom-scroll pt-20 md:pt-0 relative font-serif">
      {/* Subtle Paper Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }} />

      <div className="min-h-full flex w-full relative z-10 pt-16 md:pt-20">
        
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-zinc-200/50 bg-[#faf9f6] hidden lg:block px-4 py-6 flex-shrink-0 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto custom-scroll font-sans">
          <button 
            onClick={() => setActiveView('study')}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-8 px-2"
          >
            <Menu size={16} /> Back to Library
          </button>
          
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-6 px-3">Admin Center</div>
          
          <nav className="flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('traces')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'traces' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent'}`}
            >
              <Activity size={16} />
              <span className="line-clamp-1 leading-snug">DeepSeek Trace</span>
            </button>
            <button 
              onClick={() => setActiveTab('console')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'console' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent'}`}
            >
              <Terminal size={16} />
              <span className="line-clamp-1 leading-snug">Server Console</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full relative font-sans">
          
          {/* Header for mobile */}
          <div className="sticky top-16 md:top-20 left-0 right-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md border-b border-zinc-200/50 px-6 py-4 flex items-center justify-between shadow-sm lg:hidden">
            <button 
              onClick={() => setActiveView('study')}
              className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Menu size={16} /> Back
            </button>
            <div className="text-sm font-semibold text-zinc-800 tracking-wide truncate max-w-[200px] md:max-w-md">Admin Center</div>
            <div className="w-16"></div>
          </div>
          
          <div className="flex-1 p-6 md:p-12 lg:p-16 xl:p-24 relative isolate w-full">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 font-serif pb-12"
              >
                
                {/* Admin Center Preface */}
                <div className="mb-12">
                  <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">Admin Center</h1>
                  <p className="text-zinc-600 leading-relaxed max-w-2xl text-sm font-serif">
                    Welcome to the Tutor System's central command. This dashboard provides complete transparency into the AI's internal cognitive processes. Use the <strong>DeepSeek Trace</strong> to watch the LLM's thought process and tool invocations in real-time, or switch to the <strong>Server Console</strong> to monitor live backend traffic, WebSocket streams, and TTS generation logs.
                  </p>
                </div>

                <div className="mb-10 border-b border-zinc-200 pb-8 pt-4 font-sans cursor-default">
                  <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-zinc-400 mb-6 block font-medium">
                    <span className="text-blue-500 mr-2">#</span> 
                    {activeTab === 'traces' ? 'Diagnostics' : 'Runtime Environment'}
                  </span>
                  <div className="flex items-center justify-between">
                    <h1 className="text-3xl md:text-4xl lg:text-4xl font-medium tracking-tight text-zinc-900 mb-2 font-serif leading-[1.15]">
                      {activeTab === 'traces' ? 'DeepSeek Brain Trace' : 'Live Server Console'}
                    </h1>
                    {activeTab === 'console' && (
                      <div className="flex gap-1.5 items-center px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded-md shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Connected</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="prose prose-zinc w-full max-w-none prose-sm md:prose-base font-serif prose-p:leading-[1.8] prose-p:text-zinc-800 prose-p:font-light prose-p:my-5 selection:bg-blue-200 selection:text-zinc-900">
                  {activeTab === 'traces' ? (
                    <div className="flex flex-col gap-8 font-sans">
                      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500/70">
                              <Sparkles size={13} /> Virtual Brain
                            </div>
                            <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">{learnerName}'s DeepSeek Brain Trace</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                              Learning books are updated after each completed tutor chat. Each card shows the current concepts and weak spots the background DeepSeek pass extracted from the conversation.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                            <div className="text-2xl font-semibold text-zinc-900">{learningBooks.length}</div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Books mapped</div>
                          </div>
                        </div>

                        {learningBooks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No learning books yet. Complete a chat and the learning-book agent will map it here.
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            {learningBooks.map((book, index) => {
                              const concepts = (conceptsByBook[book.id] || []).slice(0, 8);
                              const latestEntry = latestEntryByBook[book.id];
                              const avgConfidence = concepts.length
                                ? concepts.reduce((sum, concept) => sum + (concept.confidence || 0), 0) / concepts.length
                                : 0;
                              return (
                                <motion.article
                                  key={book.id}
                                  initial={{ opacity: 0, y: 16 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.04, type: 'spring', stiffness: 360, damping: 28 }}
                                  className="relative overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
                                >
                                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_0%,rgba(255,110,0,0.04),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.03),transparent_38%)]" />
                                  <div className="relative">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-orange-500">
                                          <BookOpen size={18} />
                                        </div>
                                        <div>
                                          <h3 className="text-lg font-semibold leading-tight text-zinc-900">{book.title}</h3>
                                          <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                            {book.conversationCount} chats · {book.agentModel || 'deepseek/deepseek-chat'}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                                        {Math.round(avgConfidence * 100)}%
                                      </div>
                                    </div>

                                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-600 font-serif">
                                      {book.overview || book.knowledgeSummary || book.summary || 'Knowledge summary pending.'}
                                    </p>

                                    {(book.chapters || []).length > 0 && (
                                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                                          Chapters
                                        </div>
                                        <div className="space-y-2">
                                          {(book.chapters || []).slice(-3).map((chapter, chapterIndex) => (
                                            <div key={chapter.id} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600">
                                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 text-[10px] text-orange-500 font-medium">
                                                {chapterIndex + 1}
                                              </span>
                                              <span>
                                                <span className="text-zinc-800 font-medium">{chapter.title}</span>
                                                {chapter.summary && <span className="text-zinc-500"> · {chapter.summary}</span>}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {concepts.length === 0 ? (
                                        <span className="text-xs text-zinc-500 font-serif">No concepts mapped yet.</span>
                                      ) : (
                                        concepts.map(concept => (
                                          <span
                                            key={concept.id}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-sm"
                                          >
                                            <Network size={11} className="text-blue-500" />
                                            {concept.name}
                                          </span>
                                        ))
                                      )}
                                    </div>

                                    {concepts.some(concept => concept.childConcepts.length > 0 || concept.parentConcepts.length > 0) && (
                                      <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3">
                                        {concepts
                                          .filter(concept => concept.childConcepts.length > 0 || concept.parentConcepts.length > 0)
                                          .slice(0, 3)
                                          .map(concept => (
                                            <div key={`${concept.id}-branch`} className="text-xs text-zinc-500">
                                              <span className="text-zinc-800 font-medium">{concept.name}</span>
                                              {concept.childConcepts.length > 0 && <span> branches to {concept.childConcepts.slice(0, 4).join(', ')}</span>}
                                              {concept.childConcepts.length === 0 && concept.parentConcepts.length > 0 && <span> sits under {concept.parentConcepts.slice(0, 3).join(', ')}</span>}
                                            </div>
                                          ))}
                                      </div>
                                    )}

                                    {latestEntry && (
                                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 font-serif">
                                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-sans">
                                          Latest update · {new Date(latestEntry.timestamp).toLocaleTimeString()}
                                        </div>
                                        {latestEntry.conversationSummary || latestEntry.assistantSummary}
                                      </div>
                                    )}
                                  </div>
                                </motion.article>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      {!logs || logs.length === 0 ? (
                        <div className="flex items-center justify-center flex-col text-zinc-500 gap-3 py-20 font-serif italic text-lg">
                          No background traces recorded yet.
                        </div>
                      ) : (
                        logs.map((log, index) => (
                          <motion.div 
                            key={log.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
                            className="relative pl-8 pb-8"
                          >
                            <motion.div 
                              className="absolute left-[0px] top-4 w-[2px] bg-zinc-200/60"
                              initial={{ height: 0 }}
                              animate={{ height: "100%" }}
                              transition={{ duration: 0.8, ease: "easeInOut", delay: Math.min(index * 0.05, 1) }}
                            />
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20, delay: Math.min(index * 0.05, 1) }}
                              className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-[#faf9f6] shadow-sm -left-[5px] top-1 z-10" 
                            />
                            
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                                {log.action}
                              </span>
                              <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-mono">
                                <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <div className="text-[15px] text-zinc-800 mb-4 leading-relaxed mt-3 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm font-serif">
                              {log.llmExplanation}
                            </div>
                            
                            <details className="group">
                              <summary className="text-xs font-mono text-zinc-500 cursor-pointer hover:text-zinc-800 transition-colors flex items-center gap-1.5 select-none font-medium">
                                <ChevronRight size={14} className="group-open:rotate-90 transition-transform" /> 
                                Raw JSON Payload
                              </summary>
                              <pre className="mt-3 text-[11px] text-zinc-600 bg-zinc-50 p-4 rounded-xl overflow-x-auto border border-zinc-200 font-mono shadow-inner">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </details>
                          </motion.div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div 
                      ref={consoleRef}
                      className="bg-[#111] border border-zinc-800 rounded-2xl p-6 font-mono text-[11px] sm:text-xs leading-relaxed custom-scroll h-[600px] overflow-y-auto shadow-inner text-zinc-300"
                    >
                      {serverLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-zinc-500 italic">
                          Awaiting server output...
                        </div>
                      ) : (
                        serverLogs.map((log, i) => (
                          <div key={i} className="mb-2 flex gap-4 hover:bg-white/5 px-2 py-1.5 rounded transition-colors">
                            <span className="text-zinc-500 shrink-0 select-none">
                              {new Date(log.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`break-words ${
                              log.type === 'error' ? 'text-red-400' :
                              log.type === 'warn' ? 'text-yellow-400' :
                              'text-zinc-300'
                            }`}>
                              {log.msg}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

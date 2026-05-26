import { PersistentConcept } from './longterm.memory';

export class ScaffoldingEngine {
  /**
   * Scaffolding levels (5 tiers):
   * 5: full worked examples, step-by-step
   * 4: worked example + one blank step
   * 3: partial hint + Socratic question
   * 2: Socratic question only
   * 1: "Try it — I'm here if you need me"
   * 0 (fade out): student works fully independently
   */
  public calculateScaffoldLevel(concept?: PersistentConcept, misconceptionCount: number = 0): number {
    if (!concept) return 5; // Default to max for new concepts
    
    let level = 5;
    
    // Higher P(L) = lower scaffold
    if (concept.p_learn > 0.85) level = 0;
    else if (concept.p_learn > 0.70) level = 1;
    else if (concept.p_learn > 0.50) level = 2;
    else if (concept.p_learn > 0.30) level = 3;
    else if (concept.p_learn > 0.15) level = 4;
    
    // Recent struggle history pushes it back up
    const recentAttempts = concept.attempt_history.slice(-3);
    const recentFails = recentAttempts.filter(a => !a.correct).length;
    
    level += recentFails;
    
    // Misconceptions strongly indicate need for scaffolding (but specific types, like Socratic)
    if (misconceptionCount > 0) {
      level = Math.max(level, 3);
    }

    return Math.max(0, Math.min(5, level));
  }
}

export const scaffoldingEngine = new ScaffoldingEngine();

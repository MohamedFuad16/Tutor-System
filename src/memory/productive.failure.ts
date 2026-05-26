import { PersistentConcept } from './longterm.memory';

export type StruggleState = "productive_struggle" | "destructive_frustration" | "fluent" | "unknown";

export class ProductiveFailureEngine {
  public determineState(
    concept: PersistentConcept, 
    attemptCount: number, 
    timeOnTaskMs: number,
    isInZpd: boolean,
    hasMisconceptions: boolean,
    emotionalSignals: { frustration?: boolean } = {}
  ): StruggleState {
    
    // Convert to minutes
    const timeOnTaskMins = timeOnTaskMs / 1000 / 60;
    
    if (attemptCount === 0) return "unknown";

    if (
      (attemptCount >= 3) || 
      (timeOnTaskMins > 6) || 
      emotionalSignals.frustration
    ) {
      return "destructive_frustration";
    }

    if (
      attemptCount < 3 && 
      timeOnTaskMins < 4 && 
      isInZpd && 
      !hasMisconceptions
    ) {
      return "productive_struggle";
    }

    return "fluent"; // fallback
  }
}

export const productiveFailureEngine = new ProductiveFailureEngine();

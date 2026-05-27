export type CognitiveLoadState = "low" | "optimal" | "high" | "overload";

export class CognitiveLoadMonitor {
  public determineLoadConfig(
    responseLatencyMs: number,
    retryFrequency: number,
    sessionDurationMins: number,
  ): { level: CognitiveLoadState; recommendation: string } {
    // Simple heuristic-based cognitive load monitoring
    let loadScore = 0;

    if (responseLatencyMs > 60000)
      loadScore += 2; // Very slow
    else if (responseLatencyMs > 30000) loadScore += 1;

    if (retryFrequency > 3) loadScore += 2;
    else if (retryFrequency > 1) loadScore += 1;

    if (sessionDurationMins > 45) loadScore += 2;
    else if (sessionDurationMins > 25) loadScore += 1;

    if (loadScore >= 5) {
      return { level: "overload", recommendation: "summarize_and_break" };
    } else if (loadScore >= 3) {
      return { level: "high", recommendation: "simplify" };
    } else if (loadScore >= 1) {
      return { level: "optimal", recommendation: "continue" };
    } else {
      return { level: "low", recommendation: "challenge" };
    }
  }
}

export const cognitiveLoadMonitor = new CognitiveLoadMonitor();

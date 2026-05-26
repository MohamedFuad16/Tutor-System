export class IllusionDetector {
  public detectIllusionOfKnowing(selfConfidence: number, actualPerformance: number): boolean {
    const illusionScore = selfConfidence - actualPerformance;
    return illusionScore > 0.30;
  }
}

export const illusionDetector = new IllusionDetector();

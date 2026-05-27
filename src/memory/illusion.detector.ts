export class IllusionDetector {
  public detectIllusionOfKnowing(
    selfConfidence: number,
    actualPerformance: number,
  ): boolean {
    const illusionScore = selfConfidence - actualPerformance;
    return illusionScore > 0.3;
  }
}

export const illusionDetector = new IllusionDetector();

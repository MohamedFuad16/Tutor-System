export class MetacognitionTracker {
  // Array of [predicted: number, actual: number] (both 0-1)
  public calculateCalibrationError(history: [number, number][]): number {
    if (history.length === 0) return 0;
    let errSum = 0;
    for (const [pred, actual] of history) {
      errSum += Math.abs(pred - actual);
    }
    return errSum / history.length;
  }
}

export const metacognitionTracker = new MetacognitionTracker();

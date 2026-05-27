import { db, PersistentConcept } from "./longterm.memory";

// Default BKT Parameters for new concepts
const DEFAULT_BKT = {
  p_learn_init: 0.2, // P(L0)
  p_transit: 0.1, // P(T) - chance to learn at each step
  p_slip: 0.1, // P(S) - chance of making a mistake despite knowing
  p_guess: 0.2, // P(G) - chance of guessing correctly without knowing
};

export class BKTEngine {
  /**
   * Calculate Bayesian Knowledge Tracing update
   */
  public calculatePosterior(
    concept: PersistentConcept,
    isCorrect: boolean,
  ): number {
    const { p_learn, p_transit, p_slip, p_guess } = concept;

    // Probability of observing the current result given the state
    let p_obs_given_learned = isCorrect ? 1 - p_slip : p_slip;
    let p_obs_given_unlearned = isCorrect ? p_guess : 1 - p_guess;

    // Probability of the observation
    let p_obs =
      p_learn * p_obs_given_learned + (1 - p_learn) * p_obs_given_unlearned;

    // Filtered probability (P of knowing given the observation)
    let p_learn_given_obs =
      (p_learn * p_obs_given_learned) / Math.max(0.0001, p_obs);

    // Update with transit (learning rate)
    let p_learn_next = p_learn_given_obs + (1 - p_learn_given_obs) * p_transit;

    return Math.max(0, Math.min(1, p_learn_next));
  }

  public async updateConceptAttempt(
    conceptId: string,
    isCorrect: boolean,
    type: "recognition" | "generation" | "transfer",
  ) {
    const concept = await db.concepts.get(conceptId);
    if (!concept) return null;

    const posterior = this.calculatePosterior(concept, isCorrect);

    // Limits based on type (as per Phase 5 spec)
    let maxPLearn = 0.95;
    if (type === "recognition" && posterior > 0.7) maxPLearn = 0.7;
    if (type === "generation" && posterior > 0.85) maxPLearn = 0.85;

    concept.p_learn = Math.min(posterior, maxPLearn);

    concept.attempt_history.push({
      correct: isCorrect,
      type,
      timestamp: Date.now(),
    });
    concept.lastReviewedAt = Date.now();

    await db.concepts.put(concept);
    return concept;
  }
}

export const bktEngine = new BKTEngine();

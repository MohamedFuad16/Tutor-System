import { db, PersistentConcept } from './longterm.memory';

// SM-2 Algorithm specifics for computing next revision timestamp
export async function computeNextRevision(concept: PersistentConcept, grade: number) {
  // grade is 0 to 5 (0 = blackout, 5 = perfect recall)
  // Supermemo 2 algorithm simplified
  let easiness = concept.confidence ? Math.max(1.3, concept.confidence * 2.5 + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)) : 2.5;
  
  let days = 1;
  if (concept.revisionCount === 1) {
    days = 1;
  } else if (concept.revisionCount === 2) {
    days = 6;
  } else {
    days = Math.round((concept.revisionCount * easiness));
  }
  
  if (grade < 3) {
    days = 1; // Start over for failures
  }
  
  concept.confidence = easiness / 2.5;
  concept.lastReviewedAt = Date.now();
  concept.revisionCount += 1;
  
  await db.concepts.put(concept);
  return days;
}

export async function getUrgentRevisions(): Promise<PersistentConcept[]> {
  const all = await db.concepts.toArray();
  const now = Date.now();
  
  return all.filter(c => {
    // simplified urgency calc based on decay
    const daysSince = (now - c.lastReviewedAt) / (1000 * 60 * 60 * 24);
    const targetDays = Math.max(1, c.revisionCount * (c.confidence * 2.5));
    return daysSince >= targetDays || c.confidence < 0.4;
  });
}

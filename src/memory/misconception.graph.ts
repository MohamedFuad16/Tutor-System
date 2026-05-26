import { db, Misconception } from './longterm.memory';
import { v4 as uuidv4 } from 'uuid';

export class MisconceptionGraph {
  public async addMisconception(conceptId: string, description: string, initialEvidence: string): Promise<Misconception> {
    const misconception: Misconception = {
      id: uuidv4(),
      concept_id: conceptId,
      description,
      evidence: [initialEvidence],
      confidence: 0.6, // Initial confidence
      attempts_to_resolve: 0,
      resolved: false,
      createdAt: Date.now()
    };
    await db.misconceptions.add(misconception);
    return misconception;
  }

  public async getActiveMisconceptions(): Promise<Misconception[]> {
    return await db.misconceptions.filter(m => !m.resolved).toArray();
  }

  public async getForConcept(conceptId: string): Promise<Misconception[]> {
    return await db.misconceptions.where('concept_id').equals(conceptId).toArray();
  }

  public async resolveMisconception(id: string, strategy: string) {
    const m = await db.misconceptions.get(id);
    if (!m) return;
    
    m.resolved = true;
    m.resolution_strategy = strategy;
    await db.misconceptions.put(m);
  }

  public async incrementAttempts(id: string) {
    const m = await db.misconceptions.get(id);
    if (m) {
      m.attempts_to_resolve += 1;
      await db.misconceptions.put(m);
    }
  }
}

export const misconceptionGraph = new MisconceptionGraph();

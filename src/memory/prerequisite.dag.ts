import { db } from './longterm.memory';

export class PrerequisiteDAG {
  public async arePrerequisitesMet(conceptId: string, threshold: number = 0.70): Promise<boolean> {
    const concept = await db.concepts.get(conceptId);
    if (!concept || !concept.prerequisites || concept.prerequisites.length === 0) return true;
    
    for (const prereqId of concept.prerequisites) {
      const prereq = await db.concepts.get(prereqId);
      if (!prereq || prereq.p_learn < threshold) {
        return false;
      }
    }
    return true;
  }

  public async getWeakPrerequisites(conceptId: string, threshold: number = 0.65): Promise<string[]> {
    const concept = await db.concepts.get(conceptId);
    if (!concept || !concept.prerequisites) return [];
    
    const weak = [];
    for (const prereqId of concept.prerequisites) {
      const prereq = await db.concepts.get(prereqId);
      if (prereq && prereq.p_learn < threshold) {
        weak.push(prereq.name);
      }
    }
    return weak;
  }
}

export const prerequisiteDAG = new PrerequisiteDAG();

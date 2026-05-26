import { db } from './longterm.memory';
import { prerequisiteDAG } from './prerequisite.dag';

export class ZPDCalculator {
  public async getZones() {
    const allConcepts = await db.concepts.toArray();
    
    // Categorize
    const independent_zone = allConcepts.filter(c => c.p_learn >= 0.90);
    const zpd_zone_candidates = allConcepts.filter(c => c.p_learn >= 0.40 && c.p_learn < 0.90);
    const not_yet_candidates = allConcepts.filter(c => c.p_learn < 0.40);
    
    // Filter ZPD based on prerequisites
    // A concept can only be in ZPD if all its prerequisites have P(L) > 0.70
    const zpd_zone = [];
    const not_yet_zone = [...not_yet_candidates];
    
    for (const c of zpd_zone_candidates) {
      const ready = await prerequisiteDAG.arePrerequisitesMet(c.id, 0.70);
      if (ready) {
        zpd_zone.push(c);
      } else {
        not_yet_zone.push(c);
      }
    }
    
    return {
      independent_zone,
      zpd_zone,
      not_yet_zone
    };
  }
}

export const zpdCalculator = new ZPDCalculator();

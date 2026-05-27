import { db } from "./longterm.memory";
import { zpdCalculator } from "./zpd.calculator";
import { misconceptionGraph } from "./misconception.graph";
import { scaffoldingEngine } from "./scaffolding.engine";
import { prerequisiteDAG } from "./prerequisite.dag";
import { bktEngine } from "./bkt.engine";
import { illusionDetector } from "./illusion.detector";
import { cognitiveLoadMonitor } from "./cognitive.load";

export class LearnerModel {
  public async getLearnerSnapshot(
    currentConceptId?: string,
    sessionData?: any,
  ) {
    const zpd = await zpdCalculator.getZones();
    const active_misconceptions =
      await misconceptionGraph.getActiveMisconceptions();

    let currentConcept = undefined;
    let scaffold_level = 5;
    let prerequisite_gaps = [];
    let illusion_flags = [];

    if (currentConceptId) {
      currentConcept = await db.concepts.get(currentConceptId);
      if (currentConcept) {
        const relatedMisconceptions = active_misconceptions.filter(
          (m) => m.concept_id === currentConceptId,
        );
        scaffold_level = scaffoldingEngine.calculateScaffoldLevel(
          currentConcept,
          relatedMisconceptions.length,
        );
        prerequisite_gaps =
          await prerequisiteDAG.getWeakPrerequisites(currentConceptId);

        // Check for illusion of knowing
        // We'd pass real metrics here, simulating flag if high confidence but low mastery
        if (
          illusionDetector.detectIllusionOfKnowing(
            currentConcept.confidence || 0,
            currentConcept.p_learn || 0,
          )
        ) {
          illusion_flags.push(currentConcept.name);
        }
      }
    } else {
      // average scaffold across zpd
      if (zpd.zpd_zone.length > 0) {
        let total = 0;
        zpd.zpd_zone.forEach(
          (c) => (total += scaffoldingEngine.calculateScaffoldLevel(c)),
        );
        scaffold_level = Math.round(total / zpd.zpd_zone.length);
      }
    }

    const bkt_weak_kcs = await db.concepts
      .filter((c) => c.p_learn < 0.6 && c.attempt_history.length > 0)
      .limit(5)
      .toArray();

    const loadState = sessionData
      ? cognitiveLoadMonitor.determineLoadConfig(
          sessionData.latency || 0,
          sessionData.retries || 0,
          sessionData.duration || 0,
        )
      : { level: "optimal", recommendation: "continue" };

    return {
      zpd_concepts: zpd.zpd_zone,
      active_misconceptions,
      scaffold_level,
      prerequisite_gaps,
      bkt_weak_kcs: bkt_weak_kcs.map((c) => c.name),
      cognitive_load: loadState,
      struggle_state: "unknown",
      illusion_flags,
      calibration_state: "neutral",
      transfer_gaps: [],
    };
  }

  public async getTutorInstructions(snapshot: any): Promise<string> {
    let instructions =
      "### VIRTUAL STUDENT BRAIN (Cognitive Science-Grounded Learner Model) DIRECTIVES ###\n\n";

    if (
      snapshot.active_misconceptions &&
      snapshot.active_misconceptions.length > 0
    ) {
      instructions +=
        "- [CRITICAL] MISCONCEPTION DETECTED: Use Socratic correction. DO NOT just point out they are wrong directly. Ask questions to let them discover the flaw.\n";
      instructions += `  Misconceptions: ${snapshot.active_misconceptions.map((m: any) => m.description).join(", ")}\n`;
    }

    if (snapshot.prerequisite_gaps && snapshot.prerequisite_gaps.length > 0) {
      instructions += `- [PREREQUISITE GAP] The student lacks foundation in: ${snapshot.prerequisite_gaps.join(", ")}. Pivot slightly to reinforce these silently before continuing.\n`;
    }

    if (snapshot.illusion_flags && snapshot.illusion_flags.length > 0) {
      instructions += `- [ILLUSION OF KNOWING] Student believes they understand: ${snapshot.illusion_flags.join(", ")} but may have surface knowledge only. Generate a TRANSFER TASK to test their knowledge, do NOT validate their confidence yet.\n`;
    }

    if (snapshot.scaffold_level !== undefined) {
      instructions += `- SCAFFOLDING LEVEL: ${snapshot.scaffold_level}/5. `;
      switch (snapshot.scaffold_level) {
        case 5:
          instructions +=
            "Provide FULL worked examples, step-by-step walkthrough.\n";
          break;
        case 4:
          instructions +=
            "Provide worked example + leave ONE blank step for the student to fill.\n";
          break;
        case 3:
          instructions += "Provide a PARTIAL hint + Socratic question.\n";
          break;
        case 2:
          instructions +=
            "Provide Socratic question ONLY. No direct answers.\n";
          break;
        case 1:
          instructions +=
            "Say 'Try it — I'm here if you need me'. Minimum intervention.\n";
          break;
        case 0:
          instructions +=
            "Student works independently. Validate and observe.\n";
          break;
      }
    }

    if (
      snapshot.cognitive_load &&
      snapshot.cognitive_load.level === "overload"
    ) {
      instructions += `- [COGNITIVE OVERLOAD DETECTED] Immediately summarize recent material, reduce challenge difficulty, and suggest a short break. DO NOT introduce new concepts.\n`;
    }

    if (snapshot.bkt_weak_kcs && snapshot.bkt_weak_kcs.length > 0) {
      instructions += `- WEAK CONCEPTS: Student needs interleave reinforcement for [${snapshot.bkt_weak_kcs.join(", ")}].\n`;
    }

    return instructions;
  }
}

export const learnerModel = new LearnerModel();

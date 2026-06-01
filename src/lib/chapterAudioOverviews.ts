export type ChapterAudioOverview = {
  title: string;
  summary: string;
  transcript: string;
  audioSrc: string;
  durationLabel: string;
  generatedBy: string;
  voice: string;
  storedAt: string;
};

// Only include audio assets that are actually checked into public/audio-overviews.
// The full generation plan for pending chapters lives in scripts/user-brain-audio-overview-plan.mjs.
export const userBrainChapterAudioOverviews: Record<
  number,
  ChapterAudioOverview
> = {
  0: {
    title: "Quick tour of the learner brain",
    summary:
      "A stored, energetic overview of the foreground tutor, learner brain ledger, and background worker contract.",
    transcript:
      "Here is the quick tour. LearningAI is not trying to magically rewrite a learner in the background. It is building a visible tutor with a careful local brain behind it. The tutor can teach in the moment, retrieve sources, create study artifacts, and update memory, but durable mastery only moves when evidence earns it. Think of the architecture as three layers: the calm foreground tutor, the learner brain ledger, and bounded background workers. The magic is not one giant model. The magic is the contract between those layers: every important update gets a source, a status, and a way to review or correct it. That is how this app can feel alive without becoming untrustworthy.",
    audioSrc: "/audio-overviews/user-brain-runtime-overview.mp3",
    durationLabel: "about 45 sec",
    generatedBy: "GPT-authored overview script, stored as a local audio asset",
    voice: "Stored MP3",
    storedAt: "2026-06-01",
  },
};

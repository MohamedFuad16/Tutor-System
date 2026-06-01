export const USER_BRAIN_AUDIO_OVERVIEW_BOOK_ID = "user-brain-architecture";
export const USER_BRAIN_AUDIO_OVERVIEW_BOOK_TITLE = "User Brain Architecture";
export const USER_BRAIN_AUDIO_OVERVIEW_OUTPUT_DIR = "public/audio-overviews";
export const USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL = "gpt-4o-mini-tts";
export const USER_BRAIN_AUDIO_OVERVIEW_VOICE = "alloy";

export const userBrainAudioOverviewPlan = [
  {
    chapterIndex: 0,
    chapterTitle: "Chapter 1: The Whole Shape",
    title: "Quick tour of the learner brain",
    summary:
      "A stored, energetic overview of the foreground tutor, learner brain ledger, and background worker contract.",
    transcript:
      "Here is the quick tour. LearningAI is not trying to magically rewrite a learner in the background. It is building a visible tutor with a careful local brain behind it. The tutor can teach in the moment, retrieve sources, create study artifacts, and update memory, but durable mastery only moves when evidence earns it. Think of the architecture as three layers: the calm foreground tutor, the learner brain ledger, and bounded background workers. The magic is not one giant model. The magic is the contract between those layers: every important update gets a source, a status, and a way to review or correct it. That is how this app can feel alive without becoming untrustworthy.",
    durationLabel: "about 45 sec",
    outputFile: "user-brain-runtime-overview.mp3",
    assetStatus: "stored",
  },
  {
    chapterIndex: 1,
    chapterTitle: "Chapter 2: The Learner Brain Ledger",
    title: "The ledger is the trust layer",
    summary:
      "A quick explanation of why durable learner state needs typed records, sources, and correction paths.",
    transcript:
      "The ledger chapter is the trust chapter. A useful tutor can be warm and adaptive in the moment, but permanent learner state needs stricter rules. Every durable row should say what changed, why it changed, what evidence supports it, and how a learner or developer can review it. Generated notes, cards, and audio are helpful artifacts, not automatic proof. That separation keeps memory useful without turning every model guess into learner truth.",
    durationLabel: "about 40 sec",
    outputFile: "user-brain-ledger-overview.mp3",
    assetStatus: "planned",
  },
  {
    chapterIndex: 2,
    chapterTitle: "Chapter 3: Teaching Loop And State",
    title: "Fast teaching, careful memory",
    summary:
      "A short guide to separating live tutoring adaptation from durable mastery updates.",
    transcript:
      "The teaching loop is where the app should feel most human. It can explain, ask a check, notice confusion, repair the explanation, and schedule recall. Those live signals can shape the next tutor move immediately. Durable memory is different. If the system wants to change mastery or long term learner state, it needs an auditable evidence row. The lesson can move quickly, but the learner brain ledger moves carefully.",
    durationLabel: "about 40 sec",
    outputFile: "user-brain-teaching-loop-overview.mp3",
    assetStatus: "planned",
  },
  {
    chapterIndex: 3,
    chapterTitle: "Chapter 4: Retrieval, Artifacts, And Citations",
    title: "Grounding is the main boundary",
    summary:
      "An overview of local-source-first retrieval, generated artifacts, and citation states.",
    transcript:
      "Retrieval and citations are the app's honesty boundary. If the learner asks about the current page, document, selection, or saved book, the local source material comes first. Web search is reserved for current outside facts or explicit requests. Artifacts can be ready, draft, failed, or stale, and citations can be verified, checking, not checked, unavailable, conflicting, or unsupported. The point is simple: the UI should show exactly how much trust has actually been earned.",
    durationLabel: "about 45 sec",
    outputFile: "user-brain-retrieval-artifacts-overview.mp3",
    assetStatus: "planned",
  },
  {
    chapterIndex: 4,
    chapterTitle: "Chapter 5: Admin And Runtime Tuning",
    title: "Admin is the operating room",
    summary:
      "A fast tour of the behind-the-scenes meters, timelines, settings, and local beta controls.",
    transcript:
      "Admin is the operating room for local beta. It should answer what happened during a tutor request, which model ran or failed, which tools were called, which memory and retrieval rows changed, and which artifacts or corrections need review. Runtime tuning gives the user local knobs without hiding system behavior. The rule is restraint: Admin reports recorded state, not imagined model internals.",
    durationLabel: "about 35 sec",
    outputFile: "user-brain-admin-tuning-overview.mp3",
    assetStatus: "planned",
  },
  {
    chapterIndex: 5,
    chapterTitle: "Chapter 6: Voice, Audio, And Timing",
    title: "Voice should respect timing",
    summary:
      "A concise explanation of why stored chapter audio beats repeated live read-aloud for built-in books.",
    transcript:
      "Voice is powerful only when it respects timing. Live tutoring speech needs quick starts, quick stops, short explanations, and honest fallback to text. Built-in Library chapters are different. They do not need a live read aloud call every time. The better pattern is a short generated overview, stored once as an audio asset, then played locally with normal controls. That keeps listening fast, reviewable, and cheap.",
    durationLabel: "about 40 sec",
    outputFile: "user-brain-voice-audio-overview.mp3",
    assetStatus: "planned",
  },
  {
    chapterIndex: 6,
    chapterTitle: "Chapter 7: Local Beta Roadmap",
    title: "Prove it locally before cloud",
    summary:
      "A roadmap overview for validating learner-brain behavior before AWS or production sync work.",
    transcript:
      "The local beta roadmap is deliberately grounded. First, prove the learner brain behavior in the browser: evidence gates, ledgers, model runs, tool jobs, correction overlays, artifact provenance, diagnostics export, and stored audio. Only after those pieces behave well should cloud sync, tenant isolation, backups, and production dashboards enter the story. The local app should earn trust before the infrastructure grows around it.",
    durationLabel: "about 40 sec",
    outputFile: "user-brain-local-beta-roadmap-overview.mp3",
    assetStatus: "planned",
  },
  {
    chapterIndex: 7,
    chapterTitle: "Chapter 8: Sources And Glossary",
    title: "Shared words keep the system honest",
    summary:
      "A closing overview for the vocabulary and source boundaries that keep the architecture understandable.",
    transcript:
      "The glossary chapter is not decorative. Shared words keep a complicated learning system understandable. Evidence means an observed learner action or source-linked event. A mastery delta is a recorded movement, not a vibe. A correction is a visible review intent, not a silent rewrite. A learner brain is a local ledger, not a mysterious cloud memory. When the team uses precise terms, the product can stay ambitious without becoming slippery.",
    durationLabel: "about 40 sec",
    outputFile: "user-brain-sources-glossary-overview.mp3",
    assetStatus: "planned",
  },
];

export const audioOverviewIdFor = (entry) =>
  `${USER_BRAIN_AUDIO_OVERVIEW_BOOK_ID}:chapter-${entry.chapterIndex}:stored-audio-overview`;

export const audioOverviewPublicSrcFor = (entry) =>
  `/audio-overviews/${entry.outputFile}`;

export const buildAudioOverviewSpeechInput = (entry) => entry.transcript.trim();

export const buildAudioOverviewDryRunReport = ({
  entries = userBrainAudioOverviewPlan,
  existingFiles = new Set(),
} = {}) => {
  const rows = entries.map((entry) => {
    const present = existingFiles.has(entry.outputFile);

    return {
      overviewId: audioOverviewIdFor(entry),
      chapterIndex: entry.chapterIndex,
      chapterTitle: entry.chapterTitle,
      title: entry.title,
      outputFile: entry.outputFile,
      audioSrc: audioOverviewPublicSrcFor(entry),
      assetStatus: entry.assetStatus,
      fileStatus: present ? "present" : "missing",
      durationLabel: entry.durationLabel,
      transcriptLength: buildAudioOverviewSpeechInput(entry).length,
    };
  });

  return {
    total: rows.length,
    present: rows.filter((row) => row.fileStatus === "present").length,
    missing: rows.filter((row) => row.fileStatus === "missing").length,
    model: USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL,
    voice: USER_BRAIN_AUDIO_OVERVIEW_VOICE,
    outputDir: USER_BRAIN_AUDIO_OVERVIEW_OUTPUT_DIR,
    rows,
  };
};

import { readFileSync } from "node:fs";

export const AUDIO_OVERVIEW_OUTPUT_DIR = "public/audio-overviews";
export const AUDIO_OVERVIEW_DEEPGRAM_MODEL = "aura-2-odysseus-en";
export const AUDIO_OVERVIEW_DEEPGRAM_SPEED = 1;
export const AUDIO_OVERVIEW_OPENAI_SPEECH_MODEL = "gpt-4o-mini-tts";
export const AUDIO_OVERVIEW_OPENAI_VOICE = "alloy";
export const AUDIO_OVERVIEW_MACOS_VOICE = "Samantha";
export const AUDIO_OVERVIEW_MACOS_RATE = 145;
export const AUDIO_OVERVIEW_MACOS_TEMPO = 0.78;

export const USER_BRAIN_AUDIO_OVERVIEW_BOOK_ID = "user-brain-architecture";
export const USER_BRAIN_AUDIO_OVERVIEW_BOOK_TITLE = "User Brain Architecture";
export const USER_BRAIN_AUDIO_OVERVIEW_OUTPUT_DIR = AUDIO_OVERVIEW_OUTPUT_DIR;
export const USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL =
  AUDIO_OVERVIEW_OPENAI_SPEECH_MODEL;
export const USER_BRAIN_AUDIO_OVERVIEW_VOICE = AUDIO_OVERVIEW_OPENAI_VOICE;
export const USER_BRAIN_AUDIO_OVERVIEW_MACOS_VOICE = AUDIO_OVERVIEW_MACOS_VOICE;
export const USER_BRAIN_AUDIO_OVERVIEW_MACOS_RATE = AUDIO_OVERVIEW_MACOS_RATE;
export const USER_BRAIN_AUDIO_OVERVIEW_MACOS_TEMPO = AUDIO_OVERVIEW_MACOS_TEMPO;

const manifestUrl = new URL(
  "../src/lib/chapterAudioOverviews.json",
  import.meta.url,
);

export const builtInBookAudioOverviewPlan = JSON.parse(
  readFileSync(manifestUrl, "utf8"),
);

export const userBrainAudioOverviewPlan = builtInBookAudioOverviewPlan.filter(
  (entry) => entry.bookId === USER_BRAIN_AUDIO_OVERVIEW_BOOK_ID,
);

export const audioOverviewIdFor = (entry) =>
  `${entry.bookId}:chapter-${entry.chapterIndex}:stored-audio-overview`;

export const audioOverviewPublicSrcFor = (entry) =>
  entry.audioSrc || `/audio-overviews/${entry.outputFile}`;

export const buildAudioOverviewSpeechInput = (entry) =>
  String(entry.transcript || "").trim();

export const buildAudioOverviewDryRunReport = ({
  entries = builtInBookAudioOverviewPlan,
  existingFiles = new Set(),
  provider = "deepgram",
} = {}) => {
  const rows = entries.map((entry) => {
    const present = existingFiles.has(entry.outputFile);

    return {
      overviewId: audioOverviewIdFor(entry),
      bookId: entry.bookId,
      bookTitle: entry.bookTitle,
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
    provider,
    deepgramModel: AUDIO_OVERVIEW_DEEPGRAM_MODEL,
    deepgramSpeed: AUDIO_OVERVIEW_DEEPGRAM_SPEED,
    openaiModel: AUDIO_OVERVIEW_OPENAI_SPEECH_MODEL,
    openaiVoice: AUDIO_OVERVIEW_OPENAI_VOICE,
    macosVoice: AUDIO_OVERVIEW_MACOS_VOICE,
    macosRate: AUDIO_OVERVIEW_MACOS_RATE,
    macosTempo: AUDIO_OVERVIEW_MACOS_TEMPO,
    outputDir: AUDIO_OVERVIEW_OUTPUT_DIR,
    rows,
  };
};

import audioOverviewData from "./chapterAudioOverviews.json";

export type ChapterAudioOverview = {
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  title: string;
  summary: string;
  transcript: string;
  audioSrc: string;
  durationLabel: string;
  generatedBy?: string;
  voice?: string;
  storedAt?: string;
};

type ChapterAudioOverviewManifestEntry = ChapterAudioOverview & {
  outputFile: string;
  assetStatus: "stored";
};

const audioOverviewEntries =
  audioOverviewData as ChapterAudioOverviewManifestEntry[];

export const builtInBookAudioOverviewEntries: ChapterAudioOverviewManifestEntry[] =
  audioOverviewEntries;

export const builtInBookAudioOverviews = audioOverviewEntries.reduce<
  Record<string, Record<number, ChapterAudioOverview>>
>((byBook, entry) => {
  const {
    outputFile: _outputFile,
    assetStatus: _assetStatus,
    ...overview
  } = entry;
  byBook[entry.bookId] = {
    ...(byBook[entry.bookId] || {}),
    [entry.chapterIndex]: overview,
  };
  return byBook;
}, {});

export const userBrainChapterAudioOverviews: Record<
  number,
  ChapterAudioOverview
> = builtInBookAudioOverviews["user-brain-architecture"] || {};

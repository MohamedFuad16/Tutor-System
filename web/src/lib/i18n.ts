/**
 * Minimal UI copy for the most visible surfaces. The tutor itself answers in
 * the learner's language; this only localises chrome text.
 */
import { useApp } from "@/store/app";

const STRINGS = {
  en: {
    hero1: "Learning, redefined. Turn any document into a patient, expert tutor.",
    hero2: "Talk it through, see it drawn, and watch your study guide write itself.",
    hero3: "Drop in your first document to begin.",
    tutorTitle: "Interactive Tutor",
    tutorBody: "Ask by typing or talking — answers cite the exact page.",
    guideTitle: "Living Study Guide",
    guideBody: "Concept maps, key points and self-checks that grow with every conversation.",
    uploadTitle: "Upload a document",
    uploadBody: "Drop a PDF here or click to choose one.",
    uploading: "Reading your document…",
    orAsk: "or just start asking",
  },
  ja: {
    hero1: "学びを再定義。どんな資料も、あなた専属の講師に。",
    hero2: "話して、図で見て、学習ノートが自動でまとまる。",
    hero3: "最初の資料をドロップして始めましょう。",
    tutorTitle: "対話型チューター",
    tutorBody: "入力でも音声でも。回答は該当ページを引用します。",
    guideTitle: "成長する学習ガイド",
    guideBody: "概念マップ・要点・確認問題が会話ごとに育ちます。",
    uploadTitle: "資料をアップロード",
    uploadBody: "PDFをドロップ、またはクリックして選択。",
    uploading: "資料を読み込み中…",
    orAsk: "または、そのまま質問",
  },
  ko: {
    hero1: "학습의 재정의. 어떤 문서든 나만의 전문 튜터로.",
    hero2: "말로 묻고, 그림으로 보고, 학습 가이드는 저절로 완성됩니다.",
    hero3: "첫 문서를 올려 시작하세요.",
    tutorTitle: "인터랙티브 튜터",
    tutorBody: "타이핑이나 음성으로 질문하면 해당 페이지를 인용해 답합니다.",
    guideTitle: "살아있는 학습 가이드",
    guideBody: "대화할수록 개념 지도와 핵심 요약, 확인 문제가 자랍니다.",
    uploadTitle: "문서 업로드",
    uploadBody: "PDF를 끌어다 놓거나 클릭해 선택하세요.",
    uploading: "문서를 읽는 중…",
    orAsk: "또는 바로 질문하기",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

export function useT() {
  const language = useApp((state) => state.language);
  const table = (STRINGS as Record<string, Record<StringKey, string>>)[language] ?? STRINGS.en;
  return (key: StringKey) => table[key] ?? STRINGS.en[key];
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

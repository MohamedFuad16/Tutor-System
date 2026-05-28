import { useStore } from "../store";

export type Language = "en" | "ja" | "ko";

export const translations = {
  en: {
    // Navigation & General Tabs
    study: "Study",
    analytics: "Analytics",
    revision: "Revision",
    admin: "Admin",

    // General App / Settings Labels
    app_settings: "App Settings",
    general: "General",
    usage: "Usage",
    persona_studio: "Persona Studio",
    learner_name: "Learner Name",
    openrouter_key: "OpenRouter API Key",
    serper_key: "Serper API Key",
    tts_voice: "TTS Voice Selection",
    ai_model: "AI Model",
    ui_animations: "UI Animations & Transitions",
    language: "App Language",
    save_changes: "Save Changes",
    cancel: "Cancel",

    // Chat Panel & Placeholders
    ask_question_placeholder: "Ask a question about the document...",
    thinking_process: "Thinking Process",
    ai_tutor: "AI Tutor",
    clear_history: "Clear History",
    chat_tokens: "Chat Tokens",
    input: "Input",
    output: "Output",
    requests: "Requests",

    // PDF Actions & Annotation Overlay
    ask_tutor: "Ask Tutor",
    fit_width: "Fit Width",
    fit_height: "Fit Height",
    zoom_in: "Zoom In",
    zoom_out: "Zoom Out",
    highlight: "Highlight",
    underline: "Underline",
    strikethrough: "Strikethrough",
    sticky_note: "Sticky Note",
    add_annotation_note: "Add note to annotation...",

    // Revision Notebook Sidebar & Header
    built_in_book: "Tutor System Architecture",
    chapters: "Chapters",
    flashcards: "Flashcards",
    concepts: "Concepts",
    notes: "Notes",

    // Analytics Dashboard & Charts
    mastery: "Mastery",
    confidence: "Confidence",
    session_history: "Session History",
    distribution: "Distribution",
    session_cost: "Session Cost",
    insights: "Usage Insights",
    units: "billable units",
  },
  ja: {
    // Navigation & General Tabs
    study: "学習",
    analytics: "分析",
    revision: "復習",
    admin: "管理",

    // General App / Settings Labels
    app_settings: "アプリ設定",
    general: "一般",
    usage: "利用状況",
    persona_studio: "AI ペルソナ設定",
    learner_name: "学習者の名前",
    openrouter_key: "OpenRouter API キー",
    serper_key: "Serper API キー",
    tts_voice: "TTS 音声選択",
    ai_model: "AI モデル",
    ui_animations: "UI アニメーション & トランジション",
    language: "言語設定",
    save_changes: "変更を保存",
    cancel: "キャンセル",

    // Chat Panel & Placeholders
    ask_question_placeholder: "ドキュメントについて質問する...",
    thinking_process: "思考プロセス",
    ai_tutor: "AI チューター",
    clear_history: "履歴をクリア",
    chat_tokens: "チャットトークン",
    input: "インプット",
    output: "アウトプット",
    requests: "リクエスト数",

    // PDF Actions & Annotation Overlay
    ask_tutor: "チューターに聞く",
    fit_width: "幅に合わせる",
    fit_height: "高さに合わせる",
    zoom_in: "拡大",
    zoom_out: "縮小",
    highlight: "ハイライト",
    underline: "下線",
    strikethrough: "打ち消し線",
    sticky_note: "付箋",
    add_annotation_note: "ノートを追加...",

    // Revision Notebook Sidebar & Header
    built_in_book: "チューターシステム設計書",
    chapters: "チャプター",
    flashcards: "単語カード",
    concepts: "主要概念",
    notes: "学習ノート",

    // Analytics Dashboard & Charts
    mastery: "習熟度",
    confidence: "自信度",
    session_history: "セッション履歴",
    distribution: "分布状況",
    session_cost: "セッション費用",
    insights: "利用状況の統計分析",
    units: "課金対象時間（秒）",
  },
  ko: {
    // Navigation & General Tabs
    study: "학습",
    analytics: "분석",
    revision: "복습",
    admin: "관리",

    // General App / Settings Labels
    app_settings: "앱 설정",
    general: "일반",
    usage: "사용량",
    persona_studio: "AI 페르소나 설정",
    learner_name: "학습자 이름",
    openrouter_key: "OpenRouter API 키",
    serper_key: "Serper API 키",
    tts_voice: "TTS 음성 선택",
    ai_model: "AI 모델",
    ui_animations: "UI 애니메이션 및 트랜지션",
    language: "언어 설정",
    save_changes: "변경사항 저장",
    cancel: "취소",

    // Chat Panel & Placeholders
    ask_question_placeholder: "문서에 대해 질문하기...",
    thinking_process: "사고 프로세스",
    ai_tutor: "AI 튜터",
    clear_history: "대화 기록 삭제",
    chat_tokens: "채팅 토큰",
    input: "입력",
    output: "출력",
    requests: "요청 횟수",

    // PDF Actions & Annotation Overlay
    ask_tutor: "튜터에게 질문",
    fit_width: "너비 맞춤",
    fit_height: "높이 맞춤",
    zoom_in: "확대",
    zoom_out: "축소",
    highlight: "하이라이트",
    underline: "밑줄",
    strikethrough: "취소선",
    sticky_note: "메모",
    add_annotation_note: "메모 추가...",

    // Revision Notebook Sidebar & Header
    built_in_book: "튜터 시스템 아키텍처",
    chapters: "단원 리스트",
    flashcards: "플래시 카드",
    concepts: "핵심 개념",
    notes: "학습 메모",

    // Analytics Dashboard & Charts
    mastery: "숙련도",
    confidence: "신뢰도",
    session_history: "세션 내역",
    distribution: "학습 분포",
    session_cost: "세션 비용",
    insights: "사용량 통계",
    units: "과금 시간 (초)",
  },
};

export function useTranslation() {
  const language = (useStore((state) => state.language) as Language) || "en";
  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key] || key;
  };
  return { t, language };
}

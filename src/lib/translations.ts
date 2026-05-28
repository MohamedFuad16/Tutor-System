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

    // Study View Cards & Hero
    study_hero_1: "Learning, redefined. Extract profound insights from any document.",
    study_card_tutor_title: "Interactive Tutor",
    study_card_tutor_subtitle: "Chat with your document and test your knowledge.",
    study_card_graph_title: "Knowledge Graph",
    study_card_graph_subtitle: "Visualize how concepts connect across all your documents.",
    study_card_upload_title: "Upload Document",
    study_card_upload_subtitle: "Drag & drop your PDF here to begin learning.",
    study_scroll_text_2: "Map complex concepts into your personalized brain graph.",
    study_scroll_text_3: "Upload your first document to retain knowledge forever.",
    tutor_minimized: "Tutor minimized",
    tutor_minimized_desc: "Open without resizing the document.",
    open: "Open",
    replace: "Replace",
    scroll: "Scroll",

    // Analytics View Detailed Labels
    cognitive_analytics: "Cognitive Analytics",
    visualizing_learning_memory: "Visualizing your learning memory and retention over time.",
    total_concepts: "Total Concepts",
    total_concepts_desc: "The number of unique academic concepts you have extracted and studied across all documents.",
    interactions: "Interactions",
    interactions_desc: "The total number of messages and voice queries you have exchanged with the AI Tutor.",
    study_sessions: "Study Sessions",
    study_sessions_desc: "Distinct study periods you have completed, tracking your cognitive load over time.",
    concept_mastery_levels: "Concept Mastery Levels",
    mastery_distribution: "Mastery Distribution",
    mastery_distribution_desc: "Shows how many concepts are fully Mastered (Blue), currently being Learned (Purple), or are New/Needs Review (Orange).",
    mastered: "Mastered",
    learning: "Learning",
    new: "New",
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

    // Study View Cards & Hero
    study_hero_1: "学習を再定義。ドキュメントから深い洞察を抽出します。",
    study_card_tutor_title: "インタラクティブ チューター",
    study_card_tutor_subtitle: "ドキュメントについてチャットし、知識をテストします。",
    study_card_graph_title: "ナレッジグラフ",
    study_card_graph_subtitle: "すべてのドキュメント間で概念がどのように接続しているかを視覚化します。",
    study_card_upload_title: "ドキュメントをアップロード",
    study_card_upload_subtitle: "ここにPDFをドラッグ＆ドロップして学習を開始します。",
    study_scroll_text_2: "複雑な概念をあなた専用のブレイングラフにマッピングします。",
    study_scroll_text_3: "最初のドキュメントをアップロードして、知識を永久に保持しましょう。",
    tutor_minimized: "チューターを最小化しました",
    tutor_minimized_desc: "ドキュメントのサイズを変更せずに開きます。",
    open: "開く",
    replace: "置き換える",
    scroll: "スクロール",

    // Analytics View Detailed Labels
    cognitive_analytics: "認知機能分析",
    visualizing_learning_memory: "学習記憶の推移と定着状況を視覚化します。",
    total_concepts: "総概念数",
    total_concepts_desc: "これまでにすべてのドキュメントから抽出して学習した、独自の学術的概念の数です。",
    interactions: "対話数",
    interactions_desc: "AI チューターとやり取りしたメッセージおよび音声クエリの総数です。",
    study_sessions: "学習セッション数",
    study_sessions_desc: "完了した個別の学習期間であり、時間の経過に伴う認知負荷を追跡します。",
    concept_mastery_levels: "概念の習熟度レベル",
    mastery_distribution: "習熟度の分布",
    mastery_distribution_desc: "完全に習得した概念（青）、現在学習中の概念（紫）、新規または復習が必要な概念（オレンジ）の数を示します。",
    mastered: "習得済み",
    learning: "学習中",
    new: "新規",
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

    // Study View Cards & Hero
    study_hero_1: "학습의 재정의. 모든 문서에서 심오한 통찰을 추출해보세요.",
    study_card_tutor_title: "인터랙티브 튜터",
    study_card_tutor_subtitle: "문서에 대해 대화하고 나의 지식을 테스트해보세요.",
    study_card_graph_title: "지식 그래프",
    study_card_graph_subtitle: "모든 문서에 걸쳐 개념들이 어떻게 연결되는지 시각화해보세요.",
    study_card_upload_title: "문서 업로드",
    study_card_upload_subtitle: "학습을 시작하려면 여기에 PDF를 드래그 앤 드롭하세요.",
    study_scroll_text_2: "복잡한 개념들을 나만의 개인화된 두뇌 그래프로 매핑해보세요.",
    study_scroll_text_3: "지식을 영원히 간직할 수 있도록 첫 문서를 업로드해보세요.",
    tutor_minimized: "튜터 최소화됨",
    tutor_minimized_desc: "문서 크기 조절 없이 대화창 열기.",
    open: "열기",
    replace: "교체",
    scroll: "스크롤",

    // Analytics View Detailed Labels
    cognitive_analytics: "인지 분석",
    visualizing_learning_memory: "시간 경과에 따른 나의 학습 기억과 유지율을 시각화합니다.",
    total_concepts: "총 개념 개수",
    total_concepts_desc: "모든 문서에서 추출하고 학습한 고유한 학술적 개념의 총 개수입니다.",
    interactions: "상호작용 횟수",
    interactions_desc: "AI 튜터와 주고받은 메시지 및 음성 질의의 총 횟수입니다.",
    study_sessions: "학습 세션 수",
    study_sessions_desc: "시간 경과에 따른 인지 부하를 추적하며 완료한 고유 학습 기간입니다.",
    concept_mastery_levels: "개념 숙련도 수준",
    mastery_distribution: "숙련도 분포",
    mastery_distribution_desc: "완전히 마스터한 개념(파란색), 현재 학습 중인 개념(보라색), 새로운 개념 또는 복습이 필요한 개념(오렌지색)의 수를 나타냅니다.",
    mastered: "마스터함",
    learning: "학습 중",
    new: "새로운 개념",
  },
};

export function useTranslation() {
  const language = (useStore((state) => state.language) as Language) || "en";
  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key] || key;
  };
  return { t, language };
}

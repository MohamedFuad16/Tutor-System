export const DEFAULT_LOCAL_LEARNER_USER_ID = "local-default-user";
export const ACTIVE_LOCAL_LEARNER_USER_ID_KEY = "learningai_active_user_id";

const USER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/;

const normalizeUserId = (value: unknown) => {
  const text = String(value || "").trim();
  if (USER_ID_PATTERN.test(text)) return text;
  return "";
};

const createLocalUserId = () => {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `local-${random.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 64)}`;
};

export const getOrCreateLocalLearnerUserId = () => {
  try {
    const stored = normalizeUserId(
      localStorage.getItem(ACTIVE_LOCAL_LEARNER_USER_ID_KEY),
    );
    if (stored) return stored;
    const userId = createLocalUserId();
    localStorage.setItem(ACTIVE_LOCAL_LEARNER_USER_ID_KEY, userId);
    return userId;
  } catch {
    return DEFAULT_LOCAL_LEARNER_USER_ID;
  }
};

export const persistLocalLearnerUserId = (value: unknown) => {
  const userId = normalizeUserId(value) || DEFAULT_LOCAL_LEARNER_USER_ID;
  try {
    localStorage.setItem(ACTIVE_LOCAL_LEARNER_USER_ID_KEY, userId);
  } catch {}
  return userId;
};

export const learnerRequestHeaders = (
  userId: string,
  headers: Record<string, string> = {},
) => ({
  ...headers,
  "X-LearningAI-User-Id": userId,
});

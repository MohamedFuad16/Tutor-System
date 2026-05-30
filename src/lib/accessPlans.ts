export type AccessMode = "user" | "admin";
export type PlanTier = "free" | "plus" | "pro";

export const planOptions: {
  id: PlanTier;
  name: string;
  dailyRequests: number;
  accent: string;
  description: string;
}[] = [
  {
    id: "free",
    name: "Free",
    dailyRequests: 40,
    accent: "#ff6e00",
    description: "Light document study and quick tutor checks.",
  },
  {
    id: "plus",
    name: "Plus",
    dailyRequests: 180,
    accent: "#ff6e00",
    description: "Longer study sessions with more tutor turns.",
  },
  {
    id: "pro",
    name: "Pro",
    dailyRequests: 600,
    accent: "#ff6e00",
    description: "Heavy research, voice, search, and revision work.",
  },
];

export const serviceMilestones = [
  { label: "30 mins", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "3 hrs", minutes: 180 },
];

export const getPlanOption = (tier: PlanTier) =>
  planOptions.find((plan) => plan.id === tier) || planOptions[0];

export const estimateServiceMinutes = ({
  chatRequests,
  webRequests,
  voiceSeconds,
}: {
  chatRequests: number;
  webRequests: number;
  voiceSeconds: number;
}) => {
  const chatMinutes = chatRequests * 6;
  const webMinutes = webRequests * 2;
  const voiceMinutes = voiceSeconds / 60;
  return Math.min(180, Math.max(0, chatMinutes + webMinutes + voiceMinutes));
};

export const formatServiceTime = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) return `${safeMinutes}m`;
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

/**
 * The tutor's face in chat: a libraries.dev bot avatar in the body, face and
 * finish the learner chose in Settings. `working` hops (with a whirl on its
 * spins) while an answer is written, `default` idles once it lands, and
 * `sleeping` means the tutor can't be reached.
 */
import { BotAvatar, type BotAvatarState } from "bot-avatars";
import { useApp, useMotion } from "@/store/app";

export function TutorAvatar({
  state = "default",
  size = 32,
  paused = false,
  theme = "light",
  label,
}: {
  state?: BotAvatarState;
  size?: number;
  /** Hold still (older answers, reduced motion). */
  paused?: boolean;
  theme?: "light" | "dark";
  /** Accessible name; omit when the avatar is decorative next to a visible name. */
  label?: string;
}) {
  const type = useApp((app) => app.tutorAvatar);
  const face = useApp((app) => app.tutorFace);
  const shading = useApp((app) => app.tutorShading);
  const motionOn = useMotion();
  return (
    <BotAvatar
      type={type}
      face={face}
      shading={shading}
      state={state}
      size={size}
      theme={theme}
      whirl={state === "working" ? 1 : 0}
      paused={paused || !motionOn}
      interactive={!paused}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

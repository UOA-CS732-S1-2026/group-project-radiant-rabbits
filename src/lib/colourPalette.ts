export const AVATAR_COLORS = [
  "var(--color-brand-accent)",
  "var(--color-brand-completed)",
  "var(--color-brand-in-progress)",
  "var(--color-brand-todo)",
];

export function getAvatarColorCssVar(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  // The colour is derived from the name instead of random state so fallback
  // avatars stay recognizable across pages and sessions.
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

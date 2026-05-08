// Colour palette and utilities for avatar with no profile picture
export const AVATAR_COLORS = [
  "var(--color-brand-accent)",
  "var(--color-brand-completed)",
  "var(--color-brand-in-progress)",
  "var(--color-brand-todo)",
];

// Hashes a name to consistently return the same colour for the avatar
export function getAvatarColorCssVar(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

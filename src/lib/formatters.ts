export function getInitials(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    // Use first + last name so long middle names do not make avatar initials
    // shift around when a user edits their display name.
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

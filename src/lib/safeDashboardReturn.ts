/**
 * Validates `returnTo` from the query string so we only redirect to same-app
 * dashboard routes (avoids open redirects).
 */
export function safeDashboardReturn(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("..")) return null;
  if (decoded === "/dashboard" || decoded.startsWith("/dashboard/")) {
    return decoded;
  }
  return null;
}

export function joinCreateSwitchGroupHref(returnTo: string | null): string {
  if (!returnTo) return "/join-create-switch-group";
  return `/join-create-switch-group?returnTo=${encodeURIComponent(returnTo)}`;
}

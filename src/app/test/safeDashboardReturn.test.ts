import {
  joinCreateSwitchGroupHref,
  safeDashboardReturn,
} from "@/lib/safeDashboardReturn";

describe("safeDashboardReturn", () => {
  it("returns null for null or empty input", () => {
    expect(safeDashboardReturn(null)).toBeNull();
    expect(safeDashboardReturn("")).toBeNull();
  });

  it("accepts /dashboard exactly", () => {
    expect(safeDashboardReturn("/dashboard")).toBe("/dashboard");
  });

  it("accepts /dashboard/ with subpath", () => {
    expect(safeDashboardReturn("/dashboard/abc123")).toBe("/dashboard/abc123");
    expect(safeDashboardReturn("/dashboard/groups/x")).toBe(
      "/dashboard/groups/x",
    );
  });

  it("decodes URI-encoded safe paths", () => {
    expect(safeDashboardReturn(encodeURIComponent("/dashboard"))).toBe(
      "/dashboard",
    );
  });

  it("returns null on decode failure", () => {
    expect(safeDashboardReturn("%E0%A4%A")).toBeNull();
  });

  it("rejects protocol-relative and non-path prefixes", () => {
    expect(safeDashboardReturn("//evil.example/phish")).toBeNull();
    expect(safeDashboardReturn("https://evil.example")).toBeNull();
    expect(safeDashboardReturn("dashboard")).toBeNull();
  });

  it("rejects path traversal", () => {
    expect(safeDashboardReturn("/dashboard/../admin")).toBeNull();
    expect(safeDashboardReturn("/dashboard/../../../etc/passwd")).toBeNull();
  });

  it("rejects non-dashboard same-origin-looking paths", () => {
    expect(safeDashboardReturn("/current-sprint")).toBeNull();
    expect(safeDashboardReturn("/join-create-switch-group")).toBeNull();
    expect(safeDashboardReturn("/dashboard-backup")).toBeNull();
  });
});

describe("joinCreateSwitchGroupHref", () => {
  it("returns bare path when returnTo is null", () => {
    expect(joinCreateSwitchGroupHref(null)).toBe("/join-create-switch-group");
  });

  it("appends encoded returnTo when present", () => {
    expect(joinCreateSwitchGroupHref("/dashboard")).toBe(
      "/join-create-switch-group?returnTo=%2Fdashboard",
    );
    expect(joinCreateSwitchGroupHref("/dashboard/team-1")).toBe(
      "/join-create-switch-group?returnTo=%2Fdashboard%2Fteam-1",
    );
  });
});

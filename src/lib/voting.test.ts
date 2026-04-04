import { describe, expect, it } from "vitest";
import {
  formatCompactCount,
  formatSupportPercent,
  propositionIdFromParts,
  propositionPathFromParts,
  selectAiDraftSourcePropositions,
  type PropositionHistoryItem,
} from "@/lib/voting";

describe("voting helpers", () => {
  it("creates stable proposition ids and paths from jurisdiction and slug", () => {
    expect(propositionIdFromParts("campus", "transparent-department-budgets")).toBe("campus:transparent-department-budgets");
    expect(propositionPathFromParts("campus", "transparent-department-budgets")).toBe("/campus/transparent-department-budgets");
  });

  it("formats support and turnout values for the UI", () => {
    expect(formatSupportPercent(null)).toBe("--");
    expect(formatSupportPercent(72.444)).toBe("72.4%");
    expect(formatCompactCount(15320)).toBe("15.3K");
  });

  it("reuses prior closed propositions only when no new closed sources are available", () => {
    const closedHistory: PropositionHistoryItem[] = [
      {
        id: "campus:policy-a",
        slug: "policy-a",
        jurisdictionSlug: "campus",
        path: "/campus/policy-a",
        jurisdiction: "Campus",
        category: "Student life",
        title: "Policy A",
        status: "closed",
        closesAt: "2026-04-01T00:00:00.000Z",
        postedAt: "2026-03-01T00:00:00.000Z",
        sponsor: "Campus",
        supportPercent: 70,
        turnoutCount: 120,
        displayOrder: 1,
        isUserPosted: false,
        personalizationReason: null,
        aiGenerated: false,
        outcome: "APPROVED",
      },
      {
        id: "campus:policy-b",
        slug: "policy-b",
        jurisdictionSlug: "campus",
        path: "/campus/policy-b",
        jurisdiction: "Campus",
        category: "Student life",
        title: "Policy B",
        status: "closed",
        closesAt: "2026-04-01T00:00:00.000Z",
        postedAt: "2026-03-02T00:00:00.000Z",
        sponsor: "Campus",
        supportPercent: 55,
        turnoutCount: 100,
        displayOrder: 2,
        isUserPosted: false,
        personalizationReason: null,
        aiGenerated: false,
        outcome: "APPROVED",
      },
    ];

    expect(selectAiDraftSourcePropositions(closedHistory, 3, ["campus:policy-a", "campus:policy-b"])).toEqual([]);
    expect(
      selectAiDraftSourcePropositions(closedHistory, 3, ["campus:policy-a", "campus:policy-b"], {
        allowReuseWhenEmpty: true,
      }).map((item) => item.id),
    ).toEqual(["campus:policy-a", "campus:policy-b"]);
  });
});

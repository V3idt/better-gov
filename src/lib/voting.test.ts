import { describe, expect, it } from "vitest";
import {
  formatCompactCount,
  formatSupportPercent,
  propositionIdFromParts,
  propositionPathFromParts,
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
});

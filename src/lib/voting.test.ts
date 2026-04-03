import { describe, expect, it } from "vitest";
import { ballotItems } from "@/lib/ballotItems";
import { policyIdForItem, policyStatusFromBallotStatus } from "@/lib/voting";

describe("voting helpers", () => {
  it("creates stable policy ids from jurisdiction and slug", () => {
    const policy = ballotItems[0];

    expect(policyIdForItem(policy)).toBe("campus:transparent-department-budgets");
  });

  it("maps ballot item status to policy status", () => {
    expect(policyStatusFromBallotStatus("Open")).toBe("open");
    expect(policyStatusFromBallotStatus("Closing Soon")).toBe("open");
    expect(policyStatusFromBallotStatus("Draft")).toBe("draft");
  });
});


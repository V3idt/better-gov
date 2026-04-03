import { beforeEach, describe, expect, it } from "vitest";
import { ballotItems } from "@/lib/ballotItems";
import {
  getCurrentSessionPerson,
  getPolicyIdForItem,
  getVotingSnapshot,
  registerPolicyFromItem,
  resetVotingState,
  setPolicyStatus,
  submitVote,
  VotingError,
} from "@/lib/voting";

beforeEach(() => {
  window.localStorage.clear();
  resetVotingState();
});

describe("voting store", () => {
  it("keeps one canonical person with linked verification sources", () => {
    const identity = getCurrentSessionPerson();

    expect(identity.person.id).toBe("person_1");
    expect(identity.identitySources).toHaveLength(3);
    expect(identity.identitySources.map((source) => source.type)).toEqual([
      "student_id",
      "staff_id",
      "email_otp",
    ]);
  });

  it("stores a single vote row per policy and updates it in place", () => {
    const policy = ballotItems[0];
    const policyId = getPolicyIdForItem(policy);

    registerPolicyFromItem(policy);

    const created = submitVote(policyId, "approve");
    const updated = submitVote(policyId, "reject");
    const snapshot = getVotingSnapshot();

    expect(created.action).toBe("created");
    expect(updated.action).toBe("updated");
    expect(snapshot.votes).toHaveLength(1);
    expect(snapshot.votes[0]).toMatchObject({
      policyId,
      personId: "person_1",
      choice: "reject",
    });
    expect(snapshot.votes[0].updatedAt).toBeDefined();
  });

  it("rejects votes for closed policies", () => {
    const policy = ballotItems[1];
    const policyId = getPolicyIdForItem(policy);

    registerPolicyFromItem(policy);
    setPolicyStatus(policyId, "closed");

    expect(() => submitVote(policyId, "approve")).toThrow(VotingError);

    try {
      submitVote(policyId, "approve");
    } catch (error) {
      expect(error).toBeInstanceOf(VotingError);
      expect((error as VotingError).code).toBe("policy_closed");
    }
  });
});


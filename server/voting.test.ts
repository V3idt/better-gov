import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { ballotItems } from "../src/lib/ballotItems.ts";
import { policyIdForItem } from "../src/lib/voting.ts";
import {
  getSession,
  getVoteStatus,
  openVotingDatabase,
  requestSignInCode,
  submitVote,
  verifySignInCode,
  VotingDatabaseError,
} from "./db.ts";

let dbPath = "";
let db: ReturnType<typeof openVotingDatabase>;

beforeEach(() => {
  const tempDir = mkdtempSync(join(tmpdir(), "better-gov-"));
  dbPath = join(tempDir, "better-gov.sqlite");
  db = openVotingDatabase(dbPath);
});

afterEach(() => {
  db.close();
  if (dbPath) {
    rmSync(dirname(dbPath), { recursive: true, force: true });
  }
});

describe("voting database", () => {
  it("keeps anonymous visitors unauthenticated until they verify a university email code", () => {
    const anonymous = getSession(db, null);
    const codeDelivery = requestSignInCode(db, "rahel.bekele@university.edu");
    const verified = verifySignInCode(db, "rahel.bekele@university.edu", codeDelivery.devCode ?? "");
    const authenticated = getSession(db, verified.session.id);

    expect(anonymous.authenticated).toBe(false);
    expect(codeDelivery.devCode).toHaveLength(6);
    expect(verified.person.displayName).toBe("Rahel Bekele");
    expect(authenticated.authenticated).toBe(true);
  });

  it("keeps one vote row per policy for each authenticated account", () => {
    const codeDelivery = requestSignInCode(db, "leila.mekonnen@university.edu");
    const verified = verifySignInCode(db, "leila.mekonnen@university.edu", codeDelivery.devCode ?? "");
    const policyId = policyIdForItem(ballotItems[0]);
    const created = submitVote(db, verified.session.id, policyId, "approve");
    const updated = submitVote(db, verified.session.id, policyId, "reject");
    const voteStatus = getVoteStatus(db, verified.session.id, policyId);
    const voteCount = db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM votes
          WHERE policy_id = ? AND person_id = ?
        `,
      )
      .get(policyId, verified.person.id) as { count: number };

    expect(created.action).toBe("created");
    expect(updated.action).toBe("updated");
    expect(voteStatus.vote?.choice).toBe("reject");
    expect(voteCount.count).toBe(1);
  });

  it("rejects anonymous voting attempts", () => {
    const policyId = policyIdForItem(ballotItems[0]);

    expect(() => submitVote(db, null, policyId, "approve")).toThrow(VotingDatabaseError);
  });

  it("rejects expired or invalid verification codes", () => {
    requestSignInCode(db, "hana.tadesse@university.edu");

    expect(() => verifySignInCode(db, "hana.tadesse@university.edu", "000000")).toThrow(VotingDatabaseError);
  });

  it("rejects empty email requests with a validation error instead of a server crash", () => {
    expect(() => requestSignInCode(db, "")).toThrow(VotingDatabaseError);
  });
});

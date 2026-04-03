import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { ballotItems } from "../src/lib/ballotItems.ts";
import { policyIdForItem } from "../src/lib/voting.ts";
import {
  getResolvedSession,
  getVoteStatus,
  openVotingDatabase,
  submitVote,
  verifyIdentity,
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
  it("bootstraps a demo session when no session cookie is present", () => {
    const resolved = getResolvedSession(db, null);

    expect(resolved.person.id).toBe("person_demo");
    expect(resolved.identitySources).toHaveLength(3);
    expect(resolved.setCookie).toContain("better-gov.session=session_demo");
  });

  it("links verification sources to one person and keeps one vote row per policy", () => {
    const verified = verifyIdentity(
      db,
      {
        studentId: "S-1001",
        staffId: "T-2002",
        emailOtp: "member@university.edu",
      },
      null,
    );

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

    expect(verified.person.primaryRole).toBe("dual");
    expect(verified.identitySources).toHaveLength(3);
    expect(created.action).toBe("created");
    expect(updated.action).toBe("updated");
    expect(voteStatus.vote?.choice).toBe("reject");
    expect(voteCount.count).toBe(1);
  });

  it("rejects votes for closed policies", () => {
    const policyId = policyIdForItem(ballotItems[1]);
    db.prepare(`UPDATE policies SET status = 'closed' WHERE id = ?`).run(policyId);

    expect(() => submitVote(db, null, policyId, "approve")).toThrow(VotingDatabaseError);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  getPropositionDetail,
  getSession,
  listPropositionHistory,
  listPropositions,
  openVotingDatabase,
  requestSignInCode,
  submitVote,
  verifySignInCode,
  VotingDatabaseError,
} from "./db.ts";

let dbPath = "";
let db: ReturnType<typeof openVotingDatabase>;
const configuredDomain = process.env.BETTER_GOV_ALLOWED_EMAIL_DOMAIN ?? "university.edu";
const emailAtConfiguredDomain = (localPart: string) => `${localPart}@${configuredDomain}`;

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
  it("returns open propositions from the backend instead of the static frontend list", () => {
    const list = listPropositions(db);

    expect(list.propositions.length).toBeGreaterThan(0);
    expect(list.propositions.some((item) => item.status === "closed")).toBe(false);
    expect(list.propositions[0]?.path.startsWith("/")).toBe(true);
  });

  it("returns closed propositions through the history query", () => {
    const history = listPropositionHistory(db);

    expect(history.propositions.length).toBeGreaterThan(0);
    expect(history.propositions.every((item) => item.status === "closed")).toBe(true);
  });

  it("keeps anonymous visitors unauthenticated until they verify a university email code", async () => {
    const anonymous = getSession(db, null);
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");
    const authenticated = getSession(db, verified.session.id);

    expect(anonymous.authenticated).toBe(false);
    expect(codeDelivery.devCode).toHaveLength(6);
    expect(verified.person.displayName).toBe("Rahel Bekele");
    expect(authenticated.authenticated).toBe(true);
  });

  it("allows any email under the configured domain during development auth mode", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("bdu1603334"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("bdu1603334"), codeDelivery.devCode ?? "");

    expect(codeDelivery.devCode).toHaveLength(6);
    expect(verified.person.displayName).toBe("Bdu1603334");
    expect(verified.person.primaryRole).toBe("student");
  });

  it("derives proposition support and the current account vote from stored votes", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("leila.mekonnen"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("leila.mekonnen"), codeDelivery.devCode ?? "");
    const propositionId = "campus:transparent-department-budgets";

    submitVote(db, verified.session.id, propositionId, "approve");
    const detail = getPropositionDetail(db, verified.session.id, "/campus/transparent-department-budgets");

    expect(detail.proposition.supportPercent).toBe(100);
    expect(detail.proposition.turnoutCount).toBe(1);
    expect(detail.proposition.voteBreakdown[0]?.count).toBe(1);
    expect(detail.proposition.myVote?.choice).toBe("approve");
  });

  it("rejects anonymous voting attempts", () => {
    expect(() => submitVote(db, null, "campus:transparent-department-budgets", "approve")).toThrow(VotingDatabaseError);
  });

  it("rejects invalid verification codes", async () => {
    await requestSignInCode(db, emailAtConfiguredDomain("hana.tadesse"));

    expect(() => verifySignInCode(db, emailAtConfiguredDomain("hana.tadesse"), "000000")).toThrow(VotingDatabaseError);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  createProposition,
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
const propositionInput = (title: string) => ({
  title,
  category: "Student life",
  scope: "University-wide",
  tldr: "Keep the student center open later on weekdays.",
  bullets: ["Extend access until midnight", "Add security staffing for late hours"],
  brief: "Students need consistent evening study access.\n\nLater hours would reduce crowding and improve access for commuter students.",
  closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
});

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
    const list = listPropositions(db, null);

    expect(list.propositions.length).toBeGreaterThan(0);
    expect(list.propositions.some((item) => item.status === "closed")).toBe(false);
    expect(list.propositions[0]?.path.startsWith("/")).toBe(true);
    expect(list.propositions.some((item) => (item.turnoutCount ?? 0) > 0)).toBe(true);
  });

  it("returns closed propositions through the history query", () => {
    const history = listPropositionHistory(db);

    expect(history.propositions.length).toBeGreaterThan(0);
    expect(history.propositions.every((item) => item.status === "closed")).toBe(true);
    expect(history.propositions.some((item) => item.outcome === "NO_RESULT")).toBe(false);
    expect(history.propositions.every((item) => item.turnoutCount > 0)).toBe(true);
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
    const propositionPath = "/campus/transparent-department-budgets";
    const propositionId = "campus:transparent-department-budgets";
    const beforeVote = getPropositionDetail(db, null, propositionPath);

    submitVote(db, verified.session.id, propositionId, "approve");
    const detail = getPropositionDetail(db, verified.session.id, propositionPath);

    expect(detail.proposition.turnoutCount).toBe(beforeVote.proposition.turnoutCount + 1);
    expect(detail.proposition.voteBreakdown[0]?.count).toBe((beforeVote.proposition.voteBreakdown[0]?.count ?? 0) + 1);
    expect(detail.proposition.myVote?.choice).toBe("approve");
  });

  it("creates an open proposition for an authenticated campus account", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("leila.mekonnen"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("leila.mekonnen"), codeDelivery.devCode ?? "");

    const created = createProposition(db, verified.session.id, propositionInput("Keep The Student Center Open Later"), "127.0.0.1");
    const propositions = listPropositions(db, verified.session.id);
    const createdSummary = propositions.propositions.find((item) => item.id === created.proposition.id);
    const seededSummary = propositions.propositions.find((item) => item.id === "housing:residence-hall-rent-cap");

    expect(created.proposition.title).toBe("Keep The Student Center Open Later");
    expect(created.proposition.status).toBe("open");
    expect(created.proposition.sponsor).toBe("Leila Mekonnen");
    expect(created.proposition.path.startsWith("/campus/keep-the-student-center-open-later")).toBe(true);
    expect(createdSummary?.isUserPosted).toBe(true);
    expect(seededSummary?.isUserPosted).toBe(false);
    expect((createdSummary?.displayOrder ?? 0) > (seededSummary?.displayOrder ?? 0)).toBe(true);
  });

  it("rate limits repeated proposition submissions from the same account", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("samuel.abebe"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("samuel.abebe"), codeDelivery.devCode ?? "");

    createProposition(db, verified.session.id, propositionInput("Proposal One"), "127.0.0.1");
    createProposition(db, verified.session.id, propositionInput("Proposal Two"), "127.0.0.1");
    createProposition(db, verified.session.id, propositionInput("Proposal Three"), "127.0.0.1");

    expect(() =>
      createProposition(db, verified.session.id, propositionInput("Proposal Four"), "127.0.0.1"),
    ).toThrow(VotingDatabaseError);
  });

  it("rejects anonymous voting attempts", () => {
    expect(() => submitVote(db, null, "campus:transparent-department-budgets", "approve")).toThrow(VotingDatabaseError);
  });

  it("rejects anonymous proposition submissions", () => {
    expect(() => createProposition(db, null, propositionInput("Anonymous Proposal"), "127.0.0.1")).toThrow(
      VotingDatabaseError,
    );
  });

  it("rejects invalid verification codes", async () => {
    await requestSignInCode(db, emailAtConfiguredDomain("hana.tadesse"));

    expect(() => verifySignInCode(db, emailAtConfiguredDomain("hana.tadesse"), "000000")).toThrow(VotingDatabaseError);
  });

  it("returns a personalized proposition order and reason for signed-in accounts", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("leila.mekonnen"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("leila.mekonnen"), codeDelivery.devCode ?? "");

    submitVote(db, verified.session.id, "academic-senate:lecture-recording-default", "approve");

    const defaultList = listPropositions(db, verified.session.id, "default");
    const personalizedList = listPropositions(db, verified.session.id, "for_you");

    expect(defaultList.propositions[0]?.id).not.toBe(personalizedList.propositions[0]?.id);
    expect(personalizedList.propositions[0]?.id).toBe("academic-senate:lecture-recording-default");
    expect(personalizedList.propositions[0]?.personalizationReason).toBeTruthy();
  });
});

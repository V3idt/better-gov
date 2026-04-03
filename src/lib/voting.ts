import { ballotItems, type BallotItem, type VoteChoice } from "@/lib/ballotItems";

export type IdentitySourceType = "student_id" | "staff_id" | "email_otp";

export type IdentitySource = {
  type: IdentitySourceType;
  value: string;
  verifiedAt: string;
};

export type Person = {
  id: string;
  displayName: string;
  primaryRole: "student" | "staff" | "dual";
  createdAt: string;
};

export type PolicyStatus = "open" | "closed" | "draft";

export type PolicyRecord = {
  id: string;
  title: string;
  closesAt: string;
  status: PolicyStatus;
  sourcePath: string;
};

export type VoteRecord = {
  id: string;
  policyId: string;
  personId: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  id: string;
  personId: string;
  createdAt: string;
};

export type VotingState = {
  people: Record<string, Person>;
  identityLinks: Record<string, IdentitySource[]>;
  policies: Record<string, PolicyRecord>;
  votes: VoteRecord[];
  session: SessionRecord;
};

export type VoteStatus = {
  person: Person;
  identitySources: IdentitySource[];
  policy: PolicyRecord;
  vote: VoteRecord | null;
};

export type SubmitVoteResult = {
  action: "created" | "updated";
  vote: VoteRecord;
};

export class VotingError extends Error {
  code:
    | "policy_not_found"
    | "policy_closed"
    | "identity_missing"
    | "storage_unavailable"
    | "invalid_state";

  constructor(
    code: VotingError["code"],
    message: string,
  ) {
    super(message);
    this.name = "VotingError";
    this.code = code;
  }
}

const STORAGE_KEY = "better-gov:voting-state";
const SESSION_PERSON_ID = "person_1";

const nowIso = () => new Date().toISOString();

const randomId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `vote_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
};

const policyStatusFromBallotStatus = (status: BallotItem["status"]): PolicyStatus => {
  if (status === "Draft") return "draft";
  return "open";
};

const policyIdForItem = (item: Pick<BallotItem, "jurisdictionSlug" | "slug">) =>
  `${item.jurisdictionSlug}:${item.slug}`;

const seedState = (): VotingState => {
  const createdAt = "2026-04-03T09:00:00.000Z";
  const person: Person = {
    id: SESSION_PERSON_ID,
    displayName: "Verified campus member",
    primaryRole: "dual",
    createdAt,
  };

  const identitySources: IdentitySource[] = [
    { type: "student_id", value: "S-20481", verifiedAt: createdAt },
    { type: "staff_id", value: "T-11804", verifiedAt: createdAt },
    { type: "email_otp", value: "verified@university.edu", verifiedAt: createdAt },
  ];

  return {
    people: { [person.id]: person },
    identityLinks: { [person.id]: identitySources },
    policies: Object.fromEntries(
      ballotItems.map((item) => {
        const id = policyIdForItem(item);

        return [
          id,
          {
            id,
            title: item.title,
            closesAt: item.closesOn,
            status: policyStatusFromBallotStatus(item.status),
            sourcePath: `/${item.jurisdictionSlug}/${item.slug}`,
          } satisfies PolicyRecord,
        ];
      }),
    ),
    votes: [],
    session: {
      id: "session_demo",
      personId: person.id,
      createdAt,
    },
  };
};

const readStorage = (): VotingState => {
  if (typeof window === "undefined") {
    return seedState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const seeded = seedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as VotingState;

    if (!parsed.people || !parsed.identityLinks || !parsed.policies || !parsed.votes || !parsed.session) {
      throw new Error("invalid");
    }

    return parsed;
  } catch {
    const seeded = seedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const writeStorage = (state: VotingState) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetVotingState = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  writeStorage(seedState());
};

export const ensureVotingState = () => {
  const state = readStorage();
  writeStorage(state);
  return state;
};

export const getPolicyIdForItem = (item: Pick<BallotItem, "jurisdictionSlug" | "slug">) =>
  policyIdForItem(item);

export const registerPolicyFromItem = (item: BallotItem) => {
  const state = readStorage();
  const policyId = policyIdForItem(item);

  state.policies[policyId] = {
    id: policyId,
    title: item.title,
    closesAt: item.closesOn,
    status: policyStatusFromBallotStatus(item.status),
    sourcePath: `/${item.jurisdictionSlug}/${item.slug}`,
  };

  writeStorage(state);
  return state.policies[policyId];
};

const requirePolicy = (state: VotingState, policyId: string) => {
  const policy = state.policies[policyId];

  if (!policy) {
    throw new VotingError("policy_not_found", "Policy not found.");
  }

  return policy;
};

const requireSession = (state: VotingState) => {
  const person = state.people[state.session.personId];

  if (!person) {
    throw new VotingError("identity_missing", "No verified person is attached to the current session.");
  }

  return { person, session: state.session };
};

const policyAllowsVoting = (policy: PolicyRecord) => policy.status !== "closed";

export const getVoteStatus = (policyId: string): VoteStatus => {
  const state = readStorage();
  const policy = requirePolicy(state, policyId);
  const { person } = requireSession(state);
  const identitySources = state.identityLinks[person.id] ?? [];
  const vote = state.votes.find((entry) => entry.policyId === policyId && entry.personId === person.id) ?? null;

  return { person, identitySources, policy, vote };
};

export const submitVote = (policyId: string, choice: VoteChoice): SubmitVoteResult => {
  const state = readStorage();
  const policy = requirePolicy(state, policyId);
  const { person } = requireSession(state);

  if (!policyAllowsVoting(policy)) {
    throw new VotingError("policy_closed", "This policy is closed.");
  }

  const timestamp = nowIso();
  const existingIndex = state.votes.findIndex(
    (entry) => entry.policyId === policyId && entry.personId === person.id,
  );

  if (existingIndex >= 0) {
    const nextVote: VoteRecord = {
      ...state.votes[existingIndex],
      choice,
      updatedAt: timestamp,
    };

    state.votes[existingIndex] = nextVote;
    writeStorage(state);
    return { action: "updated", vote: nextVote };
  }

  const vote: VoteRecord = {
    id: randomId(),
    policyId,
    personId: person.id,
    choice,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.votes.push(vote);
  writeStorage(state);
  return { action: "created", vote };
};

export const setPolicyStatus = (policyId: string, status: PolicyStatus) => {
  const state = readStorage();
  const policy = requirePolicy(state, policyId);
  policy.status = status;
  writeStorage(state);
  return policy;
};

export const getCurrentSessionPerson = () => {
  const state = readStorage();
  const { person } = requireSession(state);
  return {
    person,
    identitySources: state.identityLinks[person.id] ?? [],
  };
};

export const getVotingSnapshot = () => readStorage();


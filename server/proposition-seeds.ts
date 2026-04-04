import { ballotItems } from "../src/lib/ballotItems.ts";
import { propositionIdFromParts, propositionPathFromParts, type PropositionReviewCheck } from "../src/lib/voting.ts";

export type SeedProposition = {
  id: string;
  slug: string;
  jurisdictionSlug: string;
  jurisdiction: string;
  category: string;
  title: string;
  status: "open" | "draft" | "closed";
  closesAt: string;
  postedAt: string;
  sponsor: string;
  scope: string;
  tldr: string;
  bullets: string[];
  reviewChecks: PropositionReviewCheck[];
  brief: string;
  displayOrder: number;
  path: string;
  seedVotes?: {
    approve: number;
    reject: number;
    abstain: number;
  };
};

const openPropositions: SeedProposition[] = ballotItems.map((item) => ({
  id: propositionIdFromParts(item.jurisdictionSlug, item.slug),
  slug: item.slug,
  jurisdictionSlug: item.jurisdictionSlug,
  jurisdiction: item.jurisdiction,
  category: item.category,
  title: item.title,
  status: item.status === "Draft" ? "draft" : "open",
  closesAt: new Date(item.closesOn).toISOString(),
  postedAt: new Date(item.postedOn).toISOString(),
  sponsor: item.sponsor,
  scope: item.scope,
  tldr: item.tldr,
  bullets: item.bullets,
  reviewChecks: item.reviewChecks,
  brief: item.brief,
  displayOrder: item.rank,
  path: propositionPathFromParts(item.jurisdictionSlug, item.slug),
}));

const closedPropositions: SeedProposition[] = [
  {
    id: propositionIdFromParts("academic-calendar", "spring-reading-week"),
    slug: "spring-reading-week",
    jurisdictionSlug: "academic-calendar",
    jurisdiction: "Academic Calendar Committee",
    category: "Academic calendar",
    title: "Spring Reading Week",
    status: "closed",
    closesAt: "2026-03-03T18:00:00.000Z",
    postedAt: "2026-02-12T08:00:00.000Z",
    sponsor: "Undergraduate council",
    scope: "Adds a mid-semester reading week to the standard undergraduate spring calendar.",
    tldr: "Students voted on whether the university should add a dedicated spring reading week before final project deadlines intensify.",
    bullets: [
      "Creates one five-day reading break in the spring term.",
      "Requires calendar adjustments to preserve total teaching weeks.",
      "Publishes the revised academic-year calendar one year in advance.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    brief: `# Spring Reading Week

## Purpose

Create a short mid-semester academic break to reduce burnout and compress fewer assessments into the final weeks of term.

## Implementation

- Shift the semester start date slightly earlier.
- Preserve the existing number of teaching weeks.
- Coordinate housing, dining, and transit schedules around the revised calendar.

## Main tradeoff

The university has to rebalance the term timeline without reducing instructional time.`,
    displayOrder: 101,
    path: propositionPathFromParts("academic-calendar", "spring-reading-week"),
    seedVotes: {
      approve: 812,
      reject: 276,
      abstain: 94,
    },
  },
  {
    id: propositionIdFromParts("finance-office", "late-tuition-fee-relief"),
    slug: "late-tuition-fee-relief",
    jurisdictionSlug: "finance-office",
    jurisdiction: "Finance Office",
    category: "Tuition & fees",
    title: "Late Tuition Fee Relief",
    status: "closed",
    closesAt: "2026-02-24T18:00:00.000Z",
    postedAt: "2026-02-01T08:00:00.000Z",
    sponsor: "Fee justice campaign",
    scope: "Creates a hardship-based reduction for late tuition penalties and a plain-language appeals route.",
    tldr: "This proposition asked whether late tuition penalties should be reduced for students facing verified financial disruption.",
    bullets: [
      "Caps first-time late fees for approved hardship cases.",
      "Adds a public appeals process with clear deadlines.",
      "Requires annual reporting on waiver approvals and denials.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "PASS" },
    ],
    brief: `# Late Tuition Fee Relief

## Intent

Reduce disproportionate penalties on students who miss tuition deadlines because of documented financial shocks.

## Core changes

- Hardship-based fee reduction.
- Standard appeal window.
- Public reporting on implementation.

## Constraint

The finance office still needs predictable tuition collection and a narrow fraud surface.`,
    displayOrder: 102,
    path: propositionPathFromParts("finance-office", "late-tuition-fee-relief"),
    seedVotes: {
      approve: 653,
      reject: 301,
      abstain: 88,
    },
  },
  {
    id: propositionIdFromParts("academic-senate", "mandatory-attendance-policy"),
    slug: "mandatory-attendance-policy",
    jurisdictionSlug: "academic-senate",
    jurisdiction: "Academic Senate",
    category: "Academic policy",
    title: "Mandatory Attendance Policy",
    status: "closed",
    closesAt: "2026-02-08T18:00:00.000Z",
    postedAt: "2026-01-19T08:00:00.000Z",
    sponsor: "Attendance reform committee",
    scope: "Would have standardized minimum in-person attendance rules across large undergraduate courses.",
    tldr: "Voters considered whether large courses should be allowed to enforce one common mandatory attendance rule across departments.",
    bullets: [
      "Sets a baseline attendance threshold for course credit.",
      "Requires limited exception handling for illness and hardship.",
      "Publishes department-level enforcement statistics.",
    ],
    reviewChecks: [
      { name: "Rights", status: "WARN" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "PASS" },
    ],
    brief: `# Mandatory Attendance Policy

## Question

Should the university apply one default attendance rule across most large lecture courses?

## Supporters argued

Shared expectations improve consistency and reduce confusion across departments.

## Opponents argued

The rule would punish students with illness, care obligations, and work constraints more than it improves learning.`,
    displayOrder: 103,
    path: propositionPathFromParts("academic-senate", "mandatory-attendance-policy"),
    seedVotes: {
      approve: 284,
      reject: 719,
      abstain: 67,
    },
  },
  {
    id: propositionIdFromParts("technology-services", "campus-wifi-upgrade-fund"),
    slug: "campus-wifi-upgrade-fund",
    jurisdictionSlug: "technology-services",
    jurisdiction: "Technology Services",
    category: "Technology",
    title: "Campus Wi-Fi Upgrade Fund",
    status: "closed",
    closesAt: "2026-01-29T18:00:00.000Z",
    postedAt: "2026-01-10T08:00:00.000Z",
    sponsor: "Digital infrastructure board",
    scope: "Dedicated capital fund for access-point replacement, dead-zone remediation, and uptime monitoring.",
    tldr: "This proposition asked whether the university should create a ring-fenced fund for major campus Wi-Fi upgrades.",
    bullets: [
      "Locks annual capital funds to network reliability upgrades.",
      "Requires dead-zone audits and public uptime reporting.",
      "Prioritizes classrooms, libraries, and residence halls.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "PASS" },
    ],
    brief: `# Campus Wi-Fi Upgrade Fund

## Goal

Move network upgrades out of one-off budgeting and into a predictable funded cycle.

## Includes

- Replacement schedule for aging access points.
- Coverage audits.
- Uptime and performance reporting.

## Tradeoff

The fund competes with other capital priorities in the annual budget.`,
    displayOrder: 104,
    path: propositionPathFromParts("technology-services", "campus-wifi-upgrade-fund"),
    seedVotes: {
      approve: 741,
      reject: 224,
      abstain: 52,
    },
  },
  {
    id: propositionIdFromParts("housing", "residence-hall-guest-curfew"),
    slug: "residence-hall-guest-curfew",
    jurisdictionSlug: "housing",
    jurisdiction: "Campus Housing",
    category: "Campus housing",
    title: "Residence Hall Guest Curfew",
    status: "closed",
    closesAt: "2026-01-11T18:00:00.000Z",
    postedAt: "2025-12-22T08:00:00.000Z",
    sponsor: "Residence operations office",
    scope: "Would have introduced a campus-wide curfew for non-resident guests in university housing.",
    tldr: "Students voted on whether all residence halls should adopt a uniform guest curfew for overnight access.",
    bullets: [
      "Sets one campus-wide guest curfew across halls.",
      "Requires check-in logging and limited exemptions.",
      "Reviews safety incidents after one semester.",
    ],
    reviewChecks: [
      { name: "Rights", status: "FAIL" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "PASS" },
    ],
    brief: `# Residence Hall Guest Curfew

## Intended effect

Create one enforceable nighttime guest rule across university housing.

## Main concern

Residents argued that a universal curfew would interfere with autonomy and disproportionately affect students with non-traditional schedules or family obligations.

## Operational effect

Housing staff would have needed a uniform enforcement workflow and appeal process.`,
    displayOrder: 105,
    path: propositionPathFromParts("housing", "residence-hall-guest-curfew"),
    seedVotes: {
      approve: 198,
      reject: 854,
      abstain: 61,
    },
  },
];

export const propositionSeeds = [...openPropositions, ...closedPropositions];

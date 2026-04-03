export type ReviewStatus = "PASS" | "WARN" | "FAIL";

export type VoteChoice = "approve" | "reject" | "abstain";

export type VoteBreakdown = {
  label: string;
  share: number;
  count: string;
};

export type ReviewCheck = {
  name: string;
  status: ReviewStatus;
};

export type BallotItem = {
  rank: number;
  slug: string;
  jurisdictionSlug: string;
  jurisdiction: string;
  category: string;
  title: string;
  status: "Open" | "Closing Soon" | "Draft";
  support: string;
  turnout: string;
  closesOn: string;
  postedOn: string;
  sponsor: string;
  scope: string;
  tldr: string;
  bullets: string[];
  reviewChecks: ReviewCheck[];
  voteBreakdown: VoteBreakdown[];
  brief: string;
};

export const ballotItems: BallotItem[] = [
  {
    rank: 1,
    slug: "open-budget-ledger",
    jurisdictionSlug: "national",
    jurisdiction: "National",
    category: "Budget & transparency",
    title: "Open Budget Ledger",
    status: "Open",
    support: "71.2%",
    turnout: "2.8M votes",
    closesOn: "May 14, 2026",
    postedOn: "March 28, 2026",
    sponsor: "Citizen petition",
    scope: "Applies to every ministry, agency, and public fund.",
    tldr: "Any budget transfer above a defined threshold should be visible to the public within 48 hours, with source, destination, amount, and justification.",
    bullets: [
      "Creates a searchable public ledger for reallocations, emergency transfers, and off-cycle spending.",
      "Requires machine-readable exports so journalists, researchers, and citizens can audit changes.",
      "Adds a short plain-language explanation for each transfer, not just accounting codes.",
      "Makes late or missing disclosures automatically visible on a public compliance list.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 71.2, count: "1.99M" },
      { label: "Reject", share: 18.6, count: "521K" },
      { label: "Abstain", share: 10.2, count: "286K" },
    ],
    brief: `# Open Budget Ledger

## Why this is on the ballot

Large public spending changes often happen after the main budget vote and become hard for ordinary people to follow.

## What would change

- Every transfer above the reporting threshold appears in a public ledger within 48 hours.
- Each entry must show source account, destination account, amount, and reason.
- The ledger must support search, filtering, and CSV export.

## What stays the same

Departments can still move funds in emergencies, but they lose the ability to do it invisibly.`,
  },
  {
    rank: 2,
    slug: "location-data-warrant-rule",
    jurisdictionSlug: "national",
    jurisdiction: "National",
    category: "Privacy & digital rights",
    title: "Location Data Warrant Rule",
    status: "Open",
    support: "68.4%",
    turnout: "2.1M votes",
    closesOn: "May 09, 2026",
    postedOn: "March 24, 2026",
    sponsor: "Civil liberties coalition",
    scope: "Covers police, tax authorities, regulators, and contracted vendors.",
    tldr: "Government should not be able to buy bulk location data from brokers to bypass warrant requirements.",
    bullets: [
      "Blocks agency procurement of commercially purchased location data tied to individuals or devices.",
      "Requires a court order for targeted access except for narrow emergency exemptions.",
      "Forces public disclosure of existing broker contracts and termination timelines.",
      "Adds penalties for agencies that route purchases through third-party intermediaries.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "PASS" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 68.4, count: "1.44M" },
      { label: "Reject", share: 20.9, count: "439K" },
      { label: "Abstain", share: 10.7, count: "225K" },
    ],
    brief: `# Warrant Rule for Purchased Location Data

## Problem

Data brokers can sell location trails that reveal where people sleep, worship, work, organize, or seek care.

## Proposal

- Public agencies may not purchase or license location data that would otherwise require legal process.
- Existing contracts must be disclosed and sunsetted.
- Emergency use is limited to imminent threats and logged for later review.

## Expected effect

The measure closes a surveillance loophole created by the commercial data market.`,
  },
  {
    rank: 3,
    slug: "universal-school-meals",
    jurisdictionSlug: "state",
    jurisdiction: "State",
    category: "Education & child welfare",
    title: "Universal School Meals",
    status: "Closing Soon",
    support: "64.7%",
    turnout: "1.6M votes",
    closesOn: "April 11, 2026",
    postedOn: "March 17, 2026",
    sponsor: "Parents and teachers initiative",
    scope: "Applies to all state-funded public primary and secondary schools.",
    tldr: "No student should be means-tested or denied a meal during the school day.",
    bullets: [
      "Removes income paperwork and debt collection tied to school meals.",
      "Funds universal breakfast and lunch through the state education budget.",
      "Protects local sourcing targets where feasible without raising student cost.",
      "Requires annual reporting on uptake, nutrition quality, and absenteeism impact.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "PASS" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 64.7, count: "1.03M" },
      { label: "Reject", share: 24.1, count: "386K" },
      { label: "Abstain", share: 11.2, count: "179K" },
    ],
    brief: `# Universal School Meals

## Core idea

Every child in public school receives breakfast and lunch without application forms, debt notices, or stigma.

## Included

- Direct state funding for universal meals.
- Nutrition standards and supplier transparency.
- Reporting on attendance, concentration, and meal participation.

## Tradeoff

The measure expands recurring education spending and requires procurement scaling.`,
  },
  {
    rank: 4,
    slug: "bus-lanes-before-road-widening",
    jurisdictionSlug: "city",
    jurisdiction: "City",
    category: "Transit & streets",
    title: "Bus Lanes Before Road Widening",
    status: "Open",
    support: "58.9%",
    turnout: "842K votes",
    closesOn: "May 22, 2026",
    postedOn: "March 30, 2026",
    sponsor: "Mobility board referral",
    scope: "Applies to all city capital street projects above the planning threshold.",
    tldr: "If the city wants to widen a road, it must first publicly score transit, walking, and safety alternatives.",
    bullets: [
      "Requires an alternatives analysis before road expansion votes can move forward.",
      "Makes bus speed, crash reduction, and access outcomes part of project scoring.",
      "Publishes side-by-side comparisons for public comment before final approval.",
      "Prevents widening-only proposals from skipping transit review.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 58.9, count: "496K" },
      { label: "Reject", share: 29.3, count: "247K" },
      { label: "Abstain", share: 11.8, count: "99K" },
    ],
    brief: `# Bus Lanes Before Road Widening

## Why it matters

Road expansions can lock in expensive car dependence while delaying better transit and safer walking conditions.

## Proposal

- The city must publish an alternatives study before widening roads.
- Transit and pedestrian options must be scored on speed, safety, and access.
- The final vote cannot occur until the comparison is public.

## Result

Residents can judge whether a widening project is actually the best use of public space.`,
  },
  {
    rank: 5,
    slug: "rent-stability-large-landlords",
    jurisdictionSlug: "city",
    jurisdiction: "City",
    category: "Housing",
    title: "Rent Cap for Large Landlords",
    status: "Open",
    support: "61.5%",
    turnout: "1.2M votes",
    closesOn: "May 18, 2026",
    postedOn: "March 22, 2026",
    sponsor: "Tenant assembly",
    scope: "Targets landlords above the unit threshold while exempting small owner-occupied buildings.",
    tldr: "Large landlords should face a cap on annual rent hikes tied to inflation and maintenance exceptions, with stronger disclosure rules for tenants.",
    bullets: [
      "Limits annual increases for covered landlords to a formula tied to inflation.",
      "Requires plain-language notice for any increase, fee change, or exemption claim.",
      "Creates a rapid appeal channel for tenants facing unlawful hikes.",
      "Publishes landlord compliance data by building portfolio.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 61.5, count: "738K" },
      { label: "Reject", share: 27.4, count: "329K" },
      { label: "Abstain", share: 11.1, count: "133K" },
    ],
    brief: `# Rent Stability for Large Landlords

## Intent

The measure tries to slow displacement without applying the same rules to every small property owner.

## Main mechanisms

- Inflation-linked rent cap for covered landlords.
- Stronger tenant notice requirements.
- Appeal process for disputed increases.

## Open implementation question

The enforcement office must be staffed well enough to process complaints quickly.`,
  },
  {
    rank: 6,
    slug: "community-solar-fast-track",
    jurisdictionSlug: "regional",
    jurisdiction: "Regional",
    category: "Energy & environment",
    title: "Fast-Track Public Solar",
    status: "Open",
    support: "73.8%",
    turnout: "917K votes",
    closesOn: "May 27, 2026",
    postedOn: "April 01, 2026",
    sponsor: "Energy transition council",
    scope: "Covers schools, clinics, libraries, and other public facilities in the region.",
    tldr: "Public rooftops should be treated as priority sites for solar and storage, with deadlines for permit decisions and community access where feasible.",
    bullets: [
      "Sets permit turnaround deadlines for public-building solar projects.",
      "Requires an inventory of suitable roofs and underused public land.",
      "Prioritizes battery backup for essential services like clinics and water pumping.",
      "Allows community subscription access when on-site use does not consume all output.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "PASS" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 73.8, count: "677K" },
      { label: "Reject", share: 15.4, count: "141K" },
      { label: "Abstain", share: 10.8, count: "99K" },
    ],
    brief: `# Fast-Track Solar on Public Buildings

## Goal

Public property can cut power costs and strengthen resilience if projects stop getting stuck in slow approvals.

## Includes

- Site inventory.
- Permit deadlines.
- Battery backup for critical services.
- Community access rules where surplus power exists.

## Outcome

The region moves clean-energy projects from aspiration into the normal capital pipeline.`,
  },
  {
    rank: 7,
    slug: "independent-use-of-force-review",
    jurisdictionSlug: "city",
    jurisdiction: "City",
    category: "Safety & justice",
    title: "Independent Force Review Board",
    status: "Closing Soon",
    support: "66.1%",
    turnout: "1.4M votes",
    closesOn: "April 09, 2026",
    postedOn: "March 14, 2026",
    sponsor: "Community accountability petition",
    scope: "Applies to police use-of-force incidents causing serious injury or death.",
    tldr: "Serious force cases should be reviewed by an independent civilian board with subpoena access and public reporting deadlines.",
    bullets: [
      "Creates an external review process independent from the chain of command.",
      "Sets deadlines for public updates and final findings.",
      "Requires anonymized publication of patterns, not just case-by-case summaries.",
      "Includes conflict-of-interest rules for board appointments.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 66.1, count: "925K" },
      { label: "Reject", share: 22.8, count: "319K" },
      { label: "Abstain", share: 11.1, count: "155K" },
    ],
    brief: `# Independent Review for Serious Use of Force

## Problem

Internal investigations often fail to convince the public that accountability is real.

## What this creates

- Civilian review board with subpoena access.
- Public timeline for case updates.
- Pattern reporting across incidents.

## Risk to manage

The board needs operational independence, staffing, and protected access to evidence.`,
  },
  {
    rank: 8,
    slug: "public-childcare-guarantee",
    jurisdictionSlug: "state",
    jurisdiction: "State",
    category: "Care, labor & family policy",
    title: "Public Childcare Guarantee",
    status: "Draft",
    support: "59.4%",
    turnout: "603K votes",
    closesOn: "June 03, 2026",
    postedOn: "April 02, 2026",
    sponsor: "Care economy taskforce",
    scope: "Begins with high-need districts and expands statewide under a published schedule.",
    tldr: "Families should have a guaranteed affordable childcare slot, starting with the highest-need districts and public-provider expansion.",
    bullets: [
      "Creates phased rollout targets with public supply maps and waiting-list data.",
      "Combines direct public provision with capped-fee partner slots.",
      "Raises worker pay floors and training support to reduce staffing shortages.",
      "Requires quarterly public reporting on access, cost, and neighborhood coverage.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 59.4, count: "358K" },
      { label: "Reject", share: 25.6, count: "154K" },
      { label: "Abstain", share: 15.0, count: "91K" },
    ],
    brief: `# Public Childcare Guarantee

## Purpose

Childcare access shapes employment, early childhood development, and household stability.

## Structure

- Phased statewide rollout.
- Public reporting on where slots exist and where they do not.
- Worker pay and training provisions.

## Hard part

This only works if workforce expansion keeps pace with demand.`,
  },
];

export const getBallotItemPath = (item: BallotItem) =>
  `/${item.jurisdictionSlug}/${item.slug}`;

export const findBallotItemByPath = (path: string) => {
  const [jurisdictionSlug, slug] = path.split("/").filter(Boolean);

  return ballotItems.find(
    (item) => item.jurisdictionSlug === jurisdictionSlug && item.slug === slug,
  );
};

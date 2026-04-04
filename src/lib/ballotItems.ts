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
    slug: "transparent-department-budgets",
    jurisdictionSlug: "campus",
    jurisdiction: "University",
    category: "Budget & transparency",
    title: "Transparent Department Budgets",
    status: "Open",
    support: "72.4%",
    turnout: "18.4K votes",
    closesOn: "May 14, 2026",
    postedOn: "March 28, 2026",
    sponsor: "Student assembly",
    scope: "Applies to academic departments, student services, and central administration.",
    tldr: "Department budget changes should be published quickly with plain-language explanations students and staff can actually follow.",
    bullets: [
      "Creates a searchable dashboard for budget updates, transfers, and reserve spending.",
      "Requires short explanations for each change, not just accounting codes.",
      "Publishes machine-readable exports for student groups and campus media.",
      "Flags late or missing disclosures on a public compliance list.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 72.4, count: "13.3K" },
      { label: "Reject", share: 17.8, count: "3.3K" },
      { label: "Abstain", share: 9.8, count: "1.8K" },
    ],
    brief: `# Transparent Department Budgets

## Why this is on the ballot

Students and staff often hear about budget cuts or reallocations after decisions are already made, with little detail on what changed.

## What would change

- Material budget changes must appear on a public dashboard within seven days.
- Each entry must show source, destination, amount, and reason.
- The dashboard must support search, filtering, and CSV export.

## What stays the same

Departments can still move funds in emergencies, but they lose the ability to do it invisibly.`,
  },
  {
    rank: 2,
    slug: "lecture-recording-default",
    jurisdictionSlug: "academic-senate",
    jurisdiction: "Academic Senate",
    category: "Teaching & access",
    title: "Lecture Recording Default",
    status: "Open",
    support: "68.4%",
    turnout: "15.9K votes",
    closesOn: "May 09, 2026",
    postedOn: "March 24, 2026",
    sponsor: "Accessibility coalition",
    scope: "Applies to large lecture courses, with opt-out exceptions for specific pedagogical or privacy reasons.",
    tldr: "Lecture recordings should be the default in major courses so students are not penalized for illness, work, disability, or care responsibilities.",
    bullets: [
      "Makes recording the default for high-enrollment classes.",
      "Requires a clear process for justified exceptions.",
      "Sets minimum retention windows during the term.",
      "Adds captioning requirements for recorded material.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "PASS" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 68.4, count: "10.9K" },
      { label: "Reject", share: 20.9, count: "3.3K" },
      { label: "Abstain", share: 10.7, count: "1.7K" },
    ],
    brief: `# Lecture Recording Default

## Problem

Students miss classes for reasons that are ordinary and unavoidable, but course access still depends heavily on being physically present at one exact time.

## Proposal

- Large lecture courses record by default.
- Exceptions require a written reason and an alternative access plan.
- Recordings remain available for the duration of the term.

## Expected effect

The measure improves access without forcing every instructor into the exact same teaching model.`,
  },
  {
    rank: 3,
    slug: "main-library-24-7",
    jurisdictionSlug: "library",
    jurisdiction: "University Library",
    category: "Library & study space",
    title: "24/7 Main Library",
    status: "Closing Soon",
    support: "64.7%",
    turnout: "14.2K votes",
    closesOn: "April 11, 2026",
    postedOn: "March 17, 2026",
    sponsor: "Library users council",
    scope: "Covers the main library during term time, with exam-period staffing and security plans.",
    tldr: "The main library should stay open 24/7 during the semester so students have a reliable study space regardless of schedule or housing situation.",
    bullets: [
      "Extends access beyond exam week only.",
      "Adds overnight security, custodial coverage, and staffed help hours.",
      "Publishes usage data to reassess after one academic year.",
      "Prioritizes quiet study floors and accessible entrances overnight.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "PASS" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 64.7, count: "9.2K" },
      { label: "Reject", share: 24.1, count: "3.4K" },
      { label: "Abstain", share: 11.2, count: "1.6K" },
    ],
    brief: `# 24/7 Main Library

## Core idea

Students should have at least one predictable, safe place to study at any hour during the semester.

## Included

- Overnight building access.
- Security and staffing plan.
- Annual review of cost and usage.

## Tradeoff

The measure increases recurring staffing and operating costs.`,
  },
  {
    rank: 4,
    slug: "late-night-shuttle-expansion",
    jurisdictionSlug: "campus",
    jurisdiction: "University",
    category: "Transit & safety",
    title: "Late-Night Shuttle Expansion",
    status: "Open",
    support: "58.9%",
    turnout: "11.4K votes",
    closesOn: "May 22, 2026",
    postedOn: "March 30, 2026",
    sponsor: "Night students forum",
    scope: "Adds routes and frequency between campus, residence halls, and major off-campus student neighborhoods.",
    tldr: "Late-night campus shuttles should run more often and cover more student-heavy routes after evening classes and library hours.",
    bullets: [
      "Extends service later into the night on weekdays and weekends.",
      "Adds stops near large off-campus housing clusters.",
      "Publishes wait-time and ridership data by route.",
      "Includes a safety review after the first term.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 58.9, count: "6.7K" },
      { label: "Reject", share: 29.3, count: "3.3K" },
      { label: "Abstain", share: 11.8, count: "1.4K" },
    ],
    brief: `# Late-Night Shuttle Expansion

## Why it matters

Students leaving labs, rehearsals, library floors, or night classes do not all live within a short walk of campus.

## Proposal

- Extend operating hours.
- Increase frequency during peak late-night windows.
- Add service to student-heavy routes currently underserved.

## Result

The campus becomes easier and safer to move through after dark.`,
  },
  {
    rank: 5,
    slug: "residence-hall-rent-cap",
    jurisdictionSlug: "housing",
    jurisdiction: "Campus Housing",
    category: "Housing",
    title: "Better Food",
    status: "Open",
    support: "61.5%",
    turnout: "12.1K votes",
    closesOn: "May 18, 2026",
    postedOn: "March 22, 2026",
    sponsor: "Residence council",
    scope: "Applies to university-operated residence halls and meal-plan bundles tied to housing contracts.",
    tldr: "Residence hall price increases should be capped and justified publicly before the next housing cycle opens.",
    bullets: [
      "Caps annual price increases unless an exception is approved publicly.",
      "Requires plain-language notice before contracts open.",
      "Separates mandatory fee changes from base housing increases.",
      "Publishes hall-by-hall price histories.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 61.5, count: "7.4K" },
      { label: "Reject", share: 27.4, count: "3.3K" },
      { label: "Abstain", share: 11.1, count: "1.4K" },
    ],
    brief: `# Residence Hall Rent Cap

## Intent

The measure tries to slow housing cost growth inside the university's own residential system.

## Main mechanisms

- Cap annual increases.
- Public justification for exceptions.
- Clearer fee breakdowns before students commit.

## Open implementation question

Housing operations need a workable exception process for major maintenance years.`,
  },
  {
    rank: 6,
    slug: "counseling-staff-minimums",
    jurisdictionSlug: "student-services",
    jurisdiction: "Student Services",
    category: "Health & wellbeing",
    title: "Counseling Staff Minimums",
    status: "Open",
    support: "73.8%",
    turnout: "13.7K votes",
    closesOn: "May 27, 2026",
    postedOn: "April 01, 2026",
    sponsor: "Health access coalition",
    scope: "Sets minimum counselor-to-student staffing targets and reporting standards for campus mental health services.",
    tldr: "The university should maintain a published minimum counseling staffing level so students are not waiting weeks for basic mental health support.",
    bullets: [
      "Sets minimum staffing ratios and vacancy reporting.",
      "Publishes average wait times for first appointments.",
      "Requires same-week triage availability during term time.",
      "Adds annual service-access reporting.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "PASS" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 73.8, count: "10.1K" },
      { label: "Reject", share: 15.4, count: "2.1K" },
      { label: "Abstain", share: 10.8, count: "1.5K" },
    ],
    brief: `# Counseling Staff Minimums

## Goal

Campus mental health support should not depend on chronic understaffing and opaque wait lists.

## Includes

- Minimum staffing targets.
- Public wait-time reporting.
- Same-week triage access.
- Annual service review.

## Outcome

The university becomes accountable for whether counseling access is actually improving.`,
  },
  {
    rank: 7,
    slug: "exam-schedule-reform",
    jurisdictionSlug: "faculty",
    jurisdiction: "Faculty Council",
    category: "Academic policy",
    title: "Exam Schedule Reform",
    status: "Closing Soon",
    support: "66.1%",
    turnout: "11.8K votes",
    closesOn: "April 09, 2026",
    postedOn: "March 14, 2026",
    sponsor: "Undergraduate council",
    scope: "Covers final exam spacing, conflict rules, and the number of high-stakes assessments allowed in compressed windows.",
    tldr: "The exam schedule should prevent extreme clustering and require more humane spacing for high-stakes assessments.",
    bullets: [
      "Limits the number of major exams in a 24-hour window.",
      "Creates automatic review triggers for severe clustering.",
      "Strengthens conflict and hardship rescheduling rules.",
      "Requires departments to publish assessment calendars earlier.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "PASS" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 66.1, count: "7.8K" },
      { label: "Reject", share: 22.8, count: "2.7K" },
      { label: "Abstain", share: 11.1, count: "1.3K" },
    ],
    brief: `# Exam Schedule Reform

## Problem

Exam timetables can create avoidable spikes in stress when several major assessments land in the same narrow window.

## What this creates

- Spacing rules for high-stakes assessments.
- Stronger conflict protections.
- Earlier publication of assessment timing.

## Risk to manage

Departments need enough scheduling flexibility to implement the rules without creating new bottlenecks.`,
  },
  {
    rank: 8,
    slug: "one-year-tuition-freeze",
    jurisdictionSlug: "board",
    jurisdiction: "Board of Trustees",
    category: "Tuition & fees",
    title: "One-Year Tuition Freeze",
    status: "Draft",
    support: "59.4%",
    turnout: "9.6K votes",
    closesOn: "June 03, 2026",
    postedOn: "April 02, 2026",
    sponsor: "Fee justice campaign",
    scope: "Applies to base tuition for one academic year while auxiliary fees are disclosed separately.",
    tldr: "Base tuition should be frozen for one academic year while the university publishes a clearer plan for cost control and financial aid.",
    bullets: [
      "Freezes base tuition for one year.",
      "Requires a public breakdown of offsetting cost controls.",
      "Separates tuition, housing, and fee increases in reporting.",
      "Pairs the freeze with a financial-aid impact review.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [
      { label: "Approve", share: 59.4, count: "5.7K" },
      { label: "Reject", share: 25.6, count: "2.5K" },
      { label: "Abstain", share: 15.0, count: "1.4K" },
    ],
    brief: `# One-Year Tuition Freeze

## Purpose

Students need short-term protection from cost increases while the university explains how it plans to control long-term spending.

## Structure

- One-year freeze on base tuition.
- Public cost-control plan.
- Financial-aid review tied to the freeze.

## Hard part

The university still needs a credible answer for costs that continue rising underneath the freeze.`,
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

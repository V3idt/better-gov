import Navbar from "@/components/Navbar";

type ClosedVote = {
  id: number;
  title: string;
  area: string;
  closedOn: string;
  outcome: "APPROVED" | "REJECTED";
  support: string;
  turnout: string;
};

const closedVotes: ClosedVote[] = [
  {
    id: 1,
    title: "Spring Reading Week",
    area: "Academic calendar",
    closedOn: "March 03, 2026",
    outcome: "APPROVED",
    support: "74.8%",
    turnout: "19.2K votes",
  },
  {
    id: 2,
    title: "Late Tuition Fee Relief",
    area: "Tuition & fees",
    closedOn: "February 24, 2026",
    outcome: "APPROVED",
    support: "68.1%",
    turnout: "14.6K votes",
  },
  {
    id: 3,
    title: "Mandatory Attendance Policy",
    area: "Academic policy",
    closedOn: "February 08, 2026",
    outcome: "REJECTED",
    support: "38.7%",
    turnout: "16.8K votes",
  },
  {
    id: 4,
    title: "Campus Wi-Fi Upgrade Fund",
    area: "Technology",
    closedOn: "January 29, 2026",
    outcome: "APPROVED",
    support: "81.3%",
    turnout: "12.4K votes",
  },
  {
    id: 5,
    title: "Residence Hall Guest Curfew",
    area: "Campus housing",
    closedOn: "January 11, 2026",
    outcome: "REJECTED",
    support: "29.4%",
    turnout: "10.7K votes",
  },
];

const outcomeClass = (outcome: ClosedVote["outcome"]) => {
  if (outcome === "APPROVED") return "text-green-500 bg-green-500/10";
  return "text-red-500 bg-red-500/10";
};

const Audits = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <h1 className="mb-4 text-3xl font-semibold text-foreground">Vote History</h1>
        <p className="mb-10 text-muted-foreground">
          Closed votes and their final results.
        </p>

        <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_92px_96px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_120px_120px]">
          <span>#</span>
          <span>Ballot Item</span>
          <span>Result</span>
          <span className="text-right">Support</span>
        </div>

        <div className="divide-y divide-border">
          {closedVotes.map((vote) => (
            <div
              key={vote.id}
              className="grid grid-cols-[32px_minmax(0,1fr)_92px_96px] items-start px-2 py-3.5 sm:grid-cols-[40px_minmax(0,1fr)_120px_120px]"
            >
              <span className="text-sm text-muted-foreground">{vote.id}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="break-words text-sm font-semibold text-foreground">{vote.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {vote.area} / Closed {vote.closedOn} / {vote.turnout}
                  </span>
                </div>
              </div>
              <span className={`w-fit rounded px-2 py-0.5 text-xs font-mono ${outcomeClass(vote.outcome)}`}>
                {vote.outcome}
              </span>
              <span className="text-right font-mono text-sm text-foreground">{vote.support}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Audits;

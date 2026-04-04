import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  listPropositionHistory,
  propositionHistoryQueryKey,
} from "@/lib/voting-api";
import {
  formatSupportPercent,
  formatTurnout,
  type PropositionOutcome,
} from "@/lib/voting";

const outcomeClass = (outcome: PropositionOutcome) => {
  if (outcome === "APPROVED") return "text-green-500 bg-green-500/10";
  if (outcome === "REJECTED") return "text-red-500 bg-red-500/10";
  return "text-amber-500 bg-amber-500/10";
};

const Audits = () => {
  const historyQuery = useQuery({
    queryKey: propositionHistoryQueryKey,
    queryFn: listPropositionHistory,
  });

  const propositions = historyQuery.data?.propositions ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        <h1 className="mb-4 text-3xl font-semibold text-foreground">Vote History</h1>
        <p className="mb-10 text-muted-foreground">Closed propositions and their final results.</p>

        <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_92px_96px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_120px_120px]">
          <span>#</span>
          <span>Proposition</span>
          <span>Result</span>
          <span className="text-right">Support</span>
        </div>

        <div className="divide-y divide-border">
          {historyQuery.isLoading ? (
            <div className="px-2 py-6 text-sm text-muted-foreground">Loading history ...</div>
          ) : historyQuery.isError ? (
            <div className="px-2 py-6 text-sm text-red-500">Could not load proposition history.</div>
          ) : propositions.length === 0 ? (
            <div className="px-2 py-6 text-sm text-muted-foreground">No closed propositions yet.</div>
          ) : (
            propositions.map((proposition, index) => (
              <Link
                key={proposition.id}
                to={proposition.path}
                className="grid grid-cols-[32px_minmax(0,1fr)_92px_96px] items-start px-2 py-3.5 transition-colors hover:bg-secondary/50 sm:grid-cols-[40px_minmax(0,1fr)_120px_120px]"
              >
                <span className="text-sm text-muted-foreground">{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-sm font-semibold text-foreground">{proposition.title}</span>
                      {proposition.aiGenerated ? (
                        <Badge
                          variant="outline"
                          className="border-blue-500/40 bg-blue-500/10 font-mono uppercase tracking-[0.16em] text-blue-400 shadow-[0_0_0_1px_rgba(59,130,246,0.16)]"
                        >
                          AI
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {proposition.category} / Closed {new Date(proposition.closesAt).toLocaleDateString()} / {formatTurnout(proposition.turnoutCount)}
                    </span>
                  </div>
                </div>
                <span className={`w-fit rounded px-2 py-0.5 text-xs font-mono ${outcomeClass(proposition.outcome)}`}>
                  {proposition.outcome}
                </span>
                <span className="text-right font-mono text-sm text-foreground">{formatSupportPercent(proposition.supportPercent)}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Audits;

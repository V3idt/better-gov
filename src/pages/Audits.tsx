import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import {
  aiPolicyBuilderStatusQueryKey,
  getAiPolicyBuilderStatus,
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
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const historyQuery = useQuery({
    queryKey: propositionHistoryQueryKey,
    queryFn: listPropositionHistory,
  });

  const builderQuery = useQuery({
    queryKey: aiPolicyBuilderStatusQueryKey,
    queryFn: getAiPolicyBuilderStatus,
    refetchInterval: 5_000,
  });

  const propositions = historyQuery.data?.propositions ?? [];
  const builderStatus = builderQuery.data;

  const countdownText = (closesAt: string | null) => {
    if (!closesAt) {
      return "Waiting for a free AI slot";
    }

    const diff = Date.parse(closesAt) - currentTime;
    if (Number.isNaN(diff) || diff <= 0) {
      return "Publishing now";
    }

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        <h1 className="mb-4 text-3xl font-semibold text-foreground">Vote History</h1>
        <p className="mb-10 text-muted-foreground">Closed propositions and their final results.</p>

        <Card className="mb-10 border-border bg-secondary/20">
          <CardHeader className="space-y-3 border-b border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-sm uppercase tracking-[0.16em]">AI policy builder</CardTitle>
                <CardDescription className="max-w-2xl leading-relaxed">
                  The server automatically keeps up to two AI-created open policies published at a time and synthesizes the next one from the strongest closed policies.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.16em]">
                Auto publish
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {builderQuery.isLoading ? (
              <div className="rounded border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Loading automatic policy builder status ...
              </div>
            ) : builderQuery.isError ? (
              <div className="rounded border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
                Could not load automatic policy builder status.
              </div>
            ) : builderStatus ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="space-y-3 rounded border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next source policies</p>
                    <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.14em] text-muted-foreground">
                      {builderStatus.nextSourcePropositions.length} selected
                    </Badge>
                  </div>
                  {builderStatus.nextSourcePropositions.length > 0 ? (
                    <div className="space-y-3">
                      {builderStatus.nextSourcePropositions.map((source, index) => (
                        <div key={source.propositionId} className={index > 0 ? "border-t border-border/60 pt-3" : ""}>
                          <p className="break-words text-lg font-semibold text-foreground">{source.title}</p>
                          <p className="text-sm text-muted-foreground">{source.path}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.14em]">
                              {formatSupportPercent(source.supportPercent)}
                            </Badge>
                            <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.14em]">
                              {formatTurnout(source.turnoutCount)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Need at least two closed propositions before the system can synthesize the next AI policy.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active AI policies</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-foreground">{builderStatus.activeCount}</span>
                      <span className="text-sm text-muted-foreground">/ {builderStatus.limit}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {builderStatus.activeCount >= builderStatus.limit
                        ? `Next publish in ${countdownText(builderStatus.nextPublishAt)}.`
                        : "A new AI policy can publish as soon as the next source set is ready."}
                    </p>
                  </div>

                  <div className="rounded border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live slots</p>
                    {builderStatus.activePolicies.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {builderStatus.activePolicies.map((policy) => (
                          <div key={policy.propositionId} className="rounded border border-border/60 bg-secondary/20 p-3">
                            <p className="break-words text-sm font-semibold text-foreground">{policy.title}</p>
                            <p className="text-xs text-muted-foreground">{countdownText(policy.closesAt)} left</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No active AI policies right now.</p>
                    )}
                  </div>

                  {builderStatus.waitingReason ? (
                    <div className="rounded border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500">
                      {builderStatus.waitingReason}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

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

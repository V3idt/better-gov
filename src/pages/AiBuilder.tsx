import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import {
  aiPolicyBuilderStatusQueryKey,
  getAiPolicyBuilderStatus,
} from "@/lib/voting-api";
import {
  formatSupportPercent,
  formatTurnout,
} from "@/lib/voting";

const AiBuilder = () => {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const builderQuery = useQuery({
    queryKey: aiPolicyBuilderStatusQueryKey,
    queryFn: getAiPolicyBuilderStatus,
    refetchInterval: 5_000,
  });

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
    <div className="min-h-screen bg-background font-mono text-foreground">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        <h1 className="mb-4 text-3xl font-semibold text-foreground">AI Suggested Proposition Builder</h1>
        <p className="mb-10 max-w-3xl text-muted-foreground">
          The builder automatically synthesizes new propositions from strong closed results and keeps a limited number of AI-suggested propositions live at one time.
        </p>

        <Card className="border-border bg-secondary/20">
          <CardHeader className="space-y-3 border-b border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-sm uppercase tracking-[0.16em]">AI suggested proposition builder</CardTitle>
                <CardDescription className="max-w-2xl leading-relaxed">
                  The server keeps up to two AI-suggested open propositions published at a time and builds the next one from the strongest closed propositions.
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
                Loading AI suggested proposition builder status ...
              </div>
            ) : builderQuery.isError ? (
              <div className="rounded border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
                Could not load AI suggested proposition builder status.
              </div>
            ) : builderStatus ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="space-y-3 rounded border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next source propositions</p>
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
                      Need at least two closed propositions before the system can synthesize the next AI-suggested proposition.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active AI propositions</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-foreground">{builderStatus.activeCount}</span>
                      <span className="text-sm text-muted-foreground">/ {builderStatus.limit}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {builderStatus.activeCount >= builderStatus.limit
                        ? `Next publish in ${countdownText(builderStatus.nextPublishAt)}.`
                        : "A new AI-suggested proposition can publish as soon as the next source set is ready."}
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
                      <p className="mt-2 text-sm text-muted-foreground">No active AI-suggested propositions right now.</p>
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
      </div>
    </div>
  );
};

export default AiBuilder;

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import AccountDialog from "@/components/AccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import {
  createPropositionAiDraft,
  listPropositionHistory,
  getSession,
  propositionHistoryQueryKey,
  propositionListQueryKey,
  sessionQueryKey,
} from "@/lib/voting-api";
import { formatSupportPercent, formatTurnout, type AiProviderPreference, type PropositionOutcome, VotingApiError } from "@/lib/voting";

const outcomeClass = (outcome: PropositionOutcome) => {
  if (outcome === "APPROVED") return "text-green-500 bg-green-500/10";
  if (outcome === "REJECTED") return "text-red-500 bg-red-500/10";
  return "text-amber-500 bg-amber-500/10";
};

const Audits = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [draftProvider, setDraftProvider] = useState<AiProviderPreference>("auto");

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const historyQuery = useQuery({
    queryKey: propositionHistoryQueryKey,
    queryFn: listPropositionHistory,
  });

  const propositions = historyQuery.data?.propositions ?? [];
  const topSupportedProposition = useMemo(() => {
    if (!propositions.length) {
      return null;
    }

    return [...propositions].sort((left, right) => {
      const leftSupport = left.supportPercent ?? -1;
      const rightSupport = right.supportPercent ?? -1;

      if (rightSupport !== leftSupport) {
        return rightSupport - leftSupport;
      }

      if (right.turnoutCount !== left.turnoutCount) {
        return right.turnoutCount - left.turnoutCount;
      }

      return Date.parse(right.closesAt) - Date.parse(left.closesAt);
    })[0] ?? null;
  }, [propositions]);

  const isAuthenticated = sessionQuery.data?.authenticated === true;

  const draftMutation = useMutation({
    mutationFn: () => {
      if (!topSupportedProposition) {
        throw new Error("No closed proposition is available for drafting.");
      }

      return createPropositionAiDraft(topSupportedProposition.id, {
        provider: draftProvider,
      });
    },
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: propositionListQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionHistoryQueryKey });
      toast.success(`Policy created from ${payload.sourcePropositionTitle}.`);
      navigate(payload.proposition.path);
    },
  });

  const draftErrorMessage =
    draftMutation.error instanceof VotingApiError
      ? draftMutation.error.message
      : draftMutation.error instanceof Error
        ? draftMutation.error.message
        : "";

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <AccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        <h1 className="mb-4 text-3xl font-semibold text-foreground">Vote History</h1>
        <p className="mb-10 text-muted-foreground">Closed propositions and their final results.</p>

        <Card className="mb-10 border-border bg-secondary/20">
          <CardHeader className="space-y-3 border-b border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-sm uppercase tracking-[0.16em]">AI policy builder</CardTitle>
                <CardDescription className="max-w-2xl leading-relaxed">
                  Start from the most-supported closed policy and auto-create a follow-up open policy for the people who supported it.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.16em]">
                Open policy
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {topSupportedProposition ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="space-y-3 rounded border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Source policy</p>
                    <p className="break-words text-lg font-semibold text-foreground">{topSupportedProposition.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {topSupportedProposition.category} / {topSupportedProposition.jurisdiction}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.14em]">
                        {formatSupportPercent(topSupportedProposition.supportPercent)}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.14em]">
                        {formatTurnout(topSupportedProposition.turnoutCount)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Provider</p>
                    <Select value={draftProvider} onValueChange={(value) => setDraftProvider(value as AiProviderPreference)}>
                      <SelectTrigger className="border-border bg-background/60 font-mono text-xs uppercase tracking-[0.16em]">
                        <SelectValue placeholder="Choose provider" />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="grok">Grok</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                      type="button"
                      className="w-full bg-foreground text-background hover:bg-foreground/90"
                      disabled={draftMutation.isPending}
                      onClick={() => {
                        if (!isAuthenticated) {
                          setAccountDialogOpen(true);
                          return;
                        }

                        draftMutation.mutate();
                      }}
                    >
                      {draftMutation.isPending ? "Creating..." : "Generate policy"}
                    </Button>
                  </div>
                </div>

                {draftErrorMessage ? (
                  <div className="rounded border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
                    {draftErrorMessage}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                No closed proposition is available yet for policy generation.
              </div>
            )}
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

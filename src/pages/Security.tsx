import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { getSecurityStatus, securityStatusQueryKey } from "@/lib/voting-api";

const statusClassName = (status: "active" | "warning") =>
  status === "active"
    ? "border-green-500/30 bg-green-500/10 text-green-400"
    : "border-amber-500/30 bg-amber-500/10 text-amber-400";

const Security = () => {
  const securityQuery = useQuery({
    queryKey: securityStatusQueryKey,
    queryFn: getSecurityStatus,
    refetchInterval: 30_000,
  });

  const security = securityQuery.data;
  const metrics = security
    ? [
        { label: "Active roster members", value: security.metrics.activeRosterMembers.toLocaleString() },
        { label: "Active sessions", value: security.metrics.activeSessions.toLocaleString() },
        { label: "Audit events / 24h", value: security.metrics.auditEventsLast24Hours.toLocaleString() },
        { label: "Recorded votes", value: security.metrics.votesRecorded.toLocaleString() },
        { label: "Open propositions", value: security.metrics.openPropositions.toLocaleString() },
        { label: "Closed propositions", value: security.metrics.closedPropositions.toLocaleString() },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background font-mono text-foreground">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        <div className="mb-10 max-w-3xl">
          <h1 className="mb-4 text-3xl font-semibold text-foreground">Security</h1>
          <p className="text-muted-foreground">
            This page reflects live backend controls and deployment warnings. It is meant to show what is actually enforced right now, not what is planned later.
          </p>
        </div>

        {securityQuery.isLoading ? (
          <div className="rounded border border-border bg-secondary/20 px-5 py-4 text-sm text-muted-foreground">
            Loading security status ...
          </div>
        ) : securityQuery.isError || !security ? (
          <div className="rounded border border-red-500/30 bg-red-500/5 px-5 py-4 text-sm text-red-500">
            Could not load security status right now.
          </div>
        ) : (
          <div className="space-y-8">
            <Card className="border-border bg-secondary/20">
              <CardHeader className="space-y-3 border-b border-border p-5">
                <CardTitle className="text-sm uppercase tracking-[0.16em]">Core protections</CardTitle>
                <CardDescription className="max-w-2xl leading-relaxed">
                  Current controls for account verification, vote integrity, session handling, and deployment hardening.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {security.controls.map((control) => (
                  <div
                    key={control.key}
                    className="grid gap-3 border-b border-border/60 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_88px]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm uppercase tracking-[0.14em] text-foreground">{control.label}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{control.detail}</p>
                    </div>
                    <div className="md:justify-self-end">
                      <Badge variant="outline" className={`font-mono uppercase tracking-[0.14em] ${statusClassName(control.status)}`}>
                        {control.status === "active" ? "Active" : "Warn"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {metrics.map((metric) => (
                <Card key={metric.label} className="border-border bg-secondary/20">
                  <CardHeader className="space-y-2 p-5">
                    <CardDescription className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {metric.label}
                    </CardDescription>
                    <CardTitle className="text-2xl text-foreground">{metric.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Card className="border-border bg-secondary/20">
              <CardHeader className="space-y-3 border-b border-border p-5">
                <CardTitle className="text-sm uppercase tracking-[0.16em]">Current policy</CardTitle>
                <CardDescription className="leading-relaxed">
                  Sessions expire after {security.sessionTtlHours} hours of inactivity. Sign-in codes expire after{" "}
                  {security.otpTtlMinutes} minutes and allow {security.otpMaxFailedAttempts} failed attempts. Proposition
                  posting is limited to {security.propositionSubmissionLimitPerPerson} submissions per account and{" "}
                  {security.propositionSubmissionLimitPerIp} per connection in a 24-hour window.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 text-sm text-muted-foreground">
                Generated at {new Date(security.generatedAt).toLocaleString()}.
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;

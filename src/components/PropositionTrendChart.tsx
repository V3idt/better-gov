import { useMemo } from "react";
import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import type { PropositionVoteHistoryPoint } from "@/lib/voting";
import { formatCompactCount } from "@/lib/voting";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type PropositionTrendChartProps = {
  points: PropositionVoteHistoryPoint[];
};

const chartConfig = {
  approveShare: {
    label: "Approve",
    color: "#22c55e",
  },
  rejectShare: {
    label: "Reject",
    color: "#ef4444",
  },
  abstainShare: {
    label: "Abstain",
    color: "#a8a29e",
  },
} as const;

const tickFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const tooltipFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const endLabel =
  (color: string, label: string, lastIndex: number) =>
  ({ x, y, index, value }: { x?: number; y?: number; index?: number; value?: number }) => {
    if (typeof x !== "number" || typeof y !== "number" || typeof index !== "number" || typeof value !== "number" || index !== lastIndex) {
      return null;
    }

    return (
      <text x={x + 10} y={y + 4} fill={color} fontFamily="JetBrains Mono, monospace" fontSize={12}>
        {label} {value.toFixed(1)}%
      </text>
    );
  };

const endDot =
  (color: string) =>
  ({ cx, cy, index, dataLength }: { cx?: number; cy?: number; index?: number; dataLength: number }) => {
    if (typeof cx !== "number" || typeof cy !== "number" || index !== dataLength - 1) {
      return null;
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={11} fill={color} fillOpacity={0.12} />
        <circle cx={cx} cy={cy} r={4.5} fill={color} />
      </g>
    );
  };

const PropositionTrendChart = ({ points }: PropositionTrendChartProps) => {
  const data = useMemo(
    () =>
      points.map((point) => ({
        capturedAt: point.capturedAt,
        approveShare: Number(point.approveShare.toFixed(1)),
        rejectShare: Number(point.rejectShare.toFixed(1)),
        abstainShare: Number(point.abstainShare.toFixed(1)),
        approveCount: point.approveCount,
        rejectCount: point.rejectCount,
        abstainCount: point.abstainCount,
      })),
    [points],
  );
  const lastIndex = data.length - 1;

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-secondary/20 p-5">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Vote Trend</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Not enough vote history has been recorded yet to draw a trend line.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Vote Trend</h3>
          <p className="text-sm text-muted-foreground">Recorded progression of support over time.</p>
        </div>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Approve
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Reject
          </span>
        </div>
      </div>

      <ChartContainer
        config={chartConfig}
        className="h-[240px] w-full [&_.recharts-cartesian-grid-horizontal_line]:stroke-border/40 [&_.recharts-layer.recharts-cartesian-axis-tick]:text-[11px]"
      >
        <LineChart data={data} margin={{ top: 14, right: 92, bottom: 6, left: -12 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <ReferenceLine y={50} stroke="rgba(120,113,108,0.35)" strokeDasharray="2 4" />
          <XAxis
            dataKey="capturedAt"
            tickFormatter={(value) => tickFormatter.format(new Date(value))}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[0, 100]}
            tickCount={5}
            tickFormatter={(value) => `${value}%`}
            tickLine={false}
            axisLine={false}
            orientation="right"
            width={44}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => tooltipFormatter.format(new Date(String(value)))}
                formatter={(value, name, item) => {
                  const countKey =
                    name === "approveShare" ? "approveCount" : name === "rejectShare" ? "rejectCount" : "abstainCount";
                  const count = item.payload?.[countKey];

                  return (
                    <>
                      <div
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {name === "approveShare" ? "Approve" : name === "rejectShare" ? "Reject" : "Abstain"}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {Number(value).toFixed(1)}% / {formatCompactCount(Number(count ?? 0))}
                        </span>
                      </div>
                    </>
                  );
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="approveShare"
            stroke="var(--color-approveShare)"
            strokeWidth={2}
            dot={endDot("#22c55e")}
            activeDot={{ r: 4, fill: "#22c55e", stroke: "#0d0a08", strokeWidth: 2 }}
          >
            <LabelList dataKey="approveShare" content={endLabel("#22c55e", "Approve", lastIndex)} />
          </Line>
          <Line
            type="monotone"
            dataKey="rejectShare"
            stroke="var(--color-rejectShare)"
            strokeWidth={2}
            dot={endDot("#ef4444")}
            activeDot={{ r: 4, fill: "#ef4444", stroke: "#0d0a08", strokeWidth: 2 }}
          >
            <LabelList dataKey="rejectShare" content={endLabel("#ef4444", "Reject", lastIndex)} />
          </Line>
          <Line
            type="monotone"
            dataKey="abstainShare"
            stroke="var(--color-abstainShare)"
            strokeWidth={1.25}
            strokeDasharray="3 4"
            dot={false}
            activeDot={{ r: 3, fill: "#a8a29e", stroke: "#0d0a08", strokeWidth: 2 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
};

export default PropositionTrendChart;

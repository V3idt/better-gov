import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ballotItems, getBallotItemPath } from "@/lib/ballotItems";
import type { ReviewStatus } from "@/lib/ballotItems";

const reviewColor = (status: ReviewStatus) => {
  if (status === "PASS") return "text-green-500";
  if (status === "WARN") return "text-amber-500";
  if (status === "FAIL") return "text-red-500";
  return "text-muted-foreground";
};

const Audits = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <h1 className="text-3xl font-semibold text-foreground mb-4">Public Review Queue</h1>
        <p className="text-muted-foreground mb-10">
          Every ballot item should be reviewed for rights impact, fiscal realism, and delivery risk before or during voting.
        </p>

        {/* Table Header */}
        <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_72px_72px_72px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_120px_120px_120px]">
          <span>#</span>
          <span>Ballot Item</span>
          <span>Rights</span>
          <span>Budget</span>
          <span>Delivery</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {ballotItems.map((item) => (
            <Link
              key={`${item.rank}-${item.slug}`}
              to={getBallotItemPath(item)}
              className="grid grid-cols-[32px_minmax(0,1fr)_72px_72px_72px] items-start px-2 py-3.5 transition-colors hover:bg-secondary/50 group sm:grid-cols-[40px_minmax(0,1fr)_120px_120px_120px]"
            >
              <span className="text-sm text-muted-foreground">{item.rank}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground truncate">{item.jurisdiction} / {item.category}</span>
              </div>
              <span className={`text-xs font-mono ${reviewColor(item.reviewChecks[0].status)}`}>
                <span className="opacity-50 mr-1">▐▌▌</span>{item.reviewChecks[0].status}
              </span>
              <span className={`text-xs font-mono ${reviewColor(item.reviewChecks[1].status)}`}>
                <span className="opacity-50 mr-1">▐▌▌</span>{item.reviewChecks[1].status}
              </span>
              <span className={`text-xs font-mono ${reviewColor(item.reviewChecks[2].status)}`}>
                <span className="opacity-50 mr-1">▐▌▌</span>{item.reviewChecks[2].status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Audits;

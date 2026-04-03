import { Triangle } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
      <Link to="/" className="flex items-center gap-2 text-sm text-foreground">
        <Triangle className="w-4 h-4 fill-foreground" />
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">better-gov</span>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">
          public beta <span className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">LIVE</span>
        </span>
        <Link to="/audits" className="text-muted-foreground hover:text-foreground transition-colors">Review</Link>
        <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
      </div>
    </nav>
  );
};

export default Navbar;

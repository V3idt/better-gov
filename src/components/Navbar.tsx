import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import NavbarAccount from "@/components/NavbarAccount";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
      <Link to="/" className="flex items-center gap-2 text-sm text-foreground">
        <Landmark className="w-4 h-4 text-foreground" strokeWidth={1.75} />
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">better-gov</span>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link to="/audits" className="text-muted-foreground hover:text-foreground transition-colors">History</Link>
        <Link to="/ai-builder" className="text-muted-foreground hover:text-foreground transition-colors">AI Builder</Link>
        <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
        <NavbarAccount />
      </div>
    </nav>
  );
};

export default Navbar;

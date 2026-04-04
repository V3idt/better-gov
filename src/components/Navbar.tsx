import { Link } from "react-router-dom";
import SkillsLogo from "@/components/SkillsLogo";
import NavbarAccount from "@/components/NavbarAccount";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
      <Link to="/" className="flex items-center gap-2 text-sm text-foreground">
        <span className="text-muted-foreground">/</span>
        <div className="w-[170px] sm:w-[220px]">
          <SkillsLogo variant="nav" />
        </div>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link to="/audits" className="text-muted-foreground hover:text-foreground transition-colors">History</Link>
        <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
        <NavbarAccount />
      </div>
    </nav>
  );
};

export default Navbar;

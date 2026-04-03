import { Triangle } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Triangle className="w-4 h-4 fill-foreground" />
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">Skills</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
          Official <span className="ml-1 text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground">NEW</span>
        </a>
        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Audits</a>
        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Docs</a>
      </div>
    </nav>
  );
};

export default Navbar;

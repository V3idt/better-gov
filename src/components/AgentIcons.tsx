import { Bot, Cpu, Code, Terminal, Sparkles, Zap, Brain } from "lucide-react";

const agents = [
  { name: "AMP", icon: Sparkles },
  { name: "Claude Code", icon: Terminal },
  { name: "Cursor", icon: Code },
  { name: "Codex", icon: Cpu },
  { name: "Cline", icon: Bot },
  { name: "Windsurf", icon: Zap },
  { name: "Gemini", icon: Brain },
];

const AgentIcons = () => {
  return (
    <div className="overflow-hidden relative">
      <div className="flex gap-8 animate-marquee">
        {[...agents, ...agents].map((agent, i) => (
          <div
            key={`${agent.name}-${i}`}
            className="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            title={agent.name}
          >
            <agent.icon className="w-6 h-6" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentIcons;

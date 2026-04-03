import {
  Bus,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Shield,
  Wallet,
  Wifi,
} from "lucide-react";

const coverageAreas = [
  { name: "Budget", icon: Wallet },
  { name: "Housing", icon: Landmark },
  { name: "Transit", icon: Bus },
  { name: "Education", icon: GraduationCap },
  { name: "Health", icon: HeartPulse },
  { name: "Safety", icon: Shield },
  { name: "Energy", icon: Leaf },
  { name: "Connectivity", icon: Wifi },
];

const AgentIcons = () => {
  return (
    <div className="overflow-hidden relative">
      <div className="flex gap-8 animate-marquee">
        {[...coverageAreas, ...coverageAreas].map((area, i) => (
          <div
            key={`${area.name}-${i}`}
            className="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            title={area.name}
          >
            <area.icon className="w-6 h-6" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentIcons;

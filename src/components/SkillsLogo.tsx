type SkillsLogoProps = {
  variant?: "hero" | "nav";
};

const WORDMARK = ` _         _   _                            
| |__  ___| |_| |_ ___ _ _ ___ __ _ _____ __
| '_ \\/ -_)  _|  _/ -_) '_|___/ _\` / _ \\ V /
|_.__/\\___|\\__|\\__\\___|_|     \\__, \\___/\\_/ 
                              |___/         `;

const SkillsLogo = ({ variant = "hero" }: SkillsLogoProps) => {
  const isNav = variant === "nav";

  return (
    <div
      className={`relative w-full select-none ${isNav ? "flex items-center justify-start" : "flex items-start justify-center overflow-hidden lg:justify-start"}`}
      aria-label="better-gov"
    >
      <div className="relative w-fit max-w-full">
        <pre
          className={`pointer-events-none whitespace-pre font-mono text-muted-foreground ${
            isNav
              ? "translate-x-px translate-y-px text-[3px] leading-[1] sm:text-[4px]"
              : "translate-x-px translate-y-px text-[4px] leading-[1] sm:text-[5px] md:text-[6px] lg:text-[7px]"
          }`}
        >
          {WORDMARK}
        </pre>
        <pre
          className={`pointer-events-none absolute left-0 top-0 whitespace-pre font-mono text-foreground ${
            isNav
              ? "text-[3px] leading-[1] sm:text-[4px]"
              : "text-[4px] leading-[1] sm:text-[5px] md:text-[6px] lg:text-[7px]"
          }`}
        >
          {WORDMARK}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;

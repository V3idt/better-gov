const SkillsLogo = () => {
  const shadow = `[[ better-gov ]]`;

  const foreground = `<< better-gov >>`;

  return (
    <div className="relative w-full flex items-start justify-center lg:justify-start overflow-hidden select-none" aria-label="BETTER GOV">
      <div className="relative max-w-full overflow-hidden">
        <pre className="text-[20px] lg:text-[28px] tracking-[-0.06em] leading-none text-muted-foreground whitespace-pre font-mono">
          {shadow}
        </pre>
        <pre className="absolute top-0 left-0 text-[20px] lg:text-[28px] tracking-[-0.06em] leading-none text-foreground whitespace-pre font-mono">
          {foreground}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;

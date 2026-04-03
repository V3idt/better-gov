# Agent Instructions

## Core Principles

- **Do things right, not easy** - Prefer scalable, maintainable solutions even if they take more upfront effort.
- **Think about scalability** - Consider how changes will hold up as the project grows.
- **Use existing patterns** - Follow the conventions already established in this codebase before introducing new ones.
- **Commit after every change** - Make small, atomic commits with descriptive messages.
- **Atomic commits must list explicit paths** - For tracked files: `git commit -m "<scoped message>" -- path/to/file1 path/to/file2`. For brand-new files: `git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2`.

## Development Guidelines

- Always use shadcn components from the existing `src/components/ui/` directory first, or add needed components through shadcn when appropriate.
- Avoid creating custom components when existing components or patterns already solve the problem.
- Put shared UI structure in the top-level app shell and shared components so it applies consistently across routes.
- Keep the codebase minimal and intentional. Avoid generic "vibe coded" UI.
- No emojis in code or UI.
- Preserving the existing style, feel, look, and overall UI direction is a hard requirement on every change, not an optional preference.
- Always follow the existing style/UI direction carefully, not just the functionality.
- This UI should stay aligned with the current monochrome, terminal-inspired aesthetic already present in the codebase.
- If you need extra visual guidance for UI work, refer to `skills.sh` as a style reference. In this workspace, that reference lives at `../websites/skills.sh`.

## Project-Specific Notes

- This is a Vite + React + TypeScript application.
- Routing is implemented with `react-router-dom`, with shared app wiring in `src/App.tsx`.
- The project uses TailwindCSS with shadcn/ui components.
- The default visual direction is dark mode, JetBrains Mono, and a restrained grayscale palette.

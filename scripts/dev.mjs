import { spawn } from "node:child_process";

const children = [];
let shuttingDown = false;

const stopAll = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 300);
};

const launch = (command, args, label) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (error) => {
    console.error(`[${label}] failed to start:`, error.message);
    stopAll(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${label}] exited ${signal ? `with signal ${signal}` : `with code ${code ?? 0}`}`);
    stopAll(code ?? 1);
  });

  children.push(child);
  return child;
};

launch("bun", ["--watch", "server/index.ts"], "api");
launch("vite", [], "web");

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));


import { spawn } from "node:child_process";
import net from "node:net";

const children = [];
let shuttingDown = false;
const WEB_PORT = 8080;
const API_PORT = Number(process.env.BETTER_GOV_API_PORT ?? "8787");

const ensurePortAvailable = (port, label) =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      server.close();
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        reject(new Error(`${label} port ${port} is already in use. Stop the existing dev process before starting another one.`));
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve());
    });

    server.listen(port, "127.0.0.1");
  });

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

try {
  await ensurePortAvailable(API_PORT, "API");
  await ensurePortAvailable(WEB_PORT, "Web");
} catch (error) {
  console.error(`[dev] ${error instanceof Error ? error.message : "Required dev port is unavailable."}`);
  process.exit(1);
}

launch("bun", ["--watch", "server/index.ts"], "api");
launch("vite", [], "web");

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

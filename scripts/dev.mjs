import { spawn } from "node:child_process";
import net from "node:net";

const children = [];
let shuttingDown = false;
const DEFAULT_API_PORT = Number(process.env.BETTER_GOV_API_PORT ?? "8787");
const STARTUP_GRACE_MS = 1200;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForExit = (child, timeoutMs) =>
  Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    wait(timeoutMs).then(() => false),
  ]);

const forwardStream = (stream, target) => {
  if (!stream) {
    return;
  }

  stream.on("data", (chunk) => target.write(chunk));
};

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

const attachLifecycleHandlers = (child, label) => {
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
};

const launch = (command, args, label, extraEnv = {}) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  attachLifecycleHandlers(child, label);
  return child;
};

const probeApiPort = async (port) => {
  const child = spawn("bun", ["server/index.ts"], {
    stdio: ["inherit", "pipe", "pipe"],
    env: {
      ...process.env,
      BETTER_GOV_API_PORT: String(port),
    },
  });

  let stderr = "";
  forwardStream(child.stdout, process.stdout);
  child.stderr?.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(chunk);
  });

  const result = await Promise.race([
    wait(STARTUP_GRACE_MS).then(() => ({ status: "running" })),
    new Promise((resolve) => {
      child.once("exit", (code, signal) => resolve({ status: "exit", code, signal }));
      child.once("error", (error) => resolve({ status: "error", error }));
    }),
  ]);

  if (result.status === "running") {
    child.kill("SIGTERM");
    const exited = await waitForExit(child, 500);
    if (!exited) {
      child.kill("SIGKILL");
      await waitForExit(child, 500);
    }

    await wait(100);
    return { ok: true };
  }

  if (result.status === "exit" && stderr.includes("EADDRINUSE")) {
    return { ok: false, reason: "in_use" };
  }

  if (result.status === "error") {
    throw result.error;
  }

  throw new Error(`API failed to start on port ${port}.`);
};

const launchApiWithFallback = async (startPort, attempts = 20) => {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    const probe = await probeApiPort(port);

    if (probe.ok) {
      launch("bun", ["--watch", "server/index.ts"], "api", {
        BETTER_GOV_API_PORT: String(port),
      });
      return port;
    }

    if (probe.reason === "in_use") {
      console.warn(`[dev] port ${port} is busy, trying ${port + 1}.`);
      continue;
    }
  }

  throw new Error(`No available API port found between ${startPort} and ${startPort + attempts - 1}.`);
};

const apiPort = await launchApiWithFallback(DEFAULT_API_PORT);
if (apiPort !== DEFAULT_API_PORT) {
  console.warn(`[dev] using ${apiPort} for the API.`);
}

const sharedEnv = {
  BETTER_GOV_API_PORT: String(apiPort),
};

launch("vite", [], "web", sharedEnv);

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

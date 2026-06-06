#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadAgentConfig, projectRoot } from "./lib/paths.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const linkScript = resolve(scriptsDir, "link-bbuutoonnss.mjs");

function runSync(label, command, args, cwd = projectRoot) {
  console.log(`\n→ ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(`${projectRoot}/node_modules`)) {
  runSync("install rasterscape deps", "npm", ["install"]);
}

runSync("link bbuutoonnss", "node", [linkScript]);

const config = loadAgentConfig();
const viteArgs = ["run", "dev"];
const port = process.env.PORT ?? config?.devServer?.port;

if (port) {
  viteArgs.push("--", "--port", String(port));
}

console.log("\n→ starting vite dev server\n");

const vite = spawn("npm", viteArgs, {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

vite.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => vite.kill("SIGINT"));
process.on("SIGTERM", () => vite.kill("SIGTERM"));

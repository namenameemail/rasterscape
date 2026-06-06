#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadAgentConfig, projectRoot, resolveBbuutoonnssPath } from "./lib/paths.mjs";

function run(command, args, cwd, label) {
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

function ensureBbuutoonnss(libPath, config) {
  if (existsSync(libPath)) {
    return;
  }

  const cloneIfMissing = config?.bbuutoonnss?.cloneIfMissing ?? true;
  if (!cloneIfMissing) {
    console.error(`bbuutoonnss not found at ${libPath}`);
    console.error("Set BBUUTOONNSS_PATH or update .agent/config.json");
    process.exit(1);
  }

  const repo =
    process.env.BBUUTOONNSS_REPO ??
    config?.bbuutoonnss?.repo ??
    "https://github.com/normalblending/bbuutoonnss.git";
  const branch = config?.bbuutoonnss?.branch ?? "master";

  run("git", ["clone", "--branch", branch, "--depth", "1", repo, libPath], projectRoot, "clone bbuutoonnss");
}

function needsInstall(libPath) {
  return !existsSync(`${libPath}/node_modules`);
}

function needsBuild(libPath) {
  return (
    !existsSync(`${libPath}/dist/index.js`) ||
    !existsSync(`${libPath}/dist/bbuutoonnss.css`)
  );
}

const config = loadAgentConfig();
const libPath = resolveBbuutoonnssPath(config);

console.log(`bbuutoonnss path: ${libPath}`);

ensureBbuutoonnss(libPath, config);

if (needsInstall(libPath)) {
  run("npm", ["install"], libPath, "install bbuutoonnss deps");
} else {
  console.log("\n→ bbuutoonnss node_modules present, skipping install");
}

if (needsBuild(libPath)) {
  run("npm", ["run", "build"], libPath, "build bbuutoonnss");
} else {
  console.log("\n→ bbuutoonnss dist present, skipping build");
}

run(
  "npm",
  ["install", "--no-save", "--ignore-scripts", `file:${libPath}`],
  projectRoot,
  "link bbuutoonnss into rasterscape"
);

console.log("\n✓ bbuutoonnss linked");

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptsDir, "../..");
export const agentConfigPath = resolve(projectRoot, ".agent/config.json");

export function loadAgentConfig() {
  if (!existsSync(agentConfigPath)) {
    return {};
  }

  return JSON.parse(readFileSync(agentConfigPath, "utf8"));
}

export function resolveBbuutoonnssPath(config = loadAgentConfig()) {
  const configuredPath =
    process.env.BBUUTOONNSS_PATH ?? config?.bbuutoonnss?.path ?? "../bbuutoonnss";

  return isAbsolute(configuredPath)
    ? configuredPath
    : resolve(projectRoot, configuredPath);
}

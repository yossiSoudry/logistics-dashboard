import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export function loadMockData() {
  return JSON.parse(readFileSync(join(here, "..", "data", "mock-data.json"), "utf8"));
}

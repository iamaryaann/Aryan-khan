import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "dist");
const excluded = new Set([
  ".git",
  "dist",
  "node_modules",
  "netlify",
  "scripts",
  ".gitignore",
  "netlify.toml",
  "package.json",
  "package-lock.json",
  "README.md",
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of await readdir(root)) {
  if (excluded.has(name)) continue;
  await cp(join(root, name), join(output, name), { recursive: true });
}

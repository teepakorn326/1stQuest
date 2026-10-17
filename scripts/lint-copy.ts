/** Fails (exit 1) if banned words appear in app/, components/ or lib/ai/. */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { lintText } from "../lib/copyLint";

const ROOTS = ["app", "components", "lib/ai", "lib/pdf"];
const EXT = /\.(tsx?|jsx?|md|json|css)$/;

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.test(e.name)) yield p;
  }
}

async function main() {
  let failures = 0;
  for (const root of ROOTS) {
  for await (const file of walk(root)) {
    for (const hit of lintText(await readFile(file, "utf8"))) {
      failures++;
      console.error(`${file}:${hit.line}  banned "${hit.label}"  ${hit.text}`);
    }
  }
}
  if (failures) {
    console.error(`\ncopy lint: ${failures} banned word(s). Use "wishes", "moments", "cards", "together". Add // copy-lint-ignore for code identifiers.`);
    process.exit(1);
  }
  console.log("copy lint: clean");
}

void main();

// Banned-word rules for UI copy and AI prompts. Used by scripts/lint-copy.ts and its tests.

export const BANNED: { label: string; re: RegExp }[] = [
  { label: "last", re: /\blast\b/i },
  { label: "remaining", re: /\bremaining\b/i },
  { label: "bucket list", re: /\bbucket[\s-]?list\b/i },
  { label: "deadline", re: /\bdeadlines?\b/i },
  { label: "countdown", re: /\bcount[\s-]?downs?\b/i },
  { label: "streak", re: /\bstreaks?\b/i },
  { label: "x of y", re: /\b\d+\s+of\s+\d+\b|\{[^}]+\}\s+of\s+\{[^}]+\}|\$\{[^}]+\}\s+of\s+\$\{[^}]+\}/i },
];

export const IGNORE_MARKER = "copy-lint-ignore";

export type Hit = { line: number; label: string; text: string };

export function lintText(source: string): Hit[] {
  const hits: Hit[] = [];
  source.split("\n").forEach((text, i) => {
    if (text.includes(IGNORE_MARKER)) return;
    for (const { label, re } of BANNED) {
      if (re.test(text)) hits.push({ line: i + 1, label, text: text.trim() });
    }
  });
  return hits;
}

// Exports the app's word list (site/js/vocab.js, so overrides, removals, and pinyin are included) to a CSV.
//
// Usage: npm run export:csv [-- path/to/output.csv]   (default: exports/vocab.csv)
//
// The CSV is a snapshot for viewing in Excel or Google Sheets, not a source: it isn't committed
// (exports/ is git-ignored). To change words, edit the PDFs or the lists in scripts/import_vocab.py.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TOPICS } from "../site/js/vocab.js";

const COLUMNS = ["topic_id", "topic", "chinese", "pinyin", "english"];

function field(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(topics) {
  const rows = [COLUMNS];
  for (const topic of topics) {
    for (const w of topic.words) rows.push([topic.id, topic.name, w.chinese, w.pinyin, w.english]);
  }
  // A byte-order mark so Excel opens the file as UTF-8 and shows Chinese and tone marks correctly.
  return "﻿" + rows.map((row) => row.map(field).join(",")).join("\r\n") + "\r\n";
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = resolve(process.argv[2] ?? `${root}/exports/vocab.csv`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toCsv(TOPICS));
  const count = TOPICS.reduce((n, t) => n + t.words.length, 0);
  console.log(`Wrote ${count} words in ${TOPICS.length} topic(s) to ${out}`);
}

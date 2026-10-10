import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../../scripts/export_csv.js";
import { TOPICS } from "../../site/js/vocab.js";

test("CSV has a header, a BOM for Excel, and quotes fields containing commas or quotes", () => {
  const csv = toCsv([
    { id: "t", name: "Topic, One", words: [{ chinese: "课程", pinyin: "kè chéng", english: 'a "class"' }] },
  ]);
  assert.ok(csv.startsWith("﻿topic_id,topic,chinese,pinyin,english\r\n"));
  assert.ok(csv.includes('t,"Topic, One",课程,kè chéng,"a ""class"""\r\n'));
});

test("export reflects the app's word list, including overrides and removals", () => {
  const csv = toCsv(TOPICS);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length - 1, TOPICS.reduce((n, t) => n + t.words.length, 0));
  assert.ok(csv.includes("school,School 学校,电脑,diàn nǎo,computer"));
  assert.ok(!csv.includes("数学分析"));
  assert.ok(!csv.includes("Test topic")); // preview-only topic isn't exported
});

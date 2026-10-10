import { test } from "node:test";
import assert from "node:assert/strict";
import { answerVariants } from "../../site/js/answer-rules.js";
import { acceptedAnswers, isAlternateSpelling, isCorrect } from "../../site/js/quiz.js";
import { TOPICS } from "../../site/js/vocab.js";

const school = TOPICS.find((t) => t.id === "school");
const schoolVariants = answerVariants("school");

// Every School word the 学 rule changes, with exactly what it adds. All other School words stay exact.
const SCHOOL_EXTRAS = {
  物理学: ["物理", "物理科学"],
  生物学: ["生物", "生物科学"],
  心理学: ["心理", "心理科学"],
  统计学: ["统计", "统计科学"],
  代数学: ["代数", "代数科学"],
  几何学: ["几何", "几何科学"],
  解剖学: ["解剖", "解剖科学"],
  生理学: ["生理", "生理科学"],
  计算机学: ["计算机", "计算机科学"],
  环境科学: ["环境学"], // the reverse direction
};

test("School: the 学 rule accepts exactly the agreed spellings, and nothing else changes", () => {
  for (const word of school.words) {
    const expected = [word.chinese, ...(SCHOOL_EXTRAS[word.chinese] ?? [])];
    assert.deepEqual(acceptedAnswers(word, school.words, schoolVariants).sort(), expected.sort(), word.chinese);
  }
  for (const listed of Object.keys(SCHOOL_EXTRAS)) {
    assert.ok(school.words.some((w) => w.chinese === listed), `${listed} is no longer a School word`);
  }
});

test("School: teacher exclusions and words the rule must skip stay exact", () => {
  for (const chinese of ["经济学", "社会学", "世界文学", "英国文学", "科学", "数学", "化学", "医学"]) {
    const word = school.words.find((w) => w.chinese === chinese);
    assert.deepEqual(acceptedAnswers(word, school.words, schoolVariants), [chinese]);
  }
});

test("rules only apply to topics that opt in", () => {
  const words = [
    { chinese: "物理学", english: "physics" },
    { chinese: "环境科学", english: "environmental science" },
  ];
  for (const word of words) {
    assert.deepEqual(acceptedAnswers(word, words, answerVariants("family")), [word.chinese]);
    assert.deepEqual(acceptedAnswers(word, words, answerVariants("test")), [word.chinese]);
  }
});

test("a lenient spelling never counts if it's exactly another word in the topic", () => {
  const words = [
    { chinese: "物理学", english: "physics" },
    { chinese: "物理", english: "physical principles" },
  ];
  assert.deepEqual(acceptedAnswers(words[0], words, schoolVariants).sort(), ["物理学", "物理科学"].sort());
});

test("grading and the 'textbook answer' flag", () => {
  const word = school.words.find((w) => w.chinese === "物理学");
  const q = { type: "sa", word, accepted: acceptedAnswers(word, school.words, schoolVariants) };
  assert.ok(isCorrect(q, "物理学") && !isAlternateSpelling(q, "物理学"));
  assert.ok(isCorrect(q, "物理") && isAlternateSpelling(q, "物理"));
  assert.ok(isCorrect(q, " 物理科学。") && isAlternateSpelling(q, "物理科学"));
  assert.ok(!isCorrect(q, "物") && !isAlternateSpelling(q, "物"));
});

test("docs/ANSWER-RULES.md is up to date (run `npm run docs:rules` after changing rules or words)", async () => {
  const { readFileSync } = await import("node:fs");
  const { OUT_FILE, renderTable } = await import("../../scripts/answer_rules_table.js");
  assert.equal(readFileSync(OUT_FILE, "utf8"), renderTable());
});

test("Travel: the teacher's other accepted answers count when typing", () => {
  const travel = TOPICS.find((t) => t.id === "travel");
  const accepts = (chinese) =>
    acceptedAnswers(travel.words.find((w) => w.chinese === chinese), travel.words, answerVariants("travel")).sort();
  assert.deepEqual(accepts("订"), ["订", "预定", "定"].sort());
  assert.deepEqual(accepts("旅馆"), ["旅馆", "酒店"].sort());
  assert.deepEqual(accepts("机票"), ["机票", "飞机票"].sort());
  assert.deepEqual(accepts("游览区"), ["游览区", "景区"].sort());
  assert.deepEqual(accepts("飞行"), ["飞行", "航班"].sort());
  assert.deepEqual(accepts("护照"), ["护照"]); // everything else stays exact

  const word = travel.words.find((w) => w.chinese === "旅馆");
  const q = { type: "sa", word, accepted: accepts("旅馆") };
  assert.ok(isCorrect(q, "酒店") && isAlternateSpelling(q, "酒店")); // feedback shows the textbook answer 旅馆
});

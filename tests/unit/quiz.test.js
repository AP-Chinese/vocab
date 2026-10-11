import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuiz, isCorrect, isPass, normalizeAnswer, percent } from "../../site/js/quiz.js";
import { TOPICS } from "../../site/js/vocab.js";
import { DEV_TOPICS } from "../../site/js/dev-topics.js";

const words = (n) => Array.from({ length: n }, (_, i) => ({ chinese: `词${i}`, english: `word ${i}` }));

test("normalizeAnswer strips whitespace and ASCII/full-width punctuation", () => {
  assert.equal(normalizeAnswer(" 课外 活动。"), "课外活动");
  assert.equal(normalizeAnswer("作业，！？、；：,.!?;:"), "作业");
});

test("every word is asked exactly once", () => {
  const list = words(47);
  const quiz = buildQuiz(list);
  assert.equal(quiz.length, 47);
  assert.deepEqual(new Set(quiz.map((q) => q.word.chinese)), new Set(list.map((w) => w.chinese)));
});

test("half and half, multiple choice gets the extra word", () => {
  for (const [n, mc] of [[40, 20], [41, 21], [47, 24]]) {
    const quiz = buildQuiz(words(n));
    assert.equal(quiz.filter((q) => q.type === "mc").length, mc, `n=${n}`);
    assert.equal(quiz.filter((q) => q.type === "sa").length, n - mc, `n=${n}`);
  }
});

test("multiple choice has 4 distinct options including the answer", () => {
  for (const q of buildQuiz(words(30)).filter((q) => q.type === "mc")) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.word.chinese));
  }
});

test("words sharing an English meaning are never distractors, and both are accepted", () => {
  const list = [...words(10), { chinese: "甲", english: "same" }, { chinese: "乙", english: "same" }];
  for (let i = 0; i < 50; i++) {
    for (const q of buildQuiz(list)) {
      if (q.word.english !== "same") continue;
      if (q.type === "mc") {
        assert.equal(q.options.filter((o) => o === "甲" || o === "乙").length, 1);
      } else {
        assert.ok(isCorrect(q, "甲") && isCorrect(q, "乙"));
      }
    }
  }
});

test("short answer is exact match after normalizing", () => {
  const q = { type: "sa", word: { chinese: "微积分", english: "calculus" }, accepted: ["微积分"] };
  assert.ok(isCorrect(q, "微积分"));
  assert.ok(isCorrect(q, " 微积分。"));
  assert.ok(!isCorrect(q, "微积"));
  assert.ok(!isCorrect(q, "微積分"));
  assert.ok(!isCorrect(q, ""));
});

test("pass threshold is 90% without rounding", () => {
  assert.ok(isPass(9, 10));
  assert.ok(isPass(38, 42)); // 90.47%
  assert.ok(!isPass(37, 42)); // 88.1%
  assert.ok(!isPass(0, 0));
  assert.equal(percent(37, 42), 88);
  assert.equal(percent(42, 42), 100);
});

test("vocab data is well formed", () => {
  assert.ok(TOPICS.length > 0);
  const all = [...TOPICS, ...DEV_TOPICS];
  assert.equal(new Set(all.map((t) => t.id)).size, all.length, "topic IDs must be unique");
  for (const topic of all) {
    assert.match(topic.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${topic.name}: ID must be link-safe`);
    assert.ok(topic.name);
    assert.ok(topic.words.length >= 4, `${topic.name} needs at least 4 words for multiple choice`);
    for (const w of topic.words) {
      assert.ok(w.chinese.trim() && w.english.trim(), JSON.stringify(w));
      // Pinyin has one syllable per character, written with tone marks (no tone numbers).
      assert.equal(w.pinyin.split(" ").length, [...w.chinese].length, `${w.chinese}: pinyin "${w.pinyin}"`);
      assert.doesNotMatch(w.pinyin, /\d/, `${w.chinese}: use tone marks, not numbers`);
    }
    assert.equal(new Set(topic.words.map((w) => w.chinese)).size, topic.words.length, `${topic.name} has duplicate Chinese`);
  }
});

test("each new quiz (e.g. a retake) has a different order and question types", () => {
  const list = TOPICS[0].words;
  const signature = (quiz) => quiz.map((q) => `${q.type}:${q.word.chinese}`).join();
  const first = signature(buildQuiz(list));
  const retakes = Array.from({ length: 5 }, () => signature(buildQuiz(list)));
  assert.ok(retakes.every((r) => r !== first));
});

test("teacher corrections are applied on import", () => {
  const word = (topic, chinese) => TOPICS.find((t) => t.id === topic).words.find((w) => w.chinese === chinese);
  assert.equal(word("family", "祖父").english, "father's father");
  assert.equal(word("transportation", "交通事故").english, "accident");
  // Chinese-side correction: 出租汽车 became 出租车, with pinyin generated for the new word.
  assert.equal(word("transportation", "出租汽车"), undefined);
  assert.deepEqual(word("transportation", "出租车"), { chinese: "出租车", pinyin: "chū zū chē", english: "taxi" });
});

test("teacher's Travel changes: removals, embassy, and the added word", () => {
  const travel = TOPICS.find((t) => t.id === "travel");
  const has = (chinese) => travel.words.some((w) => w.chinese === chinese);
  for (const removed of ["独具匠心", "湖光山色", "依山傍水", "景色如画", "山清水秀", "特快车", "领事馆"]) assert.ok(!has(removed), removed);
  const word = (chinese) => travel.words.find((w) => w.chinese === chinese);
  assert.deepEqual(word("大使馆"), { chinese: "大使馆", pinyin: "dà shǐ guǎn", english: "embassy" });
  assert.deepEqual(word("高铁"), { chinese: "高铁", pinyin: "gāo tiě", english: "high-speed rail" });
});

test("teacher's Transportation changes: idioms removed", () => {
  const transportation = TOPICS.find((t) => t.id === "transportation");
  const has = (chinese) => transportation.words.some((w) => w.chinese === chinese);
  for (const removed of ["畅通无阻", "水泄不通"]) assert.ok(!has(removed), removed);
});

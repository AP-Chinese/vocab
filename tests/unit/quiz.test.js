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

test("teacher's Housing changes: 幼稚园 removed, zoo, freeway; highway", () => {
  const housing = TOPICS.find((t) => t.id === "housing");
  const word = (chinese) => housing.words.find((w) => w.chinese === chinese);
  assert.equal(word("幼稚园"), undefined);
  assert.equal(word("动物园").english, "zoo");
  assert.equal(word("高速公路").english, "freeway; highway");
  assert.equal(word("城市"), undefined); // city and river live in Geography and Climate
  assert.equal(word("河"), undefined);
});

test("teacher's Transportation changes: idioms removed", () => {
  const transportation = TOPICS.find((t) => t.id === "transportation");
  const has = (chinese) => transportation.words.some((w) => w.chinese === chinese);
  for (const removed of ["畅通无阻", "水泄不通"]) assert.ok(!has(removed), removed);
});

test("teacher's Family changes: 亲属 removed, 伯伯, 姑姑 and 姨姨", () => {
  const family = TOPICS.find((t) => t.id === "family");
  const word = (chinese) => family.words.find((w) => w.chinese === chinese);
  for (const removed of ["亲属", "大伯", "姑母", "姨妈"]) assert.equal(word(removed), undefined, removed);
  assert.equal(word("亲戚").english, "relative");
  assert.deepEqual(word("伯伯"), { chinese: "伯伯", pinyin: "bó bo", english: "father's elder brother" });
  assert.deepEqual(word("姑姑"), { chinese: "姑姑", pinyin: "gū gu", english: "father's sister" });
  assert.deepEqual(word("姨姨"), { chinese: "姨姨", pinyin: "yí yi", english: "mother's sister" });
});

test("teacher's Food changes: 老 (tough) removed", () => {
  const food = TOPICS.find((t) => t.id === "food");
  assert.equal(food.words.find((w) => w.chinese === "老"), undefined);
  assert.ok(food.words.some((w) => w.chinese === "嫩")); // its neighbor "tender" stays
});

test("teacher's Sports changes: 橄榄球 is American football", () => {
  const sports = TOPICS.find((t) => t.id === "sports");
  assert.equal(sports.words.find((w) => w.chinese === "橄榄球").english, "American football");
});

test("teacher's Clothing changes: idiom removed", () => {
  const clothing = TOPICS.find((t) => t.id === "clothing");
  assert.ok(!clothing.words.some((w) => w.chinese === "物美价廉"));
  assert.equal(clothing.words.length, 45);
});

test("teacher's Art changes: idiom removed, 美术馆 is art museum", () => {
  const art = TOPICS.find((t) => t.id === "art");
  assert.ok(!art.words.some((w) => w.chinese === "丰富多彩"));
  assert.equal(art.words.find((w) => w.chinese === "美术馆").english, "art museum");
  assert.equal(art.words.length, 36);
});

test("teacher's Festivities changes: idioms and the 前期白怪 typo removed, 服饰 became 服装", () => {
  const festivities = TOPICS.find((t) => t.id === "festivities");
  assert.ok(!festivities.words.some((w) => w.chinese === "服饰"));
  assert.deepEqual(festivities.words.find((w) => w.chinese === "服装"), { chinese: "服装", pinyin: "fú zhuāng", english: "dress and personal adornment" });
  for (const removed of ["五颜六色", "美味佳肴", "前期白怪"]) assert.ok(!festivities.words.some((w) => w.chinese === removed), removed);
  assert.equal(festivities.words.length, 50);
});

test("teacher's Entertainment changes: 艺人 removed, 演员 stays", () => {
  const entertainment = TOPICS.find((t) => t.id === "entertainment");
  assert.ok(!entertainment.words.some((w) => w.chinese === "艺人"));
  assert.ok(entertainment.words.some((w) => w.chinese === "演员"));
  assert.equal(entertainment.words.length, 23);
});

test("teacher's Lifestyle changes: 负责人 became 负责, 习气 became 坏习惯, tired/exhausted words removed", () => {
  const lifestyle = TOPICS.find((t) => t.id === "lifestyle");
  const word = (chinese) => lifestyle.words.find((w) => w.chinese === chinese);
  assert.equal(word("负责人"), undefined);
  assert.deepEqual(word("负责"), { chinese: "负责", pinyin: "fù zé", english: "to take responsibility" });
  assert.equal(word("习气"), undefined);
  assert.equal(word("坏习惯").english, "bad habit; bad practice");
  for (const removed of ["疲惫", "劳累"]) assert.equal(word(removed), undefined, removed);
  assert.equal(word("疲倦").english, "tired");
  assert.equal(lifestyle.words.length, 41);
});

test("teacher's Jobs changes: idiom removed, only 经验 means experience, 利 and 弊 removed", () => {
  const jobs = TOPICS.find((t) => t.id === "jobs");
  const has = (chinese) => jobs.words.some((w) => w.chinese === chinese);
  for (const removed of ["上当受骗", "经历", "体验", "见识", "利", "弊"]) assert.ok(!has(removed), removed);
  assert.ok(has("经验"));
  assert.equal(jobs.words.length, 24);
});

test("teacher's Friendship changes: English uses the same punctuation as other topics", () => {
  const friendship = TOPICS.find((t) => t.id === "friendship");
  for (const w of friendship.words) assert.ok(!/[；，（）：。]/.test(w.english), `${w.chinese}: ${w.english}`);
  assert.equal(friendship.words.find((w) => w.chinese === "了解").english, "to understand; know");
  assert.ok(!friendship.words.some((w) => w.chinese === "温柔")); // combined into 温和
  assert.ok(friendship.words.some((w) => w.chinese === "温和"));
  assert.equal(friendship.words.find((w) => w.chinese === "程度").english, "level (of education, ability)");
  assert.equal(friendship.words.length, 46);
});

test("teacher's Education changes: idioms and five other words removed", () => {
  const education = TOPICS.find((t) => t.id === "education");
  for (const removed of ["死记硬背", "望子成龙", "用心良苦", "填鸭式", "补习班", "启发式", "普及教育", "义务教育"]) assert.ok(!education.words.some((w) => w.chinese === removed), removed);
  assert.equal(education.words.length, 24);
});

test("teacher's School changes: sport is 运动, physical education is 体育, sociology removed", () => {
  const school = TOPICS.find((t) => t.id === "school");
  const word = (chinese) => school.words.find((w) => w.chinese === chinese);
  assert.deepEqual(word("运动"), { chinese: "运动", pinyin: "yùn dòng", english: "sport" });
  assert.equal(word("体育").english, "physical education");
  assert.equal(word("体育教育"), undefined);
  assert.equal(word("社会学"), undefined);
  assert.equal(word("社会学科").english, "social studies");
  assert.equal(school.words.length, 45);
});

test("teacher's Literature and History changes: English uses the same style as other topics", () => {
  const topic = TOPICS.find((t) => t.id === "literature-and-history");
  assert.equal(topic.words.find((w) => w.chinese === "报告文学").english, "reportage");
  for (const w of topic.words) assert.ok(!/[；，（）：。]/.test(w.english), `${w.chinese}: ${w.english}`);
});

test("teacher's Society changes: idioms removed except 重男轻女", () => {
  const society = TOPICS.find((t) => t.id === "society");
  const has = (chinese) => society.words.some((w) => w.chinese === chinese);
  for (const removed of ["贫富不均", "同工同酬"]) assert.ok(!has(removed), removed);
  assert.ok(has("重男轻女"));
  assert.equal(society.words.length, 22);
});

test("teacher's Science and Technology changes: 电子信 became 电子邮件", () => {
  const topic = TOPICS.find((t) => t.id === "science-and-technology");
  const word = (chinese) => topic.words.find((w) => w.chinese === chinese);
  assert.equal(word("电子信"), undefined);
  assert.equal(word("电子邮件").english, "email");
  assert.equal(topic.words.length, 21);
});

test("teacher's Human and Nature changes: 抗议 is just protest", () => {
  const topic = TOPICS.find((t) => t.id === "human-and-nature");
  assert.equal(topic.words.find((w) => w.chinese === "抗议").english, "protest");
});

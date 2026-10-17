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
  美国史: ["美国历史"], // the 史 rule
  世界史: ["世界历史"],
  欧洲史: ["欧洲历史"],
  社会学科: ["社会学"], // the teacher's list
  爵士: ["爵士乐"],
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
  for (const chinese of ["经济学", "世界文学", "英国文学", "科学", "数学", "化学", "医学", "历史"]) {
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

test("Education: the teacher's other accepted answers count when typing", () => {
  const education = TOPICS.find((t) => t.id === "education");
  const accepts = (chinese) =>
    acceptedAnswers(education.words.find((w) => w.chinese === chinese), education.words, answerVariants("education")).sort();
  assert.deepEqual(accepts("方式"), ["方式", "方法"].sort());
  assert.deepEqual(accepts("本领"), ["本领", "能力"].sort());
});

test("Friendship: the teacher's other accepted answers count when typing", () => {
  const friendship = TOPICS.find((t) => t.id === "friendship");
  const accepts = (chinese) =>
    acceptedAnswers(
      friendship.words.find((w) => w.chinese === chinese),
      friendship.words,
      answerVariants("friendship"),
    ).sort();
  const expected = {
    感情: ["感受"],
    争执: ["争吵"],
    急躁: ["不耐烦"],
    沟通: ["交流"],
    性格: ["个性"],
    勤奋: ["努力"],
    兴趣: ["爱好"],
    彼此: ["对方"],
    长相: ["外表", "外貌"],
    温和: ["温柔"],
  };
  for (const [chinese, extra] of Object.entries(expected)) assert.deepEqual(accepts(chinese), [chinese, ...extra].sort(), chinese);
  assert.deepEqual(accepts("幸福"), ["幸福"]); // everything else stays exact
});

test("Housing: the teacher's other accepted answers count when typing", () => {
  const housing = TOPICS.find((t) => t.id === "housing");
  const accepts = (chinese) =>
    acceptedAnswers(housing.words.find((w) => w.chinese === chinese), housing.words, answerVariants("housing")).sort();
  assert.deepEqual(accepts("乡村"), ["乡村", "农村"].sort());
  assert.deepEqual(accepts("优美"), ["优美", "美丽"].sort());
  assert.deepEqual(accepts("海滨"), ["海滨", "海边"].sort());
  assert.deepEqual(accepts("村"), ["村", "村庄"].sort());
  assert.deepEqual(accepts("马路"), ["马路", "路"].sort());
  assert.deepEqual(accepts("住宅区"), ["住宅区", "居民区"].sort());
  assert.deepEqual(accepts("位置"), ["位置", "地点"].sort());
  assert.deepEqual(accepts("剧院"), ["剧院", "剧场"].sort());
  assert.deepEqual(accepts("城市"), ["城市"]); // everything else stays exact
});

test("Transportation: the teacher's other accepted answers count when typing", () => {
  const transportation = TOPICS.find((t) => t.id === "transportation");
  const accepts = (chinese) =>
    acceptedAnswers(
      transportation.words.find((w) => w.chinese === chinese),
      transportation.words,
      answerVariants("transportation"),
    ).sort();
  assert.deepEqual(accepts("交通事故"), ["交通事故", "事故"].sort());
  assert.deepEqual(accepts("交通管理"), ["交通管理", "交通控制"].sort());
  assert.deepEqual(accepts("条件"), ["条件", "情况"].sort());
  assert.deepEqual(accepts("线路"), ["线路", "路线"].sort());
  assert.deepEqual(accepts("状况"), ["状况"]); // everything else stays exact
});

test("Family: the teacher's other accepted answers count when typing", () => {
  const family = TOPICS.find((t) => t.id === "family");
  const accepts = (chinese) =>
    acceptedAnswers(family.words.find((w) => w.chinese === chinese), family.words, answerVariants("family")).sort();
  assert.deepEqual(accepts("祖父"), ["祖父", "爷爷"].sort());
  assert.deepEqual(accepts("祖母"), ["祖母", "奶奶"].sort());
  assert.deepEqual(accepts("外祖父"), ["外祖父", "姥爷", "外公"].sort());
  assert.deepEqual(accepts("外祖母"), ["外祖母", "外婆", "姥姥"].sort());
  assert.deepEqual(accepts("子女"), ["子女", "孩子"].sort());
  assert.deepEqual(accepts("期望"), ["期望", "希望"].sort());
  assert.deepEqual(accepts("夫妇"), ["夫妇", "夫妻"].sort());
  assert.deepEqual(accepts("晚辈"), ["晚辈", "后辈"].sort());
  assert.deepEqual(accepts("母亲"), ["母亲", "妈妈"].sort());
  assert.deepEqual(accepts("父亲"), ["父亲"]); // everything else stays exact
});

test("Food: the teacher's other accepted answers count when typing", () => {
  const food = TOPICS.find((t) => t.id === "food");
  const accepts = (chinese) =>
    acceptedAnswers(food.words.find((w) => w.chinese === chinese), food.words, answerVariants("food")).sort();
  assert.deepEqual(accepts("腻"), ["腻", "油腻"].sort());
  assert.deepEqual(accepts("橙汁"), ["橙汁", "橘子汁"].sort());
  assert.deepEqual(accepts("汉堡包"), ["汉堡包", "汉堡"].sort());
  assert.deepEqual(accepts("好吃"), ["好吃", "美味"].sort());
  assert.deepEqual(accepts("香槟酒"), ["香槟酒", "香槟"].sort());
  assert.deepEqual(accepts("难吃"), ["难吃", "不好吃"].sort());
  assert.deepEqual(accepts("苹果汁"), ["苹果汁"]); // everything else stays exact
});

test("Clothing: the 色 rule and the teacher's other accepted answers count when typing", () => {
  const clothing = TOPICS.find((t) => t.id === "clothing");
  const accepts = (chinese) =>
    acceptedAnswers(clothing.words.find((w) => w.chinese === chinese), clothing.words, answerVariants("clothing")).sort();
  for (const color of ["黄", "绿", "红", "蓝", "灰", "紫", "黑", "白", "粉红"]) {
    assert.deepEqual(accepts(color), [color, `${color}色`].sort(), color);
  }
  assert.deepEqual(accepts("咖啡色"), ["咖啡色", "棕色", "棕"].sort());
  assert.deepEqual(accepts("颜色"), ["颜色"]);
  assert.deepEqual(accepts("衬衫"), ["衬衫", "衬衣"].sort());
  assert.deepEqual(accepts("样式"), ["样式", "风格"].sort());
  assert.deepEqual(accepts("厚薄"), ["厚薄", "厚度"].sort());
  assert.deepEqual(accepts("长短"), ["长短", "长度"].sort());
  assert.deepEqual(accepts("运动服"), ["运动服", "运动衣"].sort());
});

test("Art: the teacher's other accepted answers count when typing", () => {
  const art = TOPICS.find((t) => t.id === "art");
  const accepts = (chinese) =>
    acceptedAnswers(art.words.find((w) => w.chinese === chinese), art.words, answerVariants("art")).sort();
  assert.deepEqual(accepts("舞蹈"), ["舞蹈", "跳舞"].sort());
  assert.deepEqual(accepts("宝贵"), ["宝贵", "宝贵的", "值钱的", "珍贵的"].sort());
  assert.deepEqual(accepts("喜爱"), ["喜爱", "喜欢"].sort());
  assert.deepEqual(accepts("园林"), ["园林", "花园"].sort());
  assert.deepEqual(accepts("演出"), ["演出", "表演"].sort());
  assert.deepEqual(accepts("动画"), ["动画", "卡通"].sort());
  assert.deepEqual(accepts("美术馆"), ["美术馆"]); // everything else stays exact
});

test("Entertainment: the teacher's other accepted answers count when typing", () => {
  const entertainment = TOPICS.find((t) => t.id === "entertainment");
  const accepts = (chinese) =>
    acceptedAnswers(
      entertainment.words.find((w) => w.chinese === chinese),
      entertainment.words,
      answerVariants("entertainment"),
    ).sort();
  assert.deepEqual(accepts("惊险片"), ["惊险片", "探险片"].sort());
  assert.deepEqual(accepts("功夫片"), ["功夫片", "武打片"].sort());
  assert.deepEqual(accepts("卡通片"), ["卡通片", "卡通"].sort());
  assert.deepEqual(accepts("科幻片"), ["科幻片"]); // everything else stays exact
});

test("Festivities: the teacher's other accepted answers count when typing", () => {
  const festivities = TOPICS.find((t) => t.id === "festivities");
  const accepts = (chinese) =>
    acceptedAnswers(festivities.words.find((w) => w.chinese === chinese), festivities.words, answerVariants("festivities")).sort();
  assert.deepEqual(accepts("元宵"), ["元宵", "汤圆"].sort());
  assert.deepEqual(accepts("礼拜"), ["礼拜", "宗教仪式"].sort());
  assert.deepEqual(accepts("故乡"), ["故乡", "家乡"].sort());
  assert.deepEqual(accepts("元宵节"), ["元宵节"]); // everything else stays exact
});

test("Lifestyle: the teacher's other accepted answers count when typing", () => {
  const lifestyle = TOPICS.find((t) => t.id === "lifestyle");
  const accepts = (chinese) =>
    acceptedAnswers(lifestyle.words.find((w) => w.chinese === chinese), lifestyle.words, answerVariants("lifestyle")).sort();
  assert.deepEqual(accepts("人生"), ["人生", "生活"].sort());
  assert.deepEqual(accepts("充足"), ["充足", "足够"].sort());
  assert.deepEqual(accepts("疾病"), ["疾病", "病"].sort());
  assert.deepEqual(accepts("疲倦"), ["疲倦", "累"].sort());
  assert.deepEqual(accepts("充沛"), ["充沛", "精力充沛"].sort());
  assert.deepEqual(accepts("守时"), ["守时", "准时"].sort());
  assert.deepEqual(accepts("危害"), ["危害", "危险"].sort());
  assert.deepEqual(accepts("睡眠"), ["睡眠", "睡觉"].sort());
  assert.deepEqual(accepts("资源"), ["资源", "自然资源"].sort());
  assert.deepEqual(accepts("财富"), ["财富"]); // everything else stays exact
});

test("Jobs: the teacher's other accepted answers count when typing", () => {
  const jobs = TOPICS.find((t) => t.id === "jobs");
  const accepts = (chinese) =>
    acceptedAnswers(jobs.words.find((w) => w.chinese === chinese), jobs.words, answerVariants("jobs")).sort();
  assert.deepEqual(accepts("生活费"), ["生活费", "生活费用"].sort());
  assert.deepEqual(accepts("丰富"), ["丰富", "富有"].sort());
  assert.deepEqual(accepts("实践"), ["实践", "练习"].sort());
  assert.deepEqual(accepts("分忧"), ["分忧", "分担"].sort());
  assert.deepEqual(accepts("接触"), ["接触", "联系"].sort());
  assert.deepEqual(accepts("复杂"), ["复杂"]); // everything else stays exact
});

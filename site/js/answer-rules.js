// Lenient grading for typed (short-answer) quiz questions.
//
// A rule takes an official answer and returns other spellings to accept. Rules are opt-in per topic:
// TOPIC_RULES lists which rules each topic uses (by topic ID), plus words the teacher excluded from
// them. A topic that isn't listed is graded exactly. Multiple choice is never affected.

export const RULES = {
  // 物理学 also accepts 物理 and 物理科学. 环境科学 also accepts 环境学.
  // Skipped when fewer than 2 characters would remain (数学, 化学, 医学, 科学) and for 文学
  // ("literature", where 学 isn't an "-ology" ending).
  "xue-suffix"(answer) {
    if (answer.endsWith("科学")) {
      const stem = answer.slice(0, -2);
      return stem.length >= 2 ? [`${stem}学`] : [];
    }
    if (answer.endsWith("学") && !answer.endsWith("文学")) {
      const stem = answer.slice(0, -1);
      return stem.length >= 2 ? [stem, `${stem}科学`] : [];
    }
    return [];
  },
};

export const TOPIC_RULES = {
  school: [
    // 经济 and 社会 alone mean "economy" and "society", so those words must keep their 学.
    { rule: "xue-suffix", except: ["经济学", "社会学"] },
  ],
};

// Returns a function giving the extra spellings to accept for one of this topic's words.
export function answerVariants(topicId) {
  const rules = TOPIC_RULES[topicId] ?? [];
  return (answer) =>
    rules.flatMap(({ rule, except = [] }) => (except.includes(answer) ? [] : RULES[rule](answer)));
}

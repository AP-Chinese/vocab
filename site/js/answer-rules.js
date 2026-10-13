// Lenient grading for typed (short-answer) quiz questions.
//
// A rule takes an official answer and returns other spellings to accept. Rules are opt-in per topic:
// TOPIC_RULES lists which rules each topic uses (by topic ID), plus words the teacher excluded from
// them. A topic that isn't listed is graded exactly. Multiple choice is never affected.

// Each rule's apply(answer) returns null when the rule isn't about that word, { skip: reason } when it
// deliberately leaves the word exact, or { variants: [...] } with the extra spellings to accept.
// The skip reasons appear in docs/ANSWER-RULES.md.
export const RULES = {
  // 物理学 also accepts 物理 and 物理科学. 环境科学 also accepts 环境学.
  "xue-suffix": {
    apply(answer) {
      if (!answer.endsWith("学")) return null;
      const scienceEnding = answer.endsWith("科学");
      const stem = answer.slice(0, scienceEnding ? -2 : -1);
      if (stem.length < 2) return { skip: "too short: fewer than 2 characters would be left" };
      if (scienceEnding) return { variants: [`${stem}学`] };
      if (answer.endsWith("文学")) return { skip: "文学 means \"literature\", so its 学 isn't an \"-ology\" ending" };
      return { variants: [stem, `${stem}科学`] };
    },
  },
  // 黄 also accepts 黄色. Only the listed color words; 咖啡色 and 颜色 already end in 色 or aren't a color.
  "se-suffix": {
    apply(answer) {
      if (!COLOR_WORDS.includes(answer)) return null;
      return { variants: [`${answer}色`] };
    },
  },
};

const COLOR_WORDS = ["黄", "绿", "红", "蓝", "灰", "紫", "黑", "白", "粉红"];

export const TOPIC_RULES = {
  school: [
    // 经济 and 社会 alone mean "economy" and "society", so those words must keep their 学.
    { rule: "xue-suffix", except: ["经济学", "社会学"] },
  ],
  clothing: [{ rule: "se-suffix" }],
};

// Returns a function giving the extra spellings to accept for one of this topic's words.
export function answerVariants(topicId) {
  const rules = TOPIC_RULES[topicId] ?? [];
  return (answer) =>
    rules.flatMap(({ rule, except = [] }) => (except.includes(answer) ? [] : (RULES[rule].apply(answer)?.variants ?? [])));
}

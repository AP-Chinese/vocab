// Pure quiz logic (no DOM), shared by the app and the unit tests.

export const PASS_PERCENT = 90;

// Fisher–Yates shuffle; returns a new array.
export function shuffle(items, random = Math.random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// NFC-normalize, then drop whitespace and punctuation (ASCII and full-width).
export function normalizeAnswer(text) {
  return text.normalize("NFC").replace(/[\s\p{P}]/gu, "");
}

// Every word is asked once: half multiple choice (it gets the extra word when
// the count is odd), half short answer, in random order.
// `variants` gives extra spellings to accept for short answers (see answer-rules.js).
export function buildQuiz(words, random = Math.random, variants = () => []) {
  const shuffled = shuffle(words, random);
  const mcCount = Math.ceil(shuffled.length / 2);
  const questions = shuffled.map((word, i) =>
    i < mcCount ? multipleChoice(word, words, random) : shortAnswer(word, words, variants),
  );
  return shuffle(questions, random);
}

function multipleChoice(word, words, random) {
  // Words sharing this English meaning would also be correct, so never use them as distractors.
  const candidates = words.filter((w) => w.english !== word.english && w.chinese !== word.chinese);
  const distractors = [];
  for (const w of shuffle(candidates, random)) {
    if (distractors.length === 3) break;
    if (!distractors.includes(w.chinese)) distractors.push(w.chinese);
  }
  return {
    type: "mc",
    word,
    options: shuffle([word.chinese, ...distractors], random),
  };
}

function shortAnswer(word, words, variants) {
  return { type: "sa", word, accepted: acceptedAnswers(word, words, variants) };
}

// Typed answers accepted for `word`: any word in the topic with the identical English meaning, the
// teacher's other accepted answers for them (`alsoAccepted` in vocab.js), and the topic's lenient
// spellings (normalized).
export function acceptedAnswers(word, words, variants = () => []) {
  const official = words
    .filter((w) => w.english === word.english)
    .flatMap((w) => [w.chinese, ...(w.alsoAccepted ?? [])]);
  // A lenient spelling never counts if it's exactly a different word in this topic.
  const otherWords = new Set(words.map((w) => w.chinese).filter((c) => !official.includes(c)));
  const lenient = official.flatMap(variants).filter((v) => !otherWords.has(v));
  return [...new Set([...official, ...lenient].map(normalizeAnswer))];
}

// True when a correct typed answer isn't the official spelling (e.g. 物理 for 物理学), so the
// feedback can show the textbook form.
export function isAlternateSpelling(question, answer) {
  return question.type === "sa" && isCorrect(question, answer) && normalizeAnswer(answer) !== normalizeAnswer(question.word.chinese);
}

export function isCorrect(question, answer) {
  if (question.type === "mc") return answer === question.word.chinese;
  const normalized = normalizeAnswer(answer);
  return normalized !== "" && question.accepted.includes(normalized);
}

// Compare without rounding: 37/42 (88.1%) fails. Integer math avoids float error at exactly 90%.
export function isPass(correct, total) {
  return total > 0 && correct * 100 >= total * PASS_PERCENT;
}

// Rounded down so the shown percentage never looks like a pass when it isn't (89.9% shows 89%).
export function percent(correct, total) {
  return total === 0 ? 0 : Math.floor((correct / total) * 100);
}

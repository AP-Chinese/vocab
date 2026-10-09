import { DEV_TOPICS } from "../../site/js/dev-topics.js";

export const TEST_TOPIC = DEV_TOPICS[0];
const chineseFor = Object.fromEntries(TEST_TOPIC.words.map((w) => [w.english, w.chinese]));

// Make every run identical: seeded shuffles, a fixed clock, and a fake Chinese voice
// (headless Chromium has none) that records what was spoken in window.__spoken.
export async function setUp(page, { voice = true } = {}) {
  await page.clock.setFixedTime(new Date("2026-10-09T19:42:00-04:00"));
  await page.addInitScript((hasVoice) => {
    let seed = 42;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__spoken = [];
    const voices = hasVoice ? [{ lang: "zh-CN", name: "Test voice" }] : [];
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => voices, speak: (u) => window.__spoken.push(u.text), cancel() {}, addEventListener() {} },
    });
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
  }, voice);
}

export async function openTestTopic(page) {
  await page.goto("/");
  await page.getByRole("link", { name: /Test topic/ }).click();
}

export async function startQuiz(page, name = "Test Student") {
  await openTestTopic(page);
  await page.getByRole("link", { name: "Quiz" }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Start" }).click();
}

// Answers the current question; `correct: false` gives a wrong answer.
export async function answer(page, { correct = true } = {}) {
  const right = chineseFor[await page.locator(".prompt").textContent()];
  if (await page.locator(".options").count()) {
    const option = correct
      ? page.locator(".option", { hasText: new RegExp(`^${right}$`) })
      : page.locator(".option").filter({ hasNotText: new RegExp(`^${right}$`) }).first();
    await option.click();
  } else {
    await page.locator("#answer").fill(correct ? right : "错");
    await page.getByRole("button", { name: "Submit" }).click();
  }
}

// Runs the whole quiz, answering the first `wrong` questions incorrectly.
export async function finishQuiz(page, { wrong = 0 } = {}) {
  for (let i = 0; i < TEST_TOPIC.words.length; i++) {
    await answer(page, { correct: i >= wrong });
    await page.locator('[data-action="quiz-next"]').click();
  }
}

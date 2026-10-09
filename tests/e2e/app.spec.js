import { test, expect } from "@playwright/test";
import { TEST_TOPIC, answer, finishQuiz, openTestTopic, setUp, startQuiz } from "./helpers.js";

test.beforeEach(async ({ page }) => setUp(page));

test("home lists every topic with its word count", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /School 学校\s*47 words/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Test topic.*5 words/ })).toBeVisible();
});

test.describe("flashcards", () => {
  test.beforeEach(async ({ page }) => {
    await openTestTopic(page);
    await page.getByRole("link", { name: "Flashcards" }).click();
  });

  test("flip, audio, and navigation", async ({ page }) => {
    const card = page.locator(".card");
    await expect(page.locator(".progress")).toHaveText("1 / 5");
    await expect(page.getByRole("button", { name: "‹ Previous" })).toBeDisabled();

    const chinese = await page.locator(".card-front .chinese").textContent();
    await page.locator(".card-front .speak-btn").click();
    expect(await page.evaluate(() => window.__spoken)).toEqual([chinese]);
    await expect(card).not.toHaveClass(/flipped/); // tapping 🔊 doesn't flip the card

    const next = page.getByRole("button", { name: "Next ›" });
    await expect(next).toBeDisabled(); // must see the answer first
    await card.click({ position: { x: 20, y: 20 } });
    await expect(card).toHaveClass(/flipped/);
    await card.click({ position: { x: 20, y: 20 } }); // flipping back keeps Next enabled
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.locator(".progress")).toHaveText("2 / 5");
    await expect(card).not.toHaveClass(/flipped/); // a new card starts on its front
    await expect(next).toBeDisabled();

    // Going back to a card already flipped doesn't require flipping it again.
    await page.getByRole("button", { name: "‹ Previous" }).click();
    await expect(page.locator(".progress")).toHaveText("1 / 5");
    await expect(next).toBeEnabled();
  });

  test("end screen after the last card", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.locator(".card").click({ position: { x: 20, y: 20 } });
      await page.getByRole("button", { name: "Next ›" }).click();
    }
    await expect(page.getByText("You've gone through all 5 cards!")).toBeVisible();
    await page.getByRole("link", { name: "Take the quiz" }).click();
    await expect(page.getByLabel("Your name")).toBeVisible();
  });
});

test.describe("quiz", () => {
  test("name is required", async ({ page }) => {
    await openTestTopic(page);
    await page.getByRole("link", { name: "Quiz" }).click();
    const start = page.getByRole("button", { name: "Start" });
    await expect(start).toBeDisabled();
    await page.getByLabel("Your name").fill("   ");
    await expect(start).toBeDisabled();
    await page.getByLabel("Your name").fill("Test Student");
    await expect(start).toBeEnabled();
  });

  test("Enter submits a typed answer and shows feedback, but not during pinyin composition", async ({ page }) => {
    await startQuiz(page);
    // Skip ahead to the first short-answer question.
    while (!(await page.locator("#answer").count())) {
      await answer(page);
      await page.locator('[data-action="quiz-next"]').click();
    }
    const input = page.locator("#answer");
    await input.fill("ni");
    await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
    await expect(page.locator(".feedback")).toHaveCount(0);

    await input.press("Enter");
    await expect(page.locator(".feedback")).toContainText("Incorrect");
    await expect(input).toBeDisabled();
  });

  test("wrong multiple choice highlights the right answer", async ({ page }) => {
    await startQuiz(page);
    while (!(await page.locator(".options").count())) {
      await answer(page);
      await page.locator('[data-action="quiz-next"]').click();
    }
    await answer(page, { correct: false });
    await expect(page.locator(".option.correct")).toHaveCount(1);
    await expect(page.locator(".option.incorrect")).toHaveCount(1);
    await expect(page.locator(".option:enabled")).toHaveCount(0);
    await expect(page.locator(".feedback")).toContainText("Correct answer:");
  });

  test("all correct passes, and results fit on one screen", async ({ page }) => {
    await startQuiz(page);
    await finishQuiz(page);
    await expect(page.locator(".result-headline")).toHaveText("Excellent! 🎉");
    await expect(page.locator(".result-status")).toHaveText("Passed");
    const details = page.locator(".result-details");
    await expect(details).toContainText("Test Student");
    await expect(details).toContainText(TEST_TOPIC.name);
    await expect(details).toContainText("5 / 5 (100%)");
    await expect(details).toContainText("Oct 9, 2026, 7:42 PM");
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  });

  test("one wrong out of five (80%) does not pass; retake keeps the name and reshuffles", async ({ page }) => {
    await startQuiz(page);
    const firstRun = await finishQuiz(page, { wrong: 1 });
    await expect(page.locator(".result-headline")).toHaveText("Try again! 💪");
    await expect(page.locator(".result-status")).toHaveText("Not passed yet · 90% needed");
    await expect(page.locator(".result-details")).toContainText("4 / 5 (80%)");

    await page.getByRole("button", { name: "Retake quiz" }).click();
    await expect(page.locator(".progress")).toHaveText("Question 1 / 5");
    const retake = await finishQuiz(page);
    await expect(page.locator(".result-details")).toContainText("Test Student");
    expect(retake).not.toEqual(firstRun);
    expect(retake.map((q) => q.slice(3)).sort()).toEqual(firstRun.map((q) => q.slice(3)).sort()); // same words
  });
});

test("🔊 buttons are hidden when the phone has no Chinese voice", async ({ page }) => {
  await setUp(page, { voice: false });
  await openTestTopic(page);
  await page.getByRole("link", { name: "Flashcards" }).click();
  await expect(page.locator(".card-front .chinese")).toBeVisible();
  await expect(page.locator(".speak-btn")).toBeHidden();
});

test("Report a problem links to the bug form on Home and Topic, but not on quiz screens", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Report a problem" });
  await expect(link).toHaveAttribute("href", "https://forms.gle/sfat25Dz7Ddcc9dY6");
  await page.getByRole("link", { name: /Test topic/ }).click();
  await expect(link).toBeVisible();
  await page.getByRole("link", { name: "Quiz" }).click();
  await expect(link).toHaveCount(0);
});

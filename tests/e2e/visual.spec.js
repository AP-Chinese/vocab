// Visual regression tests: each screen is compared with the saved screenshot in tests/e2e/screenshots/.
// After an intended design change, refresh them with `npm run test:update-screenshots` and review the diff.
import { test, expect } from "@playwright/test";
import { answer, finishQuiz, openTestTopic, setUp, startQuiz } from "./helpers.js";

test.describe("screens @visual", () => {
  test.beforeEach(async ({ page }) => setUp(page));

  test("home", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("home.png");
  });

  test("topic", async ({ page }) => {
    await page.goto("/#/topic/school");
    await expect(page).toHaveScreenshot("topic.png");
  });

  test("flashcard front and back", async ({ page }) => {
    await page.goto("/#/topic/school/cards"); // a real School 学校 card
    await expect(page).toHaveScreenshot("flashcard-front.png");
    await page.locator(".card").click({ position: { x: 20, y: 20 } });
    await expect(page).toHaveScreenshot("flashcard-back.png");
  });

  test("quiz name entry", async ({ page }) => {
    await openTestTopic(page);
    await page.getByRole("link", { name: "Quiz" }).click();
    await page.getByLabel("Your name").fill("Test Student");
    await expect(page).toHaveScreenshot("quiz-name.png");
  });

  test("quiz feedback", async ({ page }) => {
    await startQuiz(page);
    let mcDone = false;
    let saDone = false;
    while (!(mcDone && saDone)) {
      const isMc = (await page.locator(".options").count()) > 0;
      if (isMc && !mcDone) {
        await answer(page, { correct: false });
        await expect(page).toHaveScreenshot("quiz-multiple-choice-wrong.png");
        mcDone = true;
      } else if (!isMc && !saDone) {
        await expect(page).toHaveScreenshot("quiz-short-answer.png");
        await answer(page);
        await expect(page).toHaveScreenshot("quiz-short-answer-correct.png");
        saDone = true;
      } else {
        await answer(page);
      }
      await page.locator('[data-action="quiz-next"]').click();
    }
  });

  test("results: pass", async ({ page }) => {
    await startQuiz(page);
    await finishQuiz(page);
    await expect(page).toHaveScreenshot("results-pass.png");
  });

  test("results: not passed", async ({ page }) => {
    await startQuiz(page);
    await finishQuiz(page, { wrong: 2 });
    await expect(page).toHaveScreenshot("results-fail.png");
  });
});

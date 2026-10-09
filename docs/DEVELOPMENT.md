# Development notes

## Previewing a branch without merging

[raw.githack.com](https://raw.githack.com) serves files straight from GitHub with the right content types, so the static site runs as-is from any commit:

```
https://raw.githack.com/rachelli429/ap-chinese-vocab/<commit-sha>/site/index.html
```

- Use the **full commit hash** (`git rev-parse HEAD`), not the branch name. Branch names with a slash (like `claude/…`) don't work in the URL, and a commit link always shows exactly that version.
- Push the commit first. githack fetches from GitHub, not from your computer.
- The `raw.githack.com` domain is only for development. It doesn't tell us whether WeChat will open the real link, and it isn't for students. Their link is the GitHub Pages one: https://rachelli429.github.io/ap-chinese-vocab/.

## Running locally

```sh
npm install    # once per checkout; also turns on the pre-commit hook
npm start      # serves site/ at http://localhost:8080
```

## Test topic (preview only)

`site/js/dev-topics.js` adds a 5-word "🧪 Test topic (preview only)" topic, so the whole quiz and the results screen can be tried in under a minute. The deploy workflow deletes that file before publishing, so it never appears on the GitHub Pages site. It does appear locally and on raw.githack.com preview links.

## Tests

`npm test` runs everything, and it also runs automatically before every commit (`.githooks/pre-commit`). To skip it once in an emergency: `git commit --no-verify`.

| command | what it runs |
|---|---|
| `npm run test:unit` | Quiz rules in `tests/unit/`: every word asked once, the half-and-half split, 4 distinct choices, answer grading, the 90% pass mark, and checks on the word list. |
| `npm run test:e2e` | Browser tests in `tests/e2e/` on an iPhone SE and a Pixel 7 screen: using the flashcards, audio, name entry, typing answers (including the pinyin-keyboard Enter guard), feedback, pass/fail results, and retakes. Also the visual tests below. |
| `npm run test:update-screenshots` | Re-captures the screenshots after an intended design change. Review the new images before committing. |

**Visual regression tests** (`tests/e2e/visual.spec.js`) compare every screen with the saved images in `tests/e2e/screenshots/<phone>/`. If a change alters how a screen looks, the test fails and saves a before/after/diff in `test-results/`. The saved screenshots double as an always-current gallery of the app, browsable on GitHub.

Notes:
- The tests pin the random order, the clock (Oct 9, 2026, 7:42 PM Eastern), and fake a Chinese voice, so every run looks the same.
- Screenshots are captured in the Claude Code cloud environment (Linux). On another computer fonts render slightly differently, so the visual tests may fail there even when nothing changed. CI on GitHub skips them for the same reason and runs only the unit and functional tests.

## Adding a topic

Nothing in the app is specific to one topic. Topics and words come entirely from `site/js/vocab.js`, which is generated:

1. Export the Knowt set as PDF and commit it as `data/source/NN-topic.pdf`. The number sets the order on the home screen, e.g. `02-family.pdf`.
2. Run `python3 scripts/pdf_to_csv.py` (needs `poppler-utils`). It reads every PDF in `data/source/` and regenerates `data/vocab.csv` and `site/js/vocab.js`. The topic name shown in the app is the PDF's title (e.g. `School 学校`).
3. Run `npm test`. It checks every topic has at least 4 words, no blanks, and no duplicate Chinese.
4. Check the word count against the Knowt set, and check for words that share an English meaning (the app handles them, but they may be mistakes in the source set).

Corrections to the source sets go in `OVERRIDES` in the script, so they survive re-imports.

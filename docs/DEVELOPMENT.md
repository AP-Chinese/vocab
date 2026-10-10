# Development notes

## Tech choices

The app is plain HTML, CSS, and JavaScript modules: no framework and no build step. That keeps it small and fast on phones, and it means the files in `site/` can be previewed straight from GitHub (see below).

**Switching to React later.** We decided to wait (Oct 2026). React starts paying off once the app has more interactive screens and shared state, for example an admin/dev panel, progress tracking, or spaced repetition. When we switch:
- Use Vite to build. Deploy the `dist/` output instead of `site/`.
- raw.githack.com previews stop working, because they serve repo files as-is and a React app needs building first. Replace them with per-branch deploys (e.g. a Pages preview or Netlify/Cloudflare branch previews).
- The quiz logic in `site/js/quiz.js` has no DOM code and can be reused unchanged, along with its unit tests. The Playwright tests and screenshots should keep passing as-is, which makes them a good safety net for the switch.

## Previewing a branch without merging

[raw.githack.com](https://raw.githack.com) serves files straight from GitHub with the right content types, so the static site runs as-is from any commit:

```
https://raw.githack.com/ap-chinese/vocab/<commit-sha>/site/index.html
```

- Use the **full commit hash** (`git rev-parse HEAD`), not the branch name. Branch names with a slash (like `claude/…`) don't work in the URL, and a commit link always shows exactly that version.
- Push the commit first. githack fetches from GitHub, not from your computer.
- The `raw.githack.com` domain is only for development. It doesn't tell us whether WeChat will open the real link, and it isn't for students. Their link is the GitHub Pages one: https://ap-chinese.github.io/vocab/.

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

## Exporting the word list to CSV

```sh
npm run export:csv                    # writes exports/vocab.csv
npm run export:csv -- ~/Desktop/vocab.csv
```

It exports exactly what the app uses (from `site/js/vocab.js`): every topic with its ID, Chinese, pinyin, and English, with overrides and removed words already applied. The preview-only test topic isn't included. The file opens directly in Excel or Google Sheets, with Chinese and tone marks intact.

The CSV is a snapshot to look at or share, not a place to make changes. `exports/` isn't committed. To change words, edit the PDFs or the lists in `scripts/import_vocab.py`, then re-import.

## Adding a topic

Nothing in the app is specific to one topic. Topics and words come entirely from `site/js/vocab.js`, which is generated:

1. Export the Knowt set as PDF and commit it as `data/source/NN-topic.pdf`. The number sets the order on the home screen, e.g. `02-family.pdf`.
2. Run `python3 scripts/import_vocab.py` (needs `poppler-utils` and `pip install -r scripts/requirements.txt`). It reads every PDF in `data/source/` and regenerates `site/js/vocab.js`. The topic name shown in the app is the PDF's title (e.g. `School 学校`).
3. Run `npm test`. It checks every topic has at least 4 words, no blanks, and no duplicate Chinese.
4. Check the word count against the Knowt set, and check for words that share an English meaning (the app handles them, but they may be mistakes in the source set).
5. Review the generated pinyin, especially characters with more than one reading (e.g. 乐 yuè/lè, 行 xíng/háng, 长 cháng/zhǎng). Put corrections in `PINYIN_OVERRIDES` in the script.
6. Typed answers for the new topic are graded exactly. To turn on lenient spellings (like School's 学 rule), add the topic's ID to `TOPIC_RULES` in `site/js/answer-rules.js`, with any words the teacher wants excluded, and add a test listing what each affected word accepts (see `tests/unit/answer-rules.test.js`).

Changes to the source sets go in the script, so they survive re-imports: corrections in `OVERRIDES`, and words to remove in `EXCLUDE`.

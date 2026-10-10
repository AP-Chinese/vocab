# Architecture and decisions

Why the app is built the way it is. When a decision changes, update its entry rather than deleting it, so the reasoning stays on record. For how-to steps (previews, tests, adding topics) see [DEVELOPMENT.md](DEVELOPMENT.md). For what the app does, see [SPEC.md](../SPEC.md).

## Map

```
data/source/NN-topic.pdf ──scripts/import_vocab.py──► site/js/vocab.js  (the word list the app loads)
                                                          └─scripts/export_csv.js──► exports/vocab.csv  (on demand, not committed)
site/
  index.html          loads js/app.js
  styles.css          all styling
  js/app.js           screens, navigation, events (the only file that touches the page)
  js/quiz.js          quiz rules: shuffling, building questions, grading, pass mark (no page code)
  js/speech.js        text-to-speech and voice choice
  js/vocab.js         generated word list
  js/dev-topics.js    preview-only test topic (deleted on deploy)
tests/unit/           Node's built-in test runner
tests/e2e/            Playwright browser tests + screenshots/
.githooks/pre-commit  runs npm test before every commit
.github/workflows/    tests, then deploys site/ to GitHub Pages from main
```

## 1. Static site, no backend

The app is plain files on GitHub Pages: no server, database, or accounts. It's free, needs no maintenance, and loads fast. The teacher only needs screenshots, which a static site can provide.

- **Trade-off:** the app can't collect results itself, so results depend on screenshots (see Known weak spots).

## 2. Plain JavaScript, no framework or build step

The app is small (a few hundred lines), and having no build step means the files in `site/` run as-is. That's what makes raw.githack.com previews work.

- **Revisit:** switch to React when the app grows (admin panel, progress tracking, spaced repetition). See [DEVELOPMENT.md → Tech choices](DEVELOPMENT.md#tech-choices) for what switching involves.

## 3. Word list pipeline

- The **Knowt PDFs are the source of truth**. The script turns them into `site/js/vocab.js`, which the app imports directly. There's deliberately only one generated copy. An earlier `data/vocab.csv` was dropped (Oct 2026) because a second copy could drift out of sync. A CSV can still be exported on demand (`npm run export:csv`). It's generated from `vocab.js` and isn't committed, so it can't drift.
- Generated files are committed, so there's no build step.
- Teacher-approved changes to the source sets live in the script, so they survive re-imports: corrections in `OVERRIDES` (e.g. 电脑 → "computer") and removed words in `EXCLUDE` (e.g. 数学分析 "math analysis").
- **Pinyin is generated**, because the Knowt sets don't include it. The script uses pypinyin (pinned in `scripts/requirements.txt`), whose word dictionary picks the right reading for characters with more than one (乐队 yuè duì, 数学 shù xué). Every School 学校 reading was checked by hand. New topics should be reviewed too, with corrections going in `PINYIN_OVERRIDES`. It's written one syllable per character with tone marks (`kè chéng`), which tests enforce.
- Pinyin is shown only on the flashcard back. The quiz deliberately never renders it, and a browser test fails if any word's pinyin appears on a quiz screen.
- Never edit `vocab.js` by hand. The next import overwrites it.

## 4. Topics are identified by ID, not position

Each topic's ID comes from its PDF file name: `01-school.pdf` becomes `school`, giving links like `#/topic/school/quiz`. The number prefix only sets the order on the home screen. So reordering or inserting topics never changes an existing link.

- IDs come from the file name rather than the display name, because display names contain Chinese and emoji.
- The unit tests check that IDs are unique and link-safe. An unknown or old link (e.g. `#/topic/0`) goes to Home.

## 5. Navigation

Screens are addressed by the part of the URL after `#`. That works on GitHub Pages without server configuration, and the phone's back button works.

- There's no "deep link" to the results screen or the middle of a quiz. Opening a quiz link always starts at name entry.

## 6. Rendering and state

- Each screen is redrawn as a whole from a template string whenever it changes. Clicks are handled in one place using `data-action` attributes on buttons.
- Anything a student types (their name) is escaped before it's displayed, so it can't inject code into the page.
- **No storage.** State lives in memory, so refreshing or leaving abandons a quiz. The student's name is remembered only for the visit, so retakes and other topics don't ask again.

## 7. Quiz rules live in their own module

`site/js/quiz.js` has no page code, so its rules are fully unit-tested, and it can be reused unchanged by a future React version. Functions that shuffle accept a random-number generator, which the tests use to make runs repeatable.

Decisions inside the rules:
- **Odd word count:** multiple choice gets the extra word.
- **Wrong options (distractors)** come from the same topic and never share the correct word's English meaning, so only one option is ever correct.
- **Shared meanings:** if two words share an English meaning, either one is accepted when typing.
- **Grading typed answers:** exact match after normalizing Unicode and removing whitespace and punctuation (ASCII and full-width).
- **Pass mark:** checked with whole-number math (`correct × 100 ≥ total × 90`), so 37/42 can't round its way to a pass. The percentage shown is rounded down, so it never looks like a pass when it isn't.
- **Every new quiz (including a retake) reshuffles** both the order and which words are multiple choice vs. typed. Flashcards reshuffle every time the deck opens.

## 8. Audio

- It uses the browser's built-in text-to-speech (Web Speech API): free, but quality varies by phone.
- 🔊 buttons appear only when a Mandarin voice exists (`body.has-tts`). Cantonese and Taiwanese voices are skipped.
- **A woman's voice is preferred, chosen by name.** Browsers don't report a voice's gender, so known female voices (Tingting, Xiaoxiao, Google's…) rank first and known male voices last. This is a best effort.
- **Revisit:** if WeChat or certain phones have no usable voice, switch to pre-recorded audio files.

## 9. Styling

- Phone-first, with a single stylesheet and colors defined in one place (`:root`).
- It uses the phone's built-in Chinese fonts on purpose. Downloadable Chinese fonts are several megabytes.
- Text inputs are at least 16px so iPhones don't zoom in on tap. The layout leaves room for the notch (safe-area insets).
- The results screen must fit one phone screen with no scrolling, so one screenshot captures it (checked by tests).
- The "Report a problem" link appears only on Home and Topic, so it never clutters a results screenshot.

## 10. Preview-only test topic

`site/js/dev-topics.js` adds a 5-word test topic. The app loads it only if the file exists (`import()` with a fallback), and the deploy workflow deletes it before publishing. It appears locally, on preview links, and in tests, but never on the live site. That way students can't use it for an easy PASS.

## 11. Testing

- **Unit tests** use Node's built-in runner, with no dependencies.
- **Browser tests** use Playwright, pinned to the exact version that matches the installed browser. They run on iPhone SE and Pixel 7 screen sizes.
- **Determinism:** tests pin the random order, the clock, and a fake Chinese voice, so every run is identical.
- **Screenshots** must match exactly (`maxDiffPixels: 0`). A looser 1% tolerance missed a newly added link.
- Screenshot baselines are made in the Claude Code cloud environment (Linux). Fonts render differently elsewhere, so GitHub CI skips the screenshot comparisons and runs everything else.
- The pre-commit hook is turned on by `npm install` (`prepare` sets `core.hooksPath`).

## 12. Deploying

Only `main` deploys, through GitHub Actions to GitHub Pages, and only after the tests pass. The site is published from the `ap-chinese` organization, so the link (https://ap-chinese.github.io/vocab/) doesn't show a personal username.

## Known weak spots

1. **Results can be faked.** The timestamp comes from the phone's clock, and screenshots can be edited. Results are a deterrent, not proof. A possible fix is a verification code the teacher can check (spec, "Possible later work").
2. **The test topic can be reached on preview links.** The repo is public, so a tech-savvy student could screenshot a PASS from a preview link. It would show "🧪 Test topic (preview only)" as the topic, which the teacher would notice.
3. **No Safari-engine tests (deferred, Oct 2026).** Browser tests only use Chrome sized like a phone. iPhone WeChat and Safari use a different engine (WebKit), so engine-specific bugs can slip through. The card flip is the most likely, since its 3D CSS is handled differently in Safari. Real-phone checks in WeChat are still needed either way.
   - **Plan when we pick it up (about 30 min):** add an "iPhone SE (Safari engine)" Playwright project that's skipped when WebKit isn't installed, and add `npx playwright install --with-deps webkit` to the CI workflow. WebKit can't be installed in the Claude Code cloud environment, so it would run only in GitHub CI (on pull requests and `main`), with no screenshot comparisons.
   - Playwright's WebKit on Linux isn't identical to Safari on an iPhone, so this narrows the gap without closing it.

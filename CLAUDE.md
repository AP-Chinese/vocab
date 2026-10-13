# AP Chinese Vocab

Flashcard and quiz site for AP Chinese vocabulary, used by high school students and their teacher. Read these before changing anything:

- [SPEC.md](SPEC.md): what the app does and why.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it's built.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): running locally, branch previews, tests, and **Adding a topic**, which says where every kind of vocab change goes.

## Vocab changes

- Never edit `site/js/vocab.js` or `docs/ANSWER-RULES.md` by hand. Both are generated.
- Put every change in the tables in `scripts/import_vocab.py`, keyed by topic ID:
  - `OVERRIDES` (English)
  - `CHINESE_OVERRIDES`
  - `EXCLUDE` (removals)
  - `ADDITIONS` (words not in the PDF)
  - `ALSO_ACCEPTED` (other typed answers)
  - `PINYIN_OVERRIDES`
  - `TOPIC_NAMES`
- Then run `python3 scripts/import_vocab.py` and `npm run docs:rules`.
- When the teacher asks to remove "idioms", that means the 4-character chengyu (成语), like 畅通无阻 or 水泄不通. Ordinary 4-character compounds like 交通事故 or 高峰时间 stay. List the words you plan to remove.
- If a request doesn't match the data, ask instead of guessing. Examples:
  - An "also accept" answer is already the word itself.
  - A word isn't in the topic.
  - An English meaning matches more than one word.
- Add tests for each round of teacher feedback, like the Travel and Transportation tests:
  - Extra accepted answers go in `tests/unit/answer-rules.test.js`.
  - Removals and additions go in `tests/unit/quiz.test.js`.
- If a topic's word count changes, the Home screenshots (which show word counts) need refreshing. Run `npm run test:update-screenshots`, check that only `home.png` changed, and look at the new image.

## Working with the user

- After applying feedback, show a "what changed" table (Word | English | Change) and the topic's new word count.
- Commit and push when the tests pass. The pre-commit hook runs `npm test`. Open a PR only when asked, and include the table in its description.
- To share a branch preview, use the raw.githack.com link with the commit ID (see docs/DEVELOPMENT.md). Students only use https://ap-chinese.github.io/vocab/.
- Explain in plain language. The user manages the content and isn't necessarily a developer.

## Audio

- Audio uses each device's built-in speech voices.
- Unit tests use voice lists in `tests/unit/fixtures/voices.js`. Only the Android list was captured from a real device (an Android emulator).
- When audio fails on a device, ask for that device's real voice list before guessing. Run this in the browser console:

  ```js
  speechSynthesis.getVoices().map(v => `${v.lang} | ${v.name} | local: ${v.localService}`).join("\n")
  ```

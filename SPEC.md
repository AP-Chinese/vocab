# AP Chinese Vocab — MVP Spec

## Overview

A mobile-first website for studying AP Chinese vocabulary by topic. A teacher shares one link in the class WeChat group. Students open it on their phones, study the flashcards for a topic, and take a quiz. They then send the teacher a screenshot of their results.

The assignment is for students with low reading scores on the mock AP tests. The app doesn't need to know who those students are, because the teacher handles that outside the app.

## Users

- **Students:** use phones, usually opening the link inside WeChat's built-in browser. They are in the US.
- **Teacher:** never uses the app directly. She receives result screenshots through WeChat.

## Goals

- Students can study one topic's words as flip cards, with audio.
- Students can take a quiz on one topic and get a clear pass/fail result.
- The results screen is a single screenshot that identifies the student and the attempt.

## Non-goals (MVP)

- Accounts, logins, or any server-side storage
- Saving progress between visits (a refresh starts over)
- Progress tracking, streaks, or stats
- Spaced repetition
- Customizing the quiz format
- Mixing several topics in one session
- Direct links to a single topic
- Pinyin
- Showing which words were missed on the results screen
- Editing the word list in the app (the list is fixed)
- Polished laptop layout (it should work in a desktop browser, but phones come first)

## Content

### Source data

The vocabulary comes from Knowt flashcard sets, one per topic. Each set is exported as a PDF with two columns (Chinese, English) and committed to `data/source/`, named `NN-topic.pdf` (e.g. `01-school.pdf`). The number sets the topic order.

`scripts/pdf_to_csv.py` extracts every PDF into `data/vocab.csv`. The topic name comes from the PDF title (e.g. `School 学校`). The word list will not change after this one-time import.

| column    | example                   | notes                                         |
|-----------|---------------------------|-----------------------------------------------|
| `topic`   | School 学校               | English + Chinese topic name                  |
| `chinese` | 课程                      | simplified characters                         |
| `english` | course; curriculum; class | English meaning; multiple meanings separated by `; ` |

- Each topic has about 30–50 words.
- Topics appear in the app in the same order as in the CSV.
- Words appear in the CSV order within each topic.
- The CSV is converted to a data file that ships with the site. The app fetches nothing from Knowt or Quizlet at runtime.

**Words that share an English meaning.** A topic can have two words with the same English (e.g. 计算机学 and 电脑 are both "computer science" in School 学校). Since every quiz question shows English and asks for Chinese:
- **Multiple choice:** a word with the same English is never used as a distractor, so there's only one correct option.
- **Short answer:** any Chinese word in the topic with that exact English is accepted.

## Screens and flows

```
Home (topic list)
  └─ Topic
       ├─ Flashcards
       └─ Quiz: Enter name → Questions → Results
```

### 1. Home

- App title and a short one-line instruction.
- A list of topics, each showing its name and word count.
- Tapping a topic opens the Topic screen.

### 2. Topic

- The topic name.
- Two large buttons: **Flashcards** and **Quiz**.
- A back button to Home.

### 3. Flashcards

- The topic's words are **shuffled each time** the deck opens.
- **Front:** the Chinese word (large) and a 🔊 play-audio button.
- **Back:** the English meaning.
- Tapping the card flips it, and tapping again flips it back.
- **Previous** and **Next** buttons. Moving to another card always shows its front.
- A progress indicator, e.g. `12 / 42`.
- After the last card: an end screen with **Study again** (reshuffles) and **Take the quiz**.
- No self-grading.

### 4. Quiz

#### 4a. Enter name

- A required "Your name" field. **Start** is disabled until the field has non-blank text.
- The name is kept only in memory for this quiz.

#### 4b. Questions

- **Every word in the topic is asked exactly once.**
- The words are shuffled, then split half and half between the two question types. If the count is odd, multiple choice gets the extra word (e.g. 41 words → 21 multiple choice + 20 short answer). The two types are mixed together in random order.
- A progress indicator, e.g. `Question 7 / 42`.

**Multiple choice (English → Chinese)**
- Shows the English meaning.
- Four Chinese options: the correct answer and 3 distractors chosen at random from other words in the **same topic** that have a different English meaning. All four options must be distinct, in random order.
- Tapping an option submits it immediately.

**Short answer (English → Chinese)**
- Shows the English meaning.
- A text input for Chinese. Students will use their phone's pinyin keyboard.
- A **Submit** button. Pressing Enter also submits, but not while the keyboard is still composing pinyin into characters (IME composition).
- An empty answer can't be submitted.

**Grading short answers: exact match** after normalizing both sides:
- Unicode NFC normalization
- Remove all whitespace
- Remove ASCII and full-width punctuation (e.g. `，。！？、；：,.!?;:`)

No partial credit. The only alternates accepted are words in the same topic with the identical English meaning (see Content).

**Feedback after each question**
- Show ✅ Correct or ❌ Incorrect right away.
- If incorrect, show the correct Chinese answer (and, for multiple choice, highlight the correct option).
- A 🔊 button to hear the correct word.
- A **Next** button moves on. Answers can't be changed after submitting.

There is no going back to earlier questions. Leaving or refreshing the page abandons the quiz.

#### 4c. Results

Everything below must fit on **one phone screen without scrolling**, so a single screenshot captures it:

- **PASS** (green) or **NOT PASSED** (red), large
- Student name
- Topic name
- Score as both a count and a percentage, e.g. `39 / 42 (93%)`
- Date and time the quiz was finished, e.g. `Oct 9, 2026, 7:42 PM`
- A short line: "Take a screenshot and send it to your teacher."

**Passing score: ≥ 90%**, calculated as correct ÷ total and compared without rounding (so 37/42 = 88.1% fails).

Buttons: **Retake quiz** (no limit; keeps the name and reshuffles), **Back to topic**.

## Audio

- Plays the Chinese word aloud using the browser's built-in text-to-speech (Web Speech API, `zh-CN` voice).
- Available on the flashcard front and on quiz feedback. It is **not** available on quiz questions, because hearing the answer would give it away.
- If no Chinese voice is available or text-to-speech isn't supported, the 🔊 button is hidden. Everything else still works.
- **Risk:** text-to-speech support inside WeChat's built-in browser is uncertain, especially on iOS. This needs testing on real phones early. The fallback, if needed, is pre-generated audio files (out of scope unless the test fails).

## Technical approach

- **Static site:** HTML, CSS, and JavaScript, with no backend, database, or accounts.
- The vocabulary data is bundled with the site.
- **Hosting:** GitHub Pages (free; students are in the US). Pages needs a public repository on a free GitHub plan.
- **Mobile first:** works from about 360px wide, has large tap targets, and doesn't zoom when an input is focused (input font size ≥ 16px).
- **Supported browsers:** WeChat's built-in browser (iOS and Android), mobile Safari, and mobile Chrome. Desktop browsers should work but aren't the focus.
- Uses system fonts with good CJK support. No web font download.

## Testing and acceptance

- Unit tests for: CSV → data conversion, answer normalization and grading, quiz generation (every word asked once, half-and-half split, 4 distinct options with the correct one included), and the pass threshold.
- Manual check on real phones, **opening the link from a WeChat chat**:
  - The page loads (WeChat doesn't block the domain).
  - The pinyin keyboard works in short answer, and Enter during pinyin composition doesn't submit.
  - Audio plays, or the 🔊 button is hidden cleanly.
  - The results screen fits in one screenshot on a small phone.

## Open items

- [x] Confirm the source data format (Knowt PDF → `data/vocab.csv`, checked with `01-school.pdf`).
- [ ] Export and commit the remaining topic PDFs.
- [x] The GitHub repo is public (GitHub Pages is OK).
- [ ] Early WeChat test of the hosted link and text-to-speech.

## Possible later work

- Spaced repetition
- Pinyin toggle
- Topic-specific links
- Saving progress locally
- Pre-recorded or generated audio
- A verification code on the results screen that the teacher can check, to make faked screenshots harder

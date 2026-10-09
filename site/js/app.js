import { TOPICS as VOCAB_TOPICS } from "./vocab.js";
import { PASS_PERCENT, buildQuiz, isCorrect, isPass, percent, shuffle } from "./quiz.js";
import { initSpeech, speak } from "./speech.js";

// Preview-only topics; the file is absent from the deployed site, so this falls back to none.
const { DEV_TOPICS = [] } = await import("./dev-topics.js").catch(() => ({}));
const TOPICS = [...VOCAB_TOPICS, ...DEV_TOPICS];

const app = document.getElementById("app");
const BUG_REPORT_URL = "https://forms.gle/sfat25Dz7Ddcc9dY6";

// Kept for the whole visit so a retake (or another topic's quiz) doesn't ask again.
let studentName = "";
// State for the screen currently shown; replaced on every navigation.
let state = {};

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function speakButton(chinese) {
  return `<button type="button" class="speak-btn" data-action="speak" data-text="${esc(chinese)}" aria-label="Play audio">🔊</button>`;
}

// Shown on Home and Topic only, so it never clutters a results screenshot.
function footer() {
  return `
    <footer class="footer">
      <a href="${BUG_REPORT_URL}" target="_blank" rel="noopener">Report a problem</a>
    </footer>`;
}

function header(title, backHref) {
  return `
    <header class="bar">
      ${backHref ? `<a class="back" href="${backHref}" aria-label="Back">‹</a>` : ""}
      <h1>${esc(title)}</h1>
    </header>`;
}

// ---------- Routing ----------

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const topicIndex = Number(parts[1]);
  const topic = parts[0] === "topic" ? TOPICS[topicIndex] : undefined;

  if (!topic) return showHome();
  if (parts[2] === "cards") return showCards(topicIndex);
  if (parts[2] === "quiz") return showQuizStart(topicIndex);
  return showTopic(topicIndex);
}

function render(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
}

// ---------- Home ----------

function showHome() {
  state = {};
  render(`
    ${header("AP Chinese Vocab")}
    <main>
      <p class="hint">Pick a topic to study the flashcards or take the quiz.</p>
      <ul class="topic-list">
        ${TOPICS.map(
          (t, i) => `
          <li><a class="topic-link" href="#/topic/${i}">
            <span>${esc(t.name)}</span><span class="count">${t.words.length} words</span>
          </a></li>`,
        ).join("")}
      </ul>
    </main>
    ${footer()}`);
}

// ---------- Topic ----------

function showTopic(topicIndex) {
  state = {};
  const topic = TOPICS[topicIndex];
  render(`
    ${header(topic.name, "#/")}
    <main class="topic-menu">
      <a class="big-btn" href="#/topic/${topicIndex}/cards">Flashcards</a>
      <a class="big-btn primary" href="#/topic/${topicIndex}/quiz">Quiz</a>
    </main>
    ${footer()}`);
}

// ---------- Flashcards ----------

function showCards(topicIndex) {
  const topic = TOPICS[topicIndex];
  // `revealed` holds the cards already flipped once; Next stays disabled until the current one is.
  state = { screen: "cards", topicIndex, order: shuffle(topic.words), index: 0, flipped: false, revealed: new Set() };
  renderCards();
}

function renderCards() {
  const { topicIndex, order, index, flipped, revealed } = state;
  const topic = TOPICS[topicIndex];
  const back = `#/topic/${topicIndex}`;

  if (index >= order.length) {
    render(`
      ${header(topic.name, back)}
      <main class="done">
        <p class="done-title">You've gone through all ${order.length} cards!</p>
        <button type="button" class="big-btn" data-action="cards-restart">Study again</button>
        <a class="big-btn primary" href="#/topic/${topicIndex}/quiz">Take the quiz</a>
      </main>`);
    return;
  }

  const word = order[index];
  render(`
    ${header(topic.name, back)}
    <main class="cards">
      <p class="progress">${index + 1} / ${order.length}</p>
      <div class="card ${flipped ? "flipped" : ""}" data-action="flip" role="button" tabindex="0" aria-label="Flip card">
        <div class="card-inner">
          <div class="card-face card-front">
            <span class="chinese">${esc(word.chinese)}</span>
            ${speakButton(word.chinese)}
          </div>
          <div class="card-face card-back">
            <span class="english">${esc(word.english)}</span>
          </div>
        </div>
      </div>
      <p class="hint">Tap the card to flip it.</p>
      <div class="nav-row">
        <button type="button" class="btn" data-action="cards-prev" ${index === 0 ? "disabled" : ""}>‹ Previous</button>
        <button type="button" class="btn primary" data-action="cards-next" ${revealed.has(index) ? "" : "disabled"}>Next ›</button>
      </div>
    </main>`);
}

// ---------- Quiz ----------

function showQuizStart(topicIndex) {
  const topic = TOPICS[topicIndex];
  state = { screen: "quiz-name", topicIndex };
  render(`
    ${header(topic.name, `#/topic/${topicIndex}`)}
    <main class="quiz-name">
      <p>This quiz has <strong>${topic.words.length} questions</strong>, one for every word in the topic. You need <strong>90%</strong> to pass.</p>
      <label for="name">Your name</label>
      <input id="name" type="text" autocomplete="name" enterkeyhint="go" value="${esc(studentName)}" placeholder="First and last name">
      <button type="button" class="big-btn primary" data-action="quiz-start" ${studentName.trim() ? "" : "disabled"}>Start</button>
    </main>`);
}

function startQuiz() {
  const topic = TOPICS[state.topicIndex];
  state = {
    screen: "quiz",
    topicIndex: state.topicIndex,
    questions: buildQuiz(topic.words),
    current: 0,
    correctCount: 0,
    answer: null, // { given, correct } once the current question is answered
  };
  renderQuestion();
}

function renderQuestion() {
  const { topicIndex, questions, current, answer } = state;
  const topic = TOPICS[topicIndex];
  const q = questions[current];

  let body;
  if (q.type === "mc") {
    body = `
      <div class="options">
        ${q.options
          .map((opt) => {
            let cls = "option";
            if (answer && opt === q.word.chinese) cls += " correct";
            else if (answer && opt === answer.given) cls += " incorrect";
            return `<button type="button" class="${cls}" data-action="mc-answer" data-option="${esc(opt)}" ${answer ? "disabled" : ""}>${esc(opt)}</button>`;
          })
          .join("")}
      </div>`;
  } else {
    body = `
      <div class="short-answer">
        <input id="answer" type="text" lang="zh-CN" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          enterkeyhint="done" placeholder="Type the Chinese" value="${answer ? esc(answer.given) : ""}" ${answer ? "disabled" : ""}>
        ${answer ? "" : `<button type="button" class="big-btn primary" data-action="sa-submit" disabled>Submit</button>`}
      </div>`;
  }

  const feedback = answer
    ? `
      <div class="feedback ${answer.correct ? "is-correct" : "is-incorrect"}">
        <p class="verdict">${answer.correct ? "✅ Correct" : "❌ Incorrect"}</p>
        <p class="answer-line">
          ${answer.correct ? "" : "Correct answer: "}<span class="chinese-inline">${esc(q.word.chinese)}</span>
          ${speakButton(q.word.chinese)}
        </p>
        <button type="button" class="big-btn primary" data-action="quiz-next">${current + 1 === questions.length ? "See results" : "Next ›"}</button>
      </div>`
    : "";

  render(`
    ${header(topic.name, `#/topic/${topicIndex}`)}
    <main class="quiz">
      <p class="progress">Question ${current + 1} / ${questions.length}</p>
      <p class="prompt-label">${q.type === "mc" ? "Choose the Chinese for:" : "Type the Chinese for:"}</p>
      <p class="prompt">${esc(q.word.english)}</p>
      ${body}
      ${feedback}
    </main>`);

  if (q.type === "sa" && !answer) document.getElementById("answer").focus();
  if (answer) app.querySelector('[data-action="quiz-next"]').focus({ preventScroll: true });
}

function submitAnswer(given) {
  const q = state.questions[state.current];
  const correct = isCorrect(q, given);
  if (correct) state.correctCount++;
  state.answer = { given, correct };
  renderQuestion();
}

function nextQuestion() {
  state.current++;
  state.answer = null;
  if (state.current < state.questions.length) renderQuestion();
  else showResults();
}

function showResults() {
  const { topicIndex, correctCount, questions } = state;
  const topic = TOPICS[topicIndex];
  const total = questions.length;
  const passed = isPass(correctCount, total);
  const finishedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  state = { screen: "results", topicIndex };

  render(`
    <main class="results">
      <div class="result-banner ${passed ? "pass" : "fail"}">
        <p class="result-headline">${passed ? "Excellent! 🎉" : "Try again! 💪"}</p>
        <p class="result-status">${passed ? "Passed" : `Not passed yet · ${PASS_PERCENT}% needed`}</p>
      </div>
      <dl class="result-details">
        <dt>Name</dt><dd>${esc(studentName)}</dd>
        <dt>Topic</dt><dd>${esc(topic.name)}</dd>
        <dt>Score</dt><dd>${correctCount} / ${total} (${percent(correctCount, total)}%)</dd>
        <dt>Finished</dt><dd>${esc(finishedAt)}</dd>
      </dl>
      <p class="hint">Take a screenshot and send it to your teacher.</p>
      <div class="nav-row">
        <a class="btn" href="#/topic/${topicIndex}">Back to topic</a>
        <button type="button" class="btn primary" data-action="quiz-retake">Retake quiz</button>
      </div>
    </main>`);
}

// ---------- Events ----------

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;

  switch (target.dataset.action) {
    case "speak":
      event.stopPropagation(); // don't flip the card
      speak(target.dataset.text);
      break;
    case "flip":
      flipCard(target);
      break;
    case "cards-prev":
      state.index--;
      state.flipped = false;
      renderCards();
      break;
    case "cards-next":
      state.index++;
      state.flipped = false;
      renderCards();
      break;
    case "cards-restart":
      showCards(state.topicIndex);
      break;
    case "quiz-start":
      startQuiz();
      break;
    case "mc-answer":
      if (!state.answer) submitAnswer(target.dataset.option);
      break;
    case "sa-submit":
      submitShortAnswer();
      break;
    case "quiz-next":
      nextQuestion();
      break;
    case "quiz-retake":
      startQuiz();
      break;
  }
});

function submitShortAnswer() {
  const input = document.getElementById("answer");
  if (state.answer || !input || !input.value.trim()) return;
  submitAnswer(input.value);
}

app.addEventListener("input", (event) => {
  if (event.target.id === "name") {
    studentName = event.target.value;
    app.querySelector('[data-action="quiz-start"]').disabled = !studentName.trim();
  } else if (event.target.id === "answer") {
    app.querySelector('[data-action="sa-submit"]').disabled = !event.target.value.trim();
  }
});

app.addEventListener("keydown", (event) => {
  // Enter while the pinyin keyboard is still composing picks characters; it must not submit.
  if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return;
  const { target } = event;
  if (target.id !== "name" && target.id !== "answer" && target.dataset.action !== "flip") return;
  // Stop this Enter from also activating the Next button that gets focus after submitting.
  event.preventDefault();
  if (target.id === "name" && studentName.trim()) startQuiz();
  else if (target.id === "answer") submitShortAnswer();
  else if (target.dataset.action === "flip") flipCard(target);
});

function flipCard(card) {
  state.flipped = !state.flipped;
  card.classList.toggle("flipped", state.flipped);
  state.revealed.add(state.index);
  app.querySelector('[data-action="cards-next"]').disabled = false;
}

window.addEventListener("hashchange", route);
initSpeech();
route();

import { test } from "node:test";
import assert from "node:assert/strict";
import * as platforms from "./fixtures/voices.js";

// A stand-in for window.speechSynthesis that reproduces the browser bugs behind issue #10:
// - `paused`: Chrome can be left paused, and then queues utterances without playing them.
// - Chrome drops an utterance spoken in the same moment as a cancel() that stopped another one.
// - `failing` voices fire an error instead of playing, like Chrome's online Google voices.
function fakeSynth(voices, { paused = false, failing = [] } = {}) {
  const played = [];
  let cancelledAt = -1;
  let current = null;
  const synth = {
    paused,
    get speaking() {
      return current !== null;
    },
    pending: false,
    getVoices: () => voices,
    addEventListener() {},
    resume() {
      synth.paused = false;
    },
    cancel() {
      const stopped = current;
      if (stopped) cancelledAt = Date.now();
      current = null;
      stopped?.onerror?.({ error: "interrupted" });
    },
    speak(u) {
      if (synth.paused || Date.now() === cancelledAt) return;
      if (failing.includes(u.voice.name)) return u.onerror?.({ error: "synthesis-failed" });
      played.push(u.voice.name);
      current = u; // still talking until the test calls finish()
    },
  };
  const finish = () => {
    const done = current;
    current = null;
    done?.onend?.();
  };
  return { synth, played, finish };
}

// speech.js reads window.speechSynthesis when it loads, so each test imports a fresh copy.
async function load(voices, options) {
  const fake = fakeSynth(voices, options);
  let hasTts = null;
  globalThis.document = { body: { classList: { toggle: (_, on) => (hasTts = on) } } };
  globalThis.window = { speechSynthesis: fake.synth };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  const speech = await import(`../../site/js/speech.js?${Math.random()}`);
  speech.initSpeech();
  return { ...speech, ...fake, hasTts: () => hasTts };
}

async function pickVoice(voices) {
  const { speak, played } = await load(voices);
  speak("你好");
  return played[0] ?? null;
}

const v = (name, lang = "zh-CN", localService = true) => ({ name, lang, localService });

// ---------- Which voice each platform uses ----------

test("Chrome on Windows uses its online Google voice when it's the only Mandarin voice", async () => {
  assert.equal(await pickVoice(platforms.chromeWindows), "Google 普通话（中国大陆）");
});

test("Chrome on Windows prefers an installed Microsoft voice over the online Google voice", async () => {
  assert.equal(await pickVoice(platforms.chromeWindowsChinesePack), "Microsoft Huihui - Chinese (Simplified, PRC)");
});

test("Edge on Windows uses its female Natural voice", async () => {
  assert.equal(await pickVoice(platforms.edgeWindows), "Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)");
});

test("Chrome on Android uses the phone's Mandarin voice", async () => {
  assert.equal(await pickVoice(platforms.chromeAndroid), "Chinese China");
});

test("Safari on iPhone and Mac uses Tingting", async () => {
  assert.equal(await pickVoice(platforms.safariApple), "Tingting");
});

test("prefers a female Mandarin voice over a male one", async () => {
  assert.equal(await pickVoice([v("Microsoft Kangkang"), v("Microsoft Xiaoxiao")]), "Microsoft Xiaoxiao");
  assert.equal(await pickVoice([v("Li-Mu"), v("Tingting")]), "Tingting");
});

test("an installed male voice beats an online female one", async () => {
  assert.equal(await pickVoice([v("Google 普通话", "zh-CN", false), v("Kangkang")]), "Kangkang");
});

test("unknown voices beat known male voices, and the browser's order is kept otherwise", async () => {
  assert.equal(await pickVoice([v("Yunxi"), v("Mystery voice"), v("Other voice")]), "Mystery voice");
});

test("ignores Cantonese and Taiwanese voices; falls back to a male Mandarin voice", async () => {
  assert.equal(await pickVoice([v("Sinji", "zh-HK"), v("Meijia", "zh-TW"), v("Kangkang")]), "Kangkang");
});

test("no Mandarin voice means no audio, and the 🔊 buttons stay hidden", async () => {
  const { speak, played, hasTts } = await load([v("Samantha", "en-US"), v("Sinji", "zh-HK")]);
  speak("你好");
  assert.deepEqual(played, []);
  assert.equal(hasTts(), false);
});

// ---------- Getting sound out (issue #10: buttons show up but play nothing) ----------

test("speaks even when Chrome has been left paused", async () => {
  const { speak, played } = await load(platforms.chromeWindows, { paused: true });
  speak("你好");
  assert.deepEqual(played, ["Google 普通话（中国大陆）"]);
});

test("tapping 🔊 while a word is still playing plays the new word", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { speak, played } = await load(platforms.chromeAndroid);
  speak("你好");
  speak("再见"); // first word still playing
  t.mock.timers.tick(100);
  assert.deepEqual(played, ["Chinese China", "Chinese China"]);
});

test("the first tap speaks right away, inside the tap (iOS requires it)", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { speak, played } = await load(platforms.safariApple);
  speak("你好");
  assert.deepEqual(played, ["Tingting"]); // no timers ticked
});

test("a finished word doesn't delay the next tap", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { speak, played, finish } = await load(platforms.safariApple);
  speak("你好");
  finish();
  speak("再见");
  assert.deepEqual(played, ["Tingting", "Tingting"]);
});

test("when the online voice fails, retries the same word with the next Mandarin voice", async () => {
  const voices = [v("Google 普通话", "zh-CN", false), v("Kangkang", "zh-CN", false)];
  const { speak, played, finish } = await load(voices, { failing: ["Google 普通话"] });
  speak("你好");
  assert.deepEqual(played, ["Kangkang"]);
  finish();
  speak("再见"); // and keeps using it
  assert.deepEqual(played, ["Kangkang", "Kangkang"]);
});

test("when every Mandarin voice fails, gives up and hides the 🔊 buttons", async () => {
  const { speak, played, hasTts } = await load(platforms.chromeWindows, { failing: ["Google 普通话（中国大陆）"] });
  speak("你好");
  assert.deepEqual(played, []);
  assert.equal(hasTts(), false);
});

test("interrupting a word doesn't mark its voice as broken", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { speak, played } = await load(platforms.safariApple);
  speak("你好");
  speak("再见"); // cancels 你好, which fires an "interrupted" error
  t.mock.timers.tick(100);
  assert.deepEqual(played, ["Tingting", "Tingting"]);
});

test("a blocked tap (not-allowed) doesn't mark the voice as broken", async () => {
  const { speak, played, synth } = await load(platforms.safariApple);
  const realSpeak = synth.speak;
  synth.speak = (u) => u.onerror({ error: "not-allowed" });
  speak("你好");
  synth.speak = realSpeak;
  speak("再见");
  assert.deepEqual(played, ["Tingting"]);
});

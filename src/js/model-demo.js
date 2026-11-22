/**
 * A recorded model demo: a chip per prompt, four sampling controls, and what the model wrote for
 * that prompt at those settings, replayed token by token at about the speed it was generated.
 * Nothing runs in the browser. Every setting the controls can reach was recorded ahead of time: a
 * small manifest names the prompts and the grid of settings, and each prompt's recordings sit in a
 * file of their own, fetched only once that prompt is on screen.
 *
 *   <figure class="blog-figure">
 *   <div class="model-demo" data-model-demo="/assets/blog/deepseek-v3-from-scratch/demo.json"></div>
 *   <figcaption>…</figcaption>
 *   </figure>
 *
 * The manifest:
 *   { format, tokensPerSecond,
 *     grid: { temperature: [], topK: [], repetitionPenalty: [], samples, maxTokens },
 *     defaults: { temperature, topK, repetitionPenalty, maxTokens },
 *     prompts: [{ prompt, file, samples: [[text, cuts], …] }] }
 * A prompt's `samples` are its recordings at the default settings, so the demo plays before its
 * file arrives, and still plays if it never does. That file is { texts: [], cuts: [], runs: [] }:
 * runs[((t * K + k) * P + p) * S + s] is the index of the text recorded at temperature t, top-k k,
 * penalty p, sample s (each an index into the grid). A text's `cuts` has one base-36 digit per
 * token, the number of characters that token added. A recording with fewer tokens than
 * grid.maxTokens is one the model ended itself.
 *
 * With format "chat" a prompt is a question and the recording is the model's reply, so the question
 * sits on a line of its own. Otherwise the recording continues the prompt's sentence.
 */

import { escapeHtml } from './pages/shared.js';

let teardown = [];

/** Where a sample's last finished sentence ends, or -1 when the whole text is finished (or none of it is). */
function lastSentenceEnd(text) {
  const end = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'));
  return end < 0 || !text.slice(end + 1).trim() ? -1 : end;
}

/** A recording as the pieces of text its tokens added, in order. */
function toPieces(text, cuts) {
  const pieces = [];
  let at = 0;
  for (const digit of cuts) {
    const length = parseInt(digit, 36);
    pieces.push(text.slice(at, at + length));
    at += length;
  }
  return pieces;
}

function mount(box, data, manifestUrl) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = 1000 / (data.tokensPerSecond || 25);
  const { grid, defaults } = data;
  const chat = data.format === 'chat';
  const T = grid.temperature;
  const K = grid.topK;
  const P = grid.repetitionPenalty;
  const S = grid.samples;
  const home = {
    t: Math.max(0, T.indexOf(defaults.temperature)),
    k: Math.max(0, K.indexOf(defaults.topK)),
    p: Math.max(0, P.indexOf(defaults.repetitionPenalty)),
    n: defaults.maxTokens
  };
  const setting = { ...home };
  const sampleOf = data.prompts.map(() => 0); // the sample each prompt is on
  const fallback = data.prompts.map(({ samples }) => samples.map(([text, cuts]) => toPieces(text, cuts)));
  const grids = new Map();   // prompt → its recordings, null if they failed to load, or the promise of either
  const decoded = new Map(); // "prompt:text" → pieces
  const aborter = new AbortController();
  let current = 0;
  let pieces = [];  // the recording on screen, cut to the token limit
  let whole = false; // whether that is all of it, up to where the model stopped by itself
  let revealed = 0; // how many of its pieces are written out
  let timer = null;
  let settle = null;

  const optionButtons = (values, label) => values
    .map((value, i) => `<button type="button" class="model-demo-option" data-option="${i}" aria-pressed="false">${escapeHtml(label(value))}</button>`)
    .join('');
  box.classList.toggle('model-demo--chat', chat);
  box.innerHTML = `
    <div class="favourites-chips">
      ${data.prompts.map((p, i) => `<button type="button" class="fav-chip" data-prompt="${i}" aria-pressed="false">${escapeHtml(p.prompt)}</button>`).join('')}
    </div>
    <div class="model-demo-stage">
      <p class="model-demo-text"><span class="model-demo-prompt"></span><span class="model-demo-out"></span><span class="model-demo-tail"></span><span class="model-demo-caret" hidden></span></p>
      <div class="model-demo-controls">
        <label class="model-demo-control">
          <span class="model-demo-label">Temperature <output data-value="t"></output></span>
          <input type="range" min="0" max="${T.length - 1}" step="1" data-knob="t">
        </label>
        <div class="model-demo-control" role="group" aria-label="Top-k">
          <span class="model-demo-label">Top-k</span>
          <span class="model-demo-options" data-knob="k">${optionButtons(K, (k) => (k ? String(k) : 'off'))}</span>
        </div>
        <label class="model-demo-control">
          <span class="model-demo-label">Max tokens <output data-value="n"></output></span>
          <input type="range" min="10" max="${grid.maxTokens}" step="10" data-knob="n">
        </label>
        <div class="model-demo-control" role="group" aria-label="Repetition penalty">
          <span class="model-demo-label">Repetition penalty</span>
          <span class="model-demo-options" data-knob="p">${optionButtons(P, (p) => p.toFixed(1))}</span>
        </div>
      </div>
      <div class="model-demo-bar">
        <button type="button" class="model-demo-again">Another sample</button>
        <span class="model-demo-note"></span>
      </div>
    </div>
  `;
  const chips = [...box.querySelectorAll('.fav-chip')];
  const textEl = box.querySelector('.model-demo-text');
  const promptEl = box.querySelector('.model-demo-prompt');
  const outEl = box.querySelector('.model-demo-out');
  const tailEl = box.querySelector('.model-demo-tail');
  const caret = box.querySelector('.model-demo-caret');
  const note = box.querySelector('.model-demo-note');
  const again = box.querySelector('.model-demo-again');
  const sliders = { t: box.querySelector('input[data-knob="t"]'), n: box.querySelector('input[data-knob="n"]') };
  const values = { t: box.querySelector('[data-value="t"]'), n: box.querySelector('[data-value="n"]') };
  const options = {
    k: [...box.querySelectorAll('[data-knob="k"] .model-demo-option')],
    p: [...box.querySelectorAll('[data-knob="p"] .model-demo-option')]
  };

  /** Fetch a prompt's recordings once. Resolves to null if they can't be had; the defaults still play. */
  const loadGrid = (i) => {
    if (!grids.has(i)) {
      const url = new URL(data.prompts[i].file, manifestUrl);
      grids.set(i, fetch(url, { signal: aborter.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${url.pathname} (${res.status})`))))
        .then((recordings) => {
          if (recordings.runs.length !== T.length * K.length * P.length * S) throw new Error(`${url.pathname} doesn't match the grid`);
          grids.set(i, recordings);
          return recordings;
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error('Failed to load recorded samples:', err);
          grids.set(i, null);
          return null;
        }));
    }
    return Promise.resolve(grids.get(i));
  };
  /** Have a prompt's other settings ready for when a control moves. */
  const fetchFor = (i) => loadGrid(i).then(() => {
    if (current === i && box.isConnected) refresh();
  });
  const loaded = (i) => {
    const recordings = grids.get(i);
    return recordings && !(recordings instanceof Promise) ? recordings : null;
  };
  const failed = (i) => grids.get(i) === null;

  const textOf = (i, index) => {
    const key = `${i}:${index}`;
    if (!decoded.has(key)) {
      const recordings = loaded(i);
      decoded.set(key, toPieces(recordings.texts[index], recordings.cuts[index]));
    }
    return decoded.get(key);
  };

  /** The recording for the prompt at the current settings, or null while its file is on the way. */
  const recordingFor = (i) => {
    const recordings = loaded(i);
    if (recordings) {
      const at = ((setting.t * K.length + setting.k) * P.length + setting.p) * S;
      const distinct = [...new Set(recordings.runs.slice(at, at + S))];
      const sample = sampleOf[i] % distinct.length;
      return { pieces: textOf(i, distinct[sample]), sample, count: distinct.length };
    }
    const atHome = setting.t === home.t && setting.k === home.k && setting.p === home.p;
    if (!atHome && !failed(i)) return null;
    const sample = sampleOf[i] % fallback[i].length;
    return { pieces: fallback[i][sample], sample, count: fallback[i].length };
  };

  // The model runs out of tokens mid-sentence more often than not; grey that part out.
  // A reply it ended itself is whole, however its last line ends
  const finish = () => {
    const text = pieces.join('');
    const end = whole ? -1 : lastSentenceEnd(text);
    outEl.textContent = end < 0 ? text : text.slice(0, end + 1);
    tailEl.textContent = end < 0 ? '' : text.slice(end + 1);
    caret.hidden = true;
  };
  const tick = () => {
    outEl.append(pieces[revealed++]);
    if (revealed < pieces.length) timer = setTimeout(tick, interval);
    else finish();
  };

  /** Put a recording on screen. With `keep`, what it shares with the text already written stays put. */
  const show = (next, keep, complete) => {
    clearTimeout(timer);
    whole = complete;
    let from = 0;
    if (keep) {
      const limit = Math.min(revealed, pieces.length, next.length);
      while (from < limit && pieces[from] === next[from]) from++;
    }
    pieces = next;
    revealed = reduceMotion ? pieces.length : from;
    if (revealed >= pieces.length) {
      finish();
      return;
    }
    outEl.textContent = pieces.slice(0, revealed).join('');
    tailEl.textContent = '';
    caret.hidden = false;
    timer = setTimeout(tick, interval);
  };

  const syncControls = () => {
    const off = failed(current); // only the default settings are available for this prompt
    const shown = off ? home : setting;
    sliders.t.value = String(shown.t);
    sliders.t.setAttribute('aria-valuetext', T[shown.t].toFixed(1));
    values.t.textContent = T[shown.t].toFixed(1);
    sliders.n.value = String(setting.n);
    values.n.textContent = String(setting.n);
    sliders.t.disabled = off;
    for (const knob of ['k', 'p']) {
      // At temperature 0 the model takes its likeliest token, whatever top-k is
      const idle = off || (knob === 'k' && T[shown.t] === 0);
      options[knob].forEach((button, i) => {
        button.setAttribute('aria-pressed', String(i === shown[knob]));
        button.disabled = idle;
      });
    }
    chips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === current)));
    promptEl.textContent = data.prompts[current].prompt;
  };

  // Hold the height of the longest recording at this token limit, so the page below doesn't move
  // while text arrives or a setting changes
  let measured = '';
  const measure = () => {
    const width = textEl.clientWidth;
    const recordings = loaded(current);
    const key = `${width}:${current}:${setting.n}:${recordings ? 1 : 0}`;
    if (!width || key === measured) return;
    measured = key;
    const candidates = recordings
      ? recordings.texts.map((text, i) => {
        let length = 0;
        const cuts = recordings.cuts[i];
        for (let j = 0; j < cuts.length && j < setting.n; j++) length += parseInt(cuts[j], 36);
        return text.slice(0, length);
      })
      : fallback[current].map((sample) => sample.slice(0, setting.n).join(''));
    candidates.sort((a, b) => b.length - a.length);
    const probe = textEl.cloneNode(false);
    probe.style.cssText = 'position:absolute;visibility:hidden;min-height:0;left:0;right:0;';
    probe.style.width = `${width}px`;
    const probePrompt = promptEl.cloneNode(false);
    const probeOut = outEl.cloneNode(false);
    probe.append(probePrompt, probeOut);
    probePrompt.textContent = data.prompts[current].prompt;
    textEl.parentNode.appendChild(probe);
    let tallest = 0;
    for (const text of candidates.slice(0, 3)) {
      probeOut.textContent = text;
      tallest = Math.max(tallest, probe.offsetHeight);
    }
    probe.remove();
    textEl.style.minHeight = `${tallest}px`;
  };

  /** Once a prompt's file is in: the controls, the note and the held height may all have changed. */
  const refresh = () => {
    syncControls();
    const recording = recordingFor(current);
    if (recording) describe(recording);
    measure();
  };
  /** Whether the token limit leaves a recording as the model ended it. */
  const isWhole = (recording) => recording.pieces.length < grid.maxTokens && recording.pieces.length <= setting.n;
  const describe = (recording) => {
    again.disabled = recording.count < 2;
    let which = recording.count > 1
      ? `Recorded sample ${recording.sample + 1} of ${recording.count}`
      : (T[setting.t] === 0 && !failed(current) ? 'Recorded, the one answer at temperature 0' : 'Recorded, both samples match here');
    if (chat) which += isWhole(recording) ? ', ended by the model' : `, cut off at ${setting.n} tokens`;
    note.textContent = failed(current) ? `${which}; other settings failed to load` : which;
  };

  /** Bring the stage in line with the prompt and settings. */
  const update = (keep) => {
    const i = current;
    syncControls();
    const recording = recordingFor(i);
    if (!recording) {
      // Settings other than the defaults need the prompt's file
      again.disabled = true;
      note.textContent = 'Loading recorded samples…';
      loadGrid(i).then(() => {
        if (current === i && box.isConnected) update(keep);
      });
      return;
    }
    describe(recording);
    measure();
    show(recording.pieces.slice(0, setting.n), keep, isWhole(recording));
  };

  box.addEventListener('click', (ev) => {
    const chip = ev.target.closest('.fav-chip');
    const option = ev.target.closest('.model-demo-option');
    if (chip) {
      current = Number(chip.dataset.prompt);
      update(false);
      fetchFor(current);
    } else if (option) {
      setting[option.parentNode.dataset.knob] = Number(option.dataset.option);
      update(true);
    } else if (ev.target.closest('.model-demo-again')) {
      sampleOf[current] += 1;
      update(false);
    }
  });
  box.addEventListener('input', (ev) => {
    const knob = ev.target.dataset?.knob;
    if (!sliders[knob]) return;
    setting[knob] = Number(ev.target.value);
    syncControls();
    // A slider passes through every stop on its way: wait until it rests before rewriting the text
    clearTimeout(settle);
    settle = setTimeout(() => update(true), 140);
  });

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(textEl);
  document.fonts?.ready.then(() => {
    measured = ''; // the serif face changes the line breaks once it loads
    measure();
  });

  // The first prompt waits with its text unwritten until the demo scrolls into view,
  // and only then are its other settings fetched
  syncControls();
  note.textContent = `Recorded sample 1 of ${fallback[0].length}`;
  const io = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) return;
    io.disconnect();
    update(false);
    fetchFor(current);
  }, { threshold: 0.35 });
  io.observe(box.querySelector('.model-demo-stage'));

  return () => {
    clearTimeout(timer);
    clearTimeout(settle);
    aborter.abort();
    io.disconnect();
    resizeObserver.disconnect();
  };
}

/** Call after every navigation; stops the previous page's replays. */
export function initModelDemo(root) {
  teardown.forEach((stop) => stop());
  teardown = [];
  root?.querySelectorAll('[data-model-demo]').forEach(async (box) => {
    try {
      const manifestUrl = new URL(box.dataset.modelDemo, location.href);
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`${box.dataset.modelDemo} (${res.status})`);
      const data = await res.json();
      if (!box.isConnected) return; // the reader left while it loaded
      teardown.push(mount(box, data, manifestUrl));
    } catch (err) {
      console.error('Failed to load the model demo:', err);
      box.innerHTML = '<p class="blog-soon">Failed to load the recorded samples.</p>';
    }
  });
}

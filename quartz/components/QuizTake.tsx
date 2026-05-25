import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * QuizTake — subject-filtered free-recall quiz component.
 *
 * Renders on /quiz/take only (wired via ConditionalRender in
 * quartz.layout.ts). Reads /static/corpus.json — the same file used
 * by Visualize sub-pages — and the per-page `quiz` arrays the
 * CorpusIndex emitter normalizes from page frontmatter.
 *
 * The whole experience runs in one component because state is
 * intentionally ephemeral: a quiz session lives until the user
 * closes the tab. No localStorage, no persistence — score from one
 * session doesn't influence the next. If we add spaced repetition
 * later, that's a separate concern that wraps around this one.
 */
const QuizTake: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="quiz-app">
      {/* Setup screen — visible by default, hidden when a quiz starts. */}
      <div class="search-page-card quiz-screen" id="quiz-setup">
        <h3 class="search-page-label">Start a quiz</h3>

        <label for="quiz-subject" class="quiz-label">Subject</label>
        <select id="quiz-subject" class="quiz-select" aria-label="Quiz subject">
          <option value="">Loading subjects…</option>
        </select>

        <p class="quiz-hint" id="quiz-setup-hint">
          Pick a subject to see how many questions are available.
        </p>

        <div class="notes-controls">
          <button type="button" id="quiz-start-btn" class="jb-btn jb-btn-primary" disabled>
            Start
          </button>
        </div>
      </div>

      {/* Asking screen — populated dynamically as the session progresses. */}
      <div class="search-page-card quiz-screen" id="quiz-asking" hidden>
        <div class="quiz-progress" id="quiz-progress" aria-live="polite"></div>

        <div class="quiz-question" id="quiz-question"></div>

        <div class="quiz-answer" id="quiz-answer" hidden></div>

        <div class="quiz-source" id="quiz-source" hidden></div>

        <div class="notes-controls quiz-controls">
          <button type="button" id="quiz-show-answer-btn" class="jb-btn">
            Show answer
          </button>
          <button type="button" id="quiz-missed-btn" class="jb-btn jb-btn-secondary" hidden>
            Missed it
          </button>
          <button type="button" id="quiz-got-btn" class="jb-btn jb-btn-primary" hidden>
            Got it
          </button>
        </div>
      </div>

      {/* Done screen — score + miss list + restart. */}
      <div class="search-page-card quiz-screen" id="quiz-done" hidden>
        <h3 class="search-page-label">Done</h3>

        <div class="quiz-score" id="quiz-score" aria-live="polite"></div>

        <div class="quiz-misses-wrap" id="quiz-misses-wrap" hidden>
          <h4 class="quiz-misses-heading">Questions to revisit</h4>
          <div id="quiz-misses" class="quiz-misses"></div>
        </div>

        <div class="notes-controls">
          <button type="button" id="quiz-restart-btn" class="jb-btn jb-btn-primary">
            Take another
          </button>
        </div>
      </div>
    </div>
  )
}

QuizTake.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("quiz-app")
  if (!root) return

  /* ───── DOM refs ──────────────────────────────────────────────── */
  const setupScreen = document.getElementById("quiz-setup")
  const askingScreen = document.getElementById("quiz-asking")
  const doneScreen = document.getElementById("quiz-done")

  const subjectSelect = document.getElementById("quiz-subject")
  const startBtn = document.getElementById("quiz-start-btn")
  const setupHint = document.getElementById("quiz-setup-hint")

  const progressEl = document.getElementById("quiz-progress")
  const questionEl = document.getElementById("quiz-question")
  const answerEl = document.getElementById("quiz-answer")
  const sourceEl = document.getElementById("quiz-source")
  const showAnswerBtn = document.getElementById("quiz-show-answer-btn")
  const missedBtn = document.getElementById("quiz-missed-btn")
  const gotBtn = document.getElementById("quiz-got-btn")

  const scoreEl = document.getElementById("quiz-score")
  const missesWrap = document.getElementById("quiz-misses-wrap")
  const missesEl = document.getElementById("quiz-misses")
  const restartBtn = document.getElementById("quiz-restart-btn")

  if (
    !setupScreen || !askingScreen || !doneScreen ||
    !subjectSelect || !startBtn || !setupHint ||
    !progressEl || !questionEl || !answerEl || !sourceEl ||
    !showAnswerBtn || !missedBtn || !gotBtn ||
    !scoreEl || !missesWrap || !missesEl || !restartBtn
  ) {
    return
  }

  /* ───── Helpers ───────────────────────────────────────────────── */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  // Fisher-Yates in-place shuffle. Used both for the question
  // sequence within a subject and (later) any tiebreakers.
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  /* ───── Session state ─────────────────────────────────────────── */
  // Built from corpus on Start. Each entry is one question:
  //   { q, a, slug, title, subjects }
  let questions = []
  let currentIndex = 0
  // Per-question result. Map from index → "got" | "missed".
  let results = new Map()

  // Built once on load. subjectName → { count, pages: [...] }
  let subjectIndex = new Map()

  /* ───── Screen toggling ───────────────────────────────────────── */

  function showScreen(which) {
    setupScreen.hidden = which !== "setup"
    askingScreen.hidden = which !== "asking"
    doneScreen.hidden = which !== "done"
  }

  /* ───── Setup-screen behavior ─────────────────────────────────── */

  // Build the subject dropdown from the corpus. Subjects with zero
  // questions don't appear — there's nothing to do with them here.
  function populateSubjects() {
    const subjectNames = Array.from(subjectIndex.keys()).sort()

    subjectSelect.innerHTML = ""

    const placeholder = document.createElement("option")
    placeholder.value = ""
    placeholder.textContent = "— pick a subject —"
    subjectSelect.appendChild(placeholder)

    for (const name of subjectNames) {
      const opt = document.createElement("option")
      opt.value = name
      const entry = subjectIndex.get(name)
      const count = entry ? entry.count : 0
      opt.textContent = name + " (" + count + " question" + (count === 1 ? "" : "s") + ")"
      subjectSelect.appendChild(opt)
    }

    if (subjectNames.length === 0) {
      // No subjects with quiz entries yet. Surface this clearly.
      setupHint.textContent =
        "No quiz questions in the corpus yet. Add a quiz: array to any page's frontmatter and rebuild."
      startBtn.disabled = true
    } else {
      setupHint.textContent =
        "Pick a subject to see how many questions are available."
    }
  }

  function onSubjectChange() {
    const subject = subjectSelect.value
    if (!subject) {
      startBtn.disabled = true
      setupHint.textContent =
        "Pick a subject to see how many questions are available."
      return
    }
    const entry = subjectIndex.get(subject)
    const count = entry ? entry.count : 0
    if (count === 0) {
      startBtn.disabled = true
      setupHint.textContent = "No questions in this subject."
      return
    }
    startBtn.disabled = false
    setupHint.textContent =
      count + " question" + (count === 1 ? "" : "s") + " ready."
  }

  function onStartClick() {
    const subject = subjectSelect.value
    if (!subject) return
    const entry = subjectIndex.get(subject)
    if (!entry || entry.count === 0) return

    // Build the question sequence: flatten quiz arrays of all pages
    // tagged with this subject. Shuffle for variety across sessions.
    questions = []
    for (const page of entry.pages) {
      for (const qa of page.quiz) {
        questions.push({
          q: qa.q,
          a: qa.a,
          slug: page.slug,
          title: page.title,
          subjects: page.subjects,
        })
      }
    }
    shuffle(questions)

    currentIndex = 0
    results = new Map()

    showScreen("asking")
    renderCurrentQuestion()
  }

  /* ───── Asking-screen behavior ────────────────────────────────── */

  function renderCurrentQuestion() {
    if (currentIndex >= questions.length) {
      renderDone()
      return
    }

    const q = questions[currentIndex]
    progressEl.textContent =
      "Question " + (currentIndex + 1) + " of " + questions.length
    questionEl.innerHTML = "<p>" + escapeHtml(q.q) + "</p>"
    answerEl.innerHTML = "<p>" + escapeHtml(q.a) + "</p>"
    answerEl.hidden = true
    sourceEl.innerHTML =
      "from <a href=\\"/" + escapeHtml(q.slug) + "\\">" + escapeHtml(q.title) + "</a>"
    sourceEl.hidden = true

    showAnswerBtn.hidden = false
    missedBtn.hidden = true
    gotBtn.hidden = true
  }

  function onShowAnswerClick() {
    answerEl.hidden = false
    sourceEl.hidden = false
    showAnswerBtn.hidden = true
    missedBtn.hidden = false
    gotBtn.hidden = false
    // Focus shifts to "Got it" since that's the affirmative path.
    gotBtn.focus()
  }

  function recordAndAdvance(result) {
    results.set(currentIndex, result)
    currentIndex++
    renderCurrentQuestion()
  }

  function onGotClick() {
    recordAndAdvance("got")
  }
  function onMissedClick() {
    recordAndAdvance("missed")
  }

  /* ───── Done-screen behavior ──────────────────────────────────── */

  function renderDone() {
    showScreen("done")

    const total = questions.length
    let got = 0
    let missed = 0
    const missedList = []
    for (let i = 0; i < questions.length; i++) {
      const result = results.get(i)
      if (result === "got") got++
      else if (result === "missed") {
        missed++
        missedList.push({ index: i, question: questions[i] })
      }
    }

    const pct = total > 0 ? Math.round((got / total) * 100) : 0
    scoreEl.innerHTML =
      "<div class=\\"quiz-score-line\\"><strong>" + got + "</strong> of <strong>" +
      total + "</strong> (" + pct + "%)</div>" +
      "<div class=\\"quiz-score-detail\\">" +
      got + " correct · " + missed + " missed" +
      "</div>"

    if (missedList.length === 0) {
      missesWrap.hidden = true
    } else {
      missesWrap.hidden = false
      missesEl.innerHTML = missedList.map(({ question: q }) =>
        '<div class="quiz-miss-row">' +
          '<div class="quiz-miss-q">' + escapeHtml(q.q) + '</div>' +
          '<div class="quiz-miss-a">' + escapeHtml(q.a) + '</div>' +
          '<div class="quiz-miss-source">' +
            'from <a href="/' + escapeHtml(q.slug) + '">' + escapeHtml(q.title) + '</a>' +
          '</div>' +
        '</div>'
      ).join("")
    }
  }

  function onRestartClick() {
    // Reset to setup. Don't clear the subject dropdown — likely the
    // user wants the same subject again, or to pick a different one
    // from the same populated list.
    showScreen("setup")
    questions = []
    currentIndex = 0
    results = new Map()
  }

  /* ───── Wire up event listeners ───────────────────────────────── */

  subjectSelect.addEventListener("change", onSubjectChange)
  startBtn.addEventListener("click", onStartClick)
  showAnswerBtn.addEventListener("click", onShowAnswerClick)
  gotBtn.addEventListener("click", onGotClick)
  missedBtn.addEventListener("click", onMissedClick)
  restartBtn.addEventListener("click", onRestartClick)

  // Keyboard shortcuts while asking — space/enter shows answer, then
  // y/n (or g/m) grades. Reduces friction on a real keyboard.
  function onKeyDown(e) {
    if (askingScreen.hidden) return
    // Don't intercept if a text input has focus (none in this UI but
    // defensive).
    const tag = (e.target && e.target.tagName) || ""
    if (tag === "INPUT" || tag === "TEXTAREA") return

    if (!showAnswerBtn.hidden && (e.key === " " || e.key === "Enter")) {
      e.preventDefault()
      onShowAnswerClick()
      return
    }
    if (!gotBtn.hidden) {
      if (e.key === "y" || e.key === "Y" || e.key === "g" || e.key === "G") {
        e.preventDefault()
        onGotClick()
      } else if (e.key === "n" || e.key === "N" || e.key === "m" || e.key === "M") {
        e.preventDefault()
        onMissedClick()
      }
    }
  }
  document.addEventListener("keydown", onKeyDown)

  if (window.addCleanup) {
    window.addCleanup(() => {
      document.removeEventListener("keydown", onKeyDown)
    })
  }

  /* ───── Initial corpus load ───────────────────────────────────── */

  fetch("/static/corpus.json")
    .then(r => r.json())
    .then(data => {
      // Build subjectIndex: subject → { count, pages: [...] }
      // Only pages with at least one quiz entry contribute.
      const idx = new Map()
      for (const page of data.pages) {
        if (!Array.isArray(page.quiz) || page.quiz.length === 0) continue
        const subjects = Array.isArray(page.subjects) ? page.subjects : []
        for (const subject of subjects) {
          if (!idx.has(subject)) {
            idx.set(subject, { count: 0, pages: [] })
          }
          const entry = idx.get(subject)
          entry.count += page.quiz.length
          entry.pages.push(page)
        }
      }
      subjectIndex = idx
      populateSubjects()
    })
    .catch(err => {
      setupHint.textContent = "Could not load the corpus: " + err.message
      startBtn.disabled = true
    })
})
`

QuizTake.css = `
#quiz-app {
  max-width: 720px;
  margin: 1rem auto;
}

.quiz-screen {
  margin: 0;
}

.quiz-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--secondary);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.quiz-select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  background: var(--light);
  color: var(--dark);
  font-family: inherit;
  font-size: 1rem;
  margin-bottom: 0.6rem;
  cursor: pointer;
}
.quiz-select:focus {
  outline: 2px solid var(--secondary);
  outline-offset: -2px;
}

.quiz-hint {
  color: var(--gray);
  font-size: 0.85rem;
  font-style: italic;
  margin: 0.3rem 0 1rem;
}

.quiz-progress {
  font-size: 0.8rem;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.quiz-question {
  font-size: 1.15rem;
  line-height: 1.5;
  color: var(--dark);
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--lightgray);
}
.quiz-question p {
  margin: 0;
}

.quiz-answer {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--darkgray);
  margin-bottom: 0.6rem;
  padding: 0.8rem 1rem;
  background: color-mix(in srgb, var(--light) 92%, var(--secondary) 8%);
  border-left: 3px solid var(--secondary);
  border-radius: 0 4px 4px 0;
}
.quiz-answer p {
  margin: 0;
}

.quiz-source {
  font-size: 0.8rem;
  color: var(--gray);
  font-style: italic;
  margin-bottom: 1rem;
}
.quiz-source a {
  color: var(--secondary);
  text-decoration: none;
}
.quiz-source a:hover {
  text-decoration: underline;
}

.quiz-controls {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

/* Done screen */
.quiz-score {
  margin: 1rem 0 1.5rem;
  text-align: center;
}
.quiz-score-line {
  font-size: 1.8rem;
  color: var(--dark);
  margin-bottom: 0.3rem;
}
.quiz-score-line strong {
  color: var(--secondary);
  font-weight: 700;
}
.quiz-score-detail {
  font-size: 0.9rem;
  color: var(--gray);
}

.quiz-misses-wrap {
  margin: 1rem 0 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--lightgray);
}
.quiz-misses-heading {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.8rem;
}

.quiz-misses {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quiz-miss-row {
  padding: 0.8rem 1rem;
  background: color-mix(in srgb, var(--light) 95%, var(--dark) 5%);
  border-radius: 6px;
  border-left: 3px solid var(--gray);
}
.quiz-miss-q {
  font-weight: 500;
  color: var(--dark);
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
}
.quiz-miss-a {
  color: var(--darkgray);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.4rem;
}
.quiz-miss-source {
  font-size: 0.78rem;
  color: var(--gray);
  font-style: italic;
}
.quiz-miss-source a {
  color: var(--secondary);
  text-decoration: none;
}
.quiz-miss-source a:hover {
  text-decoration: underline;
}
`

export default (() => QuizTake) satisfies QuartzComponentConstructor

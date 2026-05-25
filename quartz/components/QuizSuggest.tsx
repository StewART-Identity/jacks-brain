import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * QuizSuggest — "Generate quiz questions" button.
 *
 * Renders at the bottom of any content page that can host quiz
 * questions. The page's slug is threaded through as a data attribute
 * on the root element so the inline script can read it.
 *
 * State machine (client-side, in the inline script):
 *   idle       → initial state. Shows current quiz count + button.
 *   triggering → POST /api/quiz/suggest in flight.
 *   polling    → workflow dispatched, polling /api/quiz/status every
 *                5 seconds to detect new questions.
 *   done       → quiz count increased. Show success + refresh link.
 *   failed     → POST failed, or polling timed out.
 *
 * The button uses the canonical .jb-btn style (with the secondary
 * modifier — this is a side action, not the focus of the page).
 */
const QuizSuggest: QuartzComponent = (props: QuartzComponentProps) => {
  const slug = props.fileData.slug ?? ""

  return (
    <div class="quiz-suggest" id="quiz-suggest-app" data-slug={slug}>
      <div class="quiz-suggest-inner">
        <div class="quiz-suggest-meta" id="quiz-suggest-meta">
          <span class="quiz-suggest-count" id="quiz-suggest-count">
            Loading quiz status…
          </span>
        </div>

        <div class="quiz-suggest-controls">
          <button
            type="button"
            id="quiz-suggest-btn"
            class="jb-btn jb-btn-secondary quiz-suggest-btn"
            disabled
          >
            Generate quiz questions
          </button>
        </div>

        <div class="quiz-suggest-status" id="quiz-suggest-status" hidden></div>
      </div>
    </div>
  )
}

QuizSuggest.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("quiz-suggest-app")
  if (!root) return

  const slug = root.getAttribute("data-slug") || ""
  if (!slug) return

  const countEl = document.getElementById("quiz-suggest-count")
  const btn = document.getElementById("quiz-suggest-btn")
  const statusEl = document.getElementById("quiz-suggest-status")
  if (!countEl || !btn || !statusEl) return

  // Baseline count at mount. We capture this BEFORE the user clicks
  // so we can detect "new questions landed" purely from the count
  // delta, without needing to track workflow run IDs.
  let baselineCount = 0

  // Polling state. Both null when idle.
  let pollIntervalId = null
  let pollStartTime = null
  const POLL_INTERVAL_MS = 5000
  const POLL_TIMEOUT_MS = 3 * 60 * 1000   // 3 minutes

  function setStatus(text, kind) {
    statusEl.hidden = false
    statusEl.innerHTML = ""
    const div = document.createElement("div")
    div.className = "quiz-suggest-msg " + (kind || "")
    div.textContent = text
    statusEl.appendChild(div)
  }

  function clearStatus() {
    statusEl.hidden = true
    statusEl.innerHTML = ""
  }

  function renderCountLine(count) {
    if (count === 0) {
      countEl.textContent = "No quiz questions yet."
      btn.textContent = "Generate quiz questions"
    } else {
      countEl.textContent = count + " quiz question" + (count === 1 ? "" : "s") + " on this page."
      btn.textContent = "Add more questions"
    }
  }

  async function fetchCount() {
    const res = await fetch("/api/quiz/status?slug=" + encodeURIComponent(slug))
    if (!res.ok) throw new Error("status fetch returned " + res.status)
    const data = await res.json()
    return typeof data.count === "number" ? data.count : 0
  }

  async function initialLoad() {
    try {
      baselineCount = await fetchCount()
      renderCountLine(baselineCount)
      btn.disabled = false
    } catch (err) {
      countEl.textContent = "Could not load quiz status."
      btn.disabled = true
    }
  }

  function stopPolling() {
    if (pollIntervalId !== null) {
      clearInterval(pollIntervalId)
      pollIntervalId = null
    }
    pollStartTime = null
  }

  async function pollOnce() {
    try {
      const count = await fetchCount()
      if (count > baselineCount) {
        // Success. Update UI and stop polling.
        const added = count - baselineCount
        baselineCount = count
        stopPolling()
        renderCountLine(count)
        const msg = "Generated " + added + " new question" + (added === 1 ? "" : "s") +
          ". Total: " + count + ". Refresh to see them in the Quiz section once the next build completes (~30s)."
        setStatus(msg, "success")
        btn.disabled = false
        return
      }

      const elapsed = Date.now() - (pollStartTime || Date.now())
      if (elapsed > POLL_TIMEOUT_MS) {
        stopPolling()
        setStatus(
          "Generation took longer than expected. Check the Actions tab on GitHub — the workflow may still be running or it may have failed.",
          "error",
        )
        btn.disabled = false
        return
      }

      // Still polling. Update the status text with elapsed seconds so
      // the user sees progress.
      const seconds = Math.floor(elapsed / 1000)
      setStatus(
        "Generating questions… (" + seconds + "s elapsed, usually 60-90s)",
        "pending",
      )
    } catch (err) {
      // Transient errors during polling are non-fatal — just try
      // again on the next interval. If it's consistently broken the
      // timeout will eventually fire.
      console.warn("Quiz status poll failed:", err)
    }
  }

  async function onSuggestClick() {
    btn.disabled = true
    setStatus("Dispatching workflow…", "pending")

    try {
      const res = await fetch("/api/quiz/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setStatus("Failed to dispatch: " + (data.error || "unknown error"), "error")
        btn.disabled = false
        return
      }

      // Start polling.
      pollStartTime = Date.now()
      setStatus("Workflow dispatched. Generating questions…", "pending")
      pollIntervalId = setInterval(pollOnce, POLL_INTERVAL_MS)
      // Fire one poll immediately so the elapsed counter starts ticking.
      pollOnce()
    } catch (err) {
      setStatus("Network error dispatching workflow: " + err.message, "error")
      btn.disabled = false
    }
  }

  btn.addEventListener("click", onSuggestClick)

  if (window.addCleanup) {
    window.addCleanup(() => {
      stopPolling()
    })
  }

  initialLoad()
})
`

QuizSuggest.css = `
.quiz-suggest {
  margin: 2.5rem 0 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--lightgray);
}

.quiz-suggest-inner {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
}

.quiz-suggest-meta {
  font-size: 0.85rem;
  color: var(--gray);
}

.quiz-suggest-count {
  font-style: italic;
}

.quiz-suggest-controls {
  display: flex;
  gap: 0.5rem;
}

/* Visual styling of the button comes from .jb-btn / .jb-btn-secondary
   in custom.scss. The .quiz-suggest-btn class is retained for any
   future component-scoped layout adjustments but currently sets no
   properties. */

.quiz-suggest-status {
  font-size: 0.85rem;
  line-height: 1.5;
  max-width: 56ch;
}
.quiz-suggest-msg {
  padding: 0.5rem 0.7rem;
  border-radius: 4px;
}
.quiz-suggest-msg.pending {
  background: color-mix(in srgb, var(--light) 92%, var(--secondary) 8%);
  color: var(--darkgray);
  border-left: 3px solid var(--secondary);
}
.quiz-suggest-msg.success {
  background: color-mix(in srgb, var(--light) 92%, #7BBF95 8%);
  color: var(--darkgray);
  border-left: 3px solid #7BBF95;
}
.quiz-suggest-msg.error {
  background: color-mix(in srgb, var(--light) 92%, #B8845A 8%);
  color: var(--darkgray);
  border-left: 3px solid #B8845A;
}
`

export default (() => QuizSuggest) satisfies QuartzComponentConstructor

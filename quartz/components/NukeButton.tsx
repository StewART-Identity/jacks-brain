import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const NukeButton: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="nuke-app">
      <button id="nuke-btn" class="nuke-btn">Nuke It from Orbit</button>
      <p class="nuke-sub">It's the only way to be sure.</p>
      <div id="nuke-status" class="nuke-status" style="display:none"></div>
    </div>
  )
}

NukeButton.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const btn = document.getElementById("nuke-btn")
  const status = document.getElementById("nuke-status")
  if (!btn || !status) return

  btn.addEventListener("click", async () => {
    const confirmed = confirm(
      "This will permanently delete ALL wiki content (sources, entities, concepts, synthesis, originals, memory).\\n\\nAre you sure?"
    )
    if (!confirmed) return

    const doubleConfirmed = confirm(
      "Last chance. This cannot be undone.\\n\\nType OK to proceed."
    )
    if (!doubleConfirmed) return

    btn.disabled = true
    btn.textContent = "Nuking..."
    status.style.display = "block"
    status.className = "nuke-status pending"
    status.textContent = "Deleting all content..."

    try {
      const res = await fetch("/api/nuke", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        status.className = "nuke-status success"
        status.textContent = data.message + " The site will redeploy shortly."
        btn.textContent = "Done"
      } else {
        status.className = "nuke-status error"
        status.textContent = "Error: " + (data.error || "Unknown error")
        btn.disabled = false
        btn.textContent = "Nuke It from Orbit"
      }
    } catch (err) {
      status.className = "nuke-status error"
      status.textContent = "Error: " + err.message
      btn.disabled = false
      btn.textContent = "Nuke It from Orbit"
    }
  })
})
`

NukeButton.css = `
#nuke-app {
  margin-top: 1.5rem;
  text-align: center;
}
.nuke-btn {
  padding: 0.8rem 2rem;
  background: #8B3232;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s ease;
}
.nuke-btn:hover {
  background: #6B2020;
}
.nuke-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.nuke-sub {
  color: var(--gray);
  font-size: 0.85rem;
  font-style: italic;
  margin-top: 0.5rem;
}
.nuke-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}
.nuke-status.pending {
  background: #FBF4E4;
  color: #6B4D1A;
}
.nuke-status.success {
  background: #EBF5EE;
  color: #2B5E3E;
}
.nuke-status.error {
  background: #F9EDED;
  color: #6B2020;
}
:root[saved-theme="dark"] .nuke-status.pending {
  background: #6B4D1A;
  color: #D4AD5A;
}
:root[saved-theme="dark"] .nuke-status.success {
  background: #1B3F29;
  color: #7BBF95;
}
:root[saved-theme="dark"] .nuke-status.error {
  background: #6B2020;
  color: #C46B6B;
}
`

export default (() => NukeButton) satisfies QuartzComponentConstructor

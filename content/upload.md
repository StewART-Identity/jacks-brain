---
title: "Upload & Ingest"
---

<div id="upload-app">

<div class="upload-zone" id="drop-zone">
  <div class="upload-icon">&#8693;</div>
  <p class="upload-label">Drop a file here to ingest</p>
  <p class="upload-sub">or click to browse</p>
  <input type="file" id="file-input" accept=".md,.txt,.pdf,.html,.doc,.docx" />
</div>

<div class="divider-row">
  <hr class="divider-line" /><span class="divider-text">or</span><hr class="divider-line" />
</div>

<div class="youtube-section">
  <h3>Ingest a YouTube video</h3>
  <div class="youtube-row">
    <input type="url" id="youtube-input" placeholder="https://www.youtube.com/watch?v=..." />
    <button id="youtube-btn">Ingest</button>
  </div>
</div>

<div id="status-area" class="status-area" style="display:none;">
  <h3>Status</h3>
  <div id="status-messages"></div>
</div>

<div id="recent-runs" class="recent-runs">
  <h3>Recent ingestions</h3>
  <div id="runs-list"><p class="muted">Loading...</p></div>
</div>

</div>

<style>
#upload-app {
  max-width: 600px;
}

/* Drop zone */
.upload-zone {
  border: 2px dashed var(--gray);
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  position: relative;
}
.upload-zone:hover,
.upload-zone.drag-over {
  border-color: var(--secondary);
  background: var(--highlight);
}
.upload-zone .upload-icon {
  font-size: 2.5rem;
  color: var(--secondary);
  margin-bottom: 0.5rem;
}
.upload-zone .upload-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--dark);
  margin: 0;
}
.upload-zone .upload-sub {
  font-size: 0.85rem;
  color: var(--gray);
  margin: 0.3rem 0 0 0;
}
.upload-zone input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 10;
}

/* Divider */
.divider-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
}
.divider-line {
  flex: 1;
  border: none;
  height: 1px;
  background: var(--lightgray);
  margin: 0;
}
.divider-text {
  color: var(--gray);
  font-size: 0.85rem;
}

/* YouTube section */
.youtube-section h3 {
  margin-bottom: 0.75rem;
}
.youtube-row {
  display: flex;
  gap: 0.5rem;
}
.youtube-row input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  background: var(--light);
  color: var(--darkgray);
  font-size: 0.95rem;
}
.youtube-row input:focus {
  outline: none;
  border-color: var(--secondary);
}
.youtube-row button,
.status-area button {
  padding: 0.6rem 1.2rem;
  background: var(--secondary);
  color: var(--light);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.95rem;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}
.youtube-row button:hover {
  opacity: 0.85;
}
.youtube-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Status area */
.status-area {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--lightgray);
  background: var(--highlight);
}
.status-area h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}
.status-msg {
  padding: 0.4rem 0;
  font-size: 0.9rem;
}
.status-msg.success { color: #3A7D53; }
.status-msg.error { color: #8B3232; }
.status-msg.pending { color: var(--gray); }

:root[saved-theme="dark"] .status-msg.success { color: #7BBF95; }
:root[saved-theme="dark"] .status-msg.error { color: #C46B6B; }

/* Recent runs */
.recent-runs {
  margin-top: 2rem;
}
.recent-runs h3 {
  margin-bottom: 0.75rem;
}
.run-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--lightgray);
  font-size: 0.88rem;
}
.run-item:last-child { border-bottom: none; }
.run-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.run-badge.success { background: #EBF5EE; color: #2B5E3E; }
.run-badge.failure { background: #F9EDED; color: #6B2020; }
.run-badge.in_progress { background: #FBF4E4; color: #6B4D1A; }
.run-badge.queued { background: #EEF1F6; color: #2E3D55; }

:root[saved-theme="dark"] .run-badge.success { background: #1B3F29; color: #7BBF95; }
:root[saved-theme="dark"] .run-badge.failure { background: #6B2020; color: #C46B6B; }
:root[saved-theme="dark"] .run-badge.in_progress { background: #6B4D1A; color: #D4AD5A; }
:root[saved-theme="dark"] .run-badge.queued { background: #2E3D55; color: #7B8FAD; }

.run-name { flex: 1; }
.run-time { color: var(--gray); font-size: 0.82rem; }
.muted { color: var(--gray); font-style: italic; }
</style>

<script>
(function() {
  // Drop zone
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const statusArea = document.getElementById("status-area");
  const statusMessages = document.getElementById("status-messages");
  const youtubeInput = document.getElementById("youtube-input");
  const youtubeBtn = document.getElementById("youtube-btn");

  if (!dropZone || !fileInput) return;

  function showStatus(msg, type) {
    statusArea.style.display = "block";
    const div = document.createElement("div");
    div.className = "status-msg " + type;
    div.textContent = msg;
    statusMessages.prepend(div);
  }

  // Drag and drop handlers
  dropZone.addEventListener("dragover", function(e) {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", function() {
    dropZone.classList.remove("drag-over");
  });
  dropZone.addEventListener("drop", function(e) {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", function() {
    if (fileInput.files.length > 0) {
      uploadFile(fileInput.files[0]);
    }
  });

  async function uploadFile(file) {
    showStatus("Uploading " + file.name + "...", "pending");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (data.success) {
        showStatus(data.message, "success");
        setTimeout(loadRuns, 3000);
      } else {
        showStatus("Upload failed: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      showStatus("Upload failed: " + err.message, "error");
    }
    fileInput.value = "";
  }

  // YouTube ingest
  youtubeBtn.addEventListener("click", async function() {
    const url = youtubeInput.value.trim();
    if (!url) return;
    youtubeBtn.disabled = true;
    youtubeBtn.textContent = "Submitting...";
    showStatus("Submitting YouTube URL...", "pending");
    try {
      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url }),
      });
      const data = await response.json();
      if (data.success) {
        showStatus(data.message, "success");
        youtubeInput.value = "";
        setTimeout(loadRuns, 3000);
      } else {
        showStatus("Failed: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      showStatus("Failed: " + err.message, "error");
    }
    youtubeBtn.disabled = false;
    youtubeBtn.textContent = "Ingest";
  });

  // Load recent runs
  async function loadRuns() {
    const runsList = document.getElementById("runs-list");
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      if (data.runs && data.runs.length > 0) {
        runsList.innerHTML = data.runs.map(function(run) {
          const badge = run.conclusion || run.status;
          const time = new Date(run.created).toLocaleString();
          return '<div class="run-item">' +
            '<span class="run-badge ' + badge + '">' + badge + '</span>' +
            '<span class="run-name"><a href="' + run.url + '" target="_blank">' + run.name + '</a></span>' +
            '<span class="run-time">' + time + '</span>' +
            '</div>';
        }).join("");
      } else {
        runsList.innerHTML = '<p class="muted">No recent ingestion runs.</p>';
      }
    } catch (err) {
      runsList.innerHTML = '<p class="muted">Could not load status.</p>';
    }
  }

  loadRuns();
})();
</script>

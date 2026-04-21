#!/usr/bin/env node

/**
 * youtube-transcript.mjs
 *
 * Fetches a YouTube video transcript and saves it as a markdown file in raw/.
 *
 * Usage:
 *   node scripts/youtube-transcript.mjs <youtube-url>
 *   npm run yt -- <youtube-url>
 *
 * Fast path: fetches existing captions via youtube-transcript package.
 * Fallback:  uses yt-dlp + whisper CLI (must be installed separately).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const RAW_DIR = join(ROOT, "raw")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

async function fetchVideoMeta(videoId) {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new Error(`oEmbed request failed: ${res.status}`)
  return res.json()
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

// ---------------------------------------------------------------------------
// Caption fetching (fast path)
// ---------------------------------------------------------------------------

async function fetchCaptions(videoId) {
  // Dynamic import so the package is only required at runtime
  const { YoutubeTranscript } = await import("youtube-transcript")
  const segments = await YoutubeTranscript.fetchTranscript(videoId)
  return segments.map((s) => ({
    text: s.text,
    offset: s.offset / 1000, // ms → seconds
  }))
}

// ---------------------------------------------------------------------------
// Whisper fallback (slow path)
// ---------------------------------------------------------------------------

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function whisperFallback(videoId) {
  // Check prerequisites
  if (!commandExists("yt-dlp")) {
    console.error(
      "Error: yt-dlp is not installed. Install it with: pip install yt-dlp\n" +
        "Or see: https://github.com/yt-dlp/yt-dlp#installation",
    )
    process.exit(1)
  }
  if (!commandExists("whisper")) {
    console.error(
      "Error: whisper is not installed. Install it with: pip install openai-whisper\n" +
        "Or see: https://github.com/openai/whisper#setup",
    )
    process.exit(1)
  }

  const tmpDir = join(ROOT, ".tmp-whisper")
  mkdirSync(tmpDir, { recursive: true })

  const audioPath = join(tmpDir, `${videoId}.mp3`)
  const txtPath = join(tmpDir, `${videoId}.txt`)

  try {
    console.log("Downloading audio with yt-dlp...")
    execSync(
      `yt-dlp -x --audio-format mp3 -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`,
      { stdio: "inherit" },
    )

    console.log("Transcribing with Whisper (this may take a while)...")
    execSync(`whisper "${audioPath}" --model base --output_format txt --output_dir "${tmpDir}"`, {
      stdio: "inherit",
    })

    // Whisper outputs <videoId>.txt
    const transcript = readFileSync(txtPath, "utf-8").trim()
    return transcript
  } finally {
    // Clean up temp files
    try {
      execSync(`rm -rf "${tmpDir}"`, { stdio: "ignore" })
    } catch {
      // ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error("Usage: node scripts/youtube-transcript.mjs <youtube-url>")
    process.exit(1)
  }

  const videoId = extractVideoId(url)
  if (!videoId) {
    console.error(`Could not extract video ID from: ${url}`)
    process.exit(1)
  }

  // Fetch video metadata
  console.log(`Fetching metadata for video ${videoId}...`)
  let meta
  try {
    meta = await fetchVideoMeta(videoId)
  } catch (err) {
    console.error(`Failed to fetch video metadata: ${err.message}`)
    process.exit(1)
  }

  const title = meta.title || "Untitled Video"
  const channel = meta.author_name || "Unknown Channel"
  const today = new Date().toISOString().slice(0, 10)
  const slug = slugify(title)
  const filename = `${today}-${slug}.md`
  const filepath = join(RAW_DIR, filename)

  // Try captions first
  let transcriptText = null
  let method = "captions"

  try {
    console.log("Fetching captions...")
    const segments = await fetchCaptions(videoId)

    // Format with timestamps every ~2 minutes
    const lines = []
    let lastTimestamp = -Infinity
    for (const seg of segments) {
      if (seg.offset - lastTimestamp >= 120) {
        lines.push(`\n**[${formatTimestamp(seg.offset)}]**\n`)
        lastTimestamp = seg.offset
      }
      lines.push(seg.text)
    }
    transcriptText = lines.join(" ").replace(/ +/g, " ").trim()
  } catch (err) {
    console.log(`Captions not available: ${err.message}`)
    console.log("Falling back to yt-dlp + Whisper...")
    method = "whisper"
    transcriptText = whisperFallback(videoId)
  }

  if (!transcriptText) {
    console.error("Failed to obtain transcript via any method.")
    process.exit(1)
  }

  // Write markdown file
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const markdown = `---
source_type: youtube-video
title: "${title.replace(/"/g, '\\"')}"
channel: "${channel.replace(/"/g, '\\"')}"
url: "${videoUrl}"
date: ${today}
transcription_method: ${method}
---

# ${title}

Source: ${channel} | [Watch on YouTube](${videoUrl}) | Transcribed: ${today} (${method})

## Transcript

${transcriptText}
`

  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true })
  }
  writeFileSync(filepath, markdown, "utf-8")

  console.log(`\nTranscript saved to: raw/${filename}`)
  console.log(`Method: ${method}`)
  console.log(`\nTo catalog into the wiki, run: npm run catalog -- raw/${filename}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

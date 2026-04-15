---
title: "Getting Started"
---

# Getting started: GitHub LLM Wiki with Quartz

A personal knowledge base using the Karpathy LLM Wiki pattern,
GitHub as the backend, and Quartz as the browser frontend.

## Step 1: Create the repo from Quartz

Quartz is the static site generator that gives you the graph view,
search, backlinks, and wikilink navigation. You start by cloning it
and making it your own.

From any machine with Node.js 22+ and git:

```bash
git clone https://github.com/jackyzha0/quartz.git my-wiki
cd my-wiki
npm install
```

Then remove Quartz's upstream remote and add your own:

```bash
git remote remove origin
```

Go to GitHub and create a new **private** repo (e.g., `my-wiki`).
Then:

```bash
git remote add origin git@github.com:YOUR_USERNAME/my-wiki.git
```

## Step 2: Add the wiki structure

Copy the starter files from this package into your repo:

- `SCHEMA.md` → repo root (next to `quartz.config.ts`)
- `content/index.md` → replaces the default content
- `content/log.md` → new file
- `content/sources/`, `content/entities/`, `content/concepts/`,
  `content/synthesis/` → new directories (with `.gitkeep` files)
- `raw/` → new directory at repo root (with `.gitkeep`)
- `.github/workflows/deploy.yml` → new file

Delete or replace Quartz's default sample content in `content/`
(keep the directories you just created).

## Step 3: Configure Quartz

Edit `quartz.config.ts` to customize your wiki. The key settings:

```typescript
const config: QuartzConfig = {
  configuration: {
    pageTitle: "My Wiki",           // Your wiki name
    enableSPA: true,                // Smooth navigation
    enablePopovers: true,           // Hover previews on links
    locale: "en-US",
    baseUrl: "YOUR_USERNAME.github.io/my-wiki",
    // ...
  },
  // ...
}
```

The defaults for graph view, search, wikilinks, and backlinks are
already enabled. You shouldn't need to change `quartz.layout.ts`
unless you want to rearrange the page layout.

## Step 4: Enable GitHub Pages

In your repo on github.com:

1. Go to **Settings → Pages**
2. Under **Source**, select **GitHub Actions**

That's it. The workflow file you added will handle the rest.

## Step 5: Push and verify

```bash
git add -A
git commit -m "Initial wiki setup"
git push -u origin main
```

Wait a couple of minutes for the Actions build to finish.
Then visit `https://YOUR_USERNAME.github.io/my-wiki/`.

You should see your empty wiki with the index page, the graph
view (empty for now), and search.

## Step 6: First ingest

Now the fun part. Drop a document into `raw/` — an article saved
as markdown, a PDF, a text file. Commit and push it.

Then open Claude Code (on your laptop or in a Codespace) pointed
at the repo:

```
claude-code --project /path/to/my-wiki
```

Tell Claude:

> Read SCHEMA.md, then ingest the new source in raw/.

Claude will read the source, discuss it with you, create wiki pages,
update the index and log, and you'll review the changes together.
When you're happy:

```bash
git add -A
git commit -m "Ingest: [source title]"
git push
```

The wiki rebuilds automatically. Open it on your iPad and browse
the graph — your first nodes and links are live.

## Ongoing workflow

**From any device (iPad, laptop, phone):**
- Browse the wiki at your GitHub Pages URL
- Navigate via graph view, search, or wikilinks
- Upload files to `raw/` via GitHub's web interface

**From a laptop or Codespace:**
- Run Claude Code for ingest, query, or lint operations
- Review and commit changes
- Push to trigger a rebuild

**Periodically:**
- Run a lint pass: tell Claude "lint the wiki"
- Review contradictions and orphan pages
- Ask questions that produce synthesis pages

## Tips

- **Obsidian Web Clipper** (browser extension) converts web articles
  to clean markdown. Great for getting sources into `raw/`.
- **Working Copy** (iOS) is a full git client for iPad if you want
  to do more than just browse.
- Start with one domain — don't try to build a wiki about everything
  at once. Let it grow naturally.
- The wiki gets more valuable with every source. The cross-references
  compound. The 20th ingest is dramatically richer than the first.

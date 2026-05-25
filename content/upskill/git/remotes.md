---
title: "Git remotes (fetch, pull, push)"
summary: "How a local Git repo mirrors a remote one — remote-tracking branches, the difference between fetch and pull, and what push actually does to the remote."
type: concept
created: 2026-05-25
updated: 2026-05-25
subjects:
  - git
tags:
  - git
  - remote
  - fetch
  - pull
  - push
  - origin
  - remote-tracking-branch
  - upstream
confidence: high
sources: []
---

A Git **remote** is a named pointer to another repository — usually one hosted on a server like GitHub, but it can be any reachable Git repo, even one on the same machine. The default remote is named `origin`, established when you `git clone`. You can have multiple remotes (e.g., `origin` for your fork, `upstream` for the original) and they're managed with `git remote add` / `git remote remove`.

Understanding what fetch, pull, and push actually do is mostly a matter of understanding remote-tracking branches.

## Remote-tracking branches

For each branch on each remote, Git keeps a **remote-tracking branch** locally — a ref that mirrors what your repo last saw on the remote. These live under `refs/remotes/<remote>/<branch>` (see [[upskill/git/refs|Refs]]). For example:

- `refs/remotes/origin/main` — your local memory of `main` on `origin`
- `refs/remotes/origin/feature-x` — your local memory of `feature-x` on `origin`
- `refs/remotes/upstream/main` — your local memory of `main` on `upstream`

These are read-only from your perspective. You don't commit on them. They're updated only by `git fetch` (and `git pull`, which calls fetch internally).

## Fetch vs. pull

**`git fetch <remote>`** does exactly one thing: it asks the remote what state its branches are in, downloads any new commits, and updates the remote-tracking branches accordingly. Your *local* branches don't move. Your working directory doesn't change. After a fetch, `origin/main` reflects the latest from the server but your local `main` is still wherever it was.

**`git pull`** is `git fetch` followed by `git merge` (or `git rebase`, if configured). It updates the remote-tracking branches AND tries to integrate the new commits into your current local branch. Pull is convenient but it hides the two-step structure; many experienced users prefer `fetch` + a deliberate `merge` or `rebase` because it lets them inspect what landed before integrating.

## What push actually does

**`git push <remote> <local-branch>:<remote-branch>`** asks the remote to update one of its branches to match a local commit hash. It's the inverse of fetch: instead of downloading the remote's state into a remote-tracking branch, you're asking the remote to set one of its refs to match your local one. The remote will accept the push only if the update is a *fast-forward* — that is, your local commit is a descendant of the current remote commit. Otherwise the push is rejected and you have to integrate (pull) the remote's changes first.

`git push` with no arguments uses your branch's **upstream** — the remote-tracking branch it's configured to track. Upstream is set when you first push with `-u`, or when you create a branch from a remote-tracking branch.

`--force` (or the safer `--force-with-lease`) tells the remote to accept a non-fast-forward update — useful after a rebase, dangerous if other people are working on the branch.

## Why this matters

Many Git confusions come from not separating "my repo," "my memory of the remote," and "the remote itself." Local branches → my work in progress. Remote-tracking branches → snapshot of what the remote looked like last time I asked. The remote itself → only changes via push (mine or someone else's). Pull and fetch are how my memory of the remote stays current; push is how the remote learns about my work.

---
title: "Git refs (branches, tags, HEAD)"
summary: "Refs are named pointers to commits. Branches, tags, HEAD, and the reflog are all just refs — files containing object hashes — which explains why branch operations are so cheap."
type: concept
created: 2026-05-25
updated: 2026-05-25
subjects:
  - git
tags:
  - git
  - refs
  - branch
  - tag
  - head
  - reflog
  - detached-head
confidence: high
sources: []
---

A **ref** in Git is a named pointer to a commit. That's it. Branches are refs, tags are refs (mostly), HEAD is a ref, and the strange-looking `refs/remotes/origin/main` is a ref. Every named thing in Git that points at a commit lives under `.git/refs/` (or `.git/packed-refs` if Git has consolidated them for efficiency).

## The three main ref namespaces

**`refs/heads/`** — local branches. A branch like `main` is the file `.git/refs/heads/main`, and its contents are literally the 40-character SHA-1 of the commit it points to. When you commit on a branch, Git updates that one file with the new commit's hash. That's the entire operation.

**`refs/tags/`** — tags. Lightweight tags point directly at a commit (just like a branch, but conventionally never moves). Annotated tags point at a tag object, which in turn points at the commit (see [[upskill/git/object-model|Object model]]).

**`refs/remotes/`** — remote-tracking branches. These mirror the state of branches on a remote (see [[upskill/git/remotes|Remotes]]). `refs/remotes/origin/main` is your local memory of what `main` looked like on `origin` the last time you fetched.

## HEAD — the symbolic ref

**HEAD** is the special ref that points at "where you are." It's stored in `.git/HEAD` and usually contains a *symbolic reference* — text like `ref: refs/heads/main` — meaning "HEAD is whatever main is." When you `git checkout` a different branch, HEAD's contents change to point at that branch.

If you `git checkout` a commit directly (a hash, or a tag), HEAD instead contains the commit hash itself rather than a symbolic ref. This is called **detached HEAD**: you're not on a branch, just sitting at a specific commit. Commits you make from detached HEAD aren't reachable from any branch — they exist in the object database but no ref points to them, which is why Git warns you. The reflog (below) is what lets you recover them if you accidentally move away.

## The reflog

The **reflog** is Git's record of every change to a ref. Every time HEAD moves (checkout, commit, rebase, reset, merge) Git appends a line to `.git/logs/HEAD` saying what the old value was, what the new value is, and what command caused the change. Branches have their own reflogs too: `.git/logs/refs/heads/main`.

This is the safety net that makes Git's destructive-looking commands actually safe in practice. A `git reset --hard HEAD~3` looks scary, but the previous HEAD is in the reflog — `git reflog` will show it, and `git reset --hard HEAD@{1}` puts you back where you were. The reflog is local-only and has a default expiration of 90 days, but within that window almost any "I just broke everything" mistake is recoverable.

## Why this matters

Branches are cheap because creating one is just creating a file with 40 characters of text in it. Renaming a branch is renaming a file. Deleting a branch is deleting a file (the commits live on in the object database until garbage collection notices nothing references them). When you understand that branches are *just refs*, the workflow advice you've heard for years ("make lots of branches, they're free") suddenly makes obvious mechanical sense.

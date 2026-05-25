---
title: "Git object model"
summary: "Git's content-addressed object database — blobs, trees, commits, and tags — that sits underneath every command and explains why Git behaves the way it does."
type: concept
created: 2026-05-25
updated: 2026-05-25
subjects:
  - git
tags:
  - git
  - object-model
  - blob
  - tree
  - commit
  - tag
  - sha-1
  - content-addressed
  - dag
confidence: high
sources: []
---

Everything Git does — every commit, every branch, every diff — ultimately reduces to four kinds of objects stored in a content-addressed database. Understanding the four object types is the single biggest leverage point for understanding Git, because every command is just a way of creating, reading, or moving pointers between them.

## The four object types

**Blob.** A blob is the raw contents of a file — just the bytes, with no name and no metadata. If two files in your repo have identical contents, Git stores one blob and both files point at it.

**Tree.** A tree is a directory listing. It contains a list of entries, each entry being a filename, a permission mode, and a pointer (a hash) to either a blob (a file) or another tree (a subdirectory). A tree is Git's representation of a directory at a single moment in time.

**Commit.** A commit is a snapshot plus context. It contains: a pointer to one tree (the root directory of the snapshot), zero or more pointers to parent commits, an author, a committer, a timestamp, and a message. Commits form a directed acyclic graph — every commit (except the very first) points backward at its parent(s), and this graph is the entire history of the project.

**Tag.** A tag (specifically an *annotated tag*) is an object that points at another object, usually a commit, and carries a name, a tagger, and a message. Lightweight tags are just refs (see [[upskill/git/refs|Refs]]); annotated tags are objects in their own right.

## Content-addressed storage

Every object is identified by the SHA-1 hash of its contents. (Git is migrating to SHA-256, but SHA-1 is what you'll see in practice today.) The hash IS the identity — there's no separate ID. Two identical blobs have the same hash and are literally the same object. Two commits with identical trees, parents, authors, and messages would have the same hash, which is why Git history is immutable: you cannot change a commit without changing its hash, and changing its hash makes it a different commit.

This is why `git commit --amend` doesn't actually modify a commit — it creates a new commit with a new hash, and moves the current branch ref to point at the new one. The old commit still exists in the object database (until garbage collection eventually removes it), just unreferenced.

## Why this matters operationally

When you understand that commits are immutable snapshots and that branches are just movable pointers (see [[upskill/git/refs|Refs]]), commands stop feeling magical:

- `git checkout <branch>` reads the tree the branch points at and writes its contents into your working directory.
- `git diff <commit-a> <commit-b>` walks both commits' trees and compares the blobs.
- `git merge` finds a common ancestor commit, computes two diffs (ancestor → A, ancestor → B), and applies them both to produce a new tree, then creates a new commit pointing at both A and B as parents.
- `git log` walks the parent pointers backward from HEAD.

Everything is just creating objects and moving refs. Once you internalize that, most Git surprises disappear.

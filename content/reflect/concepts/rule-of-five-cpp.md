---
title: "Rule of Five (C++)"
summary: "C++ guideline: if you define any one of the five special member functions, you must define all five, because each one implies the class owns a resource."
type: concept
created: 2026-05-28
updated: 2026-05-28
subjects:
  - software-engineering
tags:
  - cpp
  - memory-management
  - rule-of-five
  - special-member-functions
  - resource-ownership
  - raii
  - best-practices
  - cpp11
confidence: high
---

The Rule of Five is a C++ guideline linking five special member functions through the concept of resource ownership. The rule: **if you explicitly define any one of the following five functions, you must define all five.**

## The five functions

1. **Destructor** — releases resources when an object goes out of scope
2. **Copy constructor** — defines how a new object is initialized from an existing one
3. **Copy assignment operator** — defines behavior for `a = b` on already-constructed objects
4. **Move constructor** — transfers resources from a temporary or explicitly moved object
5. **Move assignment operator** — defines behavior for `a = std::move(b)` on already-constructed objects

## Why defining one implies all five

A destructor's purpose is to free owned memory or resources — you only write one if the class manages something manually. That ownership creates an obligation: you must specify what *copying* and *moving* that resource means.

Without explicit definitions the compiler supplies defaults, and for resource-owning classes those defaults are wrong:

- The default copy constructor does a **shallow copy** — two objects end up pointing at the same memory. When either destructs, the other holds a dangling pointer. Double-free at destruction time.
- The default move constructor similarly fails to null out the moved-from pointer, leaving two owners for one resource.

Defining all five closes the ownership contract: the class declares not just *how to release* the resource, but how to safely *replicate and transfer* it.

## Derivability from first principles

The rule is derivable, not just memorizable. The derivation chain:

> "I wrote a destructor" → "I'm managing a resource manually" → "I must say what copy means for that resource" → "I must say what move means for that resource" → "Write all five."

This first-principles framing is common in technical interviews — see [[reflect/sources/2026-05-28-rule-of-five-programming-cpp-advice]] for an example where the interviewer walks a candidate through this chain rather than testing whether they know the rule name.

## Historical context: Rule of Three and Rule of Zero

- **Rule of Three** (pre-C++11): the same ownership principle applied to the three functions that existed before move semantics — destructor, copy constructor, and copy assignment operator.
- **Rule of Five** (C++11+): extends the Rule of Three with move constructor and move assignment operator, added when C++11 introduced rvalue references and move semantics.
- **Rule of Zero**: the preferred design goal — write none of the five by using RAII wrapper types (`std::unique_ptr`, `std::vector`, `std::string`) that already implement correct ownership semantics. When wrapper types own the resources, the compiler-generated defaults do the right thing.

The Rule of Five is the defensive fallback when the Rule of Zero isn't applicable (e.g., when writing the wrapper types themselves, or when working with legacy C APIs).

## Sources

- [[reflect/sources/2026-05-28-rule-of-five-programming-cpp-advice]] — FunnanSoftware video framing this as an interview seniority signal

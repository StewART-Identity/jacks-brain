---
title: "DirXML Script"
summary: "NetIQ Identity Manager's policy language, defined by dirxmlscript.dtd. The DTD is the only authoritative element/attribute reference — vendor docs lag behind it and human memory drifts."
type: concept
created: 2026-05-23
updated: 2026-05-23
subjects:
  - identity-management
tags:
  - dirxml-script
  - identity-manager
  - idm
  - dtd
  - policy-language
  - novell
  - netiq
  - xml
  - tokens
  - actions
  - conditions
confidence: high
---

DirXML Script is the XML-based policy language used by [[reflect/entities/novell|NetIQ Identity Manager]] (formerly Novell Identity Manager) to express transformations, conditions, and actions inside driver policies. Every rule in every IDM policy is DirXML Script. The language is defined by a single DTD — `dirxmlscript.dtd`, version 1.1.0, copyright Novell/NetIQ — and the DTD is the only place that authoritatively lists which elements exist, what attributes they take, and what they can contain.

This page exists because vendor documentation drifts behind the DTD and human memory drifts faster. Whenever there is doubt about an element name, attribute name, or nesting rule, **read the DTD first**.

## Canonical location

The DTD lives in the IAM ontology staging repo at `source/dtd/dirxmlscript.dtd`. To read it via Jack's Brain MCP: `repo_read_file` with `path="source/dtd/dirxmlscript.dtd"` and `repo="StewART-Identity/iam-ontology-staging"`.

NetIQ also ships the DTD with the Designer install (under the Designer plugin directory) and publishes it on the NetIQ documentation site, but the staging-repo copy is the one this wiki treats as canonical for cross-referencing.

## Structure of the DTD

The DTD is organized around three parameter entities that act as the three vocabularies of the language:

- **`%CONDITIONS;`** — every `if-*` element legal inside `<and>` or `<or>` (e.g. `if-attr`, `if-op-attr`, `if-local-variable`, `if-xpath`)
- **`%ACTIONS;`** — every `do-*` element legal inside `<actions>` or `<arg-actions>` (e.g. `do-set-local-variable`, `do-for-each`, `do-if`, `do-trace-message`)
- **`%TOKENS;`** — every `token-*` element legal inside any `arg-*` container that holds tokens (e.g. `token-local-variable`, `token-text`, `token-op-attr`, `token-replace-all`)

**If a name doesn't appear in one of those three entities, it doesn't exist.** This is the single most useful test when something throws a `-9124` schema error.

The rest of the DTD is per-element `<!ELEMENT>` and `<!ATTLIST>` declarations binding content models and attributes to each name in the entities above. Common patterns:

- Tokens that wrap a string and emit a transformed string take their input as nested tokens: `<!ELEMENT token-upper-case (%TOKENS;)+>`. The input is the children, not an attribute.
- Actions that take a string argument use `<arg-string>` (which itself contains `(%TOKENS;)*`), not raw text.
- Mode constants are enumerated in `%MODES;` (`case`, `nocase`, `regex`, `src-dn`, `dest-dn`, `numeric`, `octet`, `structured`) and `%SCALARMODES;` (same list minus `structured`).
- Trace colors are enumerated in `%COLORS;` (16 values from `black` through `yellow` and `white`); anything outside that set is a schema error.
- Severity levels for `do-generate-event` come from `%SEVERITY;` (`log-emergency` through `log-debug`).

## Gotchas worth memorizing

### Regex replace is `token-replace-all` or `token-replace-first`, never `token-replace`

There is no element named `<token-replace>`. The DTD defines exactly two replace tokens:

```xml
<!ELEMENT token-replace-first (%TOKENS;)+>
<!ATTLIST token-replace-first
    regex CDATA #REQUIRED
    replace-with CDATA #REQUIRED
    notrace (%BOOLEAN;) "false"
>

<!ELEMENT token-replace-all (%TOKENS;)+>
<!ATTLIST token-replace-all
    regex CDATA #REQUIRED
    replace-with CDATA #REQUIRED
    notrace (%BOOLEAN;) "false"
>
```

Both take the source string as nested tokens and the pattern/replacement as attributes. Use `-all` by default; use `-first` only when the pattern can match multiple times and you specifically want only the first occurrence replaced.

When `<token-replace>` is written by mistake, the IDM engine produces a misleading error of the form `Element 'token-replace' not allowed in 'token-replace'` (DirXML code `-9124`). The parser found no `<!ELEMENT token-replace>` declaration, fell back to reporting the offending element against itself, and emitted what looks like a self-nesting violation. **A `-9124` error mentioning a name nested inside itself is almost always an undeclared element, not a real nesting bug.**

### Regex backreferences use `$1`, not `\1`

The regex engine behind `regex` mode and the replace tokens is Java's `java.util.regex`. Backreferences in `replace-with` are `$1`, `$2`, etc. PCRE-style `\1` is silently treated as a literal backslash-one.

### Trace messages take string arguments, not bare text

`<do-trace-message>` has content model `(arg-string)`. To trace a literal string, wrap it in `<arg-string><token-text xml:space="preserve">...</token-text></arg-string>` — not as raw text inside `<do-trace-message>`. The `xml:space="preserve"` default on `token-text` is set in the DTD, so it's safe to rely on whitespace being preserved.

### `do-if` is a do-action, `if-*` are conditions

These are separate vocabularies. `<do-if>` lives in `%ACTIONS;` and contains `<arg-conditions>` plus one or two `<arg-actions>` blocks. The `<if-*>` elements live in `%CONDITIONS;` and only appear inside `<and>` or `<or>` (whether at the top level of a rule's `<conditions>` or inside a `<do-if>`'s `<arg-conditions>`).

A common slip is writing `<do-if>` and dropping `<if-attr>` directly inside it, skipping the `<arg-conditions>` and `<and>` wrappers. The DTD requires both wrappers.

### `arg-value` has a discriminating content model

`<!ELEMENT arg-value (arg-component+ | (%TOKENS;)*)>` — an `arg-value` contains *either* one or more `<arg-component>` elements (for structured attributes) *or* a sequence of tokens (for everything else). Mixing the two in one `arg-value` is a schema error.

### Local variables: `arg-string` vs `arg-node-set` vs `arg-object`

`<do-set-local-variable>` has content model `(arg-string | arg-node-set | arg-object)` — exactly one of the three. The choice determines the variable's type, which then determines what tokens can read it and how XPath sees it. A string-typed variable read by `<token-xpath>` will be coerced; a node-set-typed variable can be iterated by `<do-for-each>` with `<token-local-variable>` inside `<arg-node-set>`.

## Workflow when authoring or debugging policies

1. **Before writing**: open `dirxmlscript.dtd` and confirm the element exists in `%CONDITIONS;`, `%ACTIONS;`, or `%TOKENS;`. If it doesn't appear, the element doesn't exist and the intended operation needs a different element.
2. **Before nesting**: check the element's `<!ELEMENT>` declaration to confirm what content model it accepts. `EMPTY` means no children; `(%TOKENS;)+` means one or more tokens; `(arg-string)` means exactly one `arg-string` child.
3. **For attributes**: check the `<!ATTLIST>` declaration to see required attributes (`#REQUIRED`), optional attributes (`#IMPLIED`), and default values. Enumerated attributes (in parentheses with `|`) reject any value outside the listed set.
4. **When debugging a `-9124` error**: the line number in the error refers to the policy's own XML stream, not the file containing the policy. Find the policy's `<policy>` element, count from there. If the error names an element nested inside itself, suspect an undeclared element name before suspecting a real nesting violation.

## See also

No IDM-specific wiki pages exist yet. When IDM driver concepts get cataloged (driver shim, channel direction, GCVs, mapping tables, the engine's event lifecycle), this page should grow `[[wikilinks]]` to them. The DTD itself is the durable artifact; everything else is interpretation.

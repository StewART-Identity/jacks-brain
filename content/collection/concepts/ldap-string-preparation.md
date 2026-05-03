---
title: "LDAP String Preparation"
summary: "Six-step Unicode normalization algorithm (RFC 4518) applied before LDAP matching rule evaluation; extends IETF stringprep with LDAP-specific transcoding and insignificant-character steps."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - unicode
  - string-preparation
  - matching-rules
  - internationalization
  - stringprep
  - normalization
  - rfc4518
  - security
  - interoperability
  - substring-matching
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4518-txt]]"
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
---

**LDAP string preparation** is the normalization process applied to both stored attribute values and presented assertion values before [[collection/concepts/ldap-matching-rules|matching rule]] evaluation. Defined in [[collection/sources/2026-05-02-rfc4518-txt|RFC 4518]] and authored by [[collection/entities/kurt-zeilenga|Kurt Zeilenga]], the algorithm ensures that character-by-character comparison of prepared strings produces the correct semantic result across implementations — regardless of encoding path, Unicode normalization form, or whitespace styling.

## Motivation

The 1997 LDAPv3 specifications defined matching rules like `caseIgnoreMatch` only in prose: "case-insensitive comparison where insignificant spaces are ignored." For ASCII `PrintableString` values this was unambiguous — one space character, bijective case mapping. For Unicode strings (used in `universalString`, `bmpString`, `UTF8String`) it was not. Implementations diverged on which code points counted as space, which direction case-folding ran, and how combining marks interacted with case. These divergences caused interoperability failures and, when directory values were used in certificate chain validation, security vulnerabilities.

The stringprep framework (RFC 3454, 2002) gave the IETF a principled approach to internationalized string preparation. RFC 4518 (2006) adapted stringprep for LDAP, wrapping it with two LDAP-specific steps. Because RFC 3454 did not exist until 2002, RFC 4518 has no direct 1997 predecessor — it is one of the genuinely new additions in the 2006 RFC 4510 series. See [[collection/synthesis/ldap-technical-specification-architecture|LDAPv3 Specification Architecture]] for context.

## The Six Steps

### Step 1: Transcode

Non-Unicode LDAP string types are converted to Unicode before any other processing:

| Type | Action |
|------|--------|
| `PrintableString` | Transcode directly to Unicode (subset of ASCII) |
| `UniversalString`, `UTF8String`, `bmpString` | Already Unicode; no transcoding needed |
| `TeletexString` (T61String) | No standard mapping exists; left as a local matter |

TeletexString's undefined mapping is a deliberate gap. RFC 4518 explicitly marks TeletexString as NOT RECOMMENDED because the absence of a standard transcoding undermines interoperability.

### Step 2: Map

Specific code points are remapped before Unicode normalization:

| Code points | Action |
|-------------|--------|
| SOFT HYPHEN (U+00AD), MONGOLIAN TODO SOFT HYPHEN (U+1806) | → nothing |
| COMBINING GRAPHEME JOINER (U+034F), VARIATION SELECTORs (U+180B–180D, FF00–FE0F) | → nothing |
| OBJECT REPLACEMENT CHARACTER (U+FFFC), ZERO WIDTH SPACE (U+200B) | → nothing |
| Control/format code points (Cc, Cf): U+0000–0008, 000E–001F, 007F–0084, 0086–009F, 06DD, 070F, 180E, 200C–200F, 202A–202E, 2060–2063, 206A–206F, FEFF, FFF9–FFFB, 1D173–1D17A, E0001, E0020–E007F | → nothing |
| CHARACTER TABULATION (U+0009), LINE FEED (U+000A), LINE TABULATION (U+000B), FORM FEED (U+000C), CARRIAGE RETURN (U+000D), NEXT LINE (U+0085) | → SPACE (U+0020) |
| All other Separator-class code points (Zs, Zl, Zp): U+00A0, 1680, 2000–200A, 2028–2029, 202F, 205F, 3000 | → SPACE (U+0020) |

For **case-ignore, numeric, and stored prefix string matching rules**: case folding is applied per RFC 3454 §B.2 (uppercase → lowercase). Case-exact rules skip case folding at this step.

### Step 3: Normalize

The string is normalized to Unicode **Form KC** (NFKC — compatibility decomposition followed by canonical composition), as defined in Unicode Standard Annex #15. NFKC collapses compatibility variants (ligatures, width variants, fractions, compatibility ideographs) into canonical forms, and recomposes combining sequences where a precomposed form exists.

### Step 4: Prohibit

The step fails — causing the matching assertion to evaluate to **Undefined** — if the string contains any of:

- Unassigned code points (RFC 3454 Table A.1)
- Characters that change display properties or are deprecated (RFC 3454 Table C.8)
- Private Use code points (RFC 3454 Table C.3)
- Non-character code points (RFC 3454 Table C.4)
- Surrogate code points (RFC 3454 Table C.5)
- REPLACEMENT CHARACTER (U+FFFD)

### Step 5: Check bidi

Bidirectional characters are noted but **not rejected** at this step. RFC 4518 specifies that bidi characters are "ignored" — the step is present for structural compatibility with the stringprep framework but has no normative effect on LDAP string preparation.

### Step 6: Insignificant Character Handling

This is the most rule-specific step. It modifies the string to ensure proper handling of characters that the [[collection/concepts/ldap-matching-rules|matching rule]] considers insignificant.

#### Case-ignore and exact string matching: space handling

A "space" for this section means SPACE (U+0020) followed by no combining marks (the earlier steps ensure no other separator code points remain).

**For attribute values and non-substring assertion values:**
- If the string contains no non-space character → output is exactly two SPACEs
- Otherwise: start with exactly one SPACE, end with exactly one SPACE, replace any inner run of one or more spaces with exactly two SPACEs

Example: `"foo<SP>bar<SP><SP>"` → `"<SP>foo<SP><SP>bar<SP>"`

**For substring assertion values** (initial, any, final components of a wildcard filter):
- If no non-space characters → output is exactly one SPACE
- Initial substrings: start with exactly one SPACE
- Initial or any substrings ending in spaces: end with exactly one SPACE
- Any or final substrings starting with spaces: start with exactly one SPACE
- Final substrings: end with exactly one SPACE

Example: `"foo<SP>bar<SP><SP>"` as initial → `"<SP>foo<SP><SP>bar<SP>"`; as any or final → `"foo<SP><SP>bar<SP>"`

#### numericString matching: space removal

All spaces are removed. `"  123  456  "` → `"123456"`. A pure-space string → `""` (empty string).

#### telephoneNumber matching: space and hyphen removal

All spaces and all hyphen variants are removed. "Hyphen" is defined broadly:

| Code point | Name |
|------------|------|
| U+002D | HYPHEN-MINUS |
| U+058A | ARMENIAN HYPHEN |
| U+2010 | HYPHEN |
| U+2011 | NON-BREAKING HYPHEN |
| U+2212 | MINUS SIGN |
| U+FE63 | SMALL HYPHEN-MINUS |
| U+FF0D | FULLWIDTH HYPHEN-MINUS |

Each must be followed by no combining marks to qualify. A pure-hyphen/space string → `""`.

## Why Substring Handling is Complex

A simpler space-handling approach — collapse multiple spaces to one, strip leading and trailing — would break LDAP substring matching in two ways:

1. `(CN=foo\20*\20bar)` would incorrectly match `"foobar"` if leading/trailing spaces in substrings are simply stripped.
2. Sub-partitioning would fail: if a prepared `any` substring matches a partition of an attribute value, subdividing that substring into two `any` substrings should also match — but simplified stripping breaks this guarantee.

The RFC 4518 approach preserves the X.520 guarantee that if an assertion matches an attribute value, it also matches any value differing only by addition or removal of insignificant characters — while avoiding the edge-case failures that simplified approaches introduce.

## Security Implications

Imprecise string preparation in security-sensitive contexts — particularly when directory lookups are used in certificate chain validation — creates exploitable divergences. An attacker can craft a directory value or assertion that matches under one implementation's rules but not another's. RFC 4518's normative algorithm eliminates this class of vulnerability for LDAP character-string matching. The RFC incorporates RFC 3454's security considerations by reference.

## Combining Marks Reference

RFC 4518 Appendix A provides a normative list of all Unicode 3.2 code points with Mn, Mc, or Me (mark) properties. This list is definitive for implementation purposes, regardless of what the Unicode character data files indicate.

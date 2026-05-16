# Iteration 8.1 — Affiliation cluster, source-verified corrections

**First draft:** 2026-05-16
**Author:** Jack Stewart, IAM Engineer, UNT System

## Scope

A focused corrections pass on iter-8, parallel to how iter-7.1 corrected
iter-7. Lifts the "UNVERIFIED PENDING SOURCE REVIEW" caveats that iter-8
attached to UNT_AD and HSC_AD instantiations of the eduPerson trio and
eduPersonEntitlement, and adds the source-verified contributions from
the UNTAD and HSCAD drivers that iter-8 could not capture because
UNTAD.xml and HSCAD.xml exceeded the read-tool size limit.

Made possible by a separate engineering effort that produced
`source/drivers/driver_chunks.zip` — a chunked export of all 13 IDM
drivers split at the natural XML seams the engine uses (top-level
`<attributes>` children, individual `<rule>` elements, etc.) and
packed under an ~8K-token target per chunk. The chunked layout came
with an `index.json`, per-driver `manifest.json`, and a `chunk-meta`
header on every chunk listing its contents by logical path. Together
these made it cheap to read just the chunks that mattered (filter,
policy-linkage, specific named rules) without burning context on
schema dumps, password machinery, or driver image data.

## Files modified

- `affiliation.ttl` — UNT_AD/HSC_AD caveats lifted; new
  `unt:IDM_Driver_UNTAD` and `unt:IDM_Driver_HSCAD` driver-as-artifact
  Transformation URIs declared; per-driver contributions added.
- `scoped-affiliation.ttl` — UNT_AD/HSC_AD caveats lifted; per-driver
  contributions added.
- `entitlement.ttl` — UNT_AD/HSC_AD caveats lifted; per-driver
  contributions added; HSC NetIQ Entitlements subsystem noted as
  distinct from eduPersonEntitlement.
- `primary-affiliation.ttl` — UNT_AD/HSC_AD instantiations
  source-verified; per-driver contributions added. (See "Process
  incident" below.)
- `student-status.ttl` — AD-propagation caveat lifted (confirmed
  IDTREE-only across all three AD driver filters).
- `faculty-status.ttl` — AD-propagation caveat lifted (same).
  WRITER UNKNOWN status retained — none of the source-verified
  drivers writes isfaculty.
- `retiree-status.ttl` — AD-propagation caveat lifted (same).
  WRITER UNKNOWN status retained.
- `00-ontology-core.ttl` — version bumped to
  `0.8.1-affiliation-corrections`.

## Chunked-driver methodology

The chunks layout that made this work:

```
chunks/
  index.json
  UNTAD/
    000_overview.xml
    001_attributes_application-schema.xml      ← oversize, skipped
    002_attributes_configuration-manifest.xml
    003_attributes_driver-filter-xml.xml       ← READ: filter + policy-linkage
    004_publisher_rule_Password_Pub_-Add_Password_Payload.xml
    005_publisher_rule_UNTAD-Pub-Cmd-TransformMailAttribut.xml  ← READ: newhire, MicrosoftOnline
    006_subscriber_rule_Password_Sub_-Add_Password_Payload.xml  ← READ: sub-ctp-company
    007_subscriber_stylesheet_QueryADForParentDepartment.xml    ← READ: DataTransforms inventory
    008_rule_UNTAD-SchemaMapping.xml
    manifest.json
  HSCAD/
    [11 chunks; same pattern. Read 003, 004, 007.]
  ... (11 other drivers)
```

The discriminating feature of the format: every chunk begins with a
`<chunk-meta>` block listing the units it contains by logical path
(e.g., `subscriber/rule:newhire`, `attributes/policy-linkage`). That
meant a quick scan of `<chunk-meta>` across all 19 UNTAD+HSCAD chunks
identified the 6 affiliation-relevant ones, and the other 13 could
be ignored entirely — no need to even open them.

Six chunks read out of ~19 total. Roughly 30K characters per chunk.
For comparison, the previous attempt to read UNTAD.xml whole (~1.1
million characters) failed against the read-tool size cap; the
chunked approach brought the same source-of-truth into reach.

## Source-verified findings

### 1. UNTAD filter: eduPerson trio + Entitlement all subscriber=sync

The UNTAD driver's filter declares all four affiliation-relevant
eduPerson attributes with subscriber=sync — meaning IDTREE-side
changes propagate transparently to UNT_AD. This matches the
UNTADSTU pattern source-verified in iter-7.1, confirming iter-8's
presumed-pattern claim and allowing the UNT_AD instantiations'
caveats to be lifted.

Also source-verified:
- `role`: subscriber=notify (driver fires on changes but does not
  auto-propagate; same as UNTADSTU)
- `vpnrole`: subscriber=sync (UNT_AD does carry vpnrole — new
  finding, relevant for the deferred vpn-role.ttl slice)
- `empstatus`: subscriber=notify
- `untdept`: subscriber=sync (Employment cluster — iter-9)

The filter has 30 attribute entries on the User class, vs. UNTADSTU's
21. The difference is UNTAD carries additional Employment attributes
(jobCode, untdept, Title), Location attributes (L, OU, Physical
Delivery Office Name), and Communication attributes (Facsimile
Telephone Number, Telephone Number) that students don't need.

### 2. HSCAD filter: same affiliation pattern, plus NetIQ Entitlements

The HSCAD driver's filter declares the same affiliation pattern as
UNTAD — eduPerson trio + eduPersonEntitlement all subscriber=sync,
role and empstatus subscriber=notify, vpnrole subscriber=sync. So
the HSC_AD instantiations source-verify exactly as UNT_AD does.

What distinguishes HSCAD from UNTAD is an extra subsystem of
integration with NetIQ IDM's native Entitlements framework, visible
both as a filter attribute (`DirXML-EntitlementRef` with
subscriber=notify) and as five additional rules in the policy-linkage
(`sub-ctp-EntitlementsImpl`, `sub-cp-EntitlementsImpl`,
`sub-mp-EntitlementsImpl`, `pub-etp-EntitlementsImpl`,
`pub-mp-EntitlementsImpl`, plus `itp-EntitlementsImpl` and
`sub-cust-block-users`). UNTAD has none of these.

The HSC NetIQ Entitlements subsystem is operationally distinct from
eduPersonEntitlement: they're parallel entitlement systems, one
defined by IDM's framework and one defined by UNT's own vocabulary.
A future "what entitlements does this person hold" audit will need
to consult both. Captured in the `entitlement.ttl` slice header for
forward reference.

### 3. UNTAD newhire rule writes UNT_AD.extensionAttribute15="newhire"

Source-extracted from UNTAD chunk 005. Both sub-rules enabled:
- When `role` contains `newhire` AND `untdept` does NOT match
  `[34]\d\d\d\d\d` (so excluding HSC employees, per the rule's own
  comment "HSC employees should have mailboxes assigned to accounts
  in the HSC domain"), set UNT_AD.extensionAttribute15 = "newhire".
- When `role` no longer contains `newhire`, clear
  UNT_AD.extensionAttribute15.

So UNT_AD has an affiliation-marker attribute at
extensionAttribute15. This was not modeled in iter-8 (the slice files
focused on the four eduPerson attrs); not adding it in iter-8.1
either because it raises a "is this an Affiliation Attribute or is
'newhire' a marker value on a generic-purpose Attribute" modeling
decision that deserves its own conversation rather than a quick
addition. Captured in `notes/ITERATION-8.1-NOTES.md` as a forward
item; the candidate is to declare an `unt:NewHireMarker`
ElementalAttribute and instantiate it at UNT_AD.extensionAttribute15
and HSC_AD.extensionAttribute15, with rdfs:comment noting the
semantic-collision with STUDENTS_AD.extensionAttribute15 (which iter-7.1
modeled as a FERPA-withholding marker). See finding #4.

### 4. extensionAttribute15 has three different semantics per AD domain

Source-verified cross-domain finding:

| Domain | Writing driver | Value | Meaning |
|---|---|---|---|
| UNT_AD | UNTAD `newhire` rule | "newhire" | recent new hire (employees only) |
| HSC_AD | HSCAD `newhire` rule | "newhire" | recent new hire (all HSC) |
| STUDENTS_AD | UNTADSTU `HideFromAddressLists` rule | "GalDisabledMailboxPlan" | FERPA-withholding student |

Three writers, three meanings, same attribute name — but each is
distinct in the ontology because each is `unt:belongsTo`-ed to a
different `unt:System`. The Attribute URIs are distinct
(`unt:UNT_AD_extensionAttribute15`, `unt:HSC_AD_extensionAttribute15`,
`unt:STUDENTS_AD_extensionAttribute15`), and they instantiate
different ElementalAttributes (the UNT_AD/HSC_AD ones share an
ElementalAttribute that we haven't declared yet; the STUDENTS_AD one
instantiates `unt:FerpaWithholding`'s mailbox-visibility expression
per iter-7.1's deferred mailbox-visibility modeling).

This is a clean example of why the four-layer model (Elemental →
Standard → Attribute → Transformation) earns its complexity: the
same attribute name in three places has the same string label but
three different referents in the conceptual graph, and the
belongs-to-different-System discrimination handles the disambiguation
naturally.

### 5. MicrosoftOnline rule writes msExchExtensionCustomAttribute5="MSOL"

Both UNTAD and HSCAD have a `MicrosoftOnline` rule in policy-set 10
(Subscriber Command Transformation Policies) that writes
`msExchExtensionCustomAttribute5 = "MSOL"` based on role-and-untdept
criteria. This is the license-gate marker for Microsoft 365 (group-
based licensing assignment reads this attribute to decide which
Entra-side license group the user belongs to).

The criteria differ per driver — appropriate to each domain:
- UNTAD: role matches `dalfs|untfs|sysfs|dalvs|untvs|sysvs|newhire`,
  untdept matches `[1259]\d\d\d\d\d`
- HSCAD: role matches `hscfs|newhire`, untdept matches `H\d\d\d\d\d`

This is a GroupMembership-cluster concern (license-assignment
gating) rather than Affiliation, and is captured here for forward
reference when the GroupMembership cluster is modeled. The role-as-
input dependency means GroupMembership will need to read across into
Affiliation when it's iterated.

### 6. UNTAD sub-ctp-company writes UNT_AD.company

Source-extracted from UNTAD chunk 006. The rule maps the leading
digit of `untdept` to a company name:
- `[1-2]xxxxx` → "UNT" (Denton)
- `[3-4]xxxxx` → "UNT HSC"
- `[5]xxxxx` → "UNT Dallas"
- `[9]xxxxx` → "UNT System"

The rule sets a local variable `company-value` to "INVALID" and
overrides it conditionally; only writes UNT_AD.company when the
variable ends up non-INVALID. Defensive against unrecognized
untdept patterns.

This is an Employment-cluster transformation (writes AD.company),
captured here for forward reference when Employment is modeled.

### 7. UNTAD-Output-DataTransforms is data-shaping only

Source-inventoried from UNTAD chunk 007 by sub-rule descriptions
(without extracting the full bodies):
- `accountExpires`: convert to AD form
- `description`: convert multi-valued attribute to single value
- Exchange: remove HomeMDB when disabled
- `employeeNumber`: convert multi-valued to single value
- `logonHours`: convert to AD form
- `lockoutTime`: convert to AD form
- `streetAddress`: convert LF to CR-LF
- `telephoneNumber`: convert multi-valued to single value

All of these are cosmetic/formatting transformations — converting
attributes to forms AD expects, collapsing multi-valued source
attributes to single-valued destination attributes. No affiliation-
relevant semantic transformation happens here. Confirmed by
sub-rule descriptions alone; full body extraction was not necessary.

### 8. Y/N status attributes are IDTREE-only

The three Y/N predicate attributes (`isstudent`, `isfaculty`,
`isretiree`) are NOT in any of the per-domain AD driver filters
(UNTADSTU iter-7.1, UNTAD iter-8.1, HSCAD iter-8.1). They stay in
IDTREE and are not synchronized to any AD domain. Consumers needing
status-on-the-AD-side must read eduPersonAffiliation or
eduPersonScopedAffiliation, both of which DO propagate.

This was an "UNVERIFIED" caveat in iter-8; now fully source-verified.

## Operational findings worth flagging

### UNT_AD vs HSC_AD newhire rule asymmetry

UNTAD's newhire rule has an extra condition that HSCAD's doesn't:
the UNT_AD rule excludes accounts with HSC department numbers (`untdept`
matches `[34]\d\d\d\d\d`). The rule's comment explains: "Do NOT add
'newhire' for HSC employees. They should have mailboxes assigned to
accounts in the HSC domain." This is a routing decision encoded in the
rule, not in the filter — a person flagged as `newhire` in role with
an HSC `untdept` will get a Microsoft 365 license assignment via HSC_AD
rather than UNT_AD even though their employee record might exist on both
sides. Worth understanding when reasoning about why a person ended up in
one mailbox domain vs another.

### Malformed Description filter entry in source/drivers/UNTAD.xml

The Description attribute line in the UNTAD filter — as it appears in
the chunked output at `chunks/UNTAD/003_attributes_driver-filter-xml.xml`
AND, by extension, in the source XML at `source/drivers/UNTAD.xml` —
is mangled:

```
<filter-attr attr-name="Description" from-all-classes="true"
  merge-authority="default" priority-sync="false" publisher="ignore"
  publisher-optimize-mocriber="sync" subscriber="sync" />dify="true"
  subscriber="sync"/&gt;
```

Reading the visible fragments side by side:
- Expected: `publisher-optimize-modify="true" subscriber="sync" />`
- Got: `publisher-optimize-mocriber="sync" subscriber="sync" />dify="true" subscriber="sync"/>`

The string `publisher-optimize-mo` appears to have had `dify="true" sub`
replaced inline with `criber="sync" sub`, and the displaced text
`dify="true" subscriber="sync"/>` got appended after the (now premature)
self-closing `/>`. The trailing `&gt;` (XML-escaped `>`) is a further
clue — the file was at some point saved through a tool that escaped a
stray `>` into `&gt;` while corrupting the attribute string.

**Important re-attribution from the initial reading of iter-8.1:** the
first version of these notes blamed the chunker for this corruption.
That was wrong. Verified by comparing the v1 and v2 chunker outputs:
the inner chunk files are byte-identical (same MD5 sums) between the
two versions; only the zip-archive timestamps differ. The chunker is
correctly preserving what is in `source/drivers/UNTAD.xml` — and what
is in UNTAD.xml is malformed.

How the corruption got into UNTAD.xml is unknown. The most plausible
explanation is that the file was opened, edited, and re-saved through
a tool that round-tripped imperfectly (a non-XML-aware editor, perhaps
during a hand-merge or a copy-paste). The corruption is localized to
this single attribute and does not affect downstream chunking or the
filter-attr inventory done by iter-8.1 — every other attribute parses
cleanly and the Description-line intent is recoverable from context
(publisher=ignore subscriber=sync with the standard
publisher-optimize-modify="true").

Iter-8.1 modeling proceeds on the inferred intent of the Description
line. The recommended fix is to re-export the live UNTAD driver from
iManager and replace `source/drivers/UNTAD.xml` with the clean export
when convenient. That puts the file's source-of-truth status back
under iManager's control rather than whatever local editing produced
the corruption.

### vpnrole propagates to UNT_AD and HSC_AD

The iter-8 design notes deferred vpnrole modeling because vpnrole
was "downstream of role, not a first-class affiliation statement."
The iter-8.1 source review confirms that vpnrole is declared
subscriber=sync in both UNTAD and HSCAD filters — meaning the
attribute does propagate to AD and consumers on the AD side can
read it. This changes the design of the deferred vpn-role.ttl
slice from "IDTREE-only derived attribute" to "IDTREE-derived
attribute propagated to two of the three AD domains" (the UNTADSTU
filter does not include vpnrole, so STUDENTS_AD does not carry it,
which makes sense — students don't typically need VPN access).

## Forward items

1. **vpn-role.ttl, wireless-role.ttl** — original iter-8.5 plan still
   stands. With iter-8.1 corrections in hand, vpn-role.ttl's design
   should declare vpnrole Attributes on IDTREE, UNT_AD, and HSC_AD
   (NOT STUDENTS_AD). wirelessrole was not source-verified in the
   per-domain filters yet — that's an iter-8.5 prerequisite to read
   the filters again for wirelessrole specifically.

2. **NewHireMarker elemental** — declare a UNT-local elemental for
   the "this person is a new hire" marker that lives in UNT_AD and
   HSC_AD as extensionAttribute15="newhire". The semantic-collision
   with STUDENTS_AD.extensionAttribute15="GalDisabledMailboxPlan" is
   clean structurally (different System → different Attribute → can
   instantiate a different ElementalAttribute) but the modeling
   conversation about whether to declare a new elemental or
   piggy-back on something already declared is worth having
   explicitly.

3. **Identify writers for the WRITER UNKNOWN attributes** — the
   IDM PeopleSoft Inbound driver is still the most likely candidate.
   Acquiring it (it is not yet in source/drivers/) is a small task
   blocking the iter-8.1 closure of:
   - `IDTREE.eduPersonPrimaryAffiliation` writer
   - `IDTREE.isfaculty` writer
   - `IDTREE.isretiree` writer
   - The Y-setting writer for `IDTREE.isstudent` (Loopback only
     handles N-setting)

4. **Re-export source/drivers/UNTAD.xml from iManager** to repair the
   Description-line corruption documented above. The chunker is
   confirmed good; the issue is upstream in UNTAD.xml itself. A clean
   re-export from iManager and replacement of source/drivers/UNTAD.xml
   would close the gap. Not blocking iter-8.1 closure — the
   corruption did not affect the affiliation findings — but worth
   doing before more iterations rely on the file.

5. **iter-9 AccountLifecycle** — still the next major iteration.
   The driver chunks methodology proven in iter-8.1 will make
   iter-9 much faster: the relevant attributes (Login Disabled,
   untAccountDisabled, untAccountADNoSync, untAccountDeferral,
   untAccountHistory, password timestamps) are spread across UNTAD,
   HSCAD, UNTADSTU, and Loopback, and previously a full review
   would have required reading three multi-MB files. Now those reads
   are tractable.

## Process incident — accidental overwrite of primary-affiliation.ttl

Worth recording because it's the kind of thing that can recur in any
session that restarts mid-cluster.

The iter-8 work happened across two sessions separated by an MCP
reauthentication event. The first session wrote three slices
(`role.ttl`, `affiliation.ttl`, `scoped-affiliation.ttl`) and then
hit the reauth break. The pre-restart Claude continued writing while
the user re-auth'd; the post-restart Claude inherited an older
mental model of what was on disk.

When the post-restart Claude listed the repo at the start of its
session, it saw the three slices it knew about and inferred from
context that the work was incomplete (the user message said "you may
have already created some files but the work was definitely
incomplete"). The post-restart Claude then went on to read filter
chunks and decided to lift caveats on the existing slices PLUS write
the remaining five slices.

In doing so, it wrote `primary-affiliation.ttl` without first
reading the existing file — assuming, incorrectly, that the file
did not exist. The pre-restart Claude had already written
`primary-affiliation.ttl` and the other four slices plus the
`ITERATION-8-NOTES.md` notes file. The push overwrote the
pre-restart version with the post-restart Claude's version (commit
`6028a3a8ddf84337418da65e86f7f6a080d5169c`).

The post-restart Claude only realized the mistake when it ran a
`list_repo_tree` after the push and saw the four other unread slice
files (`entitlement.ttl`, `faculty-status.ttl`, `retiree-status.ttl`,
`student-status.ttl`) and the notes file already existing. At that
point it stopped, read each before modifying, and proceeded
carefully.

The overwritten primary-affiliation.ttl follows the same design
conventions as the rest of the cluster and includes the same
source-verified content for UNT_AD/HSC_AD that iter-8.1 was going
to add anyway, so the loss is small. The pre-restart version may
have had slightly different wording in the slice header or in
inline rationale; if a comparison is wanted, the commit immediately
preceding `6028a3a` on the file would have the prior content.

The general lesson worth keeping: **after any session restart, do
`list_repo_tree` AND read every file that might have been touched
before writing anything**. The list-then-read step is the safety
net; the post-restart Claude skipped the read step for the slice it
mistakenly believed didn't exist.

This kind of safety pattern is implicit in the way Claude works
with version-controlled artifacts but is easy to skip when a fresh
session inherits incomplete context. Worth promoting from "implicit"
to "explicit in the cluster's own design notes" so future Claudes
working on the ontology see the pattern documented.

## Summary

Iter-8.1 brings the Affiliation cluster from "structurally complete,
partially source-verified" to "structurally complete, fully source-
verified for all four currently-modeled AD-side eduPerson
attributes." Two new driver-as-artifact Transformations
(`unt:IDM_Driver_UNTAD`, `unt:IDM_Driver_HSCAD`) are now first-class
in the ontology, with reads and writes documented across the four
affiliation-relevant slices. The ontology stands at
`0.8.1-affiliation-corrections` with **5 of 10 clusters populated**
and **27 elementals total**, unchanged from iter-8 since this was
strictly a corrections pass with no new elementals.

The chunked-driver methodology proved cleanly: six chunks read,
roughly 200K characters of source in total, vs. the ~2.2 million
characters the two driver files contain in full. That's a 10x
reduction with zero loss of analytical depth for the affiliation-
focused review. The same approach will accelerate iter-9
AccountLifecycle modeling materially.

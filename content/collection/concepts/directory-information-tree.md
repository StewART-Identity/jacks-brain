---
title: "Directory Information Tree (DIT)"
summary: "The hierarchical tree structure organizing all directory entries in an X.500/LDAP deployment; the foundational data model underlying all LDAP operations."
type: concept
created: 2026-05-02
updated: 2026-05-04
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - x500
  - x501
  - directory-information-tree
  - dit
  - dib
  - naming
  - distinguished-name
  - rdn
  - subtree
  - subentry
  - naming-context
  - dsa
  - dua
  - root-dse
  - alias
  - rfc4512
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4512-txt]]"
  - "[[collection/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e]]"
---

The **Directory Information Tree (DIT)** is the hierarchical tree structure used by X.500 and [[collection/concepts/ldap|LDAP]] to organize all directory information. Every directory entry occupies a vertex in this tree; the relationships between entries are encoded in the tree's arcs. The DIT is the core organizing principle of the directory data model, introduced in the [[collection/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e|1988 X.500 recommendation]] and defined normatively in [[collection/sources/2026-05-02-rfc4512-txt|RFC 4512]] based on X.501.

## Directory Information Base (DIB)

The **Directory Information Base (DIB)** is the complete set of information held in the Directory. It is divided into two classes:

- **User information** — data provided and administered by directory users (people or applications)
- **Administrative and operational information** — data used by servers to manage and operate the directory

The DIT is the structural framework for the DIB: all information is held in entries organized hierarchically as a tree.

## Tree Structure

The DIT is a tree where:

- Each **vertex** is a directory entry
- Each **arc** defines a superior–subordinate (parent–child) relationship
- If an arc exists from X to Y, X is the **immediate superior** (parent) of Y, and Y is an **immediate subordinate** (child) of X
- Entries that share the same parent are **siblings**

An entry's **subordinates** are all its immediate children and their descendants. An entry's **superiors** are its parent and all ancestors to the root.

## Entry Types

The DIT contains three kinds of entries:

**Object entries** represent real-world objects — people, organizations, devices, or any identifiable entity. Each object entry belongs to exactly one structural [[collection/concepts/ldap-object-classes|object class]] chain, which defines what the entry represents.

**Alias entries** provide alternative names for an object. An alias entry belongs to the `alias` structural object class and carries an `aliasedObjectName` attribute pointing to the target entry. Alias entries are always leaf entries — they cannot have subordinates. Alias dereferencing is the process of following these pointers to find the object entry being named.

**Subentries** are a special sort of entry that holds administrative and operational information associated with a subtree. Subschema subentries — which hold schema definitions — are the most important kind (see below).

## Naming Entries

Each entry is named relative to its immediate superior by a **Relative Distinguished Name (RDN)**. An RDN is one or more attribute–value assertions (AVAs) that together uniquely identify the entry among its siblings. For example:

```
OU=Engineering        (single-valued RDN)
CN=Alice+UID=alice    (multi-valued RDN)
```

An entry's **Distinguished Name (DN)** is its full hierarchical name, formed by concatenating its RDN with the DN of its parent, from most specific to most general:

```
CN=Alice,OU=Engineering,DC=example,DC=com
```

See [[collection/concepts/distinguished-name|Distinguished Names]] for the string encoding rules. DNs unambiguously identify any entry in the DIT; no two entries may share the same DN.

## Subtrees

A **subtree** is a collection of object and alias entries beginning at a root vertex and extending downward to a lower boundary. Subtrees do not contain subentries. They are the unit of replication, access control policy, and schema administration in the directory model. The base and lower boundary define which entries are within the subtree's scope.

## Naming Contexts and DSAs

The DIT is distributed across one or more **Directory System Agents (DSAs)**, which are servers. Each DSA holds a fragment of the DIB called a **naming context** — the largest collection of entries starting at a given vertex that is mastered by that particular server.

The **context prefix** is the DN of the topmost entry in a naming context. A DSA advertises the context prefixes it masters or shadows via the `namingContexts` attribute in the root DSE.

**Root DSE.** The root of the DIT is a special DSA-specific entry (DSE) identified by the zero-length DN (`""`). It is not part of any naming context and is not returned in subtree searches. Each server presents its own root DSE, which exposes server capabilities: supported controls (`supportedControl`), extended operations (`supportedExtension`), SASL mechanisms (`supportedSASLMechanisms`), LDAP versions (`supportedLDAPVersion`), and naming contexts (`namingContexts`).

**Directory User Agents (DUAs)** are clients that access the Directory on behalf of users or applications, interacting with one or more DSAs via the LDAP protocol.

## Subschema Subentries

Every portion of the DIT is governed by a **subschema subentry** — a special entry that holds all schema definitions (object class definitions, attribute type definitions, matching rules, DIT content rules, DIT structure rules, name forms) applicable to entries in that subtree. A client discovers the governing subschema subentry for any entry by reading that entry's `subschemaSubentry` operational attribute.

Schema discovery procedure:
1. Read the `subschemaSubentry` attribute of the target entry to get the subschema DN
2. Issue a Search at that DN with `scope=baseObject` and `filter=(objectClass=subschema)`, requesting the desired schema attributes

Subschema definitions in the wiki's [[collection/synthesis/ldap-schema-architecture|four-layer schema architecture]] — syntaxes, matching rules, attribute types, and [[collection/concepts/ldap-object-classes|object classes]] — are all stored in and served from subschema subentries.

## DIT Governance Rules

Two kinds of rules govern DIT structure and content beyond what object classes specify:

**DIT Structure Rules** determine which structural object classes may appear as subordinates to other entries, based on name forms. They regulate the placement of entries in the tree.

**DIT Content Rules** extend the specification of allowable attributes for entries of a particular structural class, specifying which auxiliary classes entries may belong to and which extra attributes are required, allowed, or precluded beyond what the structural class itself declares.

Both are optional for LDAP servers to implement, but are part of the full X.500 schema model exposed through subschema subentries.

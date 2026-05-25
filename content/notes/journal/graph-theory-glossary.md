---
title: "Graph Theory Glossary for Directory Services"
summary: "Formal definitions of graph-theoretic terms with explicit mappings to X.500/LDAP directory structures."
type: concept
created: 2026-05-24
updated: 2026-05-24
subjects:
  - graph-theory
  - directory-services
tags:
  - graph-theory
  - arborescence
  - tree
  - dag
  - dit
  - ldap
  - x500
  - formal-definitions
confidence: high
sources: []
---

This glossary defines graph-theoretic terminology relevant to formalizing the structure of X.500/LDAP directories. Each term includes its formal definition and its directory equivalent.

## Foundational Structures

### Graph

A **graph** G = (V, E) consists of a set V of **vertices** (also called nodes) and a set E of **edges** (also called arcs or links) connecting pairs of vertices.

| Directory Equivalent | |
|---------------------|---|
| Vertices | Directory entries |
| Edges | Parent-child relationships |

### Directed Graph (Digraph)

A **directed graph** is a graph where each edge has a direction—it goes *from* one vertex *to* another. An edge from u to v is written (u, v) or u → v.

| Directory Equivalent | |
|---------------------|---|
| Edge direction | Parent → child (superior → subordinate) |

### Undirected Graph

An **undirected graph** is a graph where edges have no direction—an edge between u and v can be traversed either way.

The DIT is inherently directed, but if you ignore direction (treat parent-child as a symmetric relationship), you get the **underlying undirected graph**.

---

## Connectivity

### Path

A **path** from vertex u to vertex v is a sequence of vertices u = v₀, v₁, v₂, ..., vₖ = v where each consecutive pair is connected by an edge. In a directed graph, each edge must point in the direction of traversal.

| Directory Equivalent | |
|---------------------|---|
| Path from root to entry | The sequence of entries encoded in the DN |
| Path length | Depth of the entry (number of RDN components) |

### Connected (Undirected)

An undirected graph is **connected** if there exists a path between every pair of vertices.

### Weakly Connected (Directed)

A directed graph is **weakly connected** if its underlying undirected graph (ignoring edge directions) is connected.

| Directory Equivalent | |
|---------------------|---|
| DIT is weakly connected | Yes—ignoring direction, you can traverse between any two entries |

### Strongly Connected (Directed)

A directed graph is **strongly connected** if for every pair of vertices u and v, there exists a directed path from u to v *and* from v to u.

| Directory Equivalent | |
|---------------------|---|
| DIT is strongly connected | No—you cannot traverse from a child back to the root following edge directions |

---

## Cycles and Acyclicity

### Cycle

A **cycle** is a path that starts and ends at the same vertex. In a directed graph, all edges in the cycle must point in the direction of traversal.

### Acyclic

A graph is **acyclic** if it contains no cycles.

| Directory Equivalent | |
|---------------------|---|
| DIT is acyclic | Yes—an entry cannot be its own ancestor; DN construction rules prevent this |

### DAG (Directed Acyclic Graph)

A **DAG** is a directed graph with no directed cycles. DAGs are more general than trees—they allow a vertex to have multiple parents.

| Directory Equivalent | |
|---------------------|---|
| Pure DIT | More constrained than a DAG (exactly one parent per entry) |
| DIT with aliases | A DAG—aliases create additional edges but cannot create cycles |

---

## Trees

### Tree (Undirected)

An undirected **tree** is a connected acyclic graph. Equivalently: a graph where there is exactly one path between any two vertices.

Properties of a tree with n vertices:
- Exactly n − 1 edges
- Connected
- Acyclic
- Adding any edge creates exactly one cycle
- Removing any edge disconnects the graph

### Rooted Tree

A **rooted tree** is a tree with one distinguished vertex called the **root**. The root induces a natural parent-child orientation: for any vertex, the neighbor closer to the root is its parent; neighbors farther from the root are its children.

| Directory Equivalent | |
|---------------------|---|
| Root | Root DSE (the zero-length DN) |
| Parent-child relationships | Superior-subordinate relationships in the DIT |

### Arborescence (Out-Tree)

An **arborescence** is a directed rooted tree where all edges point away from the root. Equivalently: a directed graph where:

1. There is exactly one vertex with in-degree 0 (the root)
2. Every other vertex has in-degree exactly 1
3. There is a unique directed path from the root to every vertex

Alternative names: **out-tree**, **branching**, **directed rooted tree** (informal).

| Directory Equivalent | |
|---------------------|---|
| Arborescence | The DIT structure |
| Root (in-degree 0) | Root DSE |
| All other vertices (in-degree 1) | Every entry has exactly one parent |
| Unique path from root | The DN encodes this unique path |

### Anti-Arborescence (In-Tree)

An **anti-arborescence** is the opposite: all edges point *toward* the root. Every vertex has out-degree at most 1. This is *not* the DIT structure.

---

## Degree

### Degree (Undirected)

The **degree** of a vertex is the number of edges connected to it.

### In-Degree (Directed)

The **in-degree** of a vertex is the number of edges pointing *into* it (edges where this vertex is the destination).

| Directory Equivalent | |
|---------------------|---|
| Root DSE in-degree | 0 (no parent) |
| All other entries in-degree | 1 (exactly one parent) |

### Out-Degree (Directed)

The **out-degree** of a vertex is the number of edges pointing *out of* it (edges where this vertex is the source).

| Directory Equivalent | |
|---------------------|---|
| Container entry out-degree | Number of immediate children |
| Leaf entry out-degree | 0 (no children) |

**Important:** Degree is a *local* property—how many edges touch this vertex. It is independent of *depth* (how far from the root). An entry buried deep in the tree still has in-degree 1.

---

## Depth and Height

### Depth

The **depth** of a vertex is the length of the path from the root to that vertex (number of edges traversed).

| Directory Equivalent | |
|---------------------|---|
| Depth of an entry | Number of RDN components in its DN |
| Root depth | 0 |

### Height

The **height** of a tree is the maximum depth of any vertex. The **height of a vertex** is the length of the longest path from that vertex to any leaf.

| Directory Equivalent | |
|---------------------|---|
| Height of DIT | Maximum DN depth in the directory |

---

## Additional Structures in Directories

### Forest

A **forest** is a disjoint union of trees—multiple trees with no edges between them.

| Directory Equivalent | |
|---------------------|---|
| Forest | A multi-rooted directory (multiple naming contexts with no common ancestor) |

### Overlay Graph

An **overlay graph** is a graph structure superimposed on another graph, using the same vertices but different edges.

| Directory Equivalent | |
|---------------------|---|
| Overlay on DIT | Group membership graph (member/memberOf edges) |
| | Manager relationships |
| | Any multi-valued reference attribute |

These overlay graphs may contain cycles (a group containing itself, directly or transitionally) even though the underlying DIT cannot.

---

## Properties to Prove for Formal Treatment

To formally establish that a DIT is an arborescence, demonstrate:

1. **Vertex set is well-defined**: Each directory entry is a vertex, uniquely identified by its DN
2. **Edge set is well-defined**: Each parent-child relationship is a directed edge
3. **Exactly one root**: The root DSE has in-degree 0; all other entries have in-degree 1
4. **Acyclic**: DN construction rules make circular ancestry impossible
5. **Connected**: Every entry is reachable from the root (by definition of being in the DIT)
6. **Unique paths**: Each DN represents the unique path from root to entry

The key insight: properties 3 and 4 follow directly from DN construction rules. An entry's DN is formed by prepending its RDN to its parent's DN. This construction:
- Guarantees exactly one parent (the DN you prepend to)
- Makes cycles impossible (the parent's DN is strictly shorter)

---

## References

For canonical definitions, consult:

- **Diestel, Reinhard.** *Graph Theory* (5th ed.). Springer, 2017. Freely available at https://diestel-graph-theory.com/
- **Bang-Jensen, Jørgen and Gregory Z. Gutin.** *Digraphs: Theory, Algorithms and Applications* (2nd ed.). Springer, 2009. The standard reference for directed graph terminology including arborescence.
- **Cormen, Thomas H., et al.** *Introduction to Algorithms* (4th ed.). MIT Press, 2022. Chapters 20–22 cover graph representations and basic algorithms.

For directory structure definitions, see:

- [[reflect/concepts/directory-information-tree|Directory Information Tree (DIT)]]
- [[reflect/concepts/distinguished-name|Distinguished Name (DN)]]
- [[reflect/sources/2026-05-02-rfc4512-txt|RFC 4512: LDAP Directory Information Models]]

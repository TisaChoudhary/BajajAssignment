const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USER_ID = "TisaChoudhary_23012006";
const EMAIL = "tc7305@srmist.edu.in";
const ROLL_NUMBER = "RA2311003020465";

app.get("/bfhl", (_req, res) => {
  res.status(200).json({ operation_code: 1 });
});

app.post("/bfhl", (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        is_success: false,
        message: "Invalid input. 'data' must be an array.",
      });
    }

    const invalid_entries = [];
    const duplicate_edges = [];
    const validEdges = [];
    const seenEdges = new Set();
    const duplicateEdgeSet = new Set();

    // 1 & 2. Parse and validate
    for (let item of data) {
      if (typeof item !== "string") {
        invalid_entries.push(String(item));
        continue;
      }
      const trimmed = item.trim();
      if (!/^[A-Z]->[A-Z]$/.test(trimmed)) {
        invalid_entries.push(item);
        continue;
      }

      const [parent, child] = trimmed.split("->");
      if (parent === child) {
        invalid_entries.push(item);
        continue;
      }

      // Valid format, check duplicates
      if (seenEdges.has(trimmed)) {
        if (!duplicateEdgeSet.has(trimmed)) {
          duplicate_edges.push(trimmed);
          duplicateEdgeSet.add(trimmed);
        }
      } else {
        seenEdges.add(trimmed);
        validEdges.push({ u: parent, v: child, original: trimmed });
      }
    }

    // 3. Graph Construction & WCC
    const adjUndirected = {};
    const adjDirected = {};
    const inDegreeOriginal = {};

    validEdges.forEach(({ u, v }) => {
      if (!adjUndirected[u]) adjUndirected[u] = [];
      if (!adjUndirected[v]) adjUndirected[v] = [];
      adjUndirected[u].push(v);
      adjUndirected[v].push(u);

      if (!adjDirected[u]) adjDirected[u] = [];
      adjDirected[u].push(v);

      inDegreeOriginal[v] = (inDegreeOriginal[v] || 0) + 1;
      if (inDegreeOriginal[u] === undefined) inDegreeOriginal[u] = 0;
    });

    const allNodes = Object.keys(adjUndirected);
    const visited = new Set();
    const wccs = [];

    for (const node of allNodes) {
      if (!visited.has(node)) {
        const comp = [];
        const queue = [node];
        visited.add(node);
        while (queue.length > 0) {
          const curr = queue.shift();
          comp.push(curr);
          const neighbors = adjUndirected[curr] || [];
          for (const n of neighbors) {
            if (!visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          }
        }
        wccs.push(comp);
      }
    }

    // Kept edges (first parent wins)
    const keptAdj = {};
    const parentOf = {};
    validEdges.forEach(({ u, v }) => {
      if (!parentOf[v]) {
        parentOf[v] = u;
        if (!keptAdj[u]) keptAdj[u] = [];
        keptAdj[u].push(v);
      }
    });

    function hasDirectedCycle(compNodes) {
      const state = {};
      compNodes.forEach(n => state[n] = 0);

      for (const node of compNodes) {
        if (state[node] === 0) {
          if (dfsCycle(node, state)) return true;
        }
      }
      return false;

      function dfsCycle(n, s) {
        s[n] = 1;
        const neighbors = adjDirected[n] || [];
        for (const next of neighbors) {
          if (s[next] === 1) return true;
          if (s[next] === 0 && dfsCycle(next, s)) return true;
        }
        s[n] = 2;
        return false;
      }
    }

    function buildTreeObj(n) {
      const children = keptAdj[n] || [];
      const tree = {};
      for (const child of children) {
        tree[child] = buildTreeObj(child);
      }
      return tree;
    }

    function getDepth(n) {
      const children = keptAdj[n] || [];
      let maxD = 0;
      for (const child of children) {
        maxD = Math.max(maxD, getDepth(child));
      }
      return maxD + 1;
    }

    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let largest_tree_root = null;
    let max_depth_found = -1;

    for (const compNodes of wccs) {
      const cycleExists = hasDirectedCycle(compNodes);
      const roots = compNodes.filter(n => inDegreeOriginal[n] === 0);

      if (cycleExists) {
        total_cycles++;
        roots.sort();
        compNodes.sort();
        const rootNode = roots.length > 0 ? roots[0] : compNodes[0];
        hierarchies.push({
          root: rootNode,
          tree: {},
          has_cycle: true
        });
      } else {
        roots.sort();
        for (const root of roots) {
          const depth = getDepth(root);
          hierarchies.push({
            root,
            tree: { [root]: buildTreeObj(root) },
            depth
          });
          total_trees++;

          if (depth > max_depth_found) {
            max_depth_found = depth;
            largest_tree_root = root;
          } else if (depth === max_depth_found) {
            if (largest_tree_root && root < largest_tree_root) {
              largest_tree_root = root;
            }
          }
        }
      }
    }

    res.status(200).json({
      user_id: USER_ID,
      email_id: EMAIL,
      college_roll_number: ROLL_NUMBER,
      hierarchies,
      invalid_entries,
      duplicate_edges,
      summary: {
        total_trees,
        total_cycles,
        largest_tree_root: largest_tree_root || ""
      }
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

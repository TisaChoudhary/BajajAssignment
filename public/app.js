document.addEventListener("DOMContentLoaded", () => {
  const jsonInput = document.getElementById("jsonInput");
  const submitBtn = document.getElementById("submitBtn");
  const exampleChips = document.querySelectorAll(".example-chip");
  
  const errorBar = document.getElementById("errorBar");
  const errorText = document.getElementById("errorText");
  const resultsSection = document.getElementById("resultsSection");
  
  const userInfoBar = document.getElementById("userInfoBar");
  const valTotalTrees = document.getElementById("valTotalTrees");
  const valTotalCycles = document.getElementById("valTotalCycles");
  const valLargestRoot = document.getElementById("valLargestRoot");
  
  const alertsContainer = document.getElementById("alertsContainer");
  const hierarchiesContainer = document.getElementById("hierarchiesContainer");
  const rawJson = document.getElementById("rawJson");

  // Load examples
  exampleChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const data = chip.getAttribute("data-example");
      jsonInput.value = JSON.stringify(JSON.parse(data), null, 2);
    });
  });

  submitBtn.addEventListener("click", async () => {
    const rawInput = jsonInput.value.trim();
    if (!rawInput) {
      showError("Please enter JSON data.");
      return;
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawInput);
    } catch (e) {
      showError("Invalid JSON format.");
      return;
    }

    submitBtn.textContent = "Processing...";
    submitBtn.disabled = true;
    hideError();
    resultsSection.classList.add("hidden");

    try {
      const res = await fetch("/bfhl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedBody)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Server Error");
      }

      renderResults(data);
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.textContent = "Generate Graph";
      submitBtn.disabled = false;
    }
  });

  function showError(msg) {
    errorText.textContent = msg;
    errorBar.classList.remove("hidden");
  }

  function hideError() {
    errorBar.classList.add("hidden");
  }

  function renderResults(data) {
    // User info
    userInfoBar.innerHTML = `
      <span>ID: <strong>${data.user_id}</strong></span>
      <span>Email: <strong>${data.email_id}</strong></span>
      <span>Roll: <strong>${data.college_roll_number}</strong></span>
    `;

    // Summary
    valTotalTrees.textContent = data.summary.total_trees;
    valTotalCycles.textContent = data.summary.total_cycles;
    valLargestRoot.textContent = data.summary.largest_tree_root || "-";

    // Alerts
    alertsContainer.innerHTML = "";
    if (data.invalid_entries && data.invalid_entries.length > 0) {
      const div = document.createElement("div");
      div.className = "alert-box invalid";
      div.innerHTML = `<div class="alert-title">⚠ Invalid Entries</div>
                       <div class="alert-items">${data.invalid_entries.join(", ")}</div>`;
      alertsContainer.appendChild(div);
    }
    if (data.duplicate_edges && data.duplicate_edges.length > 0) {
      const div = document.createElement("div");
      div.className = "alert-box duplicate";
      div.innerHTML = `<div class="alert-title">🔁 Duplicate Edges</div>
                       <div class="alert-items">${data.duplicate_edges.join(", ")}</div>`;
      alertsContainer.appendChild(div);
    }

    // Hierarchies
    hierarchiesContainer.innerHTML = "";
    if (data.hierarchies && data.hierarchies.length > 0) {
      data.hierarchies.forEach(h => {
        const card = document.createElement("div");
        card.className = "tree-card";
        
        let headerHtml = `<div class="tree-header">
                            <span>Root: ${h.root}</span>
                            ${h.has_cycle ? '<span class="tree-badge cycle">Cycle Detected</span>' : `<span class="tree-badge">Depth: ${h.depth}</span>`}
                          </div>`;
        
        let treeHtml = "";
        if (!h.has_cycle && Object.keys(h.tree).length > 0) {
          treeHtml = renderTreeLevel(h.tree);
        } else if (h.has_cycle) {
          treeHtml = `<div style="color: var(--error); font-style: italic;">Cyclic group - no valid tree.</div>`;
        }

        card.innerHTML = headerHtml + treeHtml;
        hierarchiesContainer.appendChild(card);
      });
    } else {
      hierarchiesContainer.innerHTML = "<p>No hierarchies found.</p>";
    }

    // Raw JSON
    rawJson.textContent = JSON.stringify(data, null, 2);

    resultsSection.classList.remove("hidden");
  }

  function renderTreeLevel(obj) {
    if (!obj || Object.keys(obj).length === 0) return "";
    let html = '<ul class="tree-list">';
    for (const key in obj) {
      html += `<li class="tree-node">
                 <span class="node-label">${key}</span>
                 ${renderTreeLevel(obj[key])}
               </li>`;
    }
    html += '</ul>';
    return html;
  }
});

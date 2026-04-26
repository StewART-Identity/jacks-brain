import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir}>{title}</a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 2.25rem;
  margin: 0;
  font-family: var(--titleFont);
}
`

PageTitle.afterDOMLoaded = `
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/static/sw.js").catch(function() {});
}

document.addEventListener("nav", function() {
  // Mobile menu toggle. Uses addCleanup so the listener doesn't
  // accumulate across SPA navigations — same pattern as
  // checkbox.inline.ts (canonical Quartz form).
  var toggle = document.querySelector(".mobile-menu-toggle");
  var content = document.querySelector(".sidebar-content");
  if (toggle && content) {
    var onToggleClick = function() {
      var open = content.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    toggle.addEventListener("click", onToggleClick);
    window.addCleanup(function() { toggle.removeEventListener("click", onToggleClick); });
  }

  // ── Graph View page controls ────────────────────────────────────────
  // Both the right-side zoom/fullscreen toolbar and the left-side
  // saved-layouts toolbar live on the Graph View page (via FullGraph).
  // PageTitle is on every page, so the elements may not exist; we no-op
  // gracefully when they're missing.
  var graphEl = document.getElementById("full-graph");
  if (!graphEl) return;

  // ── Right toolbar: zoom + fullscreen ───────────────────────────────
  var fsBtn = document.getElementById("graph-fullscreen-btn");
  var zoomInBtn = document.getElementById("graph-zoom-in");
  var zoomOutBtn = document.getElementById("graph-zoom-out");
  if (fsBtn) {
    var onFsClick = function() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (graphEl.requestFullscreen) {
        graphEl.requestFullscreen();
      } else if (graphEl.webkitRequestFullscreen) {
        graphEl.webkitRequestFullscreen();
      }
    };
    fsBtn.addEventListener("click", onFsClick);
    window.addCleanup(function() { fsBtn.removeEventListener("click", onFsClick); });
  }

  // Fullscreen toggle changes the canvas's container size, but the
  // pixi renderer's pixel buffer was sized for the original 70vh
  // viewport. Without this, the canvas bitmap gets CSS-stretched to
  // fill the screen, producing the "huge zoomed-in labels" effect.
  // Wait one frame after the change so the CSS layout has settled,
  // then call the graph's resize handler. fullscreenchange fires for
  // both enter and exit, so this also fixes the inverse "tiny graph
  // in upper-left" problem on exit.
  var onFsChange = function() {
    requestAnimationFrame(function() {
      if (window.__graphResize) window.__graphResize();
    });
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  window.addCleanup(function() {
    document.removeEventListener("fullscreenchange", onFsChange);
    document.removeEventListener("webkitfullscreenchange", onFsChange);
  });
  function simulateZoom(direction) {
    var canvas = graphEl.querySelector("canvas");
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    canvas.dispatchEvent(new WheelEvent("wheel", {
      clientX: cx, clientY: cy,
      deltaY: direction * 150,
      bubbles: true, cancelable: true
    }));
  }
  if (zoomInBtn) {
    var onZoomIn = function() { simulateZoom(-1); };
    zoomInBtn.addEventListener("click", onZoomIn);
    window.addCleanup(function() { zoomInBtn.removeEventListener("click", onZoomIn); });
  }
  if (zoomOutBtn) {
    var onZoomOut = function() { simulateZoom(1); };
    zoomOutBtn.addEventListener("click", onZoomOut);
    window.addCleanup(function() { zoomOutBtn.removeEventListener("click", onZoomOut); });
  }

  // ── Freeze toggle ──────────────────────────────────────────────────
  // Pauses the d3 force simulation so drags don't ripple through the
  // graph. The setting persists in localStorage; the button reflects
  // current state via aria-pressed and the active styling.
  var freezeBtn = document.getElementById("graph-freeze-btn");
  if (freezeBtn && window.graphFreeze) {
    var freezeApi = window.graphFreeze;
    var renderFreeze = function() {
      var pressed = freezeApi.isFrozen();
      freezeBtn.setAttribute("aria-pressed", pressed ? "true" : "false");
      // Title updates to indicate what the click will do, not the
      // current state — clearer affordance than "Frozen / Unfrozen".
      freezeBtn.setAttribute("title", pressed ? "Unfreeze layout (resume physics)" : "Freeze layout (no physics)");
    };
    var onFreezeClick = function() { freezeApi.toggle(); };
    freezeBtn.addEventListener("click", onFreezeClick);
    var unsubFreeze = freezeApi.onChange(renderFreeze);
    window.addCleanup(function() {
      freezeBtn.removeEventListener("click", onFreezeClick);
      unsubFreeze();
    });
    renderFreeze();
  }

  // ── Synthesis filter panel ─────────────────────────────────────────
  // Toggleable panel listing synthesis pages. Each row is a checkbox
  // + the synthesis title + member count. Unchecking a synthesis hides
  // its nodes (and any edges touching them). Free nodes always visible.
  var filterBtn = document.getElementById("graph-filter-btn");
  var filterPanel = document.getElementById("graph-filter-panel");
  var filterBody = document.getElementById("graph-filter-body");
  if (filterBtn && filterPanel && filterBody && window.graphFilter) {
    var filterApi = window.graphFilter;

    var renderFilterBody = function() {
      var syntheses = filterApi.getSyntheses();
      while (filterBody.firstChild) filterBody.removeChild(filterBody.firstChild);
      if (syntheses.length === 0) {
        var empty = document.createElement("div");
        empty.className = "graph-filter-empty";
        empty.textContent = "No synthesis pages in the wiki yet. Filter unavailable until at least one synthesis is cataloged.";
        filterBody.appendChild(empty);
        return;
      }
      syntheses.forEach(function(s) {
        var row = document.createElement("label");
        row.className = "graph-filter-row";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !filterApi.isUnchecked(s.slug);
        input.addEventListener("change", function() {
          filterApi.setChecked(s.slug, input.checked);
        });
        var name = document.createElement("span");
        name.className = "graph-filter-row-name";
        name.textContent = s.title;
        name.title = s.title;
        var count = document.createElement("span");
        count.className = "graph-filter-row-count";
        count.textContent = String(s.nodeCount);
        count.title = s.nodeCount + " node" + (s.nodeCount === 1 ? "" : "s");
        row.appendChild(input);
        row.appendChild(name);
        row.appendChild(count);
        filterBody.appendChild(row);
      });

      // Action buttons: select all / clear all. Helpful when there
      // are many syntheses; harmless when there are few.
      var actions = document.createElement("div");
      actions.className = "graph-filter-actions";
      var checkAllBtn = document.createElement("button");
      checkAllBtn.type = "button";
      checkAllBtn.className = "graph-filter-action";
      checkAllBtn.textContent = "Show all";
      checkAllBtn.addEventListener("click", function() { filterApi.checkAll(); });
      var uncheckAllBtn = document.createElement("button");
      uncheckAllBtn.type = "button";
      uncheckAllBtn.className = "graph-filter-action";
      uncheckAllBtn.textContent = "Hide all";
      uncheckAllBtn.addEventListener("click", function() {
        filterApi.uncheckAll(syntheses.map(function(s) { return s.slug; }));
      });
      actions.appendChild(checkAllBtn);
      actions.appendChild(uncheckAllBtn);
      filterBody.appendChild(actions);
    };

    var onFilterBtnClick = function() {
      var willOpen = filterPanel.hasAttribute("hidden");
      if (willOpen) {
        filterPanel.removeAttribute("hidden");
        filterBtn.setAttribute("aria-pressed", "true");
        renderFilterBody();
      } else {
        filterPanel.setAttribute("hidden", "");
        filterBtn.setAttribute("aria-pressed", "false");
      }
    };
    filterBtn.addEventListener("click", onFilterBtnClick);
    var unsubFilter = filterApi.onChange(function() {
      // Re-render the panel body so checkbox states stay in sync if
      // they're changed programmatically (e.g., another tab via the
      // shared localStorage key, or the show-all/hide-all actions).
      if (!filterPanel.hasAttribute("hidden")) renderFilterBody();
    });
    window.addCleanup(function() {
      filterBtn.removeEventListener("click", onFilterBtnClick);
      unsubFilter();
    });
  }

  // ── Left toolbar: saved layouts ────────────────────────────────────
  // The graphLayouts API is set up by graph.inline.ts (module-scope
  // bootstrap). It exists by the time this nav handler fires because
  // graph.inline.ts is loaded earlier. If it doesn't, no-op.
  var api = window.graphLayouts;
  if (!api) return;

  var currentBtn = document.getElementById("graph-layouts-current");
  var newBtn = document.getElementById("graph-layouts-new");
  var saveBtn = document.getElementById("graph-layouts-save");
  var renameBtn = document.getElementById("graph-layouts-rename");
  var deleteBtn = document.getElementById("graph-layouts-delete");
  var menu = document.getElementById("graph-layouts-menu");
  if (!currentBtn || !newBtn || !saveBtn || !renameBtn || !deleteBtn || !menu) return;

  // Render the toolbar's visible state from the current layouts API.
  // Called on initial load AND on every state change (via api.onChange
  // and api.onDirtyChange). The render is cheap (a few attribute
  // updates) so we don't bother to diff what changed.
  function render() {
    var state = api.getState();
    var activeId = state.activeLayout;
    var active = activeId && state.layouts[activeId] ? state.layouts[activeId] : null;
    var nameEl = currentBtn.querySelector(".graph-layouts-current-name");
    if (nameEl) nameEl.textContent = active ? active.name : "No layout";
    renameBtn.disabled = !active;
    deleteBtn.disabled = !active;
    // Save is enabled when there's something to save AND we're on an
    // active layout. (Dirty-without-active-layout shouldn't normally
    // happen — markDirty is only called from operations that require
    // an active layout — but the && active guard makes the UI honest
    // about what the button can actually do.)
    var dirty = api.isDirty();
    saveBtn.disabled = !active || !dirty;
    if (dirty && active) {
      saveBtn.classList.add("graph-layouts-dirty");
      saveBtn.setAttribute("title", "Save layout (you have unsaved changes)");
    } else {
      saveBtn.classList.remove("graph-layouts-dirty");
      saveBtn.setAttribute("title", "Save layout (no unsaved changes)");
    }
  }

  function closeMenu() {
    menu.hidden = true;
  }

  function openMenu() {
    var state = api.getState();
    // Build menu fresh on each open — small enough that incremental
    // updates aren't worth the bookkeeping.
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    var ids = Object.keys(state.layouts);
    if (ids.length === 0) {
      var empty = document.createElement("div");
      empty.className = "graph-layouts-menu-empty";
      empty.textContent = "No saved layouts. Click + to create one.";
      menu.appendChild(empty);
    } else {
      // Sort by updatedAt desc — most recently used at the top.
      ids.sort(function(a, b) {
        var ta = state.layouts[a].updatedAt || "";
        var tb = state.layouts[b].updatedAt || "";
        return tb.localeCompare(ta);
      });
      ids.forEach(function(id) {
        var layout = state.layouts[id];
        var item = document.createElement("button");
        item.type = "button";
        item.className = "graph-layouts-menu-item" + (id === state.activeLayout ? " active" : "");
        item.textContent = layout.name;
        item.setAttribute("role", "menuitem");
        item.addEventListener("click", function() {
          api.switchLayout(id);
          closeMenu();
          // Trigger a re-render of the graph so pins reapply. The
          // simulation rebuild on every nav handles this for us when
          // the user navigates, but for an in-place layout switch we
          // dispatch a synthetic nav event with the current URL so
          // the graph re-renders without an actual navigation.
          document.dispatchEvent(new CustomEvent("nav", {
            detail: { url: window.location.pathname.replace(/^\\//, "") }
          }));
        });
        menu.appendChild(item);
      });
    }
    menu.hidden = false;
  }

  var onCurrentClick = function(e) {
    e.stopPropagation();
    if (menu.hidden) openMenu(); else closeMenu();
  };
  currentBtn.addEventListener("click", onCurrentClick);
  window.addCleanup(function() { currentBtn.removeEventListener("click", onCurrentClick); });

  // Click-outside-to-close. Bound on document so we catch clicks
  // anywhere else on the page.
  var onDocClick = function(e) {
    if (menu.hidden) return;
    var target = e.target;
    if (target instanceof Node && !menu.contains(target) && !currentBtn.contains(target)) {
      closeMenu();
    }
  };
  document.addEventListener("click", onDocClick);
  window.addCleanup(function() { document.removeEventListener("click", onDocClick); });

  var onNewClick = function() {
    var name = window.prompt("Name for new layout:");
    if (!name) return;
    var snapshot = window.__graphPositionSnapshot ? window.__graphPositionSnapshot() : {};
    var id = api.createLayout(name, snapshot);
    if (!id) {
      window.alert("Couldn't create layout — name may be empty or invalid.");
      return;
    }
    // Trigger re-render so pins apply immediately.
    document.dispatchEvent(new CustomEvent("nav", {
      detail: { url: window.location.pathname.replace(/^\\//, "") }
    }));
  };
  newBtn.addEventListener("click", onNewClick);
  window.addCleanup(function() { newBtn.removeEventListener("click", onNewClick); });

  // Save button: explicitly trigger a flush. The dirty-state listener
  // (registered below) will clear the highlight and disable the button
  // when the flush completes successfully. If flushNow is called while
  // we're already clean, it's a no-op — flushLayouts internally returns
  // false for already-clean state.
  var onSaveClick = function() {
    api.flushNow();
  };
  saveBtn.addEventListener("click", onSaveClick);
  window.addCleanup(function() { saveBtn.removeEventListener("click", onSaveClick); });

  var onRenameClick = function() {
    var state = api.getState();
    var id = state.activeLayout;
    if (!id) return;
    var current = state.layouts[id];
    if (!current) return;
    var newName = window.prompt("Rename layout:", current.name);
    if (!newName) return;
    api.renameLayout(id, newName);
  };
  renameBtn.addEventListener("click", onRenameClick);
  window.addCleanup(function() { renameBtn.removeEventListener("click", onRenameClick); });

  var onDeleteClick = function() {
    var state = api.getState();
    var id = state.activeLayout;
    if (!id) return;
    var current = state.layouts[id];
    if (!current) return;
    if (!window.confirm("Delete layout \\"" + current.name + "\\"? This can't be undone.")) return;
    api.deleteLayout(id);
    // Re-render so pins clear.
    document.dispatchEvent(new CustomEvent("nav", {
      detail: { url: window.location.pathname.replace(/^\\//, "") }
    }));
  };
  deleteBtn.addEventListener("click", onDeleteClick);
  window.addCleanup(function() { deleteBtn.removeEventListener("click", onDeleteClick); });

  // Subscribe to layout state changes so the toolbar reflects them.
  var unsubscribe = api.onChange(render);
  window.addCleanup(unsubscribe);

  // Subscribe to dirty-state changes — the save button highlight and
  // its disabled state both depend on this. Calling render() re-reads
  // both isDirty() and the active layout, so the same handler covers
  // every state transition. The Set semantics in onDirtyChange mean
  // re-firing for a value the listener already saw is harmless.
  var unsubDirty = api.onDirtyChange(render);
  window.addCleanup(unsubDirty);

  // Initial render. ensureLoaded resolves immediately if already
  // loaded, otherwise kicks off the network fetch and re-renders when
  // it lands.
  render();
  api.ensureLoaded().then(render);
});
`

export default (() => PageTitle) satisfies QuartzComponentConstructor

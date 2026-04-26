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

  // ── Left toolbar: saved layouts ────────────────────────────────────
  // The graphLayouts API is set up by graph.inline.ts (module-scope
  // bootstrap). It exists by the time this nav handler fires because
  // graph.inline.ts is loaded earlier. If it doesn't, no-op.
  var api = window.graphLayouts;
  if (!api) return;

  var currentBtn = document.getElementById("graph-layouts-current");
  var newBtn = document.getElementById("graph-layouts-new");
  var renameBtn = document.getElementById("graph-layouts-rename");
  var deleteBtn = document.getElementById("graph-layouts-delete");
  var menu = document.getElementById("graph-layouts-menu");
  if (!currentBtn || !newBtn || !renameBtn || !deleteBtn || !menu) return;

  // Render the toolbar's visible state from the current layouts API.
  // Called on initial load AND on every state change (via api.onChange).
  function render() {
    var state = api.getState();
    var activeId = state.activeLayout;
    var active = activeId && state.layouts[activeId] ? state.layouts[activeId] : null;
    var nameEl = currentBtn.querySelector(".graph-layouts-current-name");
    if (nameEl) nameEl.textContent = active ? active.name : "No layout";
    renameBtn.disabled = !active;
    deleteBtn.disabled = !active;
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

  // Initial render. ensureLoaded resolves immediately if already
  // loaded, otherwise kicks off the network fetch and re-renders when
  // it lands.
  render();
  api.ensureLoaded().then(render);
});
`

export default (() => PageTitle) satisfies QuartzComponentConstructor

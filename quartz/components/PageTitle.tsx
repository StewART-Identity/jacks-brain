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
document.addEventListener("nav", function() {
  var toggle = document.querySelector(".mobile-menu-toggle");
  var content = document.querySelector(".sidebar-content");
  if (!toggle || !content) return;
  toggle.addEventListener("click", function() {
    var open = content.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  var fsBtn = document.getElementById("graph-fullscreen-btn");
  var zoomInBtn = document.getElementById("graph-zoom-in");
  var zoomOutBtn = document.getElementById("graph-zoom-out");
  var graphEl = document.getElementById("full-graph");
  if (graphEl && fsBtn) {
    fsBtn.addEventListener("click", function() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (graphEl.requestFullscreen) {
        graphEl.requestFullscreen();
      } else if (graphEl.webkitRequestFullscreen) {
        graphEl.webkitRequestFullscreen();
      }
    });

    // Zoom buttons simulate wheel events on the canvas
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
    if (zoomInBtn) zoomInBtn.addEventListener("click", function() { simulateZoom(-1); });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function() { simulateZoom(1); });
  }
});
`

export default (() => PageTitle) satisfies QuartzComponentConstructor

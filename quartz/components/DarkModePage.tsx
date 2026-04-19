import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const DarkModePage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="darkmode-page">
      <div class="toggle-page-cta">
        <button id="darkmode-page-btn" class="darkmode toggle-page-btn">Toggle Light/Dark Mode</button>
      </div>
    </div>
  )
}

DarkModePage.css = `
.toggle-page-cta {
  text-align: center;
  margin-top: 2rem;
}
.toggle-page-btn {
  padding: 0.8rem 2rem;
  background: var(--secondary);
  color: var(--light);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.toggle-page-btn:hover {
  opacity: 0.85;
}
`

export default (() => DarkModePage) satisfies QuartzComponentConstructor

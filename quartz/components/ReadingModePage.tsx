import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const ReadingModePage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="readingmode-page">
      <div class="toggle-page-cta">
        <button id="readingmode-page-btn" class="readermode toggle-page-btn">Toggle Reading Mode</button>
      </div>
    </div>
  )
}

export default (() => ReadingModePage) satisfies QuartzComponentConstructor

import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Notes: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div
      class={displayClass}
      id="notes-app"
      style="padding: 1rem; border: 2px solid red; background: yellow; color: black; font-size: 1.2rem; max-width: 720px;"
    >
      <strong>NOTES COMPONENT IS RENDERING.</strong>
      <br />
      If you can see this big red-bordered yellow box, the wiring works.
    </div>
  )
}

export default (() => Notes) satisfies QuartzComponentConstructor

// Jack's Brain is dark-only (see quartz.config.ts — the lightMode and darkMode
// palette keys are identical, by design). The original Quartz darkmode script
// reads the user's OS prefers-color-scheme and sets `saved-theme` to either
// "light" or "dark" accordingly. For us, that's a bug: when the user's iOS
// device is set to light mode, this would set `saved-theme="light"` and our
// custom.scss's `:root` (light-mode) block applies. In that block
// `--dark: $green-900` — the same color as the dark canvas background — so
// h1–h6 (which base.scss colors via `var(--dark)`) become invisible.
//
// Fix: force `saved-theme="dark"` unconditionally on every page load. We keep
// the rest of the script (theme-toggle button, prefers-color-scheme listener)
// intact for the moment in case any UI surfaces still call it, but they'll
// just no-op against the forced-dark attribute.

document.documentElement.setAttribute("saved-theme", "dark")

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

document.addEventListener("nav", () => {
  // The theme-toggle button (if rendered anywhere) used to flip between light
  // and dark. We keep the listener so click events don't error, but the toggle
  // is a no-op now — we always re-pin to "dark".
  const switchTheme = () => {
    document.documentElement.setAttribute("saved-theme", "dark")
    localStorage.setItem("theme", "dark")
    emitThemeChangeEvent("dark")
  }

  // OS-level prefers-color-scheme changes also no-op — we ignore the user's OS
  // preference and stay dark.
  const themeChange = (_e: MediaQueryListEvent) => {
    document.documentElement.setAttribute("saved-theme", "dark")
    localStorage.setItem("theme", "dark")
    emitThemeChangeEvent("dark")
  }

  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    darkmodeButton.addEventListener("click", switchTheme)
    window.addCleanup(() => darkmodeButton.removeEventListener("click", switchTheme))
  }

  // Listen for changes in prefers-color-scheme — kept so the cleanup contract
  // is unchanged, but the handler just re-pins to dark.
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", themeChange)
  window.addCleanup(() => colorSchemeMediaQuery.removeEventListener("change", themeChange))
})

import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 *
 * Note on theming: this site is dark-only. The Darkmode component
 * (and its inline script that set `saved-theme="dark"` on <html>)
 * has been removed from the layout, so the `saved-theme` attribute
 * is never set at runtime. Any CSS rule scoped to
 * `:root[saved-theme="dark"]` would therefore never match.
 *
 * Quartz's theme system still emits two CSS color blocks here (one
 * for default `:root`, one for `:root[saved-theme="dark"]`), so we
 * keep both palette keys below and set them to identical values.
 * That way the default `:root` block — the only one that actually
 * applies — already holds the dark-mode colors. quartz/styles
 * custom.scss does the same in its own `:root` block. No CSS
 * inside this repo should add new `[saved-theme="dark"]`
 * qualifiers; they'd be silently dead. See custom.scss's header
 * note for the full rationale.
 */

const palette = {
  light: "#0F2418",
  lightgray: "#1B3F29",
  gray: "#7BBF95",
  darkgray: "#E3E0DB",
  dark: "#F0DDB3",
  secondary: "#D4AD5A",
  tertiary: "#7BBF95",
  highlight: "rgba(27, 63, 41, 0.5)",
  textHighlight: "#6B4D1A",
}

const config: QuartzConfig = {
  configuration: {
    pageTitle: "Jack's Brain",
    pageTitleSuffix: " - Jack's Brain",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "jacks-brain.pages.dev",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Space Grotesk",
        body: "Source Sans Pro",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: palette,
        darkMode: palette,
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.SubjectPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.CorpusIndex(),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config

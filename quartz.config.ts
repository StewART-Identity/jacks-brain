import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 *
 * Note on theming: this site is dark-only. The Quartz theme system still
 * emits two CSS color blocks (one for default `:root`, one for
 * `:root[saved-theme="dark"]`), so we keep both keys here and set them to
 * identical values. The Light/Dark Mode toggle component, sidebar link,
 * and content page have been removed, but the underlying darkmode.inline
 * script (imported via ApplicationMenu) may still set `saved-theme` based
 * on the user's OS preference on first visit. Identical color blocks
 * guarantee that has no visible effect.
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
    pageTitleSuffix: "",
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
      Plugin.UpskillPage(),
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

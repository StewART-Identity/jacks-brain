import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { scanTopics } from "../util/upskill"

/**
 * UpskillTopics — card grid of all Upskill topics.
 *
 * Renders at /upskill/topics. Each card shows one topic's title and
 * summary (from data/upskill/<slug>/meta.json) and links to the
 * topic landing page at /upskill/<slug>.
 *
 * Server-rendered. scanTopics() runs at build time and the topic
 * list is baked into the HTML — no fetch, no client-side JS. The
 * sidebar Manage UI writes meta.json files; the next Cloudflare
 * Pages build picks them up and this page rebuilds automatically.
 *
 * Visual contract:
 *   - Responsive auto-fit grid: 1 column on mobile, 2 on tablet,
 *     3 on desktop.
 *   - Each card has a title (linked, brass), an order badge, and a
 *     summary paragraph.
 *   - Hover lifts the card border to the brass accent — the same
 *     affordance the Sources page rows use on hover.
 *   - Empty state: friendly note pointing at /upskill/manage when
 *     no topics exist yet.
 */
const UpskillTopics: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const topics = scanTopics()

  if (topics.length === 0) {
    return (
      <div class={displayClass} id="upskill-topics-app">
        <div class="upskill-topics-empty">
          <p>No Upskill topics yet.</p>
          <p>
            Add one from <a href="/upskill/manage">Manage</a>, then come back here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div class={displayClass} id="upskill-topics-app">
      <div class="upskill-topics-grid">
        {topics.map((t) => (
          <a class="upskill-topic-card" href={`/upskill/${t.slug}`}>
            <h3 class="upskill-topic-card-title">{t.title}</h3>
            {t.summary && (
              <p class="upskill-topic-card-summary">{t.summary}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

UpskillTopics.css = `
#upskill-topics-app {
  padding: 0.5rem 0 2rem;
}

.upskill-topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.upskill-topic-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.1rem 1.2rem 1.2rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.upskill-topic-card:hover {
  border-color: var(--secondary);
  background: color-mix(in srgb, var(--light) 88%, var(--secondary) 6%);
  transform: translateY(-1px);
}

.upskill-topic-card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--secondary);
  letter-spacing: 0.01em;
}

.upskill-topic-card-summary {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--darkgray);
  opacity: 0.9;
}

.upskill-topics-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--gray);
  font-size: 0.95rem;
}
.upskill-topics-empty p {
  margin: 0.3rem 0;
}
.upskill-topics-empty a {
  color: var(--secondary);
}
`

export default (() => UpskillTopics) satisfies QuartzComponentConstructor

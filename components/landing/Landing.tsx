import { ArrowRight } from "lucide-react";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LandingAuthActions } from "@/components/landing/LandingAuthActions";
import {
  contentTypeIcons,
  LandingLogo,
} from "@/components/landing/LandingPrimitives";
import { landingContent } from "@/lib/landing-content";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const enter = (ms: number): CSSProperties =>
  ({ "--aa-d": `${ms}ms` }) as CSSProperties;

const EmoteIcon = contentTypeIcons.emotes;
const ScoreIcon = contentTypeIcons.scorebugs;

const flowMods: Array<{ name: string; doing: string; dot: string }> = [
  { name: "mika", doing: "queued a clip", dot: "#D9704F" },
  { name: "dex", doing: "dropped an emote", dot: "#C69A58" },
  { name: "nia", doing: "cued a scorebug", dot: "#F2E9D8" },
];

function LaminatePass() {
  return (
    <div className="aa-lanyard">
      <Link href={landingContent.ctas.primary.href} className="aa-passlink">
        <svg
          className="aa-strap"
          width="120"
          height="106"
          viewBox="0 0 120 106"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M14 0 L54 102 L66 102 L26 0 Z" fill="#B4573B" />
          <path d="M106 0 L66 102 L54 102 L94 0 Z" fill="#D9704F" />
        </svg>
        <span className="aa-clip" aria-hidden="true" />
        <span className="aa-pass">
          <span className="aa-pass-slot" aria-hidden="true" />
          <span className="aa-pass-top">
            <em className="aa-pass-kicker">All access</em>
            <Image
              src={landingContent.logos.iconDark}
              alt=""
              width={18}
              height={18}
              className="aa-pass-mark"
            />
          </span>
          <strong className="aa-pass-label">
            {landingContent.ctas.primary.label}
          </strong>
          <span className="aa-pass-foot">
            <em>admits: you</em>
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </span>
      </Link>
    </div>
  );
}

export function Landing() {
  return (
    <div className={`${dmSerif.variable} ${dmSans.variable} aa-root`}>
      <div className="aa-dim" aria-hidden="true" />

      <header className="aa-in relative z-10" style={enter(0)}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <LandingLogo tone="dark" priority />
          <LandingAuthActions
            className="flex items-center gap-1 sm:gap-3"
            secondaryClassName="aa-btn-quiet"
            primaryClassName="aa-btn-brass"
          />
        </div>
      </header>

      <main>
        <div className="aa-lamp" aria-hidden="true" />

        {/* Row 1 — hero */}
        <section aria-labelledby="aa-hero-title" className="pt-4 md:pt-8">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-7 px-5 sm:px-8 md:grid-cols-12">
            <div
              className="aa-tile aa-hero aa-in relative flex flex-col p-8 sm:p-10 lg:p-12 md:col-span-7"
              style={enter(90)}
            >
              <p className="aa-eyebrow">{landingContent.proposition.eyebrow}</p>
              <h1
                id="aa-hero-title"
                className="aa-display aa-h1 mt-6 lg:mt-[15.5rem]"
              >
                You stay in the <em>spotlight</em>. Your crew runs the room.
              </h1>
              <p className="aa-sub mt-5 max-w-[46ch]">
                Moddrop gives your approved mods a shared canvas for stream
                moments — placed live through a single OBS browser source.
              </p>
              <LaminatePass />
              <div className="mt-7">
                <Link
                  href={landingContent.ctas.secondary.href}
                  className="aa-seelink"
                >
                  {landingContent.ctas.secondary.label}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </div>

            <div className="aa-in relative md:col-span-5" style={enter(200)}>
              <div className="aa-photo relative aspect-[3/4] overflow-hidden md:aspect-auto md:h-full md:min-h-[520px]">
                <Image
                  src={landingContent.imagery.hero.src}
                  alt={landingContent.imagery.hero.alt}
                  fill
                  priority
                  sizes="(min-width: 768px) 42vw, 94vw"
                  className="object-cover"
                />
                <div className="aa-photo-grade" aria-hidden="true" />
                <p className="aa-photo-caption">your seat’s saved.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2 — the framed canvas */}
        <section
          id="product"
          aria-labelledby="aa-demo-title"
          className="mt-24 scroll-mt-10"
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="grid grid-cols-12">
              <div className="col-span-12 lg:col-span-10 lg:col-start-2">
                <figure className="aa-framewrap aa-in" style={enter(280)}>
                  <div className="aa-picturelight" aria-hidden="true" />
                  <div className="aa-frame">
                    <div className="aa-frame-mat">
                      <div
                        className="aa-canvasmock relative aspect-[3/2] overflow-hidden"
                        aria-hidden="true"
                      >
                        <span className="aa-cm-tab">shared canvas</span>
                        <span className="aa-cm-live">
                          <i />
                          Live
                        </span>

                        <div className="aa-cm-stream">
                          <span className="aa-cm-streamlabel">your stream</span>
                        </div>

                        <div className="aa-cm-card aa-cm-brb">
                          <em>be right back</em>
                          <span>refilling the mug · 4:00</span>
                        </div>

                        <div className="aa-cm-card aa-cm-clip">
                          <span className="aa-cm-thumb">
                            <svg
                              viewBox="0 0 20 20"
                              width="13"
                              height="13"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path d="M6 4 L15 10 L6 16 Z" />
                            </svg>
                          </span>
                          clip · queued
                        </div>

                        <div className="aa-cm-emote">
                          <EmoteIcon width={22} height={22} />
                        </div>

                        <div className="aa-cm-card aa-cm-score">
                          <ScoreIcon
                            width={13}
                            height={13}
                            className="aa-score-icon"
                          />
                          2–1
                        </div>

                        <div className="aa-cm-cur aa-cm-cur--mika">
                          <svg
                            viewBox="0 0 20 20"
                            width="18"
                            height="18"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d="M4 2 L4 16.5 L7.7 13.2 L9.9 18 L12.4 16.9 L10.2 12.2 L15.5 12.2 Z" />
                          </svg>
                          <span className="aa-cm-curtag">mika · mod</span>
                        </div>
                        <div className="aa-cm-cur aa-cm-cur--dex">
                          <svg
                            viewBox="0 0 20 20"
                            width="18"
                            height="18"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d="M4 2 L4 16.5 L7.7 13.2 L9.9 18 L12.4 16.9 L10.2 12.2 L15.5 12.2 Z" />
                          </svg>
                          <span className="aa-cm-curtag">dex · mod</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </figure>
                <h2 id="aa-demo-title" className="aa-display aa-placard">
                  The shared canvas — exactly what your mods see
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Row 3 — the signal path: many mods → one shared canvas → one OBS source */}
        <section aria-labelledby="aa-flow-title" className="mt-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div
              className="aa-tile aa-in overflow-hidden p-7 sm:p-10 lg:p-12"
              style={enter(60)}
            >
              <div className="aa-flow-head">
                <div>
                  <p className="aa-eyebrow">the signal path</p>
                  <h2 id="aa-flow-title" className="aa-display aa-h2 mt-3">
                    Many hands. <em>One browser source.</em>
                  </h2>
                </div>
                <p className="aa-flow-lead">
                  {landingContent.product.collaborationDescription} It all lands
                  on one shared canvas — and reaches OBS through a single
                  browser source. You never alt-tab.
                </p>
              </div>

              <div
                className="aa-flow"
                role="img"
                aria-label="Three approved moderators place a clip, an emote, and a scorebug onto one shared canvas, which reaches OBS through a single browser source."
              >
                <ul className="aa-flow-crew">
                  {flowMods.map((mod) => (
                    <li key={mod.name} className="aa-modcard">
                      <span
                        className="aa-mod-dot"
                        style={{ backgroundColor: mod.dot }}
                        aria-hidden="true"
                      />
                      <span className="aa-mod-meta">
                        <strong>
                          {mod.name} <em>· mod</em>
                        </strong>
                        <span>{mod.doing}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div
                  className="aa-flow-link aa-flow-link--fan"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 120 236"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      className="aa-wire"
                      vectorEffect="non-scaling-stroke"
                      d="M0 40 C 66 40, 44 118, 120 118"
                    />
                    <path
                      className="aa-wire"
                      vectorEffect="non-scaling-stroke"
                      d="M0 118 H 120"
                    />
                    <path
                      className="aa-wire"
                      vectorEffect="non-scaling-stroke"
                      d="M0 196 C 66 196, 44 118, 120 118"
                    />
                    <path
                      className="aa-wire aa-wire--flow"
                      vectorEffect="non-scaling-stroke"
                      style={{ animationDelay: "0s" }}
                      d="M0 40 C 66 40, 44 118, 120 118"
                    />
                    <path
                      className="aa-wire aa-wire--flow"
                      vectorEffect="non-scaling-stroke"
                      style={{ animationDelay: "0.45s" }}
                      d="M0 118 H 120"
                    />
                    <path
                      className="aa-wire aa-wire--flow"
                      vectorEffect="non-scaling-stroke"
                      style={{ animationDelay: "0.9s" }}
                      d="M0 196 C 66 196, 44 118, 120 118"
                    />
                  </svg>
                  <span className="aa-arrow" aria-hidden="true" />
                </div>

                <div className="aa-flow-node aa-canvasnode">
                  <span className="aa-node-tab">shared canvas</span>
                  <div className="aa-canvasgrid">
                    <span
                      className="aa-media aa-media--brb"
                      style={{ "--i": 0 } as CSSProperties}
                    >
                      BRB
                    </span>
                    <span
                      className="aa-media aa-media--emote"
                      style={{ "--i": 1 } as CSSProperties}
                    >
                      <EmoteIcon width={16} height={16} />
                    </span>
                    <span
                      className="aa-media aa-media--clip"
                      style={{ "--i": 2 } as CSSProperties}
                    >
                      clip
                    </span>
                    <span
                      className="aa-media aa-media--score"
                      style={{ "--i": 3 } as CSSProperties}
                    >
                      <ScoreIcon
                        width={12}
                        height={12}
                        className="aa-score-icon"
                      />
                      2–1
                    </span>
                  </div>
                  <span className="aa-node-live">
                    <i aria-hidden="true" />
                    live
                  </span>
                </div>

                <div
                  className="aa-flow-link aa-flow-link--single"
                  aria-hidden="true"
                >
                  <span className="aa-onesrc">1 source</span>
                  <svg
                    viewBox="0 0 90 236"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      className="aa-wire aa-wire--thick"
                      vectorEffect="non-scaling-stroke"
                      d="M0 118 H 90"
                    />
                    <path
                      className="aa-wire aa-wire--flow aa-wire--ember"
                      vectorEffect="non-scaling-stroke"
                      d="M0 118 H 90"
                    />
                  </svg>
                  <span
                    className="aa-arrow aa-arrow--ember"
                    aria-hidden="true"
                  />
                </div>

                <div className="aa-flow-node aa-obsnode">
                  <span className="aa-obs-bar" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong className="aa-obs-mark">OBS</strong>
                  <span className="aa-obs-src">one browser source</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Row 4 — setup */}
        <section aria-labelledby="aa-steps-title" className="my-28 lg:my-40">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <p className="aa-eyebrow text-center">the run of show</p>
            <h2
              id="aa-steps-title"
              className="aa-display aa-h2 mt-3 text-center"
            >
              Getting in is the <em>easy</em> part.
            </h2>
            <ol className="mt-12 grid list-none grid-cols-1 gap-7 md:grid-cols-3">
              {landingContent.setupSteps.map((step) => (
                <li key={step.number} className="aa-tile aa-step">
                  <span className="aa-display aa-num" aria-hidden="true">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="aa-display aa-steptitle">{step.title}</h3>
                    <p className="aa-stepbody mt-2">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Row 5 — snack table + key rack */}
        <section className="mt-24">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-7 px-5 sm:px-8 md:grid-cols-12">
            <div className="aa-tile p-8 sm:p-10 md:col-span-7">
              <p className="aa-eyebrow">the snack table</p>
              <h2 className="aa-display aa-h2 mt-3">
                Everything your crew can run
              </h2>
              <ul className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {landingContent.contentTypes.map((type) => {
                  const Icon = contentTypeIcons[type.id];
                  return (
                    <li key={type.id} className="aa-snack" data-ct={type.id}>
                      <span className="aa-iconwrap">
                        <Icon aria-hidden className="aa-snack-icon" />
                      </span>
                      <h3>{type.title}</h3>
                      <p>{type.description}</p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="aa-tile p-8 sm:p-10 md:col-span-5">
              <p className="aa-eyebrow">the key rack</p>
              <h2 className="aa-display aa-h2 mt-3">Live on Twitch today</h2>
              <p className="aa-body mt-2">More doors get keys soon.</p>
              <ul className="aa-rack mt-8 list-none">
                {landingContent.integrations.map((integration, index) => (
                  <li
                    key={integration.name}
                    className="aa-hookrow"
                    data-lit={integration.status === "supported"}
                  >
                    <span className="aa-peg" aria-hidden="true" />
                    <div
                      className="aa-keytag"
                      style={{
                        transform: `rotate(${index % 2 === 0 ? -0.7 : 0.7}deg)`,
                      }}
                    >
                      <span className="aa-keytag-hole" aria-hidden="true" />
                      <Image
                        src={integration.src}
                        alt=""
                        width={integration.width}
                        height={integration.height}
                      />
                      <span className="aa-keytag-name">{integration.name}</span>
                      <em className="aa-keytag-status">
                        {integration.status === "supported"
                          ? "supported today"
                          : "coming soon"}
                      </em>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Closing — the cream sliver */}
        <section aria-labelledby="aa-close-title" className="mt-28">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="aa-sliver grid grid-cols-1 items-center gap-10 p-9 sm:p-12 lg:grid-cols-[1fr_auto] lg:p-16">
              <div>
                <h2 id="aa-close-title" className="aa-display aa-closetitle">
                  No dashboards to babysit — <em>just your people.</em>
                </h2>
                <Link
                  href={landingContent.ctas.secondary.href}
                  className="aa-link-bronze mt-5"
                >
                  {landingContent.ctas.secondary.label}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
              <div className="pt-7">
                <Link
                  href={landingContent.ctas.primary.href}
                  className="aa-minipass"
                >
                  <span className="aa-minipass-strap" aria-hidden="true" />
                  <span
                    className="aa-pass-slot aa-pass-slot--dark"
                    aria-hidden="true"
                  />
                  <em className="aa-minipass-kicker">All access</em>
                  <strong className="aa-minipass-label">
                    {landingContent.ctas.primary.label}
                  </strong>
                  <span className="aa-minipass-foot">
                    <em>admits: you</em>
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 pb-12">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-8 sm:px-8">
          <LandingLogo tone="dark" />
          <p className="aa-display aa-foottag">
            The live layer for your stream
          </p>
          <p className="aa-footnote">© 2026 Moddrop</p>
        </div>
      </footer>

      <style>{`
        .aa-root {
          --aa-pine: #1F362C;
          --aa-billiard: #2C4A3C;
          --aa-billiard-hi: #35564A;
          --aa-cream: #F2E9D8;
          --aa-brass: #C69A58;
          --aa-brass-hi: #D8B274;
          --aa-bronze: #7A5626;
          --aa-ember: #D9704F;
          --aa-ink: #241B10;
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          background:
            radial-gradient(1200px 700px at 16% -4%, rgba(198, 154, 88, 0.10), transparent 62%),
            radial-gradient(1200px 800px at 88% 110%, rgba(217, 112, 79, 0.05), transparent 60%),
            var(--aa-pine);
          color: var(--aa-cream);
          font-family: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.6;
        }
        .aa-root::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          opacity: 0.055;
          mix-blend-mode: soft-light;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }
        .aa-root ::selection {
          background: var(--aa-brass);
          color: var(--aa-ink);
        }

        /* House lights */
        .aa-lamp {
          position: absolute;
          inset: 0 0 auto 0;
          height: 980px;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(
            920px 640px at 20% 120px,
            rgba(198, 154, 88, 0.22),
            rgba(198, 154, 88, 0.06) 45%,
            transparent 70%
          );
          transform-origin: 20% 10%;
          animation: aa-bloom 1.3s ease-out both;
        }
        .aa-dim {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
          background: #0C1611;
          animation: aa-lightsup 1s ease-out 0.05s both;
        }
        @keyframes aa-bloom {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes aa-lightsup {
          from { opacity: 0.5; }
          to { opacity: 0; }
        }

        /* Entrance */
        .aa-in {
          animation: aa-rise 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) both;
          animation-delay: var(--aa-d, 0ms);
        }
        @keyframes aa-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }

        /* Type */
        .aa-display {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-weight: 400;
        }
        .aa-h1 {
          font-size: clamp(2.5rem, 5.6vw, 3.4rem);
          line-height: 1.06;
          letter-spacing: 0.002em;
          max-width: 15em;
        }
        .aa-h1 em,
        .aa-h2 em {
          font-style: italic;
          color: var(--aa-brass-hi);
        }
        .aa-h2 {
          font-size: clamp(1.55rem, 3vw, 2.1rem);
          line-height: 1.18;
        }
        .aa-eyebrow {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: 1.05rem;
          color: var(--aa-brass-hi);
        }
        .aa-eyebrow::before {
          content: "";
          display: inline-block;
          width: 1.9rem;
          height: 1px;
          background: var(--aa-brass);
          opacity: 0.7;
          margin-right: 0.7rem;
          vertical-align: 0.28em;
        }
        .text-center.aa-eyebrow::before {
          display: none;
        }
        .aa-sub {
          font-size: 1.06rem;
          line-height: 1.65;
          color: rgba(242, 233, 216, 0.84);
        }
        .aa-body {
          font-size: 0.98rem;
          line-height: 1.65;
          color: rgba(242, 233, 216, 0.78);
        }

        /* Surfaces */
        .aa-tile {
          background: linear-gradient(160deg, #30503F 0%, var(--aa-billiard) 55%, #294538 100%);
          border: 1px solid rgba(198, 154, 88, 0.16);
          border-radius: 24px;
          box-shadow:
            inset 0 1px 0 rgba(242, 233, 216, 0.05),
            0 24px 48px -28px rgba(0, 0, 0, 0.5);
        }

        /* Buttons */
        .aa-btn-quiet {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 0.9rem;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(242, 233, 216, 0.85);
        }
        .aa-btn-quiet:hover {
          color: var(--aa-cream);
          text-decoration: underline;
          text-underline-offset: 5px;
          text-decoration-color: var(--aa-brass);
        }
        .aa-btn-brass {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
          padding: 0 1.25rem;
          border-radius: 999px;
          background: var(--aa-brass);
          color: var(--aa-ink);
          font-size: 0.95rem;
          font-weight: 600;
        }
        .aa-btn-brass:hover {
          background: var(--aa-brass-hi);
          transform: translateY(-1px);
        }
        .aa-seelink {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
          font-size: 0.98rem;
          font-weight: 500;
          color: var(--aa-cream);
          text-decoration: underline;
          text-underline-offset: 6px;
          text-decoration-color: rgba(198, 154, 88, 0.7);
        }
        .aa-seelink:hover {
          text-decoration-color: var(--aa-ember);
        }
        .aa-root a:focus-visible,
        .aa-root button:focus-visible {
          outline: 2px solid var(--aa-brass-hi);
          outline-offset: 3px;
          border-radius: 10px;
        }
        .aa-sliver a:focus-visible {
          outline-color: var(--aa-bronze);
        }

        /* The laminate pass */
        .aa-lanyard {
          margin-top: 2.25rem;
        }
        .aa-passlink {
          display: inline-block;
          max-width: 100%;
          border-radius: 18px;
        }
        .aa-strap,
        .aa-clip {
          display: none;
        }
        .aa-pass {
          display: block;
          width: 15rem;
          max-width: 100%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(165deg, #FBF5E9 0%, var(--aa-cream) 60%, #E7DAC1 100%);
          color: var(--aa-ink);
          border-radius: 18px;
          padding: 1rem 1.2rem 1.1rem;
          box-shadow:
            0 18px 34px -18px rgba(0, 0, 0, 0.55),
            0 2px 6px rgba(0, 0, 0, 0.2);
          transform: rotate(-1.5deg);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .aa-pass::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 42%, rgba(255, 255, 255, 0.55) 50%, transparent 58%);
          opacity: 0.35;
          pointer-events: none;
        }
        .aa-passlink:hover .aa-pass,
        .aa-passlink:focus-visible .aa-pass {
          transform: rotate(-1.5deg) translateY(-3px);
          box-shadow:
            0 24px 40px -18px rgba(0, 0, 0, 0.6),
            0 2px 6px rgba(0, 0, 0, 0.2);
        }
        .aa-passlink:active .aa-pass {
          transform: translateY(4px) scale(0.985);
        }
        .aa-pass-slot {
          display: block;
          width: 2.6rem;
          height: 0.5rem;
          margin: 0 auto 0.85rem;
          border-radius: 999px;
          background: rgba(36, 27, 16, 0.22);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .aa-pass-slot--dark {
          background: rgba(0, 0, 0, 0.42);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
        }
        .aa-pass-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .aa-pass-kicker {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.98rem;
          color: var(--aa-bronze);
        }
        .aa-pass-mark {
          opacity: 0.75;
        }
        .aa-pass-label {
          display: block;
          margin-top: 0.45rem;
          font-size: 1.04rem;
          font-weight: 600;
          line-height: 1.3;
        }
        .aa-pass-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.85rem;
          padding-top: 0.7rem;
          border-top: 1px dashed rgba(122, 86, 38, 0.4);
          font-size: 0.85rem;
          color: var(--aa-bronze);
        }
        .aa-pass-foot em {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
        }
        @media (min-width: 1024px) {
          .aa-lanyard {
            position: absolute;
            top: -1px;
            right: 3rem;
            margin: 0;
          }
          .aa-passlink {
            display: block;
            transform-origin: 50% 0;
            animation: aa-sway 5.2s ease-in-out infinite alternate;
          }
          .aa-strap {
            display: block;
            margin: 0 auto;
          }
          .aa-clip {
            display: block;
            width: 2.2rem;
            height: 1rem;
            margin: -2px auto;
            position: relative;
            z-index: 2;
            border-radius: 4px 4px 6px 6px;
            background: linear-gradient(180deg, #E0BE83, #A87F41);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
            transition: background 0.2s ease;
          }
          .aa-passlink:hover .aa-clip,
          .aa-passlink:focus-visible .aa-clip {
            background: linear-gradient(180deg, #E89A6F, var(--aa-ember));
          }
          .aa-pass {
            transform: none;
          }
          .aa-passlink:hover .aa-pass,
          .aa-passlink:focus-visible .aa-pass {
            transform: perspective(700px) rotateX(9deg) rotateY(-7deg) translateY(-2px);
          }
          .aa-passlink:active .aa-pass {
            transform: translateY(5px) scale(0.985);
          }
        }
        @keyframes aa-sway {
          from { transform: rotate(-2.6deg); }
          to { transform: rotate(2.6deg); }
        }

        /* Hero photo */
        .aa-photo {
          border-radius: 24px;
          border: 1px solid rgba(198, 154, 88, 0.35);
          box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.65);
        }
        .aa-photo-grade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(200deg, rgba(198, 154, 88, 0.1), transparent 36%),
            linear-gradient(0deg, rgba(23, 40, 32, 0.55), transparent 42%);
          box-shadow: inset 0 0 90px rgba(23, 40, 32, 0.4);
        }
        .aa-photo-caption {
          position: absolute;
          left: 1.4rem;
          bottom: 1.1rem;
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: 1.1rem;
          color: var(--aa-cream);
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.6);
        }

        /* Framed canvas */
        .aa-framewrap {
          position: relative;
          padding-top: 2.6rem;
        }
        .aa-picturelight {
          position: absolute;
          top: 1.6rem;
          left: 50%;
          transform: translateX(-50%);
          width: 9rem;
          height: 0.55rem;
          border-radius: 999px;
          background: linear-gradient(180deg, #E0BE83, #8A6430);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.45);
        }
        .aa-picturelight::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 0.4rem;
          transform: translateX(-50%);
          width: 36rem;
          max-width: 84vw;
          height: 10rem;
          background: radial-gradient(closest-side, rgba(198, 154, 88, 0.26), transparent);
          pointer-events: none;
        }
        .aa-frame {
          position: relative;
          border-radius: 14px;
          padding: clamp(8px, 1.4vw, 14px);
          background: linear-gradient(160deg, #8A6430, var(--aa-brass) 30%, #7A5626 65%, var(--aa-brass-hi) 100%);
          box-shadow:
            0 40px 80px -40px rgba(0, 0, 0, 0.7),
            inset 0 2px 0 rgba(255, 255, 255, 0.12);
        }
        .aa-frame-mat {
          border-radius: 8px;
          padding: clamp(6px, 1vw, 10px);
          background: #1A2C24;
        }
        /* Shared-canvas mock (the framed "big picture") */
        .aa-canvasmock {
          border-radius: 6px;
          background:
            radial-gradient(120% 92% at 50% -8%, rgba(52, 86, 68, 0.55), transparent 62%),
            radial-gradient(rgba(242, 233, 216, 0.05) 1px, transparent 1.6px),
            linear-gradient(160deg, #16261F, #101C17);
          background-size: 100% 100%, 26px 26px, 100% 100%;
          box-shadow: inset 0 0 90px rgba(8, 16, 12, 0.6);
          font-size: clamp(0.62rem, 1.2vw, 0.8rem);
        }
        .aa-cm-tab {
          position: absolute;
          top: 0.75rem;
          left: 0.85rem;
          z-index: 4;
          padding: 0.2rem 0.62rem;
          border-radius: 999px;
          background: var(--aa-brass);
          color: var(--aa-ink);
          font-size: 0.66rem;
          font-weight: 700;
        }
        .aa-cm-live {
          position: absolute;
          top: 0.75rem;
          right: 0.85rem;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          gap: 0.32rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          background: rgba(16, 26, 21, 0.9);
          border: 1px solid rgba(198, 154, 88, 0.4);
          color: var(--aa-cream);
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .aa-cm-live i {
          width: 0.42rem;
          height: 0.42rem;
          border-radius: 50%;
          background: var(--aa-ember);
          animation: aa-livedot 1.8s ease-in-out infinite;
        }
        .aa-cm-stream {
          position: absolute;
          inset: 22% 30% 24% 30%;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(198, 154, 88, 0.45);
          background:
            radial-gradient(90% 72% at 50% 28%, rgba(198, 154, 88, 0.16), transparent 70%),
            linear-gradient(165deg, #1E3329, #16261F);
          box-shadow:
            inset 0 0 40px rgba(8, 16, 12, 0.55),
            0 0 0 6px rgba(20, 32, 26, 0.45);
        }
        .aa-cm-stream::before {
          content: "";
          position: absolute;
          inset: 12%;
          border: 1px dashed rgba(198, 154, 88, 0.3);
          border-radius: 7px;
        }
        .aa-cm-streamlabel {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: clamp(0.78rem, 1.6vw, 1.05rem);
          color: rgba(216, 178, 116, 0.82);
        }
        .aa-cm-card {
          position: absolute;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 10px;
          font-weight: 600;
          box-shadow: 0 12px 24px -12px rgba(0, 0, 0, 0.6);
        }
        .aa-cm-brb {
          top: 8%;
          left: 5%;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.1rem;
          width: clamp(6rem, 23%, 9.5rem);
          padding: 0.6rem 0.75rem;
          background: linear-gradient(160deg, #F6EEDD, #E7D8BC);
          color: #33261a;
          border: 1px solid rgba(122, 86, 38, 0.25);
        }
        .aa-cm-brb em {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: clamp(0.85rem, 1.7vw, 1.02rem);
          line-height: 1.05;
        }
        .aa-cm-brb span {
          font-size: 0.62rem;
          font-weight: 500;
          color: rgba(51, 38, 26, 0.7);
        }
        .aa-cm-clip {
          bottom: 9%;
          right: 5%;
          padding: 0.42rem 0.72rem 0.42rem 0.46rem;
          background: rgba(20, 33, 26, 0.96);
          border: 1px solid rgba(198, 154, 88, 0.42);
          color: var(--aa-cream);
          animation: aa-cmnudge 9s ease-in-out infinite;
        }
        .aa-cm-thumb {
          display: grid;
          place-items: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 6px;
          background: linear-gradient(160deg, #b4573b, var(--aa-ember));
          color: #fff3e6;
        }
        .aa-cm-thumb svg {
          fill: currentColor;
        }
        .aa-cm-score {
          left: 6%;
          bottom: 12%;
          padding: 0.4rem 0.72rem;
          border-radius: 999px;
          background: #122019;
          border: 1px solid rgba(198, 154, 88, 0.45);
          color: var(--aa-cream);
        }
        .aa-cm-emote {
          position: absolute;
          z-index: 2;
          top: 27%;
          right: 6%;
          width: clamp(2.3rem, 6vw, 3.1rem);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(160deg, #e2825f, var(--aa-ember));
          color: #fff3e6;
          box-shadow: 0 14px 24px -12px rgba(0, 0, 0, 0.55);
          animation: aa-cmpop 7s ease-in-out infinite;
        }
        .aa-cm-cur {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: flex-start;
          gap: 0.3rem;
        }
        .aa-cm-cur svg {
          flex: none;
          stroke: rgba(0, 0, 0, 0.35);
          stroke-width: 0.5;
        }
        .aa-cm-curtag {
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          color: var(--aa-ink);
          font-size: 0.66rem;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.5);
        }
        .aa-cm-cur--mika {
          top: 29%;
          left: 51%;
          animation: aa-cmmika 9s ease-in-out infinite;
        }
        .aa-cm-cur--mika svg {
          fill: var(--aa-brass);
        }
        .aa-cm-cur--mika .aa-cm-curtag {
          background: var(--aa-brass);
        }
        .aa-cm-cur--dex {
          bottom: 30%;
          left: 25%;
          animation: aa-cmdex 11s ease-in-out infinite;
        }
        .aa-cm-cur--dex svg {
          fill: var(--aa-ember);
        }
        .aa-cm-cur--dex .aa-cm-curtag {
          background: var(--aa-ember);
        }
        @keyframes aa-cmmika {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-11px, 9px); }
          55% { transform: translate(7px, 15px); }
          80% { transform: translate(2px, -4px); }
        }
        @keyframes aa-cmdex {
          0%, 100% { transform: translate(0, 0); }
          30% { transform: translate(13px, -9px); }
          60% { transform: translate(21px, 4px); }
          85% { transform: translate(5px, 8px); }
        }
        @keyframes aa-cmpop {
          0%, 60%, 100% { transform: scale(1) rotate(0deg); }
          67% { transform: scale(0.85) rotate(-5deg); }
          74% { transform: scale(1.1) rotate(3deg); }
          82% { transform: scale(1) rotate(0deg); }
        }
        @keyframes aa-cmnudge {
          0%, 42%, 100% { transform: translate(0, 0); }
          52%, 60% { transform: translate(-7px, -6px); }
        }
        @media (max-width: 720px) {
          .aa-canvasmock {
            aspect-ratio: 4 / 3;
            font-size: 0.58rem;
          }
          .aa-cm-stream {
            inset: 27% 27% 25% 27%;
          }
          .aa-cm-streamlabel {
            font-size: 0.82rem;
          }
          .aa-cm-brb {
            top: 21%;
            left: 4%;
            width: clamp(4.4rem, 33%, 5.8rem);
            padding: 0.38rem 0.5rem;
          }
          .aa-cm-brb em {
            font-size: 0.76rem;
          }
          .aa-cm-brb span {
            font-size: 0.56rem;
          }
          .aa-cm-emote {
            top: 13%;
            right: 4%;
            width: 2.1rem;
          }
          .aa-cm-score {
            left: 4%;
            bottom: 8%;
            padding: 0.3rem 0.55rem;
          }
          .aa-cm-clip {
            right: 4%;
            bottom: 8%;
            padding: 0.32rem 0.5rem 0.32rem 0.34rem;
          }
          .aa-cm-thumb {
            width: 1.2rem;
            height: 1.2rem;
          }
          .aa-cm-cur--mika {
            top: 31%;
            left: 47%;
          }
          .aa-cm-cur--dex {
            bottom: 26%;
            left: 21%;
          }
          .aa-cm-curtag {
            font-size: 0.58rem;
            padding: 0.12rem 0.42rem;
          }
          .aa-cm-cur svg {
            width: 14px;
            height: 14px;
          }
        }
        .aa-placard {
          display: block;
          width: fit-content;
          max-width: 100%;
          margin: 1.8rem auto 0;
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          background: linear-gradient(160deg, var(--aa-brass-hi), var(--aa-brass) 45%, #A87F41);
          color: #33261A;
          font-style: italic;
          font-size: clamp(1rem, 2vw, 1.15rem);
          text-align: center;
          box-shadow:
            0 10px 20px -12px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        /* The signal path: crew -> shared canvas -> OBS */
        .aa-flow-head {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem 3rem;
        }
        @media (min-width: 880px) {
          .aa-flow-head {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.02fr);
            align-items: end;
          }
        }
        .aa-flow-lead {
          font-size: 1rem;
          line-height: 1.6;
          color: rgba(242, 233, 216, 0.8);
          max-width: 48ch;
        }
        @media (min-width: 880px) {
          .aa-flow-lead { padding-bottom: 0.35rem; }
        }

        .aa-flow {
          margin-top: 2.6rem;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        @media (min-width: 880px) {
          .aa-flow {
            flex-direction: row;
            align-items: stretch;
            height: 248px;
          }
        }

        /* Crew */
        .aa-flow-crew {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        @media (min-width: 880px) {
          .aa-flow-crew {
            flex: none;
            width: 192px;
            justify-content: space-between;
            gap: 0.9rem;
          }
        }
        .aa-modcard {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-height: 44px;
          padding: 0.62rem 0.85rem;
          border-radius: 14px;
          background: rgba(31, 54, 44, 0.72);
          border: 1px solid rgba(198, 154, 88, 0.22);
          box-shadow: inset 0 1px 0 rgba(242, 233, 216, 0.04);
          animation: aa-modsend 4s ease-in-out infinite;
        }
        .aa-flow-crew li:nth-child(1) { animation-delay: 0s; }
        .aa-flow-crew li:nth-child(2) { animation-delay: 0.45s; }
        .aa-flow-crew li:nth-child(3) { animation-delay: 0.9s; }
        @keyframes aa-modsend {
          0%, 62%, 100% {
            border-color: rgba(198, 154, 88, 0.22);
            box-shadow: inset 0 1px 0 rgba(242, 233, 216, 0.04);
          }
          9%, 22% {
            border-color: rgba(216, 178, 116, 0.65);
            box-shadow:
              0 0 0 1px rgba(216, 178, 116, 0.28),
              inset 0 1px 0 rgba(242, 233, 216, 0.06);
          }
        }
        .aa-mod-dot {
          flex: none;
          width: 0.72rem;
          height: 0.72rem;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.16);
        }
        .aa-mod-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.25;
        }
        .aa-mod-meta strong {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--aa-cream);
        }
        .aa-mod-meta strong em {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          color: rgba(242, 233, 216, 0.5);
        }
        .aa-mod-meta span {
          font-size: 0.76rem;
          color: rgba(242, 233, 216, 0.62);
        }

        /* Connectors */
        .aa-flow-link {
          position: relative;
        }
        @media (min-width: 880px) {
          .aa-flow-link {
            flex: 1 1 0;
            min-width: 46px;
            align-self: stretch;
          }
          .aa-flow-link svg {
            position: absolute;
            inset: 0;
            display: block;
            width: 100%;
            height: 100%;
          }
        }
        @media (max-width: 879px) {
          .aa-flow-link {
            height: 44px;
          }
          .aa-flow-link svg { display: none; }
          .aa-flow-link::before,
          .aa-flow-link::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 3px;
            bottom: 3px;
            width: 2px;
            transform: translateX(-50%);
          }
          .aa-flow-link::before {
            background: rgba(198, 154, 88, 0.28);
          }
          .aa-flow-link::after {
            background: repeating-linear-gradient(
              rgba(216, 178, 116, 0.95) 0 4px,
              transparent 4px 15px
            );
            animation: aa-vflow 1.1s linear infinite;
          }
          .aa-flow-link--single::after {
            background: repeating-linear-gradient(
              var(--aa-ember) 0 4px,
              transparent 4px 14px
            );
          }
        }
        @keyframes aa-vflow {
          to { background-position: 0 19px; }
        }
        .aa-wire {
          fill: none;
          stroke: rgba(198, 154, 88, 0.28);
          stroke-width: 2;
        }
        .aa-wire--flow {
          stroke: var(--aa-brass-hi);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 3 12;
          animation: aa-wireflow 1.3s linear infinite;
        }
        .aa-wire--thick {
          stroke: rgba(216, 178, 116, 0.42);
          stroke-width: 3;
        }
        .aa-wire--ember {
          stroke: var(--aa-ember);
          stroke-width: 2.4;
          stroke-dasharray: 3 11;
          animation-duration: 1s;
        }
        @keyframes aa-wireflow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -30; }
        }
        .aa-arrow {
          position: absolute;
          z-index: 2;
          width: 0;
          height: 0;
        }
        @media (min-width: 880px) {
          .aa-arrow {
            right: -1px;
            top: 50%;
            transform: translateY(-50%);
            border-top: 6px solid transparent;
            border-bottom: 6px solid transparent;
            border-left: 8px solid var(--aa-brass-hi);
          }
          .aa-arrow--ember { border-left-color: var(--aa-ember); }
        }
        @media (max-width: 879px) {
          .aa-arrow {
            left: 50%;
            bottom: -2px;
            transform: translateX(-50%);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid var(--aa-brass-hi);
          }
          .aa-arrow--ember { border-top-color: var(--aa-ember); }
        }

        /* Shared-canvas node */
        .aa-flow-node { flex: none; }
        .aa-canvasnode {
          position: relative;
          align-self: center;
          width: 100%;
          padding: 1.5rem 1rem 1.15rem;
          border-radius: 16px;
          background:
            radial-gradient(130% 100% at 50% 0%, rgba(48, 80, 63, 0.5), transparent 72%),
            #17281F;
          border: 1px solid rgba(198, 154, 88, 0.3);
          box-shadow:
            inset 0 1px 0 rgba(242, 233, 216, 0.05),
            0 20px 40px -26px rgba(0, 0, 0, 0.6);
        }
        @media (min-width: 880px) {
          .aa-canvasnode { width: 216px; }
        }
        .aa-node-tab {
          position: absolute;
          top: -0.72rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.2rem 0.7rem;
          border-radius: 999px;
          background: var(--aa-brass);
          color: var(--aa-ink);
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.5);
        }
        .aa-canvasgrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        .aa-media {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          min-height: 2.5rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--aa-cream);
          border: 1px solid rgba(198, 154, 88, 0.22);
          background: rgba(31, 54, 44, 0.75);
          animation: aa-mediapulse 5.2s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.45s + 0.3s);
        }
        .aa-media--emote {
          color: #FFF3E6;
          background: linear-gradient(160deg, #E2825F, var(--aa-ember));
          border-color: transparent;
        }
        .aa-media--brb {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          color: var(--aa-brass-hi);
        }
        .aa-score-icon { color: var(--aa-brass-hi); }
        @keyframes aa-mediapulse {
          0%, 100% { transform: translateY(0); box-shadow: none; }
          8% {
            transform: translateY(-2px);
            box-shadow: 0 0 0 1px rgba(216, 178, 116, 0.45);
          }
          16% { transform: translateY(0); }
        }
        .aa-node-live {
          position: absolute;
          bottom: -0.72rem;
          right: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.62rem;
          border-radius: 999px;
          background: rgba(16, 26, 21, 0.96);
          border: 1px solid rgba(198, 154, 88, 0.4);
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--aa-cream);
        }
        .aa-node-live i {
          width: 0.42rem;
          height: 0.42rem;
          border-radius: 50%;
          background: var(--aa-ember);
          animation: aa-livedot 1.8s ease-in-out infinite;
        }
        @keyframes aa-livedot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(217, 112, 79, 0.5); }
          50% { opacity: 0.65; box-shadow: 0 0 0 4px rgba(217, 112, 79, 0); }
        }

        /* One source label */
        .aa-onesrc {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -150%);
          padding: 0.16rem 0.58rem;
          border-radius: 999px;
          background: rgba(217, 112, 79, 0.16);
          border: 1px solid rgba(217, 112, 79, 0.55);
          color: #F3C7B5;
          font-size: 0.68rem;
          font-weight: 700;
          white-space: nowrap;
        }
        @media (max-width: 879px) {
          .aa-onesrc { transform: translate(-50%, -50%); }
        }

        /* OBS node */
        .aa-obsnode {
          align-self: center;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.32rem;
          width: 100%;
          padding: 1.15rem 1.2rem 1.2rem;
          border-radius: 16px;
          background: linear-gradient(165deg, #14201A, #101A15);
          border: 1px solid rgba(198, 154, 88, 0.28);
          box-shadow: 0 20px 40px -26px rgba(0, 0, 0, 0.6);
        }
        @media (min-width: 880px) {
          .aa-obsnode { width: 160px; }
        }
        .aa-obs-bar {
          display: inline-flex;
          gap: 0.32rem;
          margin-bottom: 0.15rem;
        }
        .aa-obs-bar i {
          width: 0.4rem;
          height: 0.4rem;
          border-radius: 50%;
          background: rgba(242, 233, 216, 0.32);
        }
        .aa-obs-bar i:first-child { background: var(--aa-ember); }
        .aa-obs-mark {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1;
          color: var(--aa-cream);
        }
        .aa-obs-src {
          font-size: 0.74rem;
          color: rgba(242, 233, 216, 0.6);
        }

        /* Steps */
        .aa-step {
          display: flex;
          align-items: flex-start;
          gap: 1.4rem;
          padding: 1.8rem 1.9rem 2rem;
        }
        .aa-num {
          font-style: italic;
          font-size: 3.6rem;
          line-height: 0.9;
          color: var(--aa-brass);
          margin-top: -0.2rem;
        }
        .aa-steptitle {
          font-size: 1.32rem;
          line-height: 1.25;
        }
        .aa-stepbody {
          font-size: 0.92rem;
          line-height: 1.6;
          color: rgba(242, 233, 216, 0.75);
        }

        /* Snack table */
        .aa-snack {
          border: 1px solid rgba(198, 154, 88, 0.14);
          border-radius: 16px;
          padding: 1.1rem 1.15rem 1.2rem;
          background: rgba(31, 54, 44, 0.55);
          transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }
        .aa-snack:hover {
          background: var(--aa-billiard-hi);
          border-color: rgba(198, 154, 88, 0.35);
          transform: translateY(-3px);
        }
        .aa-iconwrap {
          position: relative;
          display: inline-grid;
          place-items: center;
          width: 2.2rem;
          height: 2.2rem;
        }
        .aa-snack-icon {
          width: 1.4rem;
          height: 1.4rem;
          color: var(--aa-brass-hi);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .aa-snack:hover .aa-snack-icon {
          transform: translateY(-4px);
        }
        .aa-snack[data-ct="audio"]:hover .aa-iconwrap::before,
        .aa-snack[data-ct="audio"]:hover .aa-iconwrap::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(216, 178, 116, 0.7);
          animation: aa-ping 1.6s ease-out infinite;
        }
        .aa-snack[data-ct="audio"]:hover .aa-iconwrap::after {
          animation-delay: 0.5s;
        }
        @keyframes aa-ping {
          0% { transform: scale(0.55); opacity: 0.9; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .aa-snack h3 {
          margin-top: 0.55rem;
          font-size: 0.98rem;
          font-weight: 600;
          color: var(--aa-cream);
        }
        .aa-snack p {
          margin-top: 0.25rem;
          font-size: 0.85rem;
          line-height: 1.5;
          color: rgba(242, 233, 216, 0.7);
        }

        /* Key rack */
        .aa-rack {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .aa-hookrow {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .aa-peg {
          flex: none;
          width: 0.85rem;
          height: 0.85rem;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #E8CC96, #A87F41 72%);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }
        .aa-keytag {
          position: relative;
          overflow: hidden;
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-height: 44px;
          padding: 0.6rem 0.9rem 0.6rem 0.75rem;
          border-radius: 12px;
          background: linear-gradient(165deg, #FBF5E9, var(--aa-cream) 70%);
          color: #33261A;
          box-shadow: 0 10px 18px -12px rgba(0, 0, 0, 0.5);
        }
        .aa-keytag-hole {
          flex: none;
          width: 0.85rem;
          height: 0.85rem;
          border-radius: 50%;
          border: 2px solid rgba(36, 27, 16, 0.25);
        }
        .aa-keytag img {
          flex: none;
        }
        .aa-keytag-name {
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aa-keytag-status {
          margin-left: auto;
          flex: none;
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.84rem;
          color: var(--aa-bronze);
        }
        .aa-hookrow[data-lit="true"] .aa-keytag {
          box-shadow:
            0 0 0 1px rgba(198, 154, 88, 0.75),
            0 8px 28px -6px rgba(198, 154, 88, 0.45);
        }
        .aa-hookrow[data-lit="true"] .aa-keytag::after {
          content: "";
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.55), transparent);
          transform: skewX(-18deg);
          animation: aa-glint 6.5s ease-in-out 2s infinite;
        }
        .aa-hookrow[data-lit="false"] .aa-keytag {
          opacity: 0.6;
          filter: saturate(0.3);
        }
        @keyframes aa-glint {
          0% { left: -60%; }
          14% { left: 130%; }
          100% { left: 130%; }
        }
        @media (max-width: 420px) {
          .aa-keytag-hole {
            display: none;
          }
          .aa-keytag-status {
            font-size: 0.78rem;
          }
        }

        /* Cream sliver */
        .aa-sliver {
          background: linear-gradient(165deg, #FBF5E9, var(--aa-cream) 55%, #EADDC4);
          color: #33261A;
          border-radius: 28px;
          box-shadow: 0 40px 70px -45px rgba(0, 0, 0, 0.7);
        }
        .aa-closetitle {
          font-size: clamp(1.7rem, 3.4vw, 2.4rem);
          line-height: 1.15;
          color: #2A2013;
          max-width: 22ch;
        }
        .aa-closetitle em {
          font-style: italic;
          color: var(--aa-bronze);
        }
        .aa-link-bronze {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
          font-size: 0.98rem;
          font-weight: 500;
          color: var(--aa-bronze);
          text-decoration: underline;
          text-underline-offset: 6px;
          text-decoration-color: rgba(122, 86, 38, 0.5);
        }
        .aa-link-bronze:hover {
          color: #5E4118;
        }
        .aa-minipass {
          position: relative;
          display: block;
          width: 14.5rem;
          max-width: 100%;
          padding: 1rem 1.15rem 1.1rem;
          border-radius: 16px;
          background: linear-gradient(160deg, #30503F 0%, var(--aa-billiard) 60%, #253F33 100%);
          color: var(--aa-cream);
          box-shadow: 0 22px 36px -20px rgba(31, 54, 44, 0.75);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .aa-minipass:hover {
          transform: rotate(-1deg) translateY(-3px);
          box-shadow: 0 28px 44px -20px rgba(31, 54, 44, 0.8);
        }
        .aa-minipass-strap {
          position: absolute;
          top: -1.5rem;
          left: 50%;
          transform: translateX(-50%);
          width: 0.85rem;
          height: 1.7rem;
          background: linear-gradient(180deg, #D9704F, #B4573B);
          border-radius: 3px;
        }
        .aa-minipass-strap::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -0.1rem;
          transform: translateX(-50%);
          width: 1.5rem;
          height: 0.55rem;
          border-radius: 3px;
          background: linear-gradient(180deg, #E0BE83, #A87F41);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .aa-minipass-kicker {
          display: block;
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.95rem;
          color: var(--aa-brass-hi);
        }
        .aa-minipass-label {
          display: block;
          margin-top: 0.4rem;
          font-size: 1.02rem;
          font-weight: 600;
          line-height: 1.3;
        }
        .aa-minipass-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.8rem;
          padding-top: 0.65rem;
          border-top: 1px dashed rgba(198, 154, 88, 0.4);
          font-size: 0.85rem;
          color: var(--aa-brass-hi);
        }
        .aa-minipass-foot em {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-style: italic;
        }

        /* Footer */
        .aa-foottag {
          font-style: italic;
          font-size: 1.02rem;
          color: var(--aa-brass-hi);
        }
        .aa-footnote {
          font-size: 0.85rem;
          color: rgba(242, 233, 216, 0.6);
        }

        /* Reduced motion: the room is simply already lit */
        @media (prefers-reduced-motion: reduce) {
          .aa-dim {
            display: none;
          }
          .aa-lamp,
          .aa-in,
          .aa-passlink,
          .aa-modcard,
          .aa-wire--flow,
          .aa-media,
          .aa-node-live i,
          .aa-flow-link::after,
          .aa-cm-live i,
          .aa-cm-emote,
          .aa-cm-clip,
          .aa-cm-cur--mika,
          .aa-cm-cur--dex,
          .aa-hookrow[data-lit="true"] .aa-keytag::after {
            animation: none;
          }
          .aa-in {
            opacity: 1;
            transform: none;
          }
          .aa-flow-link::after {
            display: none;
          }
          .aa-snack[data-ct="audio"]:hover .aa-iconwrap::before,
          .aa-snack[data-ct="audio"]:hover .aa-iconwrap::after {
            content: none;
          }
          .aa-btn-brass:hover,
          .aa-snack:hover,
          .aa-snack:hover .aa-snack-icon,
          .aa-minipass:hover {
            transform: none;
          }
          .aa-passlink:hover .aa-pass,
          .aa-passlink:focus-visible .aa-pass,
          .aa-passlink:active .aa-pass {
            transform: none;
          }
          @media (min-width: 1024px) {
            .aa-passlink:hover .aa-pass,
            .aa-passlink:focus-visible .aa-pass,
            .aa-passlink:active .aa-pass {
              transform: none;
            }
          }
        }
      `}</style>
    </div>
  );
}

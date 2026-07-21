import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ModdropLogo } from "@/components/common/ModdropLogo";
import { LandingAuthActions } from "@/components/landing/LandingAuthActions";
import { contentTypeIcons } from "@/components/landing/LandingPrimitives";
import { SharedCanvasDemo } from "@/components/landing/SharedCanvasDemo";
import { landingContent } from "@/lib/landing-content";
import "./landing.css";

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
    <div className="aa-root">
      <div className="aa-dim" aria-hidden="true" />

      <header className="aa-in relative z-10" style={enter(0)}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <ModdropLogo priority />
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
                  sizes="(min-width: 1264px) 460px, (min-width: 768px) 42vw, 94vw"
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
                      <SharedCanvasDemo />
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
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-7 px-5 sm:px-8 lg:grid-cols-12">
            <div className="aa-tile p-8 sm:p-10 lg:col-span-7">
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

            <div className="aa-tile p-8 sm:p-10 lg:col-span-5">
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
                          ? "supported"
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
          <ModdropLogo />
          <p className="aa-display aa-foottag">
            {landingContent.proposition.eyebrow}
          </p>
          <p className="aa-footnote">© {new Date().getFullYear()} Moddrop</p>
        </div>
      </footer>
    </div>
  );
}

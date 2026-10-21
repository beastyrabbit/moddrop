# Analytics, error reporting and consent

Telemetry is disabled when its environment variables are absent. The dynamic root
layout reads public settings on each server request and passes them to the browser.
No telemetry `NEXT_PUBLIC_*` markers, credentials, user IDs or `identify` calls are
used. Keep telemetry settings unset in development, CI and preview deployments.

## Production configuration

Set these frontend container variables in kub-homelab:

| Variable | Production value |
| --- | --- |
| `UMAMI_HOST_URL` | `https://umami.heerlab.com` |
| `UMAMI_WEBSITE_ID` | `319d73b8-a838-423d-ac37-34ea8ba1ea9e` |
| `UMAMI_DOMAINS` | `moddrop.live` |
| `GLITCHTIP_DSN` | `https://abc941ac4e094c2b8bbe43efd67ac740@glitchtip.heerlab.com/10` (public client config) |
| `GLITCHTIP_ENVIRONMENT` | `production`, also the default |
| `GLITCHTIP_TRACES_SAMPLE_RATE` | `0.05`, also the default; range 0 to 1 |

Set the same three `GLITCHTIP_*` values on stream-canvas. Umami requires all three
settings and an exact hostname match. Obvious bot/headless UAs are excluded. There
is no production test override. OBS is excluded regardless of consent or hostname.

`APP_RELEASE` is build-time configuration, carried into both runtime images. Tag
`v0.8.0` produces `moddrop@0.8.0`. Non-tag builds use the frontend package version;
direct local builds may leave it unset. Do not override it at deployment time or
source-map and event releases will disagree.

## Consent and storage

The bundled vanilla-cookieconsent v3 banner offers accept, reject and preferences.
Necessary is read-only. Analytics covers pageviews, events, browser performance,
session replay and heatmaps. The consent cookie is `moddrop_consent`, with a
180-day lifetime, category choices, timestamps and a random consent receipt ID.
The banner and Cookie settings appear only when all three Umami settings are
configured. Cookie settings is reachable while the consent manager is running in
the landing footer, app shell, room canvas and privacy page. The banner and
analytics are absent from `/obs` and its descendants.

Before consent, Umami scripts and API requests are absent. After acceptance,
`script.js` loads, followed by `recorder.js`. The transport guard checks consent,
hostname, UA and OBS exclusion for every request. Withdrawal disables event helpers,
removes script elements and reloads the document. The guard blocks recorder unload
flushes before that reload, since removing scripts alone cannot stop its timers.

Neither Umami nor the chosen Sentry browser integrations write cookies,
localStorage or sessionStorage. Umami's served `script.js` reads localStorage;
its cache/session token stays in memory. Sentry
browser sessions and Session Replay are disabled; the default fetch transport has
no persistent queue. Error reporting runs without analytics consent, including OBS.
The signed-out built-app tests assert exactly the consent cookie and empty browser
storage. Clerk is blocked in that fixture; it does not establish authenticated
storage guarantees. Existing signed-in features use Clerk's authentication stores,
`moddrop:media-preferences:v1:<user>:<room>` localStorage and a short-lived
`moddrop:obsSetupSecret:<room>` sessionStorage entry.

## Pageviews and replay privacy

The served Umami 3.4.0 `script.js` wraps `history.pushState` and `replaceState` when
auto-track is enabled. Moddrop disables auto-track and sends one pageview from the
App Router pathname effect instead, covering back/forward navigation without
duplicate auto-pageviews. Titles are fixed to `Moddrop`; referrers are empty;
query strings and fragments are omitted. Room/upload identifiers are redacted.
The site uses `strict-origin` referrer metadata so other requests receive no page
paths or query values. Telemetry fetches/scripts use `no-referrer`; OBS retains its
existing `no-referrer` HTTP header.

The served `recorder.js` only reads `data-website-id` and `data-host-url` locally.
It fetches `/api/websites/<id>/recorder` for `enabled`, `replayEnabled`,
`heatmapEnabled`, `sampleRate`, `heatmapSampleRate`, `maskLevel`, `maxDuration` and
`blockSelector`. Its default replay and heatmap sample rates are 0.15. Enable
replay/heatmaps and choose sample rates in the Umami website settings. This app
preserves those server sampling and enable flags, enforces strict input/text masking
and blocks Clerk widgets, the account display, room lists, user pickers, channel
names, OBS link fields, canvases, images, SVG, media and embedded frames. The app
shell and navigation remain visible as masked structure. A final
transport scrub removes input/media/identity attributes and masks text. It retains
application-defined CSS classes, numeric dimensions and bundled static app styles
with media/font URLs removed. It normalizes URL fields, including heatmaps and
route-change events. Fragmented
oversized snapshots are discarded because their partial strings cannot be safely
scrubbed. This intentionally reduces replay fidelity, especially inside the app,
while preserving structural interactions and heatmap coordinates.

The recorder has no public teardown or before-send API. Keep the contract tests
and this transport guard under review when updating Umami. No CSP existed before
this integration and no new CSP was introduced.

## Events

All events require consent, are memory-only, and omit room IDs, usernames, media
URLs, titles, email addresses, filenames and provider identifiers.

| Name | Properties | Trigger |
| --- | --- | --- |
| `auth_started` | `flow`: sign_in/sign_up | Moddrop sign-in control, or Clerk sign-up activity |
| `auth_completed` | `flow`: sign_in/sign_up | Clerk reports completion for an observed attempt |
| `room_created` | none | Create response includes the one-time setup secret |
| `room_opened` | none | Authorized room data finishes loading |
| `media_added` | `type`: image/video/audio/youtube/twitch/embed | Locally created media shape, or Twitch channel newly configured |
| `upload_succeeded` | `type`: image/video/audio/other | Upload completes |
| `upload_failed` | `reason`: network/rejected/authentication | Upload rejects |
| `obs_link_copied` | none | Clipboard write succeeds |
| `obs_link_regenerated` | none | Regeneration request succeeds |
| `settings_changed` | `moderators`, `youtube`, `twitch`: booleans | Successful update; booleans indicate submitted fields |
| `failure` | `operation`: api/room/canvas; `reason`: network/rejected | API server failure, room load failure or canvas connection failure |
| `outbound_link` | `host` | Delegated click on an HTTP(S) link to another origin |
| `web_vital` | `name`, rounded `value`, `rating` | Next useReportWebVitals; CLS is in thousandths |

There is no room deletion endpoint or UI, so there is no fabricated deletion
event. Completion events are best-effort for attempts observed in the same page;
OAuth redirects can end that memory-only observation. No pre-consent events are
queued or sent retroactively.

## Error reports

Official `@sentry/browser` and `@sentry/node` v10 SDKs send to GlitchTip. Browser
imports occur in a separate async chunk after hydration, with a bounded memory
queue installed before hydration by `instrumentation-client.ts`. Global errors,
unhandled rejections, console errors, Next error boundaries and canvas recovery
failures are reported. Node initialization precedes the backend app; Hono onError
logs to stderr and the console integration reports that error once.
WebSocket failures and console errors are covered. Dev/start and Docker use Node's
`--import` preload so instrumentation is registered before application modules load.
Shutdown flushes for two seconds.
Next's `instrumentation.ts` registers Node reporting and `onRequestError`.
The Next.js server and backend also send sampled performance transactions to GlitchTip for about 5 % of requests by default (`GLITCHTIP_TRACES_SAMPLE_RATE=0.05`), containing routes with identifiers removed, timings and technical descriptions of internal database and network calls, scrubbed by the same `scrubTelemetry` function and retained for 90 days under Art. 6(1)(f) GDPR to diagnose failures and keep the service fast and reliable; the browser SDK sends no performance transactions.

Every SDK sets environment, release, `sendDefaultPii: false`, and shared pure
`beforeSend`, `beforeSendTransaction` and `beforeBreadcrumb` scrubbers. User objects,
headers, cookies, request bodies and extra diagnostic objects are removed. Emails,
JWTs, bearer values, credential-like query fields and query/hash URL parts are
scrubbed. Do not put personal data in exception messages: automatic pattern
scrubbing cannot recognize every possible personal name. The receiving server
necessarily sees the connection IP even though the report omits it.

Umami and GlitchTip are self-hosted on the operator's own servers in Germany.
GlitchTip error event retention is pinned to 90 days. A nightly deletion job
automatically deletes Umami analytics data (pageviews, events and performance
measurements) after 25 months, and session replays and heatmap recordings after
30 days. These periods apply to all sites. The privacy page uses consent under
Art. 6(1)(a) GDPR for analytics and legitimate interest under Art. 6(1)(f) for
necessary, storage-free error reporting.

## Verification

`pnpm run test:telemetry` tests the built standalone app, not the Vite canvas
fixture. Run `pnpm run build` with the same public markers as `scripts/verify.sh`
first. Its web server copies the standalone output into a temporary directory,
substitutes only a synthetic Clerk publishable key, and starts with local telemetry
URLs. Playwright intercepts telemetry requests, serves local tracker/recorder stubs
and blocks external requests. Clerk remains unloaded/signed out, exercising the
public app independently of its network service. No live telemetry or AI endpoints
are called. The existing Vite browser tests continue to cover authenticated canvas
and settings behavior. `test:browser` and `scripts/verify.sh` run both suites.
The standalone fixture uses loopback port 43920; set
`MODDROP_TELEMETRY_TEST_PORT` when running concurrent checkouts.

Browser source maps upload to `https://glitchtip.heerlab.com` by default, with
`SENTRY_URL` as an override. The upload creates no deploys and does not call
`set-commits`. See [releasing.md](releasing.md) for BuildKit secret handling,
failure behavior and map removal.

### Lifecycle matrix

`lib/telemetry/__tests__/lifecycle.test.tsx` uses deferred CookieConsent startup
and a fake native fetch. It mounts the real telemetry and Cookie settings
components where UI state matters. Overlapping consent starts share one pending
singleton initialization, so independent `run()` completion orders cannot occur.
Only the newest generation receives callbacks or resets the singleton.

| Sequence | Expected result |
| --- | --- |
| Mount, accept, unmount, remount | Same fetch guard; analytics resumes after saved consent |
| Mount, unmount before consent resolves, remount | Old completion does nothing; new analytics works; Cookie settings stays visible |
| Overlapping consent starts, old cleanup first or new cleanup first | One initialization; only current owner notifies and resets |
| Completed consent, replacement, old abort/cleanup | Replacement UI and callbacks remain active |
| Abort pending consent without a replacement | Reset after initialization settles; no analytics callback |
| Accept, withdraw, reload pending | Scripts removed; final flush blocked; accepting again cannot restart the retired recorder |
| Enter `/obs` before scripts load or after they load | No reload before load; one reload after load, including across remounts |
| Global error, reset without reload, saved consent | Exactly one tracker and recorder script appended per document; existing tracker and recorder reused; one pageview per navigation; replay and heatmap payloads scrubbed; recorder settings overridden; credentials omitted; no referrer |
| Unmount while tracker loads, completion before or after remount | Pending tracker reused; no requests without an active consented instance; recorder appended once |
| Replacement analytics, stale disposal/script callback/config/global | Captured current tracker survives; retired endpoints stay blocked |
| Recorder settings resolve after replacement | Retired recorder receives no enabled settings |

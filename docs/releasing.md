# Release and deployment notes

Pushing a `vX.Y.Z` tag runs the GitHub container-image workflow. The workflow
verifies the repository and builds the frontend
and stream-canvas images on the `arc-moddrop` runner. The current workflow
publishes both images to GHCR; check the downstream deployment configuration
before assuming a tag has reached production.

The frontend image receives its public configuration at build time. The GitHub
repository variable `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must exist and contain the
production publishable key. The frontend build fails if this value is empty.
Local and Compose builds that omit the build argument retain the default
placeholder for runtime substitution. The workflow sets `NEXT_PUBLIC_CANVAS_API_URL` to
`/canvas-api` and reads `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` from the GitHub secret
of the same name. Changing these values requires a new frontend image build.

Before pushing from a checkout, run `git remote -v` and use the remote that
points to `github.com/beastyrabbit/moddrop`.

## Telemetry releases and source maps

See [telemetry.md](telemetry.md) for runtime variables and production values.
The image workflow sets the same `APP_RELEASE=moddrop@<version>` build argument
for both images, deriving version from the `vX.Y.Z` tag or package version on main.
Both images retain that release in their runtime environment. A release build
does not need live telemetry environment variables; those are supplied by the
production deployment.

The Forgejo mirror passes the same release to both images and skips source-map upload without a GlitchTip secret, then deletes the maps.

The frontend generates production browser source maps. A separate Docker build
step uses `@sentry/cli` to inject debug IDs and upload `.next/static` artifacts for
that exact release to GlitchTip's `beasty-rabbit/moddrop` project. The upload URL is
`https://glitchtip.heerlab.com`, overridable with `SENTRY_URL`. The public upload
routes bypass SSO, including chunk upload, artifact bundle assembly and release
files. GlitchTip 6 supports debug-ID artifact bundles. The script does not create
deploys or call `set-commits`; the commits route remains behind SSO. Verify one
symbolicated production error after rollout.

The workflow passes GitHub Actions secret `GLITCHTIP_AUTH_TOKEN` to
docker/build-push-action's `secrets`, then Docker mounts it at
`/run/secrets/glitchtip_auth_token`. Its canonical copy is in the Moddrop Infisical
production `/ci` path. The script reads the mount and passes the value only in the
CLI child's environment. It is never a build argument, Docker ENV, copied file,
layer or log entry. CLI output is suppressed because failure responses may echo
credentials. Failures report only the failed step and exit status. When the secret
exists, injection/upload failure fails the build. The workflow also sets
`SOURCEMAP_UPLOAD_REQUIRED=1` for the frontend image. With this build argument,
a missing or empty upload secret fails the build with an explicit error. The
builder passes the argument to the upload script through its environment.
Before injection or upload, the script rejects any Clerk, canvas API or tldraw
runtime placeholder anywhere under `.next/static`. Runtime replacement changes
JavaScript columns and invalidates uploaded source maps. CI images must therefore
contain the final public values; the entrypoint remains available for local and
Compose builds that skip upload. It does not rewrite CI browser artifacts.
Local and PR builds leave `SOURCEMAP_UPLOAD_REQUIRED` unset and skip upload cleanly
when the secret is absent. The step always removes
every `.map` under `.next`, including standalone dependency maps, before copying
the runner image. Source maps must never be served publicly.

Stream-canvas retains its TypeScript source maps only inside the server image and
runs Node with `--enable-source-maps`. It does not expose the dist directory over
HTTP. It does not upload maps or use the upload credential.

The builder checks `pnpm exec sentry-cli --version` before building. Its platform
binary comes from the optional `@sentry/cli-linux-*` package, so install scripts
remain disabled for `@sentry/cli`.

Enable replay/heatmaps and set sampling in the Umami website's recorder settings.
The app enforces stricter
masking locally. No CSP is introduced by this change.


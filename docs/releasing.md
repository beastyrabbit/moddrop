# Release and deployment notes

Pushing a `vX.Y.Z` tag runs the GitHub container-image workflow. The workflow
verifies the repository, deploys Convex when required, and builds the frontend
and stream-canvas images on the `arc-moddrop` runner. The current workflow
publishes both images to GHCR; check the downstream deployment configuration
before assuming a tag has reached production.

The frontend image receives `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` as a build
argument. The workflow reads it, together with `CONVEX_DEPLOYMENT`, from the
Moddrop Infisical production project at path `/ci`. These values are build-time
configuration, so changing one requires a new frontend image build.

Before pushing from a checkout, run `git remote -v` and use the remote that
points to `github.com/beastyrabbit/moddrop`.


# AP Chinese Vocab

A mobile-first flashcard and quiz site for AP Chinese vocabulary. Students pick a topic, study flip cards (with audio), and take a quiz. The results screen is meant to be screenshotted and sent to the teacher. See [SPEC.md](SPEC.md).

It's a static site with no backend and no build step. Everything lives in `site/`.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for running locally, previewing a branch without merging, the preview-only test topic, tests, and adding topics.

## Deploying

Pushing to `main` runs the tests and deploys `site/` to GitHub Pages (`.github/workflows/pages.yml`). One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

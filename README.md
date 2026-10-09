# AP Chinese Vocab

A mobile-first flashcard and quiz site for AP Chinese vocabulary. Students pick a topic, study flip cards (with audio), and take a quiz. The results screen is meant to be screenshotted and sent to the teacher. See [SPEC.md](SPEC.md).

It's a static site with no backend and no build step. Everything lives in `site/`.

## Run locally

```sh
npm start      # serves site/ at http://localhost:8080
npm test       # unit tests (Node 22+)
```

## Adding vocabulary

1. Export a Knowt set as PDF and save it as `data/source/NN-topic.pdf` (the number sets the topic order).
2. Run `python3 scripts/pdf_to_csv.py` (needs `poppler-utils`). This regenerates `data/vocab.csv` and `site/js/vocab.js`.
3. Corrections to the source sets go in `OVERRIDES` in the script, so they survive re-imports.

## Deploying

Pushing to `main` runs the tests and deploys `site/` to GitHub Pages (`.github/workflows/pages.yml`). One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

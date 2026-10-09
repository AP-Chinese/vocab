# Development notes

## Previewing a branch without merging

[raw.githack.com](https://raw.githack.com) serves files straight from GitHub with the right content types, so the static site runs as-is from any commit:

```
https://raw.githack.com/rachelli429/ap-chinese-vocab/<commit-sha>/site/index.html
```

- Use the **full commit hash** (`git rev-parse HEAD`), not the branch name. Branch names with a slash (like `claude/…`) don't work in the URL, and a commit link always shows exactly that version.
- Push the commit first. githack fetches from GitHub, not from your computer.
- The `raw.githack.com` domain is only for development. It doesn't tell us whether WeChat will open the real link, and it isn't for students. Their link is the GitHub Pages one: https://rachelli429.github.io/ap-chinese-vocab/.

## Running locally

```sh
npm start      # serves site/ at http://localhost:8080
npm test       # unit tests (Node 22+)
```

## Adding a topic

Nothing in the app is specific to one topic. Topics and words come entirely from `site/js/vocab.js`, which is generated:

1. Export the Knowt set as PDF and commit it as `data/source/NN-topic.pdf`. The number sets the order on the home screen, e.g. `02-family.pdf`.
2. Run `python3 scripts/pdf_to_csv.py` (needs `poppler-utils`). It reads every PDF in `data/source/` and regenerates `data/vocab.csv` and `site/js/vocab.js`. The topic name shown in the app is the PDF's title (e.g. `School 学校`).
3. Run `npm test`. It checks every topic has at least 4 words, no blanks, and no duplicate Chinese.
4. Check the word count against the Knowt set, and check for words that share an English meaning (the app handles them, but they may be mistakes in the source set).

Corrections to the source sets go in `OVERRIDES` in the script, so they survive re-imports.

# 🗜️ Image Compressor

A free, **100% client-side** image compressor. Drag in JPG, PNG, or WebP images
and shrink them right in your browser using the Canvas API. Nothing is uploaded —
your files never leave your device, which also means it costs nothing to host on
GitHub Pages.

## Features

- Drag & drop or pick multiple images at once
- Adjustable quality slider
- Convert between **JPEG / WebP / PNG**
- Optional max-width resizing
- See original vs. compressed size and % saved per image
- Download individually or grab everything as a **.zip**
- No backend, no tracking, no install

## Run it locally

It's just static files — open `index.html` in a browser, or serve the folder:

```bash
# any static server works, e.g.:
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy free on GitHub Pages

**Option A — Automatic (recommended).** This repo ships a workflow at
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) that publishes the
site on every push to `main`.

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and choose
   **GitHub Actions**.
3. Push to `main`. Your site goes live at
   `https://<your-username>.github.io/Image-compressor/`.

**Option B — No workflow.** In **Settings → Pages**, set the source to
**Deploy from a branch**, pick `main` / `/ (root)`, and save.

## How it works

Each image is drawn onto an off-screen `<canvas>`, then exported with
`canvas.toBlob(type, quality)`. Resizing and format conversion happen the same
way. The only third-party dependency is [JSZip](https://stuk.github.io/jszip/)
(loaded from a CDN) for the "Download all" zip.

## License

See [LICENSE](LICENSE).

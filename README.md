# Video Compare

Video Compare is a browser-based tool for visual comparison of two video sources. It is designed to support human quality validation for video encoding workflows, including Content-Aware Encoding model evaluation.

The tool allows reviewers to quickly compare Video A and Video B, inspect individual frames, zoom into fine details, and capture quality judgments for later analysis.

## Features

### Video Comparison

* Load two video URLs (Video A and Video B)
* Instant A/B switching in a shared viewport
* Synchronized playback and seeking
* Frame-accurate pause synchronization using `requestVideoFrameCallback()`
* Frame-by-frame stepping
* Adjustable frame rate for frame stepping

### Inspection Tools

* Deep zoom for pixel-level inspection
* Pan while zoomed
* Shared zoom and pan state across Video A and Video B
* Current timestamp display
* Current frame number display

### Reviewer Workflow

* Label comparison results:

  * A Better
  * B Better
  * Same
* Label history
* Undo last label
* Clear labels
* Export labels as JSON

### Sharing

* Video URLs are stored in browser query parameters
* Comparison sessions can be shared via URL

## Keyboard Shortcuts

| Shortcut    | Action         |
| ----------- | -------------- |
| Space       | Toggle A/B     |
| K           | Play / Pause   |
| Left Arrow  | Previous Frame |
| Right Arrow | Next Frame     |
| +           | Zoom In        |
| -           | Zoom Out       |
| R           | Reset View     |

## Label Export Format

Example:

```json
{
  "videoAUrl": "https://example.com/video-a.mp4",
  "videoBUrl": "https://example.com/video-b.mp4",
  "time": 12.433,
  "frame": 373,
  "verdict": "B",
  "activeVideo": "A",
  "createdAt": "2026-06-18T12:00:00.000Z"
}
```

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

## Deployment

Preview deployment:

```bash
netlify deploy
```

Production deployment:

```bash
netlify deploy --prod
```

## Roadmap

* Timestamp sharing via URL
* Labeling keyboard shortcuts
* Side-by-side comparison mode
* FPS auto-detection
* HLS/DASH support
* Blind A/B testing mode
* CSV export
* Reviewer statistics and reporting
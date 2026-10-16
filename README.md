# Video Compare

A free, open-source video comparison tool built with React, TypeScript, and Vite.

Video Compare helps you visually evaluate differences between two video files, such as an original video and an optimized or compressed version.

It provides synchronized playback, instant A/B switching, frame-by-frame inspection, zoom and pan, blind comparison, and structured quality labeling.

Designed for developers, video engineers, codec researchers, and anyone who needs to evaluate video quality beyond automated metrics such as VMAF.

## Features

### Video comparison

- **Instant A/B switching** — switch between two videos using a button or the Space key.
- **Synchronized playback** — play and pause both videos together.
- **Side-by-side comparison** — display both videos simultaneously.
- **Frame-by-frame inspection** — step forward or backward through the videos.
- **Configurable frame rate** — specify the FPS used for frame stepping and frame-number estimation, including fractional rates such as 23.976, 29.97, and 59.94.
- **Timeline seeking** — navigate to a specific point in the videos.
- **Zoom and pan** — inspect fine details and compression artifacts.

### Blind comparison

Enable Blind Mode to compare videos without knowing which source is being displayed.

When Blind Mode is enabled:

- The application randomly assigns the two sources to A and B.
- The original source identities are hidden behind those labels.
- The comparison begins with Video A.
- Side-by-side mode respects the randomized mapping.
- Quality labels are recorded with the corresponding source mapping.

This helps reduce subjective bias when comparing different encoders, codecs, bitrates, or encoding configurations.

### Quality labeling

Record subjective quality judgments while reviewing videos:

- **A better** — Video A has better visual quality.
- **B better** — Video B has better visual quality.
- **Same** — no meaningful quality difference is observed.

Additional functionality includes:

- Label history
- Undo last label
- Clear all labels
- Export labels to JSON

Each exported label includes the video URLs, timestamp, estimated frame number, verdict, active video, blind-mode state, source mapping, and creation timestamp.

### Shareable comparisons

Share a comparison using a URL containing both video sources and the current playback position.

Supported URL parameters:

| Parameter | Description |
|---|---|
| `a` | Video A source URL |
| `b` | Video B source URL |
| `t` | Playback position in seconds |

Example:

`https://your-deployment.example/?a=https%3A%2F%2Fexample.com%2Foriginal.mp4&b=https%3A%2F%2Fexample.com%2Fcompressed.mp4&t=12.5`

The **Copy Share Link** button copies the current comparison URL to your clipboard.

Note that the URL stores the video sources and timestamp, not the complete comparison session or label history.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Switch between Video A and Video B |
| `K` | Play / Pause |
| `←` | Previous frame |
| `→` | Next frame |
| `+` | Zoom in |
| `-` | Zoom out |
| `R` | Reset zoom and pan |
| `1` | Mark A better |
| `2` | Mark B better |
| `3` | Mark Same |
| `Z` | Undo last label |

Keyboard shortcut hints are displayed by default and can be hidden using the **Show Keyboard Shortcuts** toggle.

Shortcuts are ignored while typing in input fields.

## Getting started

### Requirements

- Node.js and npm
- A modern browser with HTML5 video support
- Two accessible video URLs

A current Node.js LTS version is recommended.

### Installation

Clone the repository:

```bash
git clone https://github.com/brootle/video-compare.git
cd video-compare
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal, typically:

`http://localhost:5173`

### Production build

Create an optimized production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run ESLint:

```bash
npm run lint
```

## How to use

### 1. Load your videos

Enter the URLs of the two videos you want to compare:

- **Video A URL** — typically the original or reference video.
- **Video B URL** — typically the encoded, compressed, or optimized version.

Click **Load videos** and wait until both sources are ready.

For meaningful frame-level comparisons, the videos should contain the same content, be temporally aligned, and ideally have matching frame rates and durations.

### 2. Compare visual quality

Start playback using the Play button or `K`.

Press `Space` to switch between A and B.

Look for differences such as:

- Compression artifacts and blockiness
- Loss of fine details and textures
- Banding in gradients
- Blurring or excessive smoothing
- Ringing around sharp edges
- Motion artifacts
- Differences in grain or noise preservation

You can also enable side-by-side mode to inspect both videos simultaneously.

### 3. Inspect individual frames

Pause playback and use the left and right arrow keys to step through the videos.

Adjust the FPS field to match your source material.

Use Zoom in, Zoom out, and Reset view to inspect specific areas of a frame.

The displayed frame number is an estimate based on the current playback time and configured FPS.

### 4. Perform a blind comparison

Enable **Blind mode**.

The application randomly assigns the original and optimized sources to the visible A/B labels.

Review the videos without relying on their original identities, then record your judgment using the labeling controls.

### 5. Export results

Use **Export JSON** to download the recorded quality labels.

The exported file can be used for further analysis, manual review, or comparison with automated quality metrics.

## JSON export

An exported label has the following general structure:

```json
{
  "videoAUrl": "https://example.com/original.mp4",
  "videoBUrl": "https://example.com/optimized.mp4",
  "time": 12.5,
  "frame": 375,
  "verdict": "A",
  "activeVideo": "A",
  "blindMode": false,
  "blindMapping": {
    "A": "original",
    "B": "optimized"
  },
  "createdAt": "2026-10-14T12:00:00.000Z"
}
```

The exported JSON file contains an array of these label objects.

In Blind Mode, the `videoAUrl` and `videoBUrl` fields reflect the randomized visible A/B assignment.

The export includes the source mapping, so it is **not an anonymized blind-study export**. Avoid opening the JSON during a blind evaluation if source identity could influence your judgment.

## Project structure

The application uses React, TypeScript, and Vite.

```text
video-compare/
├── public/
├── src/
│   ├── components/
│   │   ├── CompareControls.tsx
│   │   ├── LabelHistory.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── VideoSources.tsx
│   │   ├── VideoStatus.tsx
│   │   ├── VideoTimeline.tsx
│   │   └── VideoViewport.tsx
│   ├── utils/
│   │   ├── url.ts
│   │   └── video.ts
│   ├── App.tsx
│   ├── App.css
│   ├── constants.ts
│   ├── index.css
│   └── types.ts
├── index.html
├── package.json
└── README.md
```

### Architecture

**`App.tsx`** manages the main application state and coordinates playback, synchronization, comparison, and labeling.

**`components/`** contains the UI components for video sources, the viewport, timeline, playback controls, comparison controls, and label history.

**`utils/`** contains helper functions for video calculations, blind-mode mapping, and URL handling.

**`constants.ts`** contains application defaults and configuration constants.

**`types.ts`** defines shared TypeScript types.

The project intentionally keeps its architecture relatively simple, without introducing unnecessary state-management libraries or abstractions.

## Browser compatibility

Video Compare relies on native browser video playback using HTML5 video elements.

Actual codec support depends on the browser, operating system, and device.

Common formats include:

- H.264 / AVC
- H.265 / HEVC, where supported
- AV1, where supported
- VP9, where supported

A file being encoded with a supported codec does not guarantee playback. Container format, codec profile, and browser support also matter.

For best results, use a current version of Chrome, Edge, Firefox, or Safari.

### Video URL requirements

Videos must be accessible to the browser.

For remote sources:

- Use direct URLs to supported video files.
- Ensure the server permits the necessary requests.
- Configure cross-origin access where required by your hosting setup.
- Support HTTP byte-range requests where possible for efficient seeking.

Video Compare does not currently provide a built-in video transcoding service.

## Known limitations

### Frame accuracy

Frame stepping uses a configurable FPS value and timestamp-based seeking.

The displayed frame number is estimated, not obtained from an exact frame index.

Actual displayed frames can depend on the source frame rate, keyframe structure, browser seeking behavior, and video decoding.

This means frame stepping is useful for visual inspection but should not be treated as guaranteed frame-exact navigation.

### Video synchronization

The application attempts to keep both videos synchronized during playback, pausing, seeking, and buffering.

However, HTML5 video playback is controlled by the browser, and perfect frame-level synchronization is not guaranteed in every environment.

For best results, compare videos with matching durations, frame rates, and aligned starting timestamps.

### Codec support

The application cannot play formats that the browser does not support.

If a source fails to load, try another browser or convert the file into a supported format.

### Remote video hosting

Video Compare does not host your videos. You are responsible for providing accessible source URLs.

### Streaming protocols

Native support for HLS and MPEG-DASH manifests is not currently a dedicated feature of the application. Browser-native playback capabilities may vary.

### Audio

The comparison focuses on visual quality. Video elements are muted.

## Development philosophy

Video Compare is designed to remain lightweight, understandable, and easy to modify.

The project prioritizes:

- Accurate and responsive visual comparison
- Simple, intuitive controls
- Minimal dependencies
- Readable React and TypeScript code
- Practical functionality over unnecessary abstraction
- Compatibility with standard browser video playback

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

If you discover a bug or have an idea for an improvement, open an issue in the GitHub repository:

https://github.com/brootle/video-compare/issues

For code contributions:

1. Fork the repository.
2. Create a feature or fix branch.
3. Make focused changes.
4. Run `npm run lint` and `npm run build`.
5. Test the affected functionality manually.
6. Open a pull request describing your changes.

Changes involving playback synchronization, seeking, buffering, or blind-mode mapping should be tested carefully.

## Roadmap

Potential future improvements include:

- More accurate frame-rate detection
- Improved frame-exact navigation
- Better synchronization diagnostics
- Extended support for streaming formats
- Additional comparison and reporting tools
- Improvements based on community feedback

These are potential directions, not committed release features.

## License

A license has not yet been selected.

Before distributing or inviting contributions to the project as open source, add a `LICENSE` file describing the permissions and conditions under which the software may be used, modified, and redistributed.

## Repository

**GitHub:** https://github.com/brootle/video-compare

Built with React, TypeScript, and Vite.
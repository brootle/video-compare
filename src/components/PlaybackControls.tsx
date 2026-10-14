type PlaybackControlsProps = {
  videosReady: boolean;
  isPlaying: boolean;
  showKeyboardShortcuts: boolean;
  onPlayPause: () => void;
  onFrameStep: (direction: -1 | 1) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
};

export default function PlaybackControls({
  videosReady,
  isPlaying,
  showKeyboardShortcuts,
  onPlayPause,
  onFrameStep,
  onZoomIn,
  onZoomOut,
  onResetView,
}: PlaybackControlsProps) {
  return (
    <section className="block-panel">
      <h2 className="block-panel-header">PLAYBACK</h2>

      <div className="block-panel-content">
        <div className="block-panel-column">
          <div className="control-buttons">
            <button
              disabled={!videosReady}
              onClick={onPlayPause}
            >
              {videosReady ? (isPlaying ? 'Pause' : 'Play') : 'Loading…'}
              {showKeyboardShortcuts && <kbd>K</kbd>}
            </button>

            <button onClick={() => onFrameStep(-1)}>
              Prev frame
              {showKeyboardShortcuts && <kbd>←</kbd>}
            </button>

            <button onClick={() => onFrameStep(1)}>
              Next frame
              {showKeyboardShortcuts && <kbd>→</kbd>}
            </button>
          </div>
        </div>

        <div className="block-panel-column">
          <div className="control-buttons">
            <button onClick={onZoomOut}>
              Zoom out
              {showKeyboardShortcuts && <kbd>−</kbd>}
            </button>

            <button onClick={onZoomIn}>
              Zoom in
              {showKeyboardShortcuts && <kbd>+</kbd>}
            </button>

            <button onClick={onResetView}>
              Reset view
              {showKeyboardShortcuts && <kbd>R</kbd>}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
import VideoStatus from './VideoStatus';

type VideoSourcesProps = {
  originalInputUrl: string;
  optimizedInputUrl: string;
  videoAStatus: string;
  videoBStatus: string;
  onOriginalUrlChange: (url: string) => void;
  onOptimizedUrlChange: (url: string) => void;
  onLoadVideos: () => void;
};

export default function VideoSources({
  originalInputUrl,
  optimizedInputUrl,
  videoAStatus,
  videoBStatus,
  onOriginalUrlChange,
  onOptimizedUrlChange,
  onLoadVideos,
}: VideoSourcesProps) {
  return (
    <section className="video-sources" aria-label="Video sources">
      <h2>Video sources</h2>

      <div className="source-rows">
        <label className="url-input">
          <span className="url-label">Video A URL</span>

          <input
            type="url"
            value={originalInputUrl}
            onChange={(event) => onOriginalUrlChange(event.target.value)}
          />

          <VideoStatus status={videoAStatus} video="A" />
        </label>

        <label className="url-input">
          <span className="url-label">Video B URL</span>

          <input
            type="url"
            value={optimizedInputUrl}
            onChange={(event) => onOptimizedUrlChange(event.target.value)}
          />

          <VideoStatus status={videoBStatus} video="B" />
        </label>
      </div>

      <div className="source-actions">
        <button
          className="primary-button"
          onClick={onLoadVideos}
        >
          Load videos
        </button>
      </div>
    </section>
  );
}
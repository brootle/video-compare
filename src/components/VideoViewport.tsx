import type {
  MouseEvent,
  RefObject,
  SyntheticEvent,
} from 'react';

import type {
  ActiveVideo,
  ViewMode,
} from '../types';

type VideoViewportProps = {
  originalRef: RefObject<HTMLVideoElement | null>;
  optimizedRef: RefObject<HTMLVideoElement | null>;

  originalVideoUrl: string;
  optimizedVideoUrl: string;

  activeVideo: ActiveVideo;
  activeVideoLabel: 'A' | 'B';
  viewMode: ViewMode;

  zoom: number;
  pan: { x: number; y: number };

  bufferingVideo: ActiveVideo | null;
  bufferingVideoLabel: 'A' | 'B' | null;

  originalOrder: number;
  optimizedOrder: number;

  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;

  onLoadedMetadata: (
    event: SyntheticEvent<HTMLVideoElement>,
    videoType: ActiveVideo
  ) => void;

  onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => void;

  onCanPlay: (videoType: ActiveVideo) => void;
  onWaiting: (videoType: ActiveVideo) => void;
  onError: (videoType: ActiveVideo) => void;
};

export default function VideoViewport({
  originalRef,
  optimizedRef,
  originalVideoUrl,
  optimizedVideoUrl,
  activeVideo,
  activeVideoLabel,
  viewMode,
  zoom,
  pan,
  bufferingVideo,
  bufferingVideoLabel,
  originalOrder,
  optimizedOrder,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onLoadedMetadata,
  onTimeUpdate,
  onCanPlay,
  onWaiting,
  onError,
}: VideoViewportProps) {
  const isSideBySide = viewMode === 'side-by-side';

  return (
    <div
      className={`viewport ${isSideBySide ? 'side-by-side' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {bufferingVideo && (
        <div className="buffering-overlay">
          <div className="buffering-indicator">
            <span className="buffering-spinner" />

            <span>
              Buffering video {bufferingVideoLabel}…
            </span>
          </div>
        </div>
      )}

      <div
        className="video-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <video
          ref={originalRef}
          className={
            isSideBySide
              ? 'video side-video'
              : activeVideo === 'original'
                ? 'video visible'
                : 'video hidden'
          }
          style={isSideBySide ? { order: originalOrder } : undefined}
          src={originalVideoUrl}
          preload="auto"
          muted
          onLoadedMetadata={(event) =>
            onLoadedMetadata(event, 'original')
          }
          onTimeUpdate={onTimeUpdate}
          onCanPlay={() => onCanPlay('original')}
          onWaiting={() => onWaiting('original')}
          onError={() => onError('original')}
        />

        <video
          ref={optimizedRef}
          className={
            isSideBySide
              ? 'video side-video'
              : activeVideo === 'optimized'
                ? 'video visible'
                : 'video hidden'
          }
          style={isSideBySide ? { order: optimizedOrder } : undefined}
          src={optimizedVideoUrl}
          preload="auto"
          muted
          onLoadedMetadata={(event) =>
            onLoadedMetadata(event, 'optimized')
          }
          onCanPlay={() => onCanPlay('optimized')}
          onWaiting={() => onWaiting('optimized')}
          onError={() => onError('optimized')}
        />
      </div>

      <div className="viewport-label">
        {isSideBySide
          ? 'Video A + B'
          : `Video ${activeVideoLabel}`}
      </div>

      <div className="viewport-zoom">
        Zoom: {zoom.toFixed(1)}x
      </div>
    </div>
  );
}
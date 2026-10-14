import type { CSSProperties } from 'react';
import { formatTime, getFrameNumber } from '../utils/video';

type VideoTimelineProps = {
  currentTime: number;
  duration: number;
  frameRate: number;
  onSeek: (time: number) => void;
  onFrameRateChange: (frameRate: number) => void;
};

export default function VideoTimeline({
  currentTime,
  duration,
  frameRate,
  onSeek,
  onFrameRateChange,
}: VideoTimelineProps) {
  const progress =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  return (
    <div className="timeline">
      <input
        aria-label="Video position"
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(currentTime, duration || 0)}
        style={
          {
            '--progress': `${progress}%`,
          } as CSSProperties
        }
        onChange={(event) => onSeek(Number(event.target.value))}
      />

      <span className="current-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <label className="fps-control">
        <input
          type="number"
          min={1}
          max={240}
          value={frameRate}
          step="any"
          onChange={(event) => {
            const value = Number(event.target.value);

            if (
              event.target.value.trim() === '' ||
              !Number.isFinite(value) ||
              value < 1 ||
              value > 240
            ) {
              return;
            }

            onFrameRateChange(value);
          }}          
        />
        <span>FPS</span>
      </label>

      <span className="estimated-frame">
        Estimated frame:{' '}
        <strong>{getFrameNumber(currentTime, frameRate)}</strong>
      </span>
    </div>
  );
}
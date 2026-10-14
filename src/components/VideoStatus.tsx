type VideoStatusProps = {
  status: string;
  video: 'A' | 'B';
};

export default function VideoStatus({
  status,
  video,
}: VideoStatusProps) {
  return (
    <span
      className={`video-status video-status--${status.toLowerCase()}`}
      role="status"
      aria-label={`Video ${video}: ${status}`}
      title={`Video ${video}: ${status}`}
    >
      {status === 'Ready' ? '✓' : status === 'Error' ? '!' : null}
    </span>
  );
}
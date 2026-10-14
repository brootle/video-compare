
import { useEffect, useRef, useState } from 'react';
import './App.css';

import VideoStatus from './components/VideoStatus';

import {
  DEFAULT_ORIGINAL_URL,
  DEFAULT_OPTIMIZED_URL,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from './constants';

import {
  getInitialTime,
  getInitialUrl,
  updateBrowserUrl,
} from './utils/url';

import {
  formatTime,
  getFrameNumber,
  createBlindMapping,
} from './utils/video';

import type {
  ActiveVideo,
  ViewMode,
  BlindMapping,
  Verdict,
  Label,
} from './types';

function App() {

  const initialOriginalUrl = getInitialUrl('a', DEFAULT_ORIGINAL_URL);
  const initialOptimizedUrl = getInitialUrl('b', DEFAULT_OPTIMIZED_URL);  

  const [originalInputUrl, setOriginalInputUrl] = useState(initialOriginalUrl);
  const [optimizedInputUrl, setOptimizedInputUrl] = useState(initialOptimizedUrl);

  const [originalVideoUrl, setOriginalVideoUrl] = useState(initialOriginalUrl);
  const [optimizedVideoUrl, setOptimizedVideoUrl] = useState(initialOptimizedUrl);


  const [showLabelHistory, setShowLabelHistory] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(true);


  const originalRef = useRef<HTMLVideoElement | null>(null);
  const optimizedRef = useRef<HTMLVideoElement | null>(null);

  const bufferingRef = useRef(false);
  const shouldResumeAfterBufferingRef = useRef(false);

  const [bufferingVideo, setBufferingVideo] = useState<ActiveVideo | null>(null);


  const originalFrameTimeRef = useRef(0);
  const optimizedFrameTimeRef = useRef(0);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({
    x: 0,
    y: 0,
  });

  const [frameRate, setFrameRate] = useState(30);
  const frameStep = 1 / frameRate;

  const [activeVideo, setActiveVideo] = useState<ActiveVideo>('original');

  const [viewMode, setViewMode] = useState<ViewMode>('ab');

  const [videoAStatus, setVideoAStatus] = useState('Loading');
  const [videoBStatus, setVideoBStatus] = useState('Loading');

  const videosReady =
    videoAStatus === 'Ready' &&
    videoBStatus === 'Ready';  

  const [blindMode, setBlindMode] = useState(false);

  const [blindMapping, setBlindMapping] = useState<BlindMapping>({
    A: 'original',
    B: 'optimized',
  });  


  const getUrlForSource = (source: ActiveVideo) => {
    return source === 'original' ? originalVideoUrl : optimizedVideoUrl;
  };

  const getSourceForLabel = (label: 'A' | 'B'): ActiveVideo => {
    if (!blindMode) {
      return label === 'A' ? 'original' : 'optimized';
    }

    return blindMapping[label];
  };

  const getLabelForSource = (source: ActiveVideo): 'A' | 'B' => {
    return getSourceForLabel('A') === source ? 'A' : 'B';
  };  

  const getSideBySideOrder = (source: ActiveVideo) => {
    return getSourceForLabel('A') === source ? 0 : 1;
  };  

  const getActiveVideoLabel = () => {
    return getLabelForSource(activeVideo);
  };  

  const [labels, setLabels] = useState<Label[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);


  const initialTime = getInitialTime();
  const [currentTime, setCurrentTime] = useState(initialTime);

  const [duration, setDuration] = useState(0);

  const getVideos = () => {
    return [originalRef.current, optimizedRef.current].filter(
      (video): video is HTMLVideoElement => video !== null
    );
  };

  const areVideosPlayable = () => {
    const videos = getVideos();

    return (
      videos.length === 2 &&
      videos.every((video) => video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA)
    );
  };  

  const waitForSeek = (video: HTMLVideoElement) => {
    return new Promise<void>((resolve) => {
      if (!video.seeking) {
        resolve();
        return;
      }

      video.addEventListener(
        'seeked',
        () => resolve(),
        { once: true }
      );
    });
  };  



  const handleVideoWaiting = (videoType: ActiveVideo) => {
    if (!isPlaying || bufferingRef.current) return;

    bufferingRef.current = true;
    shouldResumeAfterBufferingRef.current = true;

    setBufferingVideo(videoType);

    getVideos().forEach((video) => {
      video.pause();
    });
  };  



  const handleVideoCanPlay = async (
    videoType: ActiveVideo
  ) => {
    if (videoType === 'original') {
      setVideoAStatus('Ready');
    } else {
      setVideoBStatus('Ready');
    }

    if (
      !bufferingRef.current ||
      !shouldResumeAfterBufferingRef.current ||
      !areVideosPlayable()
    ) {
      return;
    }

    const videos = getVideos();

    bufferingRef.current = false;



    const syncTime = Math.min(
      originalRef.current?.currentTime ?? currentTime,
      optimizedRef.current?.currentTime ?? currentTime
    );    

    videos.forEach((video) => {
      if (Math.abs(video.currentTime - syncTime) > 0.001) {
        video.currentTime = syncTime;
      }
    });

    await Promise.all(videos.map(waitForSeek));

    if (!shouldResumeAfterBufferingRef.current) {
      return;
    }



    try {
      await Promise.all(
        videos.map((video) => video.play())
      );

      shouldResumeAfterBufferingRef.current = false;
      setBufferingVideo(null);
    } catch {
      shouldResumeAfterBufferingRef.current = false;
      setBufferingVideo(null);
      setIsPlaying(false);
    }    
  };

  const getActiveFrameTime = () => {
    return activeVideo === 'original'
      ? originalFrameTimeRef.current
      : optimizedFrameTimeRef.current;
  };

  const trackVideoFrame = (
    video: HTMLVideoElement,
    frameTimeRef: React.MutableRefObject<number>
  ) => {
    if (!('requestVideoFrameCallback' in video)) return;

    const updateFrameTime = (
      _now: DOMHighResTimeStamp,
      metadata: { mediaTime: number }
    ) => {
      frameTimeRef.current = metadata.mediaTime;
      video.requestVideoFrameCallback(updateFrameTime);
    };

    video.requestVideoFrameCallback(updateFrameTime);
  };

  const handleToggle = () => {
    setActiveVideo((current) =>
      current === 'original'
        ? 'optimized'
        : 'original'
    );
  };  

  const handlePlayPause = async () => {
    if (!videosReady) return;

    const videos = getVideos();

    if (isPlaying) {

      shouldResumeAfterBufferingRef.current = false;
      bufferingRef.current = false;

      setBufferingVideo(null);

      const time = getActiveFrameTime();

      videos.forEach((video) => {
        video.pause();
        video.currentTime = time;
      });

      setCurrentTime(time);
      setIsPlaying(false);

      updateBrowserUrl(originalVideoUrl, optimizedVideoUrl, time);

      return;
    }

    await Promise.all(videos.map((video) => video.play()));
    setIsPlaying(true);
  };


  const handleSeek = (time: number) => {
    getVideos().forEach((video) => {
      video.currentTime = time;
    });

    originalFrameTimeRef.current = time;
    optimizedFrameTimeRef.current = time;

    setCurrentTime(time);
    updateBrowserUrl(originalVideoUrl, optimizedVideoUrl, time);
  };  



  const handleLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>,
    videoType: ActiveVideo
  ) => {
    const video = event.currentTarget;

    setDuration(video.duration);



    if (initialTime > 0) {
      video.currentTime = initialTime;
    }    

    if (videoType === 'original') {
      originalFrameTimeRef.current = video.currentTime;
      trackVideoFrame(video, originalFrameTimeRef);
    }

    if (videoType === 'optimized') {
      optimizedFrameTimeRef.current = video.currentTime;
      trackVideoFrame(video, optimizedFrameTimeRef);
    }
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (event.currentTarget !== originalRef.current) return;

    setCurrentTime(event.currentTarget.currentTime);
  };

  const handleFrameStep = (direction: -1 | 1) => {
    getVideos().forEach((video) => {
      video.pause();
    });

    setIsPlaying(false);

    const nextTime = Math.max(
      0,
      Math.min(duration, currentTime + frameStep * direction)
    );    

    handleSeek(nextTime);
  };  


  const handleZoomIn = () => {
    setZoom((current) => Math.min(current + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((current) => Math.max(current - ZOOM_STEP, MIN_ZOOM));
  };  

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };  


  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);

    dragStartRef.current = {
      x: event.clientX - pan.x,
      y: event.clientY - pan.y,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setPan({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };



  const handleLoadVideos = () => {
    const startTime = 0;

    setVideoAStatus('Loading');
    setVideoBStatus('Loading');    

    getVideos().forEach((video) => {
      video.pause();
      video.currentTime = startTime;
    });

    setIsPlaying(false);
    setCurrentTime(startTime);
    setActiveVideo('original');

    setBufferingVideo(null);

    setOriginalVideoUrl(originalInputUrl);
    setOptimizedVideoUrl(optimizedInputUrl);

    updateBrowserUrl(originalInputUrl, optimizedInputUrl, startTime);
  };  

  const addLabel = (verdict: Verdict) => {

    const label: Label = {    
      videoAUrl: getUrlForSource(getSourceForLabel('A')),
      videoBUrl: getUrlForSource(getSourceForLabel('B')),      
      time: currentTime,
      frame: getFrameNumber(currentTime, frameRate),
      verdict,
      activeVideo: getActiveVideoLabel(),
      blindMode,
      blindMapping,
      createdAt: new Date().toISOString(),
    };    

    setLabels((current) => [label, ...current]);
  };

  const exportLabels = () => {
    const blob = new Blob([JSON.stringify(labels, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-compare-labels.json';
    link.click();

    URL.revokeObjectURL(url);
  };    

  const undoLastLabel = () => {
    setLabels((current) => current.slice(1));
  };

  const clearLabels = () => {
    if (!window.confirm('Clear all labels?')) {
      return;
    }

    setLabels([]);
    setShowLabelHistory(false);
  };

  const copyShareLink = async () => {
    updateBrowserUrl(originalVideoUrl, optimizedVideoUrl, currentTime);
    await navigator.clipboard.writeText(window.location.href);
  };  

  const handleToggleViewMode = () => {
    setViewMode((current) =>
      current === 'ab' ? 'side-by-side' : 'ab'
    );
  };  

  const handleBlindModeToggle = () => {
    if (!blindMode) {
      const mapping = createBlindMapping();

      setBlindMapping(mapping);
      setBlindMode(true);

      // Always start Blind Mode showing A.
      setActiveVideo(mapping.A);
    } else {
      setBlindMode(false);

      setBlindMapping({
        A: 'original',
        B: 'optimized',
      });

      // Back to normal A.
      setActiveVideo('original');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (target.tagName === 'INPUT') return;

      if (event.code === 'Space') {
        event.preventDefault();
        handleToggle();
      }

      if (event.key.toLowerCase() === 'k') {
        handlePlayPause();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleFrameStep(-1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleFrameStep(1);
      }

      if (event.key === '+') {
        handleZoomIn();
      }

      if (event.key === '-') {
        handleZoomOut();
      }

      if (event.key.toLowerCase() === 'r') {
        handleResetView();
      }

      if (event.key === '1') {
        addLabel('A');
      }

      if (event.key === '2') {
        addLabel('B');
      }

      if (event.key === '3') {
        addLabel('same');
      }

      if (event.key.toLowerCase() === 'z') {
        undoLastLabel();
      }

    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });  

  return (
    <main className="app">
      <h1>Compare Video</h1>

      <section className="video-sources" aria-label="Video sources">
        <h2>Video sources</h2>
        <div className="source-rows">
          <label className="url-input">
            <span className="url-label">Video A URL</span>
            <input type="url" value={originalInputUrl} onChange={(event) => setOriginalInputUrl(event.target.value)} />
            {/* <span className={`video-status ${videoAStatus.toLowerCase()}`}>{videoAStatus}</span> */}
            <VideoStatus status={videoAStatus} video="A" />
          </label>
          <label className="url-input">
            <span className="url-label">Video B URL</span>
            <input type="url" value={optimizedInputUrl} onChange={(event) => setOptimizedInputUrl(event.target.value)} />
            {/* <span className={`video-status ${videoBStatus.toLowerCase()}`}>{videoBStatus}</span> */}
            <VideoStatus status={videoBStatus} video="B" />
          </label>
        </div>
        <div className="source-actions"><button className="primary-button" onClick={handleLoadVideos}>Load videos</button></div>
      </section>

      <div
        className={`viewport ${viewMode === 'side-by-side' ? 'side-by-side' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {bufferingVideo && (
          <div className="buffering-overlay">
            <div className="buffering-indicator"><span className="buffering-spinner" />
              <span>Buffering video {getLabelForSource(bufferingVideo)}…</span>
            </div>
          </div>
        )}
        <div className="video-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <video
            ref={originalRef}
            className={viewMode === 'side-by-side' ? 'video side-video' : activeVideo === 'original' ? 'video visible' : 'video hidden'}
            style={viewMode === 'side-by-side' ? { order: getSideBySideOrder('original') } : undefined}
            src={originalVideoUrl}
            preload="auto"
            muted
            onLoadedMetadata={(event) => handleLoadedMetadata(event, 'original')}
            onTimeUpdate={handleTimeUpdate}
            onCanPlay={() => handleVideoCanPlay('original')}
            onWaiting={() => handleVideoWaiting('original')}
            onError={() => setVideoAStatus('Error')}
          />
          <video
            ref={optimizedRef}
            className={viewMode === 'side-by-side' ? 'video side-video' : activeVideo === 'optimized' ? 'video visible' : 'video hidden'}
            style={viewMode === 'side-by-side' ? { order: getSideBySideOrder('optimized') } : undefined}
            src={optimizedVideoUrl}
            preload="auto"
            muted
            onLoadedMetadata={(event) => handleLoadedMetadata(event, 'optimized')}
            onCanPlay={() => handleVideoCanPlay('optimized')}
            onWaiting={() => handleVideoWaiting('optimized')}
            onError={() => setVideoBStatus('Error')}
          />
        </div>
        <div className="viewport-label">{viewMode === 'side-by-side' ? 'Video A + B' : `Video ${getActiveVideoLabel()}`}</div>
        <div className="viewport-zoom">Zoom: {zoom.toFixed(1)}x</div>
      </div>

      <div className="timeline">
        <input
          aria-label="Video position"
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          style={{ '--progress': `${duration > 0 ? Math.min(100, Math.max(0, currentTime / duration * 100)) : 0}%` } as React.CSSProperties}
          onChange={(event) => handleSeek(Number(event.target.value))}
        />
        <span className="current-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <label className="fps-control"><input type="number" min={1} max={240} value={frameRate} onChange={(event) => setFrameRate(Number(event.target.value))} /><span>FPS</span></label>
        <span className="estimated-frame">Estimated frame: <strong>{getFrameNumber(currentTime, frameRate)}</strong></span>
      </div>

      <div className="utility-row">
        <button className="primary-button" onClick={copyShareLink}>Copy Share Link</button>
        <label className="switch-label"><input type="checkbox" checked={showKeyboardShortcuts} onChange={(event) => setShowKeyboardShortcuts(event.target.checked)} />Show Keyboard Shortcuts</label>
      </div>

      <section className="block-panel">
        <h2 className="block-panel-header">PLAYBACK</h2>
        <div className="block-panel-content">
          <div className="block-panel-column">
            <div className="control-buttons">
              <button disabled={!videosReady} onClick={handlePlayPause}>{videosReady ? (isPlaying ? 'Pause' : 'Play') : 'Loading…'} {showKeyboardShortcuts && <kbd>K</kbd>}</button>
              <button onClick={() => handleFrameStep(-1)}>Prev frame {showKeyboardShortcuts && <kbd>←</kbd>}</button>
              <button onClick={() => handleFrameStep(1)}>Next frame {showKeyboardShortcuts && <kbd>→</kbd>}</button>
            </div>
          </div>
          <div className="block-panel-column">
            <div className="control-buttons">
              <button onClick={handleZoomOut}>Zoom out {showKeyboardShortcuts && <kbd>−</kbd>}</button>
              <button onClick={handleZoomIn}>Zoom in {showKeyboardShortcuts && <kbd>+</kbd>}</button>
              <button onClick={handleResetView}>Reset view {showKeyboardShortcuts && <kbd>R</kbd>}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="block-panel">
        <h2 className="block-panel-header">COMPARE &amp; LABEL</h2>
        <div className="block-panel-content">
          <div className="block-panel-column">
            <div className="block-column-title">Showing: <strong>{viewMode === 'side-by-side' ? 'Video A and B' : `Video ${getActiveVideoLabel()}`}</strong></div>
            <div className="control-buttons">
              {/* <button onClick={() => setActiveVideo(getSourceForLabel('A'))}>Show A</button> */}
              {/* <button onClick={() => setActiveVideo(getSourceForLabel('B'))}>Show B</button> */}
              <button onClick={handleToggle}>Toggle A/B {showKeyboardShortcuts && <kbd>Space</kbd>}</button>
              <button onClick={handleToggleViewMode}>Toggle View Mode</button>
            </div>
            <label className="switch-label blind-toggle"><input type="checkbox" checked={blindMode} onChange={handleBlindModeToggle} />Blind mode</label>
          </div>
          <div className="block-panel-column">
            <div className="block-column-title">Mark As</div>
            <div className="control-buttons">
              <button onClick={() => addLabel('A')}>A better {showKeyboardShortcuts && <kbd>1</kbd>}</button>
              <button onClick={() => addLabel('B')}>B better {showKeyboardShortcuts && <kbd>2</kbd>}</button>
              <button onClick={() => addLabel('same')}>Same {showKeyboardShortcuts && <kbd>3</kbd>}</button>
            </div>
          </div>
        </div>
        <div className="history-container">
          <div className="history-header">
            <h3>Label History</h3>
            <div className="history-actions">
              <button disabled={labels.length === 0} onClick={undoLastLabel}>Undo {showKeyboardShortcuts && <kbd>Z</kbd>}</button>
              <button disabled={labels.length === 0} onClick={clearLabels}>Clear</button>
              <button disabled={labels.length === 0} onClick={exportLabels}>Export JSON</button>
              <button disabled={labels.length === 0} onClick={() => setShowLabelHistory((current) => !current)}>{showLabelHistory ? 'Hide history' : `Show history (${labels.length})`}</button>
            </div>
          </div>
          {labels.length === 0 ? <p className="history-empty">You have not marked any labels yet.</p> : showLabelHistory ? (
            <ul className="label-history">
              {labels.map((label, index) => <li key={`${label.createdAt}-${index}`}><strong>{label.verdict === 'same' ? 'Same' : `${label.verdict} better`}</strong><span>Frame {label.frame} · {formatTime(label.time)}</span></li>)}
            </ul>
          ) : <p className="history-empty">{labels.length} label{labels.length === 1 ? '' : 's'} recorded. Select Show history to view them.</p>}
        </div>
      </section>
    </main>
  );
}

export default App;

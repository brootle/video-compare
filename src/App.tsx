
import { useEffect, useRef, useState } from 'react';
import './App.css';

import VideoSources from './components/VideoSources';
import PlaybackControls from './components/PlaybackControls';
import CompareControls from './components/CompareControls';
import VideoTimeline from './components/VideoTimeline';
import VideoViewport from './components/VideoViewport';

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
  const frameStep =
    Number.isFinite(frameRate) && frameRate >= 1 && frameRate <= 240
      ? 1 / frameRate
      : 1 / 30;

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
    } catch (error) {
      // One video may have started while the other failed.
      videos.forEach((video) => video.pause());

      shouldResumeAfterBufferingRef.current = false;
      bufferingRef.current = false;

      setBufferingVideo(null);
      setIsPlaying(false);

      console.error('Failed to resume video playback after buffering:', error);
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

  // const handlePlayPause = async () => {
  //   if (!videosReady) return;

  //   const videos = getVideos();

  //   if (isPlaying) {

  //     shouldResumeAfterBufferingRef.current = false;
  //     bufferingRef.current = false;

  //     setBufferingVideo(null);

  //     const time = getActiveFrameTime();

  //     videos.forEach((video) => {
  //       video.pause();
  //       video.currentTime = time;
  //     });

  //     setCurrentTime(time);
  //     setIsPlaying(false);

  //     updateBrowserUrl(originalVideoUrl, optimizedVideoUrl, time);

  //     return;
  //   }

  //   await Promise.all(videos.map((video) => video.play()));
  //   setIsPlaying(true);
  // };

  const handlePlayPause = async () => {
    if (!videosReady) return;

    const videos = getVideos();

    if (videos.length !== 2) return;

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

    try {
      await Promise.all(videos.map((video) => video.play()));

      setIsPlaying(true);
    } catch (error) {
      // One video may have started even if the other failed.
      // Pause both to avoid inconsistent playback.
      videos.forEach((video) => video.pause());

      shouldResumeAfterBufferingRef.current = false;
      bufferingRef.current = false;

      setBufferingVideo(null);
      setIsPlaying(false);

      console.error('Failed to start video playback:', error);
    }
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

    // Cancel buffering recovery from the previous sources.
    bufferingRef.current = false;
    shouldResumeAfterBufferingRef.current = false;

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

      <VideoSources
        originalInputUrl={originalInputUrl}
        optimizedInputUrl={optimizedInputUrl}
        videoAStatus={videoAStatus}
        videoBStatus={videoBStatus}
        onOriginalUrlChange={setOriginalInputUrl}
        onOptimizedUrlChange={setOptimizedInputUrl}
        onLoadVideos={handleLoadVideos}
      />

      <VideoViewport
        originalRef={originalRef}
        optimizedRef={optimizedRef}
        originalVideoUrl={originalVideoUrl}
        optimizedVideoUrl={optimizedVideoUrl}
        activeVideo={activeVideo}
        activeVideoLabel={getActiveVideoLabel()}
        viewMode={viewMode}
        zoom={zoom}
        pan={pan}
        bufferingVideo={bufferingVideo}
        bufferingVideoLabel={
          bufferingVideo ? getLabelForSource(bufferingVideo) : null
        }
        originalOrder={getSideBySideOrder('original')}
        optimizedOrder={getSideBySideOrder('optimized')}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onCanPlay={handleVideoCanPlay}
        onWaiting={handleVideoWaiting}
        onError={(videoType) => {
          if (videoType === 'original') {
            setVideoAStatus('Error');
          } else {
            setVideoBStatus('Error');
          }
        }}
      />

      <VideoTimeline
        currentTime={currentTime}
        duration={duration}
        frameRate={frameRate}
        onSeek={handleSeek}
        onFrameRateChange={setFrameRate}
      />

      <div className="utility-row">
        <button className="primary-button" onClick={copyShareLink}>Copy Share Link</button>
        <label className="switch-label"><input type="checkbox" checked={showKeyboardShortcuts} onChange={(event) => setShowKeyboardShortcuts(event.target.checked)} />Show Keyboard Shortcuts</label>
      </div>

      <PlaybackControls
        videosReady={videosReady}
        isPlaying={isPlaying}
        showKeyboardShortcuts={showKeyboardShortcuts}
        onPlayPause={handlePlayPause}
        onFrameStep={handleFrameStep}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      <CompareControls
        activeVideoLabel={getActiveVideoLabel()}
        viewMode={viewMode}
        blindMode={blindMode}
        labels={labels}
        showKeyboardShortcuts={showKeyboardShortcuts}
        onToggleVideo={handleToggle}
        onToggleViewMode={handleToggleViewMode}
        onToggleBlindMode={handleBlindModeToggle}
        onAddLabel={addLabel}
        onUndoLabel={undoLastLabel}
        onClearLabels={clearLabels}
        onExportLabels={exportLabels}
      />
    </main>
  );
}

export default App;

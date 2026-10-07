import { useEffect, useRef, useState } from 'react';
import './App.css';

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


//   const formatTime = (seconds: number) => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;

//     return `${String(minutes).padStart(2, '0')}:${remainingSeconds
//       .toFixed(3)
//       .padStart(6, '0')}`;
//   };



// const getFrameNumber = (time: number) => {
//   return Math.floor(time * frameRate);
// };  




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
      <h1>Video Compare</h1>

      <div className="video-sources">
        <h3>Video Sources</h3>

        <label className="url-input">
          <span className="url-label">Video A URL:</span>
          <input
            value={originalInputUrl}
            onChange={(event) => setOriginalInputUrl(event.target.value)}
          />
          <span className="video-status">{videoAStatus}</span>
        </label>

        <label className="url-input">
          <span className="url-label">Video B URL:</span>
          <input
            value={optimizedInputUrl}
            onChange={(event) => setOptimizedInputUrl(event.target.value)}
          />
          <span className="video-status">{videoBStatus}</span>
        </label>
    

        <button onClick={handleLoadVideos}>
          Load Videos
        </button>
      </div>      


      <div className="toolbar">
        <section className="control-group">
          <h3>Compare</h3>

          <div className="button-row">

            <button onClick={() => setActiveVideo(getSourceForLabel('A'))}>
              A
            </button>

            <button onClick={() => setActiveVideo(getSourceForLabel('B'))}>
              B
            </button>

            <button onClick={handleToggle}>Toggle A/B</button>


            <button onClick={handleToggleViewMode}>
              View Mode
            </button>              

            <button onClick={handleBlindModeToggle}>
              {blindMode ? 'Disable Blind Mode' : 'Enable Blind Mode'}
            </button>          
              
          </div>


           Showing: {getActiveVideoLabel()}

             
        </section>

        <section className="control-group">
          <h3>Playback</h3>

          <div className="button-row">

            <button
              onClick={handlePlayPause}
              disabled={!videosReady}
            >
              {videosReady ? (isPlaying ? 'Pause' : 'Play') : 'Loading...'}
            </button>            

            <button onClick={() => handleFrameStep(-1)}>
              Previous frame
            </button>

            <button onClick={() => handleFrameStep(1)}>
              Next frame
            </button>
          </div>

          <label className="fps-control">
            FPS
            <input
              type="number"
              min={1}
              max={240}
              value={frameRate}
              onChange={(event) => setFrameRate(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="control-group">
          <h3>View</h3>

          <div className="button-row">
            <button onClick={handleZoomOut}>Zoom out</button>
            <button onClick={handleZoomIn}>Zoom in</button>
            <button onClick={handleResetView}>Reset view</button>
          </div>

          <strong>Zoom: {zoom.toFixed(1)}x</strong>
        </section>
      </div>      

      <section className="label-panel">

        <div className="button-row">
          <button onClick={() => addLabel('A')}>A better</button>
          <button onClick={() => addLabel('B')}>B better</button>
          <button onClick={() => addLabel('same')}>Same</button>

          <button
            onClick={undoLastLabel}
            disabled={labels.length === 0}
          >
            Undo Last
          </button>

          <button
            onClick={clearLabels}
            disabled={labels.length === 0}
          >
            Clear Labels
          </button>

          <button
            onClick={() => setShowLabelHistory((current) => !current)}
            disabled={labels.length === 0}
          >
            {showLabelHistory
              ? `Hide History (${labels.length})`
              : `Show History (${labels.length})`}
          </button>          
          <button onClick={exportLabels} disabled={labels.length === 0}>
            Export JSON
          </button>
        </div>

        

        {showLabelHistory && labels.length > 0 && (
          <div className="label-history">
            <h4>Label history</h4>

            <ul>
              {labels.slice(0, 10).map((label) => (
                <li key={label.createdAt}>
                  <strong>
                    {label.verdict === 'same'
                      ? 'Same'
                      : `${label.verdict} better`}
                  </strong>

                  <span>
                    Frame {label.frame} — {formatTime(label.time)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}        

      </section>        

      <div className="timeline">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={currentTime}
          onChange={(event) => handleSeek(Number(event.target.value))}
        />


        <span>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <span>
          Estimated frame: {getFrameNumber(currentTime, frameRate)}
        </span>

        <button onClick={copyShareLink}>
          Copy Share Link
        </button>        
        
      </div>    

      <div 

        className={`viewport ${viewMode === 'side-by-side' ? 'side-by-side' : ''}`}

        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        {bufferingVideo && (
          <div className="buffering-overlay">
            <div className="buffering-indicator">
              <span className="buffering-spinner" />
              <span>
                Buffering video {getLabelForSource(bufferingVideo)}…
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
              viewMode === 'side-by-side'
                ? 'video side-video'
                : activeVideo === 'original'
                  ? 'video visible'
                  : 'video hidden'
            }

            style={
              viewMode === 'side-by-side'
                ? { order: getSideBySideOrder('original') }
                : undefined
            }            

            src={originalVideoUrl}

            preload="auto"
            muted
            onLoadedMetadata={(event) => {
              handleLoadedMetadata(event, 'original');
            }}
            onTimeUpdate={handleTimeUpdate}      

            onCanPlay={() => handleVideoCanPlay('original')}

            onWaiting={() => handleVideoWaiting('original')}

            onError={() => setVideoAStatus('Error')}
          />

          <video
            ref={optimizedRef}

            className={
              viewMode === 'side-by-side'
                ? 'video side-video'
                : activeVideo === 'optimized'
                  ? 'video visible'
                  : 'video hidden'
            }            

            style={
              viewMode === 'side-by-side'
                ? { order: getSideBySideOrder('optimized') }
                : undefined
            }            

            src={optimizedVideoUrl}

            preload="auto"
            muted
            onLoadedMetadata={(event) => {
              handleLoadedMetadata(event, 'optimized');
            }}
            
      
            onCanPlay={() => handleVideoCanPlay('optimized')}

            onWaiting={() => handleVideoWaiting('optimized')}

            onError={() => setVideoBStatus('Error')}            
          />          
        </div>


      </div>

      <h4>Playback & Navigation</h4>
      <div className="shortcuts">
        <span><kbd>Space</kbd> Toggle A/B</span>
        <span><kbd>K</kbd> Play / Pause</span>
        <span><kbd>←</kbd> Previous frame</span>
        <span><kbd>→</kbd> Next frame</span>
        <span><kbd>+</kbd> Zoom in</span>
        <span><kbd>-</kbd> Zoom out</span>
        <span><kbd>R</kbd> Reset view</span>
      </div>  

      <h4>Labeling</h4>
      <div className="shortcuts">
        <span><kbd>1</kbd> A better</span>
        <span><kbd>2</kbd> B better</span>
        <span><kbd>3</kbd> Same</span>
        <span><kbd>Z</kbd> Undo label</span>
      </div>            
    </main>
  );
}

export default App;

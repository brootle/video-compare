// Next stage: zoom + pan.

import { useEffect, useRef, useState } from 'react';
import './App.css';

type ActiveVideo = 'original' | 'optimized';
type ViewMode = 'ab' | 'side-by-side';

function App() {

  const defaultOriginalUrl =
    'https://video-compare.media-storage.us-west.qencode.com/demo-original.mp4';

  const defaultOptimizedUrl =
    'https://video-compare.media-storage.us-west.qencode.com/demo-optimized.mp4';

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 32;
  const ZOOM_STEP = 0.5;    



  // const updateBrowserUrl = (originalUrl: string, optimizedUrl: string) => {
  //   const params = new URLSearchParams();

  //   params.set('a', originalUrl);
  //   params.set('b', optimizedUrl);

  //   window.history.replaceState(null, '', `?${params.toString()}`);
  // };

  // const updateBrowserUrl = (
  //   videoAUrl: string,
  //   videoBUrl: string,
  //   time?: number
  // ) => {
  //   const params = new URLSearchParams();

  //   params.set('a', videoAUrl);
  //   params.set('b', videoBUrl);

  //   if (typeof time === 'number') {
  //     params.set('t', time.toFixed(3));
  //   }

  //   window.history.replaceState(null, '', `?${params.toString()}`);
  // };  

  const updateBrowserUrl = (
    videoAUrl: string,
    videoBUrl: string,
    time: number
  ) => {
    const params = new URLSearchParams();

    params.set('a', videoAUrl);
    params.set('b', videoBUrl);
    //params.set('t', time.toFixed(3));

    if (typeof time === 'number') {
      params.set('t', time.toFixed(3));
    }    

    window.history.replaceState(null, '', `?${params.toString()}`);
  };  

  const getInitialTime = () => {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get('t') || 0);
  };  

  const getInitialUrl = (key: string, fallback: string) => {
    const params = new URLSearchParams(window.location.search);

    return params.get(key) || fallback;
  };    

  const initialOriginalUrl = getInitialUrl('a', defaultOriginalUrl);
  const initialOptimizedUrl = getInitialUrl('b', defaultOptimizedUrl);  

  const [originalInputUrl, setOriginalInputUrl] = useState(initialOriginalUrl);
  const [optimizedInputUrl, setOptimizedInputUrl] = useState(initialOptimizedUrl);

  const [originalVideoUrl, setOriginalVideoUrl] = useState(initialOriginalUrl);
  const [optimizedVideoUrl, setOptimizedVideoUrl] = useState(initialOptimizedUrl);


  const [showLabelHistory, setShowLabelHistory] = useState(false);


  const originalRef = useRef<HTMLVideoElement | null>(null);
  const optimizedRef = useRef<HTMLVideoElement | null>(null);

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

  // type Verdict = 'original' | 'optimized' | 'same';

  // type Label = {
  //   originalUrl: string;
  //   optimizedUrl: string;
  //   time: number;
  //   frame: number;
  //   verdict: Verdict;
  //   activeVideo: ActiveVideo;
  //   createdAt: string;
  // };

  type Verdict = 'A' | 'B' | 'same';

  type Label = {
    videoAUrl: string;
    videoBUrl: string;
    time: number;
    frame: number;
    verdict: Verdict;
    activeVideo: 'A' | 'B';
    createdAt: string;
  };  

  const getActiveVideoLabel = () => {
    return activeVideo === 'original' ? 'A' : 'B';
  };  

  const [labels, setLabels] = useState<Label[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);

  // const [currentTime, setCurrentTime] = useState(0);

  const initialTime = getInitialTime();
  const [currentTime, setCurrentTime] = useState(initialTime);

  const [duration, setDuration] = useState(0);

  const getVideos = () => {
    return [originalRef.current, optimizedRef.current].filter(
      (video): video is HTMLVideoElement => video !== null
    );
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
    const videos = getVideos();

    if (isPlaying) {
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

  // const handleSeek = (time: number) => {
  //   getVideos().forEach((video) => {
  //     video.currentTime = time;
  //   });

  //   updateBrowserUrl(originalVideoUrl, optimizedVideoUrl, time);

  //   originalFrameTimeRef.current = time;
  //   optimizedFrameTimeRef.current = time;

  //   setCurrentTime(time);
  // };

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

    if (initialTime > 0) {
      video.currentTime = initialTime;
    }    

    setDuration(video.duration);

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


  // const handleLoadVideos = () => {
  //   getVideos().forEach((video) => {
  //     video.pause();
  //     video.currentTime = 0;
  //   });

  //   setIsPlaying(false);
  //   setCurrentTime(0);
  //   setActiveVideo('original');

  //   setOriginalVideoUrl(originalInputUrl);
  //   setOptimizedVideoUrl(optimizedInputUrl);
  // };  


  // const handleLoadVideos = () => {
  //   getVideos().forEach((video) => {
  //     video.pause();
  //     video.currentTime = 0;
  //   });

  //   setIsPlaying(false);
  //   setCurrentTime(0);
  //   setActiveVideo('original');

  //   setOriginalVideoUrl(originalInputUrl);
  //   setOptimizedVideoUrl(optimizedInputUrl);

  //   updateBrowserUrl(originalInputUrl, optimizedInputUrl);
  // };  

  const handleLoadVideos = () => {
    const startTime = 0;

    getVideos().forEach((video) => {
      video.pause();
      video.currentTime = startTime;
    });

    setIsPlaying(false);
    setCurrentTime(startTime);
    setActiveVideo('original');

    setOriginalVideoUrl(originalInputUrl);
    setOptimizedVideoUrl(optimizedInputUrl);

    updateBrowserUrl(originalInputUrl, optimizedInputUrl, startTime);
  };  


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${remainingSeconds
      .toFixed(3)
      .padStart(6, '0')}`;
  };

  const getFrameNumber = (time: number) => {
    return Math.round(time * 30);
  };  


// const addLabel = (verdict: Verdict) => {
//   const label: Label = {
//     originalUrl: originalVideoUrl,
//     optimizedUrl: optimizedVideoUrl,
//     time: currentTime,
//     frame: getFrameNumber(currentTime),
//     verdict,
//     activeVideo,
//     createdAt: new Date().toISOString(),
//   };

//   setLabels((current) => [label, ...current]);
// };

  const addLabel = (verdict: Verdict) => {
    const label: Label = {
      videoAUrl: originalVideoUrl,
      videoBUrl: optimizedVideoUrl,
      time: currentTime,
      frame: getFrameNumber(currentTime),
      verdict,
      activeVideo: getActiveVideoLabel(),
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
  }, [
    handleToggle,
    handlePlayPause,
    handleFrameStep,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
  ]);  


  useEffect(() => {
    //updateBrowserUrl(originalVideoUrl, optimizedVideoUrl);
    updateBrowserUrl(originalVideoUrl, optimizedVideoUrl, initialTime);
  }, []);  


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
        </label>

        <label className="url-input">
          <span className="url-label">Video B URL:</span>
          <input
            value={optimizedInputUrl}
            onChange={(event) => setOptimizedInputUrl(event.target.value)}
          />
        </label>

        <button onClick={handleLoadVideos}>
          Load Videos
        </button>
      </div>      

      <div className="toolbar">
        <section className="control-group">
          <h3>Compare</h3>

          <div className="button-row">
            <button onClick={() => setActiveVideo('original')}>A</button>
            <button onClick={() => setActiveVideo('optimized')}>B</button>
            <button onClick={handleToggle}>Toggle A/B</button>

            {/* <button onClick={() => setViewMode('ab')}>
              A/B mode
            </button> */}

            {/* <button onClick={() => setViewMode('side-by-side')}>
              Side-by-side
            </button>           */}

            {/* <button onClick={handleToggleViewMode}>
              Mode: {viewMode === 'ab' ? 'A/B' : 'Side-by-side'}
            </button>   */}

            <button onClick={handleToggleViewMode}>
              View Mode
            </button>              
          </div>

          {/* <strong>Showing: {activeVideo}</strong> */}
           Showing: {activeVideo === 'original' ? 'A' : 'B'}

        </section>

        <section className="control-group">
          <h3>Playback</h3>

          <div className="button-row">
            <button onClick={handlePlayPause}>
              {isPlaying ? 'Pause' : 'Play'}
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
        {/* <h3>Labels: {labels.length}</h3> */}

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

        
        {/* {labels.length > 0 && (
          <div className="label-history">
            <h4>Label history</h4>

            <ul>
              {labels.slice(0, 5).map((label) => (
                <li key={label.createdAt}>
                  <strong>
                    {label.verdict === 'same' ? 'Same' : `${label.verdict} better`}
                  </strong>

                  <span>
                    Frame {label.frame} — {formatTime(label.time)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )} */}

        {/* <div className="label-history-controls">
          <button
            onClick={() => setShowLabelHistory((current) => !current)}
            disabled={labels.length === 0}
          >
            {showLabelHistory
              ? `Hide History (${labels.length})`
              : `Show History (${labels.length})`}
          </button>
        </div> */}

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

        {/* <span>
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span> */}

        <span>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <span>
          Frame: {getFrameNumber(currentTime)}
        </span>

        <button onClick={copyShareLink}>
          Copy Share Link
        </button>        
        
      </div>    

      <div 
        // className="viewport"
        className={`viewport ${viewMode === 'side-by-side' ? 'side-by-side' : ''}`}

        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        <div
          className="video-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <video
            ref={originalRef}
            // className={activeVideo === 'original' ? 'video visible' : 'video hidden'}

            className={
              viewMode === 'side-by-side'
                ? 'video side-video'
                : activeVideo === 'original'
                  ? 'video visible'
                  : 'video hidden'
            }

            //src={originalVideo}
            src={originalVideoUrl}
            preload="auto"
            muted
            onLoadedMetadata={(event) => {
              handleLoadedMetadata(event, 'original');
            }}
            onTimeUpdate={handleTimeUpdate}
          />

          <video
            ref={optimizedRef}
            // className={activeVideo === 'optimized' ? 'video visible' : 'video hidden'}

            className={
              viewMode === 'side-by-side'
                ? 'video side-video'
                : activeVideo === 'optimized'
                  ? 'video visible'
                  : 'video hidden'
            }            

            //src={optimizedVideo}
            src={optimizedVideoUrl}
            preload="auto"
            muted
            onLoadedMetadata={(event) => {
              handleLoadedMetadata(event, 'optimized');
            }}
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


// This version adds play/pause and seek controls that affect both videos simultaneously,
// allowing for a more direct comparison of the two videos at any given moment.

// import { useRef, useState } from 'react';
// import './App.css';

// import originalVideo from './assets/videos/demo-original.mp4';
// import optimizedVideo from './assets/videos/demo-optimized.mp4';

// type ActiveVideo = 'original' | 'optimized';

// function App() {
//   const originalRef = useRef<HTMLVideoElement | null>(null);
//   const optimizedRef = useRef<HTMLVideoElement | null>(null);

//   const originalFrameTimeRef = useRef(0);
//   const optimizedFrameTimeRef = useRef(0);

//   //const FRAME_RATE = 30;
//   //const FRAME_STEP = 1 / FRAME_RATE;

//   const [frameRate, setFrameRate] = useState(30);
//   const frameStep = 1 / frameRate;

//   const [activeVideo, setActiveVideo] = useState<ActiveVideo>('original');
//   const [isPlaying, setIsPlaying] = useState(false);

//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);

//   const getVideos = () => {
//     return [originalRef.current, optimizedRef.current].filter(
//       (video): video is HTMLVideoElement => video !== null
//     );
//   };

//   const getActiveFrameTime = () => {
//     return activeVideo === 'original'
//       ? originalFrameTimeRef.current
//       : optimizedFrameTimeRef.current;
//   };

//   const trackVideoFrame = (
//     video: HTMLVideoElement,
//     frameTimeRef: React.MutableRefObject<number>
//   ) => {
//     if (!('requestVideoFrameCallback' in video)) return;

//     const updateFrameTime = (
//       _now: DOMHighResTimeStamp,
//       metadata: { mediaTime: number }
//     ) => {
//       frameTimeRef.current = metadata.mediaTime;
//       video.requestVideoFrameCallback(updateFrameTime);
//     };

//     video.requestVideoFrameCallback(updateFrameTime);
//   };

//   const handleToggle = () => {
//     setActiveVideo((current) =>
//       current === 'original'
//         ? 'optimized'
//         : 'original'
//     );
//   };  

//   const handlePlayPause = async () => {
//     const videos = getVideos();

//     if (isPlaying) {
//       const time = getActiveFrameTime();

//       videos.forEach((video) => {
//         video.pause();
//         video.currentTime = time;
//       });

//       setCurrentTime(time);
//       setIsPlaying(false);
//       return;
//     }

//     await Promise.all(videos.map((video) => video.play()));
//     setIsPlaying(true);
//   };

//   const handleSeek = (time: number) => {
//     getVideos().forEach((video) => {
//       video.currentTime = time;
//     });

//     originalFrameTimeRef.current = time;
//     optimizedFrameTimeRef.current = time;

//     setCurrentTime(time);
//   };

//   const handleLoadedMetadata = (
//     event: React.SyntheticEvent<HTMLVideoElement>,
//     videoType: ActiveVideo
//   ) => {
//     const video = event.currentTarget;

//     setDuration(video.duration);

//     if (videoType === 'original') {
//       originalFrameTimeRef.current = video.currentTime;
//       trackVideoFrame(video, originalFrameTimeRef);
//     }

//     if (videoType === 'optimized') {
//       optimizedFrameTimeRef.current = video.currentTime;
//       trackVideoFrame(video, optimizedFrameTimeRef);
//     }
//   };

//   const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
//     if (event.currentTarget !== originalRef.current) return;

//     setCurrentTime(event.currentTarget.currentTime);
//   };

//   const handleFrameStep = (direction: -1 | 1) => {
//     getVideos().forEach((video) => {
//       video.pause();
//     });

//     setIsPlaying(false);

//     // const nextTime = Math.max(
//     //   0,
//     //   Math.min(duration, currentTime + FRAME_STEP * direction)
//     // );

//     const nextTime = Math.max(
//       0,
//       Math.min(duration, currentTime + frameStep * direction)
//     );    

//     handleSeek(nextTime);
//   };  

//   return (
//     <main className="app">
//       <h1>Video Compare</h1>

//       <div className="toolbar">
//         <button onClick={() => setActiveVideo('original')}>Original</button>
//         <button onClick={() => setActiveVideo('optimized')}>Optimized</button>

//         <button onClick={handleToggle}>
//           Toggle A/B
//         </button>

//         <button onClick={handlePlayPause}>
//           {isPlaying ? 'Pause' : 'Play'}
//         </button>

//         <button onClick={() => handleFrameStep(-1)}>
//           Previous frame
//         </button>

//         <button onClick={() => handleFrameStep(1)}>
//           Next frame
//         </button>        

//         <label>
//           FPS
//           <input
//             type="number"
//             min={1}
//             max={240}
//             value={frameRate}
//             onChange={(event) => setFrameRate(Number(event.target.value))}
//           />
//         </label>        

//         <strong>Showing: {activeVideo}</strong>
//       </div>

//       <div className="timeline">
//         <input
//           type="range"
//           min={0}
//           max={duration}
//           step={0.01}
//           value={currentTime}
//           onChange={(event) => handleSeek(Number(event.target.value))}
//         />

//         <span>
//           {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
//         </span>
//       </div>

//       <div className="viewport">
//         <video
//           ref={originalRef}
//           className={activeVideo === 'original' ? 'video visible' : 'video hidden'}
//           src={originalVideo}
//           preload="auto"
//           muted
//           onLoadedMetadata={(event) => {
//             handleLoadedMetadata(event, 'original');
//           }}
//           onTimeUpdate={handleTimeUpdate}
//         />

//         <video
//           ref={optimizedRef}
//           className={activeVideo === 'optimized' ? 'video visible' : 'video hidden'}
//           src={optimizedVideo}
//           preload="auto"
//           muted
//           onLoadedMetadata={(event) => {
//             handleLoadedMetadata(event, 'optimized');
//           }}
//         />
//       </div>
//     </main>
//   );
// }

// export default App;


// This version adds play/pause and seek controls that affect both videos simultaneously, allowing for a more direct comparison of the two videos at any given moment.

// import { useRef, useState } from 'react';
// import './App.css';

// import originalVideo from './assets/videos/demo-original.mp4';
// import optimizedVideo from './assets/videos/demo-optimized.mp4';

// type ActiveVideo = 'original' | 'optimized';

// function App() {

//   const originalRef = useRef<HTMLVideoElement | null>(null);
//   const optimizedRef = useRef<HTMLVideoElement | null>(null);

//   const [activeVideo, setActiveVideo] = useState<ActiveVideo>('original');
//   const [isPlaying, setIsPlaying] = useState(false);

//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);

//   const getVideos = () => {
//     return [originalRef.current, optimizedRef.current].filter(
//       (video): video is HTMLVideoElement => video !== null
//     );
//   };
  
//   const handlePlayPause = async () => {
//     const videos = getVideos();

//     if (isPlaying) {
//       const active = activeVideo === 'original'
//         ? originalRef.current
//         : optimizedRef.current;

//       if (!active) return;

//       const time = Math.min(active.currentTime + 0.001, duration);

//       videos.forEach((video) => {
//         video.pause();
//         video.currentTime = time;
//       });

//       setCurrentTime(time);
//       setIsPlaying(false);
//       return;
//     }    

//     await Promise.all(videos.map((video) => video.play()));
//     setIsPlaying(true);
//   };

//   const handleSeek = (time: number) => {
//     getVideos().forEach((video) => {
//       video.currentTime = time;
//     });

//     setCurrentTime(time);
//   };  

//   return (
//     <main className="app">
//       <h1>Video Compare</h1>

//       <div className="toolbar">
//         <button onClick={() => setActiveVideo('original')}>Original</button>
//         <button onClick={() => setActiveVideo('optimized')}>Optimized</button>

//         <button
//           onClick={() =>
//             setActiveVideo((current) =>
//               current === 'original' ? 'optimized' : 'original'
//             )
//           }
//         >
//           Toggle A/B
//         </button>

//         <button onClick={handlePlayPause}>
//           {isPlaying ? 'Pause' : 'Play'}
//         </button>

//         <strong>Showing: {activeVideo}</strong>
//       </div>

//       <div className="timeline">
//         <input
//           type="range"
//           min={0}
//           max={duration}
//           step={0.01}
//           value={currentTime}
//           onChange={(event) => handleSeek(Number(event.target.value))}
//         />

//         <span>
//           {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
//         </span>
//       </div>      

//       <div className="viewport">
//         <video
//           ref={originalRef}
//           className={activeVideo === 'original' ? 'video visible' : 'video hidden'}
//           src={originalVideo}
//           preload="auto"
//           muted
//           onLoadedMetadata={(event) => {
//             setDuration(event.currentTarget.duration);
//           }}
//           onTimeUpdate={(event) => {
//             if (event.currentTarget === originalRef.current) {
//               setCurrentTime(event.currentTarget.currentTime);
//             }
//           }}          
//         />

//         <video
//           ref={optimizedRef}
//           className={activeVideo === 'optimized' ? 'video visible' : 'video hidden'}
//           src={optimizedVideo}
//           preload="auto"
//           muted
//           onLoadedMetadata={(event) => {
//             setDuration(event.currentTarget.duration);
//           }}         
//         />
//       </div>
//     </main>
//   );
// }

// export default App;


// Previous version without play/pause and seek controls:

// import { useState } from 'react';
// import './App.css';

// import originalVideo from './assets/videos/demo-original.mp4';
// import optimizedVideo from './assets/videos/demo-optimized.mp4';

// type ActiveVideo = 'original' | 'optimized';

// function App() {
//   const [activeVideo, setActiveVideo] = useState<ActiveVideo>('original');

//   return (
//     <main className="app">
//       <h1>Video Compare</h1>

//       <div className="toolbar">
//         <button onClick={() => setActiveVideo('original')}>
//           Original
//         </button>

//         <button onClick={() => setActiveVideo('optimized')}>
//           Optimized
//         </button>

//         <button
//           onClick={() =>
//             setActiveVideo((current) =>
//               current === 'original' ? 'optimized' : 'original'
//             )
//           }
//         >
//           Toggle A/B
//         </button>

//         <strong>Showing: {activeVideo}</strong>
//       </div>

//       <div className="viewport">
//         <video
//           className={activeVideo === 'original' ? 'video visible' : 'video hidden'}
//           src={originalVideo}
//           preload="auto"
//           muted
//         />

//         <video
//           className={activeVideo === 'optimized' ? 'video visible' : 'video hidden'}
//           src={optimizedVideo}
//           preload="auto"
//           muted
//         />
//       </div>
//     </main>
//   );
// }

// export default App;
// Next stage: zoom + pan.

import { useRef, useState } from 'react';
import './App.css';

// import originalVideo from './assets/videos/demo-original.mp4';
// import optimizedVideo from './assets/videos/demo-optimized.mp4';

// const originalVideo =
//   'https://video-compare.media-storage.us-west.qencode.com/demo-original.mp4';

// const optimizedVideo =
//   'https://video-compare.media-storage.us-west.qencode.com/demo-optimized.mp4';


type ActiveVideo = 'original' | 'optimized';

function App() {

  // const [originalVideoUrl, setOriginalVideoUrl] = useState(
  //   'https://video-compare.media-storage.us-west.qencode.com/demo-original.mp4'
  // );

  // const [optimizedVideoUrl, setOptimizedVideoUrl] = useState(
  //   'https://video-compare.media-storage.us-west.qencode.com/demo-optimized.mp4'
  // );

  const defaultOriginalUrl =
    'https://video-compare.media-storage.us-west.qencode.com/demo-original.mp4';

  const defaultOptimizedUrl =
    'https://video-compare.media-storage.us-west.qencode.com/demo-optimized.mp4';

  const [originalInputUrl, setOriginalInputUrl] = useState(defaultOriginalUrl);
  const [optimizedInputUrl, setOptimizedInputUrl] = useState(defaultOptimizedUrl);

  const [originalVideoUrl, setOriginalVideoUrl] = useState(defaultOriginalUrl);
  const [optimizedVideoUrl, setOptimizedVideoUrl] = useState(defaultOptimizedUrl);  

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
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
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
  };

  const handleLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>,
    videoType: ActiveVideo
  ) => {
    const video = event.currentTarget;

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
    setZoom((current) => Math.min(current + 0.25, 8));
  };

  const handleZoomOut = () => {
    setZoom((current) => Math.max(current - 0.25, 1));
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
    getVideos().forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });

    setIsPlaying(false);
    setCurrentTime(0);
    setActiveVideo('original');

    setOriginalVideoUrl(originalInputUrl);
    setOptimizedVideoUrl(optimizedInputUrl);
  };  

  return (
    <main className="app">
      <h1>Video Compare</h1>

      {/* <div className="url-inputs">
        <div>
          <label htmlFor="original-url">Original Video URL</label>
          <input
            id="original-url"
            type="text"
            value={originalVideoUrl}
            onChange={(event) => setOriginalVideoUrl(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="optimized-url">Optimized Video URL</label>
          <input
            id="optimized-url"
            type="text"
            value={optimizedVideoUrl}
            onChange={(event) => setOptimizedVideoUrl(event.target.value)}
          />
        </div>
      </div>       */}

      <div className="url-inputs">
        <label>
          Original URL
          <input
            value={originalInputUrl}
            onChange={(event) => setOriginalInputUrl(event.target.value)}
          />
        </label>

        <label>
          Optimized URL
          <input
            value={optimizedInputUrl}
            onChange={(event) => setOptimizedInputUrl(event.target.value)}
          />
        </label>

        <button onClick={handleLoadVideos}>Load videos</button>
      </div>      

      <div className="toolbar">
        <button onClick={() => setActiveVideo('original')}>Original</button>
        <button onClick={() => setActiveVideo('optimized')}>Optimized</button>

        <button onClick={handleToggle}>
          Toggle A/B
        </button>

        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button onClick={() => handleFrameStep(-1)}>
          Previous frame
        </button>

        <button onClick={() => handleFrameStep(1)}>
          Next frame
        </button>        

        <label>
          FPS
          <input
            type="number"
            min={1}
            max={240}
            value={frameRate}
            onChange={(event) => setFrameRate(Number(event.target.value))}
          />
        </label>        

        <button onClick={handleZoomOut}>Zoom out</button>
        <button onClick={handleZoomIn}>Zoom in</button>
        <button onClick={handleResetView}>Reset view</button>        

        <strong>Showing: {activeVideo}</strong>
      </div>

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
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
      </div>

      <div 
        className="viewport"

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
            className={activeVideo === 'original' ? 'video visible' : 'video hidden'}
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
            className={activeVideo === 'optimized' ? 'video visible' : 'video hidden'}
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
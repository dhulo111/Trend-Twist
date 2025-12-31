import React, { useEffect, useRef, useState, useCallback } from "react";
import { fabric } from "fabric";
import { searchMusic } from "../../../api/musicApi";
import {
  IoText,
  IoMusicalNotes,
  IoCloseOutline,
  IoColorFill,
  IoBrushOutline,
  IoTrash,
  IoDownloadOutline,
  IoHappyOutline,
  IoContrastOutline,
  IoTextOutline,
  IoMove,
  IoCheckmark,
  IoSearchOutline,
  IoPlay,
  IoTimeOutline,
  IoCalendarOutline,
  IoScan,
  IoFlash,
  IoLayers,
  IoGridOutline,
  IoChevronDown,
  IoCutOutline,
  IoVideocam
} from "react-icons/io5";

// --- Constants & Assets ---
const EDITOR_FONTS = [
  { name: "Classic", value: "Inter", css: "font-sans" },
  { name: "Modern", value: "Playfair Display", css: "font-serif" },
  { name: "Neon", value: "Courier New", css: "font-mono" },
  { name: "Typewriter", value: "Merriweather", css: "font-serif" },
  { name: "Cursive", value: "cursive", css: "font-cursive" },
  { name: "Bold", value: "Impact", css: "font-sans font-black" },
];

const STICKERS = ["❤️", "🔥", "😂", "⭐", "✨", "💯", "😍", "👍", "🎉", "🍕", "🍔", "🎵", "📍", "👋", "🚀", "💡", "🌈", "🦋"];

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"
];

const FILTER_TYPES = ['none', 'vintage', 'bw', 'warm', 'cool', 'technicolor', 'kodachrome'];

// --- Helper Components ---
const IconButton = ({ icon: Icon, onClick, className, size = "w-6 h-6", active, label }) => (
  <button
    onClick={onClick}
    className={`group relative p-3 rounded-full transition-all duration-300 flex items-center justify-center shrink-0 ${active
      ? "bg-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
      : "bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10"
      } ${className}`}
  >
    <Icon className={size} />
    {label && (
      <span className="absolute -bottom-8 bg-black/80 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
        {label}
      </span>
    )}
  </button>
);

const ToolbarContainer = ({ children, className }) => (
  <div className={`absolute left-0 right-0 p-4 z-[100] flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300 ${className}`}>
    <div className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl">
      {children}
    </div>
  </div>
);

// --- Main Component ---
const ReelEditor = ({ mediaFile, initialJson, initialMetadata, onNext, onCancel }) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(new Audio());
  const videoRef = useRef(null); // Reference to html video tag
  const [ready, setReady] = useState(false);

  // Tools
  const [activeTool, setActiveTool] = useState("none");
  const [musicStep, setMusicStep] = useState("search");

  // State
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicTheme, setMusicTheme] = useState("card");
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimRange, setTrimRange] = useState({ start: 0, end: 15 });

  const [textOptions, setTextOptions] = useState({
    font: "Inter", color: "#ffffff", bgColor: "transparent", stroke: false, neon: false, align: "center",
  });

  const [drawOptions, setDrawOptions] = useState({
    color: "#ffffff", width: 5, neon: false,
  });

  const [filterType, setFilterType] = useState("none");
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);

  const historyRef = useRef([]);
  const isRestoringRef = useRef(false);
  const overlayInputRef = useRef(null);
  const [mediaURL] = useState(mediaFile ? URL.createObjectURL(mediaFile) : null);

  // Restore Metadata from Draft
  useEffect(() => {
    if (initialMetadata) {
      if (initialMetadata.trim) {
        setTrimRange(initialMetadata.trim);
      }
      if (initialMetadata.filter) {
        setFilterType(initialMetadata.filter);
      }
      if (initialMetadata.music) {
        setSelectedMusic(initialMetadata.music);
      }
    }
  }, [initialMetadata]);

  // Audio Sync Effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (selectedMusic) {
      // Only update src if changed to avoid reloading
      if (audio.src !== selectedMusic.previewUrl) {
        audio.src = selectedMusic.previewUrl;
        audio.volume = 0.5;
        audio.loop = true;
      }
      // Attempt to play
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Audio autoplay prevented:", error);
        });
      }
    } else {
      audio.pause();
      audio.src = "";
    }
  }, [selectedMusic]);

  // Cleanup Audio on Unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);


  // Initialize Fabric (Transparent on top)
  useEffect(() => {
    if (!wrapperRef.current) return;
    const initW = 360;
    const initH = 640;
    const c = new fabric.Canvas("fabric-canvas", {
      width: initW, height: initH,
      preserveObjectStacking: true,
      backgroundColor: "transparent", // Transparent for filtering video below
      selectionColor: "rgba(255, 255, 255, 0.1)",
      enableRetinaScaling: true,
    });
    // Fabric Config
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = "#ffffff";
    fabric.Object.prototype.cornerStyle = "circle";
    fabric.Object.prototype.borderColor = "rgba(255,255,255,0.6)";

    canvasRef.current = c;
    setReady(true);

    if (initialJson) {
      c.loadFromJSON(initialJson, () => {
        c.setBackgroundColor('transparent', () => {
          c.renderAll();
        });
      });
    }

    return () => { c.dispose(); canvasRef.current = null; };
  }, [initialJson]);

  // Responsive Resize
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!c || !wrapper) return;

      const wrapperWidth = wrapper.clientWidth || 360;
      const width = Math.min(450, wrapperWidth);
      const height = Math.round((width * 16) / 9); // 9:16 aspect ratio

      const scaleX = width / c.getWidth();

      c.getObjects().forEach((obj) => {
        obj.scaleX = (obj.scaleX || 1) * scaleX;
        obj.scaleY = (obj.scaleY || 1) * scaleX;
        obj.left = obj.left * scaleX;
        obj.top = obj.top * scaleX;
        obj.setCoords();
      });
      c.setWidth(width);
      c.setHeight(height);
      c.renderAll();
    };
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [ready]);

  const pushHistorySnapshot = useCallback((cArg) => {
    const c = cArg || canvasRef.current;
    if (!c || isRestoringRef.current) return;
    try {
      const json = c.toJSON(["selectable", "evented", "id", "stroke", "strokeWidth", "shadow"]);
      historyRef.current.push(json);
      if (historyRef.current.length > 30) historyRef.current.shift();
    } catch (e) { console.error("History error", e); }
  }, []);

  // Video Load Metadata
  const handleVideoLoadedMetadata = (e) => {
    setVideoDuration(e.target.duration);
    // Only verify default if NOT restored from draft
    if (!initialMetadata?.trim) {
      setTrimRange({ start: 0, end: e.target.duration });
    }
  };

  // Trimming Loop Logic
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const checkTime = () => {
      if (v.currentTime < trimRange.start) v.currentTime = trimRange.start;
      if (v.currentTime >= trimRange.end) {
        v.currentTime = trimRange.start;
        v.play();
      }
      requestAnimationFrame(checkTime);
    };
    const handle = requestAnimationFrame(checkTime);
    return () => cancelAnimationFrame(handle);
  }, [trimRange]);

  // Overlay Logic
  const handleAddText = () => {
    const c = canvasRef.current;
    if (!c) return;
    const text = new fabric.Textbox("Type...", {
      left: c.getWidth() / 2, top: c.getHeight() / 2,
      originX: 'center', originY: 'center', width: 200, fontSize: 36,
      fill: textOptions.color, fontFamily: textOptions.font,
      backgroundColor: textOptions.bgColor !== 'transparent' ? textOptions.bgColor : '',
      textAlign: 'center',
      shadow: textOptions.neon ? new fabric.Shadow({ color: textOptions.color, blur: 20 }) : null,
      stroke: textOptions.stroke ? '#000000' : null,
      strokeWidth: textOptions.stroke ? 1 : 0,
    });
    c.add(text);
    c.setActiveObject(text);
    setActiveTool("text");
    pushHistorySnapshot(c);
  };

  const updateTextProp = (key, value) => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (obj) {
      if (key === 'neon') {
        obj.set('shadow', value ? new fabric.Shadow({ color: obj.fill, blur: 25 }) : null);
      } else if (key === 'stroke') {
        obj.set({ stroke: value ? '#000000' : null, strokeWidth: value ? 2 : 0 });
      } else if (key === 'backgroundColor') {
        obj.set(key, value === 'transparent' ? '' : value);
      } else {
        obj.set(key, value);
      }
      c.renderAll();
      pushHistorySnapshot(c);
    }
  };

  const toggleDrawingMode = (enable) => {
    const c = canvasRef.current;
    if (!c) return;
    c.isDrawingMode = enable;
    if (enable) {
      c.freeDrawingBrush = new fabric.PencilBrush(c);
      c.freeDrawingBrush.color = drawOptions.color;
      c.freeDrawingBrush.width = drawOptions.width;
      if (drawOptions.neon) {
        c.freeDrawingBrush.shadow = new fabric.Shadow({ blur: 15, color: drawOptions.color });
      }
    }
  };

  // Sticker Logic
  const handleAddSticker = (emoji) => {
    const c = canvasRef.current;
    if (!c) return;
    const text = new fabric.Text(emoji, {
      left: c.getWidth() / 2, top: c.getHeight() / 2,
      originX: 'center', originY: 'center', fontSize: 80,
      selectable: true
    });
    c.add(text);
    c.setActiveObject(text);
    setActiveTool("none");
    pushHistorySnapshot(c);
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (c) {
      c.clear();
      c.backgroundColor = "transparent";
      pushHistorySnapshot(c);
    }
  };

  const handleDeleteObject = () => {
    const c = canvasRef.current;
    const activeObj = c?.getActiveObject();
    if (activeObj) {
      c.remove(activeObj);
      c.discardActiveObject();
      c.renderAll();
      setActiveTool('none');
      pushHistorySnapshot(c);
    }
  };

  // Selection Handling
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const handleSelection = (e) => {
      const obj = e.selected ? e.selected[0] : c.getActiveObject();
      if (!obj) return;

      if (obj.type === 'textbox') {
        setActiveTool('text');
        // Sync State
        const matchedFont = EDITOR_FONTS.find(f => f.value === obj.fontFamily) || EDITOR_FONTS[0];
        setTextOptions({
          font: matchedFont.name,
          color: obj.fill,
          bgColor: obj.backgroundColor === '' ? 'transparent' : obj.backgroundColor,
          stroke: !!obj.stroke,
          neon: !!obj.shadow,
          align: obj.textAlign
        });
      } else if (obj.type === 'text') {
        // Sticker
        setActiveTool('sticker_edit');
      }
    };

    const handleCleared = () => {
      if (activeTool === 'text' || activeTool === 'sticker_edit') {
        setActiveTool('none');
      }
    };

    c.on('selection:created', handleSelection);
    c.on('selection:updated', handleSelection);
    c.on('selection:cleared', handleCleared);

    return () => {
      c.off('selection:created', handleSelection);
      c.off('selection:updated', handleSelection);
      c.off('selection:cleared', handleCleared);
    };
  }, [ready]);

  // Music
  const handleSearchMusic = async (e) => {
    e.preventDefault();
    if (!musicQuery.trim()) return;
    setIsSearchingMusic(true);
    const results = await searchMusic(musicQuery);
    setMusicResults(results);
    setIsSearchingMusic(false);
  };

  const selectMusicTrack = (track) => {
    setSelectedMusic(track);
  };

  const applyMusicSticker = (theme) => {
    const c = canvasRef.current;
    if (!c || !selectedMusic) return;
    c.getObjects().forEach(o => { if (o.id === 'music-tag') c.remove(o); });

    if (theme === 'card') {
      fabric.Image.fromURL(selectedMusic.coverUrl, (img) => {
        if (!img) return;
        img.set({ width: 80, height: 80, clipPath: new fabric.Circle({ radius: 40, originX: 'center', originY: 'center' }) });
        const bg = new fabric.Rect({ width: 220, height: 90, fill: 'rgba(0,0,0,0.6)', rx: 15, ry: 15, originX: 'center', originY: 'center' });
        const text = new fabric.Text(selectedMusic.title, { fill: 'white', fontSize: 16, fontFamily: 'Inter', top: -10, originX: 'center', originY: 'center' });
        const artist = new fabric.Text(selectedMusic.artist, { fill: 'gray', fontSize: 12, top: 15, originX: 'center', originY: 'center' });
        const group = new fabric.Group([bg, img, text, artist], { left: c.getWidth() / 2, top: c.getHeight() / 2, originX: 'center', originY: 'center', id: 'music-tag' });
        // Layout fix
        img.set({ left: -70, top: 0 });
        text.set({ left: 10 });
        artist.set({ left: 10 });
        c.add(group);
      }, { crossOrigin: 'anonymous' });
    }
  };

  // Filters (Applied via CSS class on video element)
  const getFilterClass = (type) => {
    switch (type) {
      case 'vintage': return 'sepia contrast-125 brightness-90';
      case 'bw': return 'grayscale contrast-125';
      case 'warm': return 'sepia-[.5] hue-rotate-[-15deg] contrast-100';
      case 'cool': return 'hue-rotate-[180deg] sepia-[.2] contrast-100';
      case 'technicolor': return 'saturate-[1.5] contrast-125';
      default: return '';
    }
  };

  const handleFinish = () => {
    const c = canvasRef.current;
    c.discardActiveObject();
    c.renderAll();
    const json = c.toJSON(["selectable", "evented", "id", "stroke", "strokeWidth", "shadow"]);

    // Metadata
    const metadata = {
      filter: filterType,
      trim: trimRange,
      music: selectedMusic ? { ...selectedMusic, theme: musicTheme } : null,
      duration: trimRange.end - trimRange.start
    };

    onNext(mediaFile, json, metadata);
  };

  // --- RENDER ---
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none bg-black">
      <div ref={wrapperRef} className="relative w-full h-full md:max-w-[420px] md:h-auto md:aspect-[9/16] bg-black overflow-hidden md:shadow-2xl md:rounded-3xl md:border border-white/10 shrink-0">

        {/* Layer 1: Video Background */}
        <video
          ref={videoRef}
          src={mediaURL}
          className={`absolute inset-0 w-full z-0 h-full object-contain pointer-events-none ${getFilterClass(filterType)}`}
          loop
          muted={!!selectedMusic} // Only mute original video if we have selected a music track
          playsInline
          autoPlay
          onLoadedMetadata={handleVideoLoadedMetadata}
        />

        {/* Layer 2: Canvas Overlay */}
        <div className="absolute inset-0 z-10">
          <canvas id="fabric-canvas" className="w-full h-full" />
        </div>

        {/* Layer 3: UI Controls */}

        {/* Top Bar */}
        {/* Top Bar */}
        {/* Top Bar (Contextual Tools Only) */}
        {["text", "draw", "filter", "sticker_edit"].includes(activeTool) && (
          <div className="absolute top-0 inset-x-0 p-4 pt-12 md:pt-6 flex justify-between items-start z-[100] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="w-full flex justify-between items-center">
              <button
                onClick={handleDeleteObject}
                className="bg-red-500/80 p-2 rounded-full text-white backdrop-blur-md hover:bg-red-600 transition shadow-lg pointer-events-auto"
              >
                <IoTrash size={20} />
              </button>
              <button onClick={() => { setActiveTool('none'); toggleDrawingMode(false); const c = canvasRef.current; if (c) c.discardActiveObject(); c?.requestRenderAll(); }} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-bold shadow-lg pointer-events-auto">
                <IoCheckmark /> Done
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar (Main View) */}
        {activeTool === 'none' && (
          <div className="absolute bottom-0 inset-x-0 p-6 pb-20 md:pb-8 flex justify-between items-center z-[100] bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
            <button onClick={onCancel} className="bg-white/10 p-3 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition pointer-events-auto border border-white/10">
              <IoCloseOutline size={28} />
            </button>
            <button onClick={handleFinish} className="px-8 py-3 bg-cyan-500 text-black font-bold text-lg rounded-full shadow-lg hover:brightness-110 pointer-events-auto active:scale-95 transition-transform">
              Next
            </button>
          </div>
        )}

        {/* Side Menu Tools */}
        {activeTool === 'none' && (
          <div className="absolute right-4 top-20 flex flex-col gap-4 z-[100] animate-in slide-in-from-right-10">
            {[
              { id: 'music', icon: IoMusicalNotes, action: () => setActiveTool('music'), label: 'Audio' },
              { id: 'text', icon: IoTextOutline, action: handleAddText, label: 'Text' },
              { id: 'draw', icon: IoBrushOutline, action: () => { setActiveTool('draw'); toggleDrawingMode(true); }, label: 'Draw' },
              { id: 'sticker', icon: IoHappyOutline, action: () => setActiveTool('sticker_menu'), label: 'Sticker' },
              { id: 'filter', icon: IoContrastOutline, action: () => setActiveTool('filter'), label: 'Effects' },
              { id: 'trim', icon: IoCutOutline, action: () => setActiveTool('trim'), label: 'Trim' },
            ].map(t => (
              <div key={t.id} className="flex flex-col items-center gap-1 group">
                <button onClick={t.action} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 hover:scale-110 transition-all shadow-lg">
                  <t.icon size={24} />
                </button>
                <span className="text-[10px] font-bold text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity absolute right-14 bg-black/80 px-2 py-1 rounded">{t.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Trimming UI: Uses ToolbarContainer (z-[100]) */}
        {activeTool === 'trim' && (
          <ToolbarContainer className="bottom-0">
            <h3 className="text-white mb-3 text-center font-bold text-sm uppercase tracking-wider">Trim Video</h3>
            <div className="relative h-16 w-full bg-gray-800 rounded-lg overflow-hidden border border-white/20 select-none">

              {/* Filmstrip Background Look */}
              <div className="absolute inset-0 flex opacity-50 pointer-events-none">
                <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-30"></div>
                <div className="w-full h-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 opacity-50"></div>
              </div>

              {/* Selected Range Highlight */}
              <div
                className="absolute top-0 bottom-0 bg-yellow-400/30 border-x-4 border-yellow-400 z-10 cursor-move pointer-events-none"
                style={{
                  left: `${(trimRange.start / videoDuration) * 100}%`,
                  right: `${100 - (trimRange.end / videoDuration) * 100}%`
                }}
              />

              {/* Slider Inputs */}
              <input
                type="range"
                min="0" max={videoDuration} step="0.1"
                value={trimRange.start}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), trimRange.end - 1);
                  setTrimRange(p => ({ ...p, start: val }));
                }}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-col-resize appearance-none pointer-events-auto"
                style={{ zIndex: 20 }}
              />
              <input
                type="range"
                min="0" max={videoDuration} step="0.1"
                value={trimRange.end}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), trimRange.start + 1);
                  setTrimRange(p => ({ ...p, end: val }));
                }}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-col-resize appearance-none pointer-events-auto"
                style={{ zIndex: 21 }}
              />

              {/* Time Indicators */}
              <span className="absolute left-2 bottom-1 text-[10px] font-mono text-white bg-black/50 px-1 rounded pointer-events-none z-30">{trimRange.start.toFixed(1)}s</span>
              <span className="absolute right-2 bottom-1 text-[10px] font-mono text-white bg-black/50 px-1 rounded pointer-events-none z-30">{trimRange.end.toFixed(1)}s</span>
            </div>
            <p className="text-center text-xs text-white/50 mt-2">Drag ends to trim</p>
          </ToolbarContainer>
        )}

        {/* Text Toolbar */}
        {activeTool === 'text' && (
          <ToolbarContainer className="bottom-24 md:bottom-28">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2">
              {EDITOR_FONTS.map((font) => (
                <button
                  key={font.name}
                  onClick={() => {
                    setTextOptions(prev => ({ ...prev, font: font.name }));
                    updateTextProp('fontFamily', font.value);
                  }}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs border transition-all ${textOptions.font === font.name
                    ? "bg-white text-black border-white"
                    : "bg-black/40 text-white border-white/20 hover:bg-black/60"}`}
                >
                  <span className={font.css}>{font.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              {COLORS.slice(0, 7).map(c => (
                <button key={c} onClick={() => { setTextOptions(p => ({ ...p, color: c })); updateTextProp('fill', c); }} className={`w-8 h-8 rounded-full border-2 ${textOptions.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
              <button onClick={() => {
                const n = !textOptions.neon; setTextOptions(p => ({ ...p, neon: n })); updateTextProp('neon', n);
              }} className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center ${textOptions.neon ? 'bg-fuchsia-500 text-white' : 'bg-black/50 text-white'}`}>
                <IoFlash size={14} />
              </button>
            </div>
          </ToolbarContainer>
        )}

        {/* Draw Toolbar */}
        {activeTool === 'draw' && (
          <ToolbarContainer className="bottom-24 md:bottom-28">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white text-xs font-bold uppercase">Brush Tools</span>
              <button onClick={() => {
                const c = canvasRef.current;
                // Simple clear or clear logic
                if (c) { c.isDrawingMode = false; c.getObjects().forEach(o => { if (o.type === 'path') c.remove(o) }); c.isDrawingMode = true; }
              }} className="text-xs text-red-400 uppercase font-bold hover:underline">Clear Ink</button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-white text-xs font-bold uppercase">Size</span>
              <input type="range" min="1" max="40" value={drawOptions.width} onChange={e => {
                const w = Number(e.target.value);
                setDrawOptions(p => ({ ...p, width: w }));
                if (canvasRef.current && canvasRef.current.freeDrawingBrush) {
                  canvasRef.current.freeDrawingBrush.width = w;
                }
              }} className="flex-1 accent-white" />
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => {
                  setDrawOptions(p => ({ ...p, color: c }));
                  if (canvasRef.current && canvasRef.current.freeDrawingBrush) {
                    canvasRef.current.freeDrawingBrush.color = c;
                  }
                }} className={`w-8 h-8 rounded-full border-2 ${drawOptions.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
              <button onClick={() => {
                const n = !drawOptions.neon;
                setDrawOptions(p => ({ ...p, neon: n }));
                if (canvasRef.current && canvasRef.current.freeDrawingBrush) {
                  canvasRef.current.freeDrawingBrush.shadow = n ? new fabric.Shadow({ blur: 15, color: drawOptions.color }) : null;
                }
              }} className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center ${drawOptions.neon ? 'bg-fuchsia-500 text-white' : 'bg-black/50 text-white'}`}>
                <IoFlash size={14} />
              </button>
            </div>
          </ToolbarContainer>
        )}

        {/* Sticker Menu (New) */}
        {activeTool === 'sticker_menu' && (
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-black/95 backdrop-blur-xl z-[100] p-6 rounded-t-3xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between mb-6">
              <h3 className="text-white font-bold text-xl">Stickers</h3>
              <button onClick={() => setActiveTool('none')} className="bg-white/10 p-2 rounded-full text-white"><IoChevronDown /></button>
            </div>
            <div className="grid grid-cols-5 gap-4 overflow-y-auto max-h-60 no-scrollbar">
              {STICKERS.map((s, i) => (
                <button key={i} onClick={() => handleAddSticker(s)} className="text-4xl hover:scale-125 transition-transform">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Music Drawer */}
        {activeTool === 'music' && (
          <div className="absolute inset-x-0 bottom-0 top-20 bg-black/95 backdrop-blur-xl z-[100] p-6 rounded-t-3xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between mb-6">
              <h3 className="text-white font-bold text-xl">Select Audio</h3>
              <button onClick={() => setActiveTool('none')} className="bg-white/10 p-2 rounded-full text-white"><IoChevronDown /></button>
            </div>
            <form onSubmit={handleSearchMusic} className="relative mb-6">
              <IoSearchOutline className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                className="w-full bg-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-gray-500 font-medium focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                placeholder="Search for songs, artists..."
                value={musicQuery}
                onChange={e => setMusicQuery(e.target.value)}
                autoFocus
              />
            </form>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pb-10">
              {musicResults.map(track => (
                <div key={track.id} onClick={() => { selectMusicTrack(track); applyMusicSticker('card'); setActiveTool('none'); }} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group">
                  <img src={track.coverUrl} className="w-14 h-14 rounded-xl shadow-lg group-hover:scale-105 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{track.title}</p>
                    <p className="text-white/60 text-sm truncate">{track.artist}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transition-opacity">
                    <IoPlay className="ml-0.5" />
                  </div>
                </div>
              ))}
              {musicResults.length === 0 && !isSearchingMusic && <div className="text-center text-gray-500 mt-10">Search for your favorite music</div>}
            </div>
          </div>
        )}

        {/* Filter UI */}
        {activeTool === 'filter' && (
          <div className="absolute bottom-24 md:bottom-28 left-0 right-0 overflow-x-auto no-scrollbar px-4 flex gap-4 pb-4 z-[100]">
            {FILTER_TYPES.map(f => (
              <button key={f} onClick={() => setFilterType(f)} className={`flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 relative group transition-all transform hover:scale-105 ${filterType === f ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-white/20'}`}>
                <div className={`w-full h-full bg-gray-800 ${getFilterClass(f)}`}>
                  {/* We use checking pattern or simple color to represent filter, since we can't easily snapshot video in button */}
                  <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${mediaURL})` }} />
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm text-white text-[9px] py-1.5 text-center font-bold uppercase tracking-widest">
                  {f}
                </div>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ReelEditor;

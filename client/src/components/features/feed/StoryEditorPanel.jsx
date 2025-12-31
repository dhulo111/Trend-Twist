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
  IoChevronDown
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
  "#ffffff", // White
  "#000000", // Black
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#f43f5e", // Rose
];

const GRADIENTS = [
  { name: "Sunset", start: "#f97316", end: "#db2777" },
  { name: "Ocean", start: "#06b6d4", end: "#3b82f6" },
  { name: "Forest", start: "#22c55e", end: "#065f46" },
  { name: "Midnight", start: "#4c1d95", end: "#1e1b4b" },
  { name: "Cyber", start: "#d946ef", end: "#8b5cf6" },
  { name: "Gold", start: "#fbbf24", end: "#b45309" },
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
  <div className={`absolute left-0 right-0 p-4 z-50 flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300 ${className}`}>
    <div className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl">
      {children}
    </div>
  </div>
);

// --- Main Component ---

const FabricStoryEditor = ({ mediaFile, selectedMusic, setSelectedMusic, onPublish }) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(new Audio());
  const [ready, setReady] = useState(false);

  // Tools
  const [activeTool, setActiveTool] = useState("none");
  const [musicStep, setMusicStep] = useState("search");
  const [musicTheme, setMusicTheme] = useState("card");
  const [storyDuration, setStoryDuration] = useState(15);

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

  useEffect(() => {
    if (!wrapperRef.current) return;
    const initW = 360;
    const initH = 640;
    const c = new fabric.Canvas("fabric-canvas", {
      width: initW, height: initH,
      preserveObjectStacking: true,
      backgroundColor: "#1a1a1a",
      selectionColor: "rgba(255, 255, 255, 0.1)",
      selectionBorderColor: "rgba(255, 255, 255, 0.3)",
      selectionLineWidth: 1,
      enableRetinaScaling: true,
    });
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = "#ffffff";
    fabric.Object.prototype.cornerStyle = "circle";
    fabric.Object.prototype.borderColor = "rgba(255,255,255,0.6)";
    fabric.Object.prototype.cornerStrokeColor = "#cccccc";
    fabric.Object.prototype.padding = 8;
    fabric.Object.prototype.controls.mtr.offsetY = -25;
    fabric.Object.prototype.controls.mtr.cursorStyle = 'pointer';
    canvasRef.current = c;
    setReady(true);
    pushHistorySnapshot(c);
    return () => { c.dispose(); canvasRef.current = null; };
  }, []);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!c || !wrapper) return;
      const wrapperWidth = wrapper.clientWidth || 360;
      const width = Math.min(450, wrapperWidth);
      const height = Math.round((width * 16) / 9);
      const scaleX = width / c.getWidth();
      const scaleY = height / c.getHeight();
      c.getObjects().forEach((obj) => {
        obj.scaleX = (obj.scaleX || 1) * scaleX;
        obj.scaleY = (obj.scaleY || 1) * scaleY;
        obj.left = obj.left * scaleX;
        obj.top = obj.top * scaleY;
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

  useEffect(() => {
    const audio = audioRef.current;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  const pushHistorySnapshot = useCallback((cArg) => {
    const c = cArg || canvasRef.current;
    if (!c || isRestoringRef.current) return;
    try {
      const json = c.toJSON(["selectable", "evented", "_isBackground", "_isVideoBackground", "id", "stroke", "strokeWidth", "shadow"]);
      historyRef.current.push(json);
      if (historyRef.current.length > 30) historyRef.current.shift();
    } catch (e) { console.error("History error", e); }
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const handler = () => pushHistorySnapshot(c);
    c.on("object:added", handler);
    c.on("object:modified", handler);
    c.on("object:removed", handler);
    c.on("path:created", handler);
    return () => {
      c.off("object:added", handler);
      c.off("object:modified", handler);
      c.off("object:removed", handler);
      c.off("path:created", handler);
    };
  }, [ready, pushHistorySnapshot]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !mediaFile) return;
    c.setBackgroundImage(null, c.renderAll.bind(c));
    c.getObjects().forEach(o => { if (o._isVideoBackground) c.remove(o); });
    if (mediaFile.type.startsWith("image")) {
      fabric.Image.fromURL(mediaURL, (img) => {
        if (!img) return;
        const scale = Math.max(c.getWidth() / img.width, c.getHeight() / img.height);
        img.set({
          originX: 'left', originY: 'top',
          left: (c.getWidth() - img.width * scale) / 2,
          top: (c.getHeight() - img.height * scale) / 2,
          scaleX: scale, scaleY: scale,
          selectable: false, evented: false,
        });
        c.setBackgroundImage(img, c.renderAll.bind(c));
        pushHistorySnapshot(c);
      }, { crossOrigin: 'anonymous' });
    } else if (mediaFile.type.startsWith("video")) {
      const videoEl = document.createElement("video");
      videoEl.src = mediaURL;
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.crossOrigin = "anonymous";
      const onVideoLoad = () => {
        const vObj = new fabric.Image(videoEl, { left: 0, top: 0, selectable: false, evented: false });
        const scale = Math.max(c.getWidth() / videoEl.videoWidth, c.getHeight() / videoEl.videoHeight);
        vObj.scale(scale);
        vObj.set({
          left: (c.getWidth() - vObj.width * scale) / 2,
          top: (c.getHeight() - vObj.height * scale) / 2,
        });
        vObj._isVideoBackground = true;
        c.add(vObj);
        c.sendToBack(vObj);
        const animate = () => {
          if (canvasRef.current) {
            c.renderAll();
            fabric.util.requestAnimFrame(animate);
          }
        };
        animate();
        pushHistorySnapshot(c);
      };
      if (videoEl.readyState >= 2) onVideoLoad();
      else videoEl.onloadeddata = onVideoLoad;
    }
  }, [mediaFile, mediaURL, ready, pushHistorySnapshot]);

  const handleOverlayFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, (img) => {
      if (!img) return;
      const scale = Math.min((canvasRef.current.getWidth() * 0.5) / img.width, (canvasRef.current.getHeight() * 0.5) / img.height);
      img.set({
        left: canvasRef.current.getWidth() / 2,
        top: canvasRef.current.getHeight() / 2,
        originX: 'center', originY: 'center',
        scaleX: scale, scaleY: scale,
        cornerStyle: 'circle',
        transparentCorners: false,
        strokeWidth: 0,
        stroke: '#fff',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20 })
      });
      canvasRef.current.add(img);
      canvasRef.current.setActiveObject(img);
      pushHistorySnapshot(canvasRef.current);
    }, { crossOrigin: 'anonymous' });
    e.target.value = null;
  };

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
    const audio = audioRef.current;
    audio.src = track.previewUrl;
    audio.volume = 0.5;
    audio.loop = true;
    audio.play().catch(e => console.log("Autoplay prevented:", e));
    // Removed addMusicStickerToCanvas(track); - Now added after confirmation
    // setActiveTool('none'); - Wait for crop step
  };

  const addMusicStickerToCanvas = (track, theme) => {
    const c = canvasRef.current;
    if (!c || theme === 'hidden') {
      // If hidden, remove existing if any
      c?.getObjects().forEach(o => { if (o.id === 'music-tag') c.remove(o); });
      return;
    }
    c.getObjects().forEach(o => { if (o.id === 'music-tag') c.remove(o); });

    if (theme === 'card') {
      fabric.Image.fromURL(track.coverUrl, (img) => {
        if (!img) return;
        img.set({
          width: 100, height: 100,
          scaleX: 0.55, scaleY: 0.55,
          originX: 'left', originY: 'center',
          left: 10,
          clipPath: new fabric.Circle({ radius: 50, originX: 'center', originY: 'center' })
        });
        const bg = new fabric.Rect({
          width: 230, height: 64,
          fill: 'rgba(20,20,20,0.7)',
          rx: 16, ry: 16,
          originX: 'left', originY: 'center',
          stroke: 'rgba(255,255,255,0.2)',
          strokeWidth: 1.5
        });
        const title = new fabric.Text(track.title, {
          fill: 'white', fontSize: 14, fontFamily: 'Inter', fontWeight: 'bold',
          left: 75, top: -10, originX: 'left', originY: 'center', width: 140
        });
        if (title.text.length > 20) title.text = title.text.substring(0, 20) + "...";
        const artist = new fabric.Text(track.artist, {
          fill: '#cdcdcd', fontSize: 11, fontFamily: 'Inter',
          left: 75, top: 10, originX: 'left', originY: 'center'
        });
        const bar1 = new fabric.Rect({ width: 3, height: 12, fill: '#ef4444', left: 205, top: 0, rx: 1, ry: 1 });
        const bar2 = new fabric.Rect({ width: 3, height: 20, fill: '#eab308', left: 210, top: 0, rx: 1, ry: 1 });
        const bar3 = new fabric.Rect({ width: 3, height: 15, fill: '#3b82f6', left: 215, top: 0, rx: 1, ry: 1 });
        const group = new fabric.Group([bg, img, title, artist, bar1, bar2, bar3], {
          left: c.getWidth() / 2, top: c.getHeight() / 2,
          originX: 'center', originY: 'center',
          selectable: true, id: 'music-tag', subTargetCheck: false,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 20 })
        });
        c.add(group);
        c.setActiveObject(group);
        pushHistorySnapshot(c);
      }, { crossOrigin: 'anonymous' });
    } else if (theme === 'tiny') {
      const bg = new fabric.Rect({
        width: 150, height: 36,
        fill: '#ffffff',
        rx: 18, ry: 18,
        originX: 'left', originY: 'center',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 10 })
      });
      const title = new fabric.Text("🎵 " + track.title, {
        fill: 'black', fontSize: 13, fontFamily: 'Inter', fontWeight: 'bold',
        left: 15, originX: 'left', originY: 'center', width: 120
      });
      if (title.text.length > 18) title.text = title.text.substring(0, 18) + "...";
      const group = new fabric.Group([bg, title], {
        left: c.getWidth() / 2, top: c.getHeight() / 2,
        originX: 'center', originY: 'center',
        selectable: true, id: 'music-tag', subTargetCheck: false
      });
      c.add(group);
      c.setActiveObject(group);
      pushHistorySnapshot(c);
    }
  };

  const handleAddText = () => {
    const c = canvasRef.current;
    if (!c) return;
    const text = new fabric.Textbox("Type something...", {
      left: c.getWidth() / 2,
      top: c.getHeight() / 2,
      originX: 'center', originY: 'center',
      width: 250,
      fontSize: 36,
      fill: textOptions.color,
      fontFamily: textOptions.font,
      backgroundColor: textOptions.bgColor !== 'transparent' ? textOptions.bgColor : '',
      textAlign: 'center',
      splitByGrapheme: true,
      shadow: textOptions.neon ? new fabric.Shadow({ color: textOptions.color, blur: 20 }) : null,
      stroke: textOptions.stroke ? '#000000' : null,
      strokeWidth: textOptions.stroke ? 1 : 0,
      paintFirst: 'stroke'
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
      updateBrush();
    }
  };

  const updateBrush = () => {
    const c = canvasRef.current;
    if (c && c.freeDrawingBrush) {
      c.freeDrawingBrush.color = drawOptions.color;
      c.freeDrawingBrush.width = drawOptions.width;
      if (drawOptions.neon) {
        c.freeDrawingBrush.shadow = new fabric.Shadow({
          blur: 15, color: drawOptions.color, affectStroke: true
        });
      } else {
        c.freeDrawingBrush.shadow = null;
      }
    }
  };

  useEffect(() => { updateBrush(); }, [drawOptions]);

  const handleAddSticker = (emoji) => {
    const c = canvasRef.current;
    if (!c) return;
    const text = new fabric.Text(emoji, {
      left: c.getWidth() / 2, top: c.getHeight() / 2, originX: 'center', originY: 'center',
      fontSize: 80, selectable: true,
    });
    c.add(text);
    c.setActiveObject(text);
    // REMOVED setActiveTool("none"); to allow multiple stickers
    pushHistorySnapshot(c);
  };

  const handleAddDateSticker = () => {
    const c = canvasRef.current;
    if (!c) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
    const timeText = new fabric.Text(timeStr, {
      fill: 'white', fontSize: 40, fontFamily: 'Inter', fontWeight: 'bold',
      originX: 'center', originY: 'center', top: -15
    });
    const dateText = new fabric.Text(dateStr, {
      fill: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Inter', spacing: 20,
      originX: 'center', originY: 'center', top: 25
    });
    const group = new fabric.Group([timeText, dateText], {
      left: c.getWidth() / 2, top: c.getHeight() / 3,
      originX: 'center', originY: 'center',
      shadow: new fabric.Shadow({ color: 'black', blur: 10 })
    });
    c.add(group);
    c.setActiveObject(group);
    setActiveTool('none');
    pushHistorySnapshot(c);
  };

  const setGradientBackground = (gradient) => {
    const c = canvasRef.current;
    if (!c) return;
    c.setBackgroundImage(null, c.renderAll.bind(c));
    c.getObjects().forEach(o => { if (o._isVideoBackground) c.remove(o); });
    const grad = new fabric.Gradient({
      type: 'linear',
      gradientUnits: 'percentage',
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0, color: gradient.start },
        { offset: 1, color: gradient.end }
      ]
    });
    c.setBackgroundColor(grad, c.renderAll.bind(c));
    pushHistorySnapshot(c);
  };

  const applyFilter = (type) => {
    const c = canvasRef.current;
    if (!c) return;
    const bg = c.backgroundImage;
    if (!bg || !bg.filters || !(bg instanceof fabric.Image)) return;
    bg.filters = [];
    setFilterType(type);
    switch (type) {
      case 'vintage':
        bg.filters.push(new fabric.Image.filters.Sepia());
        bg.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.2 }));
        bg.filters.push(new fabric.Image.filters.Noise({ noise: 10 }));
        break;
      case 'bw':
        bg.filters.push(new fabric.Image.filters.Grayscale());
        bg.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.2 }));
        break;
      case 'warm':
        bg.filters.push(new fabric.Image.filters.BlendColor({ color: '#f97316', mode: 'tint', alpha: 0.3 }));
        break;
      case 'cool':
        bg.filters.push(new fabric.Image.filters.BlendColor({ color: '#06b6d4', mode: 'tint', alpha: 0.3 }));
        break;
      case 'technicolor':
        bg.filters.push(new fabric.Image.filters.Saturation({ saturation: 0.5 }));
        bg.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.2 }));
        break;
      case 'kodachrome':
        bg.filters.push(new fabric.Image.filters.Sepia({ mode: 0.3 }));
        bg.filters.push(new fabric.Image.filters.Saturation({ saturation: 0.2 }));
    }
    bg.applyFilters();
    c.renderAll();
    pushHistorySnapshot(c);
  };

  const handleExport = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.renderAll();
    const dataUrl = c.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
    const link = document.createElement('a');
    link.download = `story-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteActive = () => {
    const c = canvasRef.current;
    const active = c?.getActiveObjects();
    if (active?.length) {
      active.forEach(o => c.remove(o));
      c.discardActiveObject();
      c.renderAll();
      pushHistorySnapshot(c);
    }
  };

  const handleNext = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.renderAll();

    // Get JSON
    const json = c.toJSON(["selectable", "evented", "_isBackground", "_isVideoBackground", "id", "stroke", "strokeWidth", "shadow"]);

    const dataUrl = c.toDataURL({ format: 'png', quality: 0.85, multiplier: 2 });
    fetch(dataUrl).then(res => res.blob()).then(blob => {
      const file = new File([blob], "story-edited.png", { type: "image/png" });
      if (onPublish) onPublish(file, json, storyDuration);
    });
  };

  const renderTextToolbar = () => (
    <ToolbarContainer className="bottom-24">
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
              : "bg-black/40 text-white border-white/20 hover:bg-black/60"
              }`}
          >
            <span className={font.css}>{font.name}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {COLORS.map(color => (
            <button
              key={color}
              onClick={() => {
                setTextOptions(prev => ({ ...prev, color }));
                updateTextProp('fill', color);
              }}
              className={`w-7 h-7 rounded-full border-2 transition-transform shrink-0 ${textOptions.color === color ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex gap-2 bg-white/10 p-1 rounded-xl">
          <button
            onClick={() => {
              const newBg = textOptions.bgColor === 'transparent' ? '#000000' : (textOptions.bgColor === '#000000' ? '#ffffff' : 'transparent');
              const newFill = newBg === '#ffffff' ? '#000000' : '#ffffff';
              setTextOptions(prev => ({ ...prev, bgColor: newBg, color: newFill }));
              updateTextProp('backgroundColor', newBg);
              updateTextProp('fill', newFill);
            }}
            className={`p-2 rounded-lg ${textOptions.bgColor !== 'transparent' ? 'bg-white text-black' : 'text-white'}`}
          >
            <IoColorFill />
          </button>
          <button
            onClick={() => {
              const val = !textOptions.neon;
              setTextOptions(p => ({ ...p, neon: val }));
              updateTextProp('neon', val);
            }}
            className={`p-2 rounded-lg ${textOptions.neon ? 'bg-fuchsia-500 text-white shadow-[0_0_10px_#d946ef]' : 'text-white'}`}
          >
            <IoFlash />
          </button>
        </div>
      </div>
    </ToolbarContainer>
  );

  const renderDrawToolbar = () => (
    <ToolbarContainer className="bottom-24">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-white text-xs font-semibold uppercase tracking-wider">Size</span>
        <input
          type="range" min="2" max="40"
          value={drawOptions.width}
          onChange={(e) => {
            const w = parseInt(e.target.value);
            setDrawOptions(p => ({ ...p, width: w }));
          }}
          className="flex-1 accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
        />
        <button
          onClick={() => setDrawOptions(p => ({ ...p, neon: !p.neon }))}
          className={`ml-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${drawOptions.neon ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_#d946ef]' : 'bg-white/10 text-white'}`}
        >
          NEON
        </button>
      </div>
      <div className="flex justify-between gap-1 overflow-x-auto no-scrollbar">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => { setDrawOptions(p => ({ ...p, color })); }}
            className={`w-8 h-8 rounded-full border-2 ${drawOptions.color === color ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </ToolbarContainer>
  );

  const renderFilterToolbar = () => (
    <div className="absolute bottom-28 left-0 right-0 overflow-x-auto no-scrollbar px-4 flex gap-4 pb-2 z-50">
      {FILTER_TYPES.map(f => (
        <button
          key={f}
          onClick={() => applyFilter(f)}
          className={`flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 relative group transition-all transform hover:scale-105 ${filterType === f ? 'border-yellow-400 shadow-xl' : 'border-white/20'}`}
        >
          <div className="w-full h-full bg-gray-800 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${mediaURL})`, opacity: 0.8 }}></div>
            <div className={`absolute inset-0 ${f === 'vintage' ? 'bg-amber-500/30 sepia contrast-125' :
              f === 'bw' ? 'grayscale contrast-125' :
                f === 'warm' ? 'bg-orange-500/20 mix-blend-overlay' :
                  f === 'cool' ? 'bg-blue-500/20 mix-blend-overlay' :
                    'bg-transparent'
              }`}></div>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm text-white text-[9px] py-1.5 text-center font-bold uppercase tracking-widest">
            {f}
          </div>
        </button>
      ))}
    </div>
  );

  const renderInfoDrawer = () => (
    <div className="absolute top-24 inset-x-4 z-50 flex gap-2 justify-center animate-in zoom-in-95">
      <button onClick={handleAddDateSticker} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center gap-2 text-white hover:bg-white/20 transition-all">
        <IoTimeOutline className="text-3xl" />
        <span className="text-xs font-bold">TIME</span>
      </button>
      <button onClick={() => { setActiveTool('sticker') }} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center gap-2 text-white hover:bg-white/20 transition-all">
        <IoHappyOutline className="text-3xl" />
        <span className="text-xs font-bold">EMOJI</span>
      </button>
    </div>
  );

  const renderToolsMenu = () => (
    <div className="absolute inset-x-0 bottom-0 top-20 bg-black/95 backdrop-blur-xl z-50 p-6 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-white text-2xl font-black tracking-tight">TOOLS</h2>
        <button onClick={() => setActiveTool('none')} className="p-2 bg-white/10 rounded-full text-white"><IoCloseOutline size={24} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'media', icon: IoLayers, label: 'Add Media', action: () => overlayInputRef.current?.click(), color: 'bg-blue-500' },
          { id: 'music', icon: IoMusicalNotes, label: 'Music', action: () => setActiveTool('music'), color: 'bg-cyan-500' },
          { id: 'text', icon: IoTextOutline, label: 'Text', action: handleAddText, color: 'bg-purple-500' },
          { id: 'draw', icon: IoBrushOutline, label: 'Draw', action: () => { setActiveTool("draw"); toggleDrawingMode(true); }, color: 'bg-pink-500' },
          { id: 'stickers', icon: IoHappyOutline, label: 'Stickers', action: () => setActiveTool('stickers_menu'), color: 'bg-yellow-500' },
          { id: 'effects', icon: IoContrastOutline, label: 'Effects', action: () => setActiveTool("filter"), color: 'bg-orange-500' },
          { id: 'canvas', icon: IoScan, label: 'Canvas', action: () => setActiveTool('background'), color: 'bg-green-500' },
        ].map(tool => (
          <button key={tool.id} onClick={tool.action} className="relative group overflow-hidden rounded-3xl p-4 h-32 flex flex-col items-start justify-between bg-white/5 border border-white/10 hover:border-white/30 transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 ${tool.color} blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity`} />
            <tool.icon className="text-3xl text-white" />
            <span className="text-white font-bold text-lg">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderBackgroundDrawer = () => (
    <ToolbarContainer className="bottom-24">
      <h3 className="text-white text-xs font-bold mb-2 uppercase tracking-wider">Choose Background</h3>
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => { const c = canvasRef.current; c.setBackgroundColor('#000000', c.renderAll.bind(c)); pushHistorySnapshot(c); }}
          className="h-12 rounded-lg bg-black border border-white/20"
        />
        <button
          onClick={() => { const c = canvasRef.current; c.setBackgroundColor('#ffffff', c.renderAll.bind(c)); pushHistorySnapshot(c); }}
          className="h-12 rounded-lg bg-white border border-white/20"
        />
        {GRADIENTS.map(g => (
          <button
            key={g.name}
            onClick={() => setGradientBackground(g)}
            className="h-12 rounded-lg border border-white/20 hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(to bottom right, ${g.start}, ${g.end})` }}
          />
        ))}
      </div>
    </ToolbarContainer>
  );

  return (
    <div className="w-full h-full mx-auto flex flex-col items-center justify-center relative select-none">
      <div ref={wrapperRef} className="relative w-full aspect-[9/16] max-w-[420px] bg-black overflow-hidden rounded-3xl shadow-2xl border border-white/10 ring-1 ring-white/5">
        <canvas id="fabric-canvas" className="w-full h-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* --- Top Bar --- */}
        <div className="absolute top-0 inset-x-0 pt-4 pb-2 px-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40 flex flex-col gap-2 pointer-events-none">

          {/* Active Tool Header (Done Button) */}
          {["text", "draw", "filter", "background"].includes(activeTool) && (
            <div className="flex justify-end px-2 pointer-events-auto animate-in slide-in-from-top-2">
              <button
                onClick={() => { setActiveTool("none"); toggleDrawingMode(false); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full text-white font-bold hover:bg-white/20 transition-all shadow-lg"
              >
                <IoCheckmark className="text-lg" /> Done
              </button>
            </div>
          )}

          {/* Main Toolbar (Scrollable Row) */}
          {!["text", "draw", "filter", "music", "background", "menu", "stickers_menu", "sticker"].includes(activeTool) && (
            <div
              className="w-full flex items-center gap-2 pointer-events-auto px-4 pb-2"
              style={{ maskImage: 'linear-gradient(to right, transparent, black 10px, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10px, black 90%, transparent)' }}
            >
              <IconButton icon={IoGridOutline} label="Menu" onClick={() => setActiveTool('menu')} className="shrink-0 bg-white/20 border-white/30" />
              <div className="w-[1px] h-8 bg-white/20 shrink-0 mx-1" />
            </div>
          )}
        </div>

        {activeTool === "menu" && renderToolsMenu()}
        {activeTool === "stickers_menu" && renderInfoDrawer()}

        {/* --- STICKER DRAWER FIX: Can stay active, scrollable --- */}
        {activeTool === "sticker" && (
          <div className="absolute top-32 inset-x-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 z-50 grid grid-cols-6 gap-3 animate-in zoom-in-95 duration-200 h-96 overflow-y-auto no-scrollbar content-start">
            <div className="col-span-6 flex justify-between mb-2">
              <span className="text-white font-bold">Stickers</span>
              <button onClick={() => setActiveTool('none')}><IoCloseOutline className="text-white text-xl" /></button>
            </div>
            {STICKERS.map(s => (
              <button key={s} onClick={() => handleAddSticker(s)} className="text-4xl hover:scale-125 transition-transform p-2">{s}</button>
            ))}
          </div>
        )}

        {/* --- MUSIC DRAWER WITH 2 STEPS --- */}
        {activeTool === "music" && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-300 flex flex-col">
            {/* Music Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              {musicStep === 'crop' && (
                <button onClick={() => setMusicStep('search')} className="text-white bg-white/10 p-2 rounded-full"><IoChevronDown className="rotate-90 text-xl" /></button>
              )}
              <h3 className="text-white font-bold text-lg tracking-wide">{musicStep === 'search' ? 'Select Music' : 'Theme'}</h3>
              <button onClick={() => { setActiveTool('none'); setMusicStep('search'); }}><IoCloseOutline className="text-white w-8 h-8" /></button>
            </div>

            {/* STEP 1: SEARCH */}
            {musicStep === 'search' && (
              <>
                <div className="p-4"><form onSubmit={handleSearchMusic} className="relative"><IoSearchOutline className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search tracks..." className="w-full bg-white/10 text-white rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium" value={musicQuery} onChange={(e) => setMusicQuery(e.target.value)} autoFocus /></form></div>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {isSearchingMusic ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div> : (
                    <div className="flex flex-col gap-2">
                      {musicResults.map(track => (
                        <div key={track.id} onClick={() => { selectMusicTrack(track); setMusicStep('crop'); }} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group">
                          <img src={track.coverUrl} className="w-14 h-14 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
                          <div className="flex-1 min-w-0"><p className="text-white font-bold truncate text-base">{track.title}</p><p className="text-white/60 text-sm truncate">{track.artist}</p></div>
                          <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transition-all"><IoPlay className="ml-0.5" /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* STEP 2: CROP & THEME */}
            {musicStep === 'crop' && selectedMusic && (
              <div className="flex-1 flex flex-col items-center justify-between p-6">
                {/* Visual Preview Area */}
                <div className="w-full aspect-square bg-gradient-to-br from-gray-900 to-black rounded-3xl flex items-center justify-center relative border border-white/10 shadow-2xl overflow-hidden">
                  {musicTheme === 'card' && (
                    <div className="relative bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 w-64 border border-white/20">
                      <img src={selectedMusic.coverUrl} className="w-16 h-16 rounded-xl shadow-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{selectedMusic.title}</p>
                        <p className="text-white/60 text-xs truncate">{selectedMusic.artist}</p>
                      </div>
                      <div className="flex gap-0.5 items-end h-4">
                        {[1, 2, 3, 2, 1].map((h, i) => <div key={i} className="w-1 bg-cyan-400 animate-pulse" style={{ height: h * 4 }} />)}
                      </div>
                    </div>
                  )}
                  {musicTheme === 'tiny' && (
                    <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2">
                      <IoMusicalNotes /> {selectedMusic.title}
                    </div>
                  )}
                  {musicTheme === 'hidden' && (
                    <div className="text-white/40 text-sm flex flex-col items-center gap-2">
                      <IoMusicalNotes className="text-4xl opacity-50" />
                      Music Hidden
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="w-full space-y-6">
                  <div className="flex justify-center gap-4">
                    <button onClick={() => setMusicTheme('card')} className={`px-6 py-2 rounded-full border border-white/20 font-medium transition-all ${musicTheme === 'card' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}>Card</button>
                    <button onClick={() => setMusicTheme('tiny')} className={`px-6 py-2 rounded-full border border-white/20 font-medium transition-all ${musicTheme === 'tiny' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}>Tiny</button>
                    <button onClick={() => setMusicTheme('hidden')} className={`px-6 py-2 rounded-full border border-white/20 font-medium transition-all ${musicTheme === 'hidden' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}>None</button>
                  </div>

                  {/* Duration Selection */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-white/70 text-sm font-semibold text-center uppercase tracking-widest">Duration</h4>
                    <div className="flex justify-center gap-3">
                      {[15, 20, 30].map(d => (
                        <button
                          key={d}
                          onClick={() => setStoryDuration(d)}
                          className={`w-12 h-12 rounded-full border font-bold text-sm flex items-center justify-center transition-all ${storyDuration === d
                            ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_15px_#06b6d4]'
                            : 'border-white/20 text-white hover:bg-white/10'
                            }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { addMusicStickerToCanvas(selectedMusic, musicTheme); setActiveTool('none'); }} className="w-full bg-cyan-500 text-black font-bold py-4 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] transition-all">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTool === "text" && renderTextToolbar()}
        {activeTool === "draw" && renderDrawToolbar()}
        {activeTool === "filter" && renderFilterToolbar()}
        {activeTool === "background" && renderBackgroundDrawer()}

        {!["text", "draw", "filter", "music", "background", "menu"].includes(activeTool) && (
          <div className="absolute bottom-8 left-6 right-6 flex items-center justify-between z-40 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-none">
            <div className="flex gap-3 pointer-events-auto">
              <IconButton icon={IoDownloadOutline} onClick={handleExport} className="bg-black/50 hover:bg-black/70" />
              <IconButton icon={IoTrash} onClick={deleteActive} className="bg-black/50 hover:bg-red-500/50 text-red-500" />
            </div>

            <button
              onClick={handleNext}
              className="pointer-events-auto flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-black text-lg shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-105 transition-all active:scale-95"
            >
              SHARE <IoMove className="text-xl" />
            </button>
          </div>
        )}

      </div>
      <input ref={overlayInputRef} type="file" accept="image/*" className="hidden" onChange={handleOverlayFile} />
    </div>
  );
};

export default FabricStoryEditor;

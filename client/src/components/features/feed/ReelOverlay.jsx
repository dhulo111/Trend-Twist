import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const ReelOverlay = ({ editorJson, width, height }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!editorJson || !canvasRef.current) return;

    // Use StaticCanvas for better performance (no interactions)
    const c = new fabric.StaticCanvas('overlay-' + Math.random(), {
      width: width || 360,
      height: height || 640,
      renderOnAddRemove: false
    });

    // Load JSON
    c.loadFromJSON(editorJson, () => {
      // Scaling logic to match container
      if (width && height) {
        const originalWidth = 360; // Assuming editor init width
        const scaleX = width / originalWidth;
        // Scale objects
        c.getObjects().forEach(obj => {
          if (obj._isVideoBackground) {
            c.remove(obj);
            return;
          }
          obj.scaleX = (obj.scaleX || 1) * scaleX;
          obj.scaleY = (obj.scaleY || 1) * scaleX; // Uniform scale
          obj.left = obj.left * scaleX;
          obj.top = obj.top * scaleX;
          obj.setCoords();
        });
      } else {
        // Even if no resize, remove video bg
        c.getObjects().forEach(obj => {
          if (obj._isVideoBackground) c.remove(obj);
        });
      }

      c.renderAll();
    });

    // Append to div
    const el = canvasRef.current;
    // Clear previous
    while (el.firstChild) el.removeChild(el.firstChild);

    // Wrapper for canvas
    const canvasEl = c.getElement();
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    el.appendChild(canvasEl);

    return () => {
      c.dispose();
    };
  }, [editorJson, width, height]);

  if (!editorJson) return null;

  return (
    <div ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />
  );
};

export default ReelOverlay;

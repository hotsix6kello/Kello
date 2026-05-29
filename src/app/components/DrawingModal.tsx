"use client";

import React, { useRef, useState, useEffect } from 'react';
import { X, Undo, PenTool, Eraser, Send } from 'lucide-react';

interface DrawingModalProps {
  imageUrl: string;
  onClose: () => void;
  onSend: (drawnImageUrl: string) => void;
}

export default function DrawingModal({ imageUrl, onClose, onSend }: DrawingModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#B8913A'); // Gold
  const [lineWidth, setLineWidth] = useState(3);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  
  // History for undo
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      if (canvas && ctx && containerRef.current) {
        // Fit canvas to container while maintaining aspect ratio
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const ratio = Math.min(containerWidth / image.width, containerHeight / image.height);
        
        canvas.width = image.width * ratio;
        canvas.height = image.height * ratio;
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        saveHistoryState();
      }
    };
  }, [imageUrl]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => [...prev, imageData]);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const previousState = newHistory[newHistory.length - 1];
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(previousState, 0, 0);
        setHistory(newHistory);
      }
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      if (mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = lineWidth * 3;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistoryState();
    }
  };

  const handleSend = () => {
    if (canvasRef.current) {
      // Create a temporary canvas to overlay the drawing on the original image if needed
      // but here we can just export the current canvas which has the image drawn on it
      const drawnImageUrl = canvasRef.current.toDataURL('image/png');
      onSend(drawnImageUrl);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#111', zIndex: 10000,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#222' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 4 }}>
          <X size={24} />
        </button>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => setMode('draw')} style={{ background: mode === 'draw' ? '#333' : 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 8, borderRadius: 8 }}>
            <PenTool size={20} />
          </button>
          <button onClick={() => setMode('erase')} style={{ background: mode === 'erase' ? '#333' : 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 8, borderRadius: 8 }}>
            <Eraser size={20} />
          </button>
          <button onClick={undo} disabled={history.length <= 1} style={{ background: 'none', border: 'none', color: history.length > 1 ? '#FFF' : '#666', cursor: 'pointer', padding: 8 }}>
            <Undo size={20} />
          </button>
        </div>
        <button onClick={handleSend} style={{ background: '#B8913A', border: 'none', color: '#FFF', cursor: 'pointer', padding: '8px 16px', borderRadius: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Send size={16} /> 전송
        </button>
      </div>

      {/* Sub Toolbar for Colors & Width */}
      {mode === 'draw' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '12px', background: '#1A1A1A' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {['#B8913A', '#EF4444', '#3B82F6', '#10B981', '#FFFFFF', '#000000'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid #FFF' : '2px solid transparent',
                  cursor: 'pointer', padding: 0
                }}
              />
            ))}
          </div>
          <div style={{ width: 1, background: '#444' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {[2, 5, 10].map(w => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'none',
                  border: lineWidth === w ? '2px solid #FFF' : '2px solid #444',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <div style={{ width: w, height: w, borderRadius: '50%', background: '#FFF' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 20 }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ cursor: mode === 'erase' ? 'crosshair' : 'crosshair', touchAction: 'none', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
        />
      </div>
    </div>
  );
}

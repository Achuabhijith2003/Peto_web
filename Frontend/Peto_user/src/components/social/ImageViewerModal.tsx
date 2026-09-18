import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: (string | { url: string; type?: string })[];
  initialIndex?: number;
}

const getMediaUrl = (item: string | { url: string; type?: string }) => {
  const rawUrl = typeof item === "string" ? item : item.url;
  if (!rawUrl) return "";
  return rawUrl
    .replace("/posts-images/posts-images/", "/posts-images/")
    .replace("/posts-videos/posts-videos/", "/posts-videos/");
};

const isVideoUrl = (item: string | { url: string; type?: string }) => {
  if (typeof item === "object") {
    if (item.type === "video") return true;
    return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(item.url || "");
  }
  return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(item || "");
};

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pinch-to-zoom touch state
  const touchStartDist = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Sync initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetTransform();
    }
  }, [isOpen, initialIndex]);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        resetTransform();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, resetTransform]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    resetTransform();
  }, [images.length, resetTransform]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    resetTransform();
  }, [images.length, resetTransform]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Double click to toggle zoom (1x <-> 2.5x)
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2.5);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.002;
    setScale((prev) => {
      const nextScale = Math.min(Math.max(prev + zoomFactor, 0.5), 5);
      if (nextScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return nextScale;
    });
  };

  // Mouse Pan / Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Pinch-to-zoom touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2-finger pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      initialPinchScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // 1-finger pan when zoomed in
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist.current !== null) {
      // Pinch gesture
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const ratio = currentDist / touchStartDist.current;
      const newScale = Math.min(Math.max(initialPinchScale.current * ratio, 0.8), 5);
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan gesture
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDist.current = null;
    setIsDragging(false);
    if (scale < 1) {
      resetTransform();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen || !images || images.length === 0) return null;

  const currentItem = images[currentIndex];
  const currentUrl = getMediaUrl(currentItem);
  const isVideo = isVideoUrl(currentItem);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Counter Badge */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15 backdrop-blur-md">
            {currentIndex + 1} / {images.length}
          </span>
          <span className="text-xs text-white/60 hidden sm:inline-block">
            {scale > 1 ? `${Math.round(scale * 100)}% zoom • Drag to pan` : "Double-click or pinch to zoom"}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {!isVideo && (
            <>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={resetTransform}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md cursor-pointer"
                title="Reset Zoom (0)"
              >
                <RefreshCw size={18} />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md cursor-pointer hidden sm:flex"
                title="Rotate 90°"
              >
                <RotateCw size={18} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md cursor-pointer hidden sm:flex"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/20 text-white hover:bg-red-600/80 transition backdrop-blur-md ml-2 cursor-pointer shadow-lg"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className="w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden"
        onMouseDown={handleMouseDown}
        onDoubleClick={!isVideo ? handleDoubleClick : undefined}
      >
        {isVideo ? (
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            <video
              src={currentUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
          </div>
        ) : (
          <div
            className="relative flex items-center justify-center transition-transform duration-75 ease-out cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
              touchAction: scale > 1 ? "none" : "pan-y",
            }}
          >
            <img
              ref={imageRef}
              src={currentUrl}
              alt={`Photo ${currentIndex + 1}`}
              draggable={false}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl pointer-events-none select-none"
            />
          </div>
        )}
      </div>

      {/* Carousel Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition backdrop-blur-md cursor-pointer z-40 border border-white/10 shadow-xl"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition backdrop-blur-md cursor-pointer z-40 border border-white/10 shadow-xl"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Bottom Thumbnail Strip for Multi-Image Carousel */}
      {images.length > 1 && (
        <div className="absolute bottom-4 inset-x-0 z-40 flex items-center justify-center gap-2 px-4 py-2">
          <div className="flex items-center gap-2 max-w-full overflow-x-auto p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
            {images.map((item, idx) => {
              const thumbUrl = getMediaUrl(item);
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    resetTransform();
                  }}
                  className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-amber-500 scale-105 opacity-100"
                      : "opacity-40 hover:opacity-80"
                  }`}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageViewerModal;

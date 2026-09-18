import { useState, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutGrid,
  Maximize2,
} from "lucide-react";
import ImageViewerModal from "./ImageViewerModal";

interface ImageGridProps {
  images: (string | { url: string; type?: string })[];
}

const isVideoUrl = (item: string | { url: string; type?: string }) => {
  if (typeof item === "object") {
    if (item.type === "video") return true;
    return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(item.url || "");
  }
  return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(item || "");
};

const getMediaUrl = (item: string | { url: string; type?: string }) => {
  const rawUrl = typeof item === "string" ? item : item.url;
  if (!rawUrl) return "";
  return rawUrl
    .replace("/posts-images/posts-images/", "/posts-images/")
    .replace("/posts-videos/posts-videos/", "/posts-videos/");
};

const VideoPlayer = ({
  src,
  containerClassName = "max-h-[520px] w-full",
}: {
  src: string;
  containerClassName?: string;
}) => {
  const [muted, setMuted] = useState(true);

  if (!src) return null;

  return (
    <div
      className={`relative group/video w-full bg-slate-950 flex items-center justify-center overflow-hidden rounded-2xl ${containerClassName}`}
    >
      <video
        src={src}
        controls
        muted={muted}
        playsInline
        preload="metadata"
        className="max-h-[520px] w-full object-contain"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted(!muted);
        }}
        type="button"
        className="absolute top-3 right-3 rounded-full bg-slate-900/75 p-2 text-white hover:bg-slate-900 transition opacity-0 group-hover/video:opacity-100 z-10 shadow-md cursor-pointer"
        aria-label={muted ? "Unmute video" : "Mute video"}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
};

const ImageGrid = ({ images }: ImageGridProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");

  // Touch swipe support for mobile web carousel
  const touchStartX = useRef<number | null>(null);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    },
    [images.length]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    },
    [images.length]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      // Swiped left -> Next
      handleNext();
    } else if (diff < -50) {
      // Swiped right -> Prev
      handlePrev();
    }
    touchStartX.current = null;
  };

  if (!images || images.length === 0) return null;

  // Single Media Item
  if (images.length === 1) {
    const item = images[0];
    const url = getMediaUrl(item);
    if (isVideoUrl(item)) {
      return <VideoPlayer src={url} containerClassName="max-h-[520px] w-full" />;
    }
    return (
      <>
        <div
          onClick={() => openViewer(0)}
          className="relative group max-h-[520px] w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center cursor-zoom-in"
        >
          <img
            src={url}
            alt="Post media"
            className="max-h-[520px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-md flex items-center gap-1.5 text-xs">
            <Maximize2 size={14} />
            <span className="font-medium text-[11px]">Zoom & View</span>
          </div>
        </div>

        <ImageViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          images={images}
          initialIndex={viewerIndex}
        />
      </>
    );
  }

  // Multiple Media Items: Carousel View (default) or Grid View
  return (
    <>
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/60 shadow-xs group/carousel">
        {viewMode === "carousel" ? (
          /* Carousel View Mode */
          <div
            className="relative w-full min-h-[360px] max-h-[540px] flex items-center justify-center bg-slate-950 select-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Current Active Slide */}
            {isVideoUrl(images[currentIndex]) ? (
              <VideoPlayer
                src={getMediaUrl(images[currentIndex])}
                containerClassName="h-[480px] w-full"
              />
            ) : (
              <div
                onClick={() => openViewer(currentIndex)}
                className="w-full h-full min-h-[360px] max-h-[540px] flex items-center justify-center cursor-zoom-in"
              >
                <img
                  src={getMediaUrl(images[currentIndex])}
                  alt={`Photo ${currentIndex + 1}`}
                  className="max-h-[540px] w-full object-contain transition duration-200"
                />
              </div>
            )}

            {/* Left Chevron Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 sm:opacity-75 sm:hover:opacity-100 z-20 cursor-pointer shadow-md"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Right Chevron Button */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 sm:opacity-75 sm:hover:opacity-100 z-20 cursor-pointer shadow-md"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>

            {/* Top Right Counter & Zoom Pill */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openViewer(currentIndex);
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 opacity-90 hover:opacity-100 transition cursor-pointer"
                title="Pinch to zoom / Image view mode"
              >
                <Maximize2 size={12} />
                <span>Zoom</span>
              </button>
              <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <Layers size={12} className="text-amber-400" />
                <span>
                  {currentIndex + 1} / {images.length}
                </span>
              </div>
            </div>

            {/* Top Left View Toggle Button (Carousel <-> Grid) */}
            <div className="absolute top-3 left-3 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("grid");
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 text-white/90 hover:text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 opacity-0 group-hover/carousel:opacity-90 hover:opacity-100 transition cursor-pointer"
                title="Switch to Grid View"
              >
                <LayoutGrid size={12} />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Bottom Dots Indicator */}
            <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex
                        ? "w-5 bg-amber-400"
                        : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Grid View Mode */
          <div className="relative p-2 bg-slate-900">
            <div className="absolute top-4 left-4 z-20">
              <button
                type="button"
                onClick={() => setViewMode("carousel")}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/70 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-black/90 transition cursor-pointer shadow-lg"
              >
                <Layers size={13} className="text-amber-400" />
                <span>Back to Carousel</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {images.map((item, index) => {
                const url = getMediaUrl(item);
                if (isVideoUrl(item)) {
                  return (
                    <VideoPlayer
                      key={index}
                      src={url}
                      containerClassName="h-56 w-full rounded-xl"
                    />
                  );
                }
                return (
                  <div
                    key={index}
                    onClick={() => openViewer(index)}
                    className="relative group/thumb h-56 w-full overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center cursor-zoom-in"
                  >
                    <img
                      src={url}
                      alt={`Post media ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                      <Maximize2
                        size={20}
                        className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Pinch to Zoom Lightbox Modal */}
      <ImageViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={images}
        initialIndex={viewerIndex}
      />
    </>
  );
};

export default ImageGrid;
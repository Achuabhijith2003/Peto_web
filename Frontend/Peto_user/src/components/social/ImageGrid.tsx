import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

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
  containerClassName = "h-[420px] w-full",
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
        className="w-full h-full object-cover"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted(!muted);
        }}
        type="button"
        className="absolute top-3 right-3 rounded-full bg-slate-900/75 p-2 text-white hover:bg-slate-900 transition opacity-0 group-hover/video:opacity-100 z-10 shadow-md"
        aria-label={muted ? "Unmute video" : "Mute video"}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
};

const ImageGrid = ({ images }: ImageGridProps) => {
  if (!images || images.length === 0) return null;

  // Single Media: Image and Video take the exact same width and height dimension
  if (images.length === 1) {
    const item = images[0];
    const url = getMediaUrl(item);
    if (isVideoUrl(item)) {
      return <VideoPlayer src={url} containerClassName="h-[420px] w-full" />;
    }
    return (
      <div className="h-[420px] w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center">
        <img
          src={url}
          alt="Post media"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Multi Media: Grid items take the exact same width and height dimension (h-64)
  return (
    <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl">
      {images.map((item, index) => {
        const url = getMediaUrl(item);
        if (isVideoUrl(item)) {
          return (
            <VideoPlayer
              key={index}
              src={url}
              containerClassName="h-64 w-full rounded-xl"
            />
          );
        }
        return (
          <div
            key={index}
            className="h-64 w-full overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center"
          >
            <img
              src={url}
              alt={`Post media ${index + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        );
      })}
    </div>
  );
};

export default ImageGrid;
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

const VideoPlayer = ({ src }: { src: string }) => {
  const [muted, setMuted] = useState(true);

  if (!src) return null;

  return (
    <div className="relative group/video w-full bg-slate-950 flex items-center justify-center overflow-hidden rounded-2xl">
      <video
        src={src}
        controls
        muted={muted}
        playsInline
        preload="metadata"
        className="max-h-[540px] w-full object-contain rounded-2xl"
      />
      <button
        onClick={() => setMuted(!muted)}
        type="button"
        className="absolute top-3 right-3 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900 transition opacity-0 group-hover/video:opacity-100 z-10"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
};

const ImageGrid = ({ images }: ImageGridProps) => {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    const item = images[0];
    const url = getMediaUrl(item);
    if (isVideoUrl(item)) {
      return <VideoPlayer src={url} />;
    }
    return (
      <img
        src={url}
        alt="Post media"
        className="max-h-[520px] w-full object-cover rounded-xl"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl">
      {images.map((item, index) => {
        const url = getMediaUrl(item);
        if (isVideoUrl(item)) {
          return <VideoPlayer key={index} src={url} />;
        }
        return (
          <img
            key={index}
            src={url}
            alt={`Post media ${index + 1}`}
            className="h-64 w-full object-cover"
          />
        );
      })}
    </div>
  );
};

export default ImageGrid;
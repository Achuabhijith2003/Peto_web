import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Film, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import api from "../../utils/api";

interface AdMediaUploaderProps {
  mediaUrl: string;
  format: "IMAGE" | "VIDEO" | "CAROUSEL";
  onChange: (data: { mediaUrl: string; format: "IMAGE" | "VIDEO" }) => void;
}

export const AdMediaUploader: React.FC<AdMediaUploaderProps> = ({
  mediaUrl,
  format,
  onChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMediaType, setUploadMediaType] = useState<"image" | "video">("image");

  const isVideo = format === "VIDEO" || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(mediaUrl);

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setError(null);

    const isVideoFile = file.type.startsWith("video/");
    const isImageFile = file.type.startsWith("image/");

    if (!isVideoFile && !isImageFile) {
      setError("Please select a valid image (JPG, PNG, WEBP) or video (MP4, MOV, WEBM) file.");
      return;
    }

    // Max 100MB for video, 15MB for image
    const maxSizeBytes = isVideoFile ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds limit (${isVideoFile ? "100MB" : "15MB"}). Please compress your file.`);
      return;
    }

    const detectedFormat: "IMAGE" | "VIDEO" = isVideoFile ? "VIDEO" : "IMAGE";

    try {
      setUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append("media", file);

      const response = await api.post("/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 180000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (response.data && response.data.success) {
        const returnedItem = Array.isArray(response.data.data)
          ? response.data.data[0]
          : response.data.data;
        const uploadedUrl =
          response.data.mediaUrl ||
          returnedItem?.url ||
          returnedItem?.path ||
          returnedItem?.media_url;

        if (!uploadedUrl) {
          throw new Error("Upload succeeded but media URL could not be determined.");
        }

        onChange({
          mediaUrl: uploadedUrl,
          format: detectedFormat,
        });
      } else {
        throw new Error(response.data?.message || "Media upload failed");
      }
    } catch (err: any) {
      console.error("Ad media upload error:", err);
      setError(err.response?.data?.message || err.message || "Failed to upload media. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleTriggerUpload = (type: "image" | "video") => {
    setUploadMediaType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "video" ? "video/mp4,video/quicktime,video/webm" : "image/*";
      fileInputRef.current.click();
    }
  };

  const handleRemoveMedia = () => {
    onChange({
      mediaUrl: "",
      format: "IMAGE",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Creative Media (Photo / Video) *
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Format:</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isVideo
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}
          >
            {isVideo ? "Video Ad" : "Photo Ad"}
          </span>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle size={16} className="shrink-0 text-rose-500" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-rose-400 hover:text-rose-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* When media is already uploaded / selected */}
      {mediaUrl ? (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm group">
          {isVideo ? (
            <div className="relative max-h-72 flex items-center justify-center bg-black">
              <video
                src={mediaUrl}
                controls
                playsInline
                className="w-full max-h-72 object-contain"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10 pointer-events-none">
                <Film size={13} className="text-purple-400" />
                <span>Video Creative</span>
              </div>
            </div>
          ) : (
            <div className="relative max-h-72 flex items-center justify-center bg-slate-950">
              <img
                src={mediaUrl}
                alt="Ad Creative Preview"
                className="w-full max-h-72 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80";
                }}
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10 pointer-events-none">
                <ImageIcon size={13} className="text-amber-400" />
                <span>Photo Creative</span>
              </div>
            </div>
          )}

          {/* Action overlay buttons */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="truncate text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span className="truncate">{mediaUrl}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleTriggerUpload(isVideo ? "video" : "image")}
                disabled={uploading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5"
              >
                <UploadCloud size={13} />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveMedia}
                disabled={uploading}
                className="p-1.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                title="Remove Media"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Drag & Drop Area with separate Photo / Video buttons */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-3xl border-2 border-dashed transition-all p-6 sm:p-8 text-center space-y-4 ${
            dragOver
              ? "border-amber-500 bg-amber-50/50 scale-[1.01]"
              : "border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          {uploading ? (
            <div className="py-6 space-y-3">
              <Loader2 size={36} className="text-amber-500 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  Uploading {uploadMediaType === "video" ? "Video Creative" : "Photo Creative"}...
                </p>
                <div className="w-48 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${uploadProgress || 20}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {uploadProgress > 0 ? `${uploadProgress}%` : "Processing..."}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                  <ImageIcon size={22} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                  <Film size={22} />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Upload Creative Media
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Drag and drop your photo or video here, or select an upload option below.
                </p>
              </div>

              {/* Upload Choice Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTriggerUpload("image")}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/40 text-xs font-bold shadow-xs transition flex items-center gap-2 active:scale-95"
                >
                  <ImageIcon size={15} className="text-amber-500" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerUpload("video")}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:border-purple-500 hover:text-purple-700 hover:bg-purple-50/40 text-xs font-bold shadow-xs transition flex items-center gap-2 active:scale-95"
                >
                  <Film size={15} className="text-purple-600" />
                  <span>Upload Video (MP4/WebM)</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Photos: JPG, PNG, WEBP (up to 15MB) • Videos: MP4, MOV, WEBM (up to 100MB)
              </div>
            </>
          )}
        </div>
      )}

      {/* Optional: manual URL fallback for external links */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-[11px] text-slate-500 hover:text-amber-600 font-medium underline"
        >
          {showManualUrl ? "Hide manual URL option" : "Or enter direct media URL / CDN link"}
        </button>

        {showManualUrl && (
          <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <input
              type="url"
              placeholder="https://example.com/ad-creative.mp4 or .jpg"
              value={mediaUrl}
              onChange={(e) => {
                const val = e.target.value;
                const isVid = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(val);
                onChange({
                  mediaUrl: val,
                  format: isVid ? "VIDEO" : "IMAGE",
                });
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="mediaFormatChoice"
                  checked={format === "IMAGE"}
                  onChange={() => onChange({ mediaUrl, format: "IMAGE" })}
                  className="text-amber-500"
                />
                <span>Image</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="mediaFormatChoice"
                  checked={format === "VIDEO"}
                  onChange={() => onChange({ mediaUrl, format: "VIDEO" })}
                  className="text-purple-600"
                />
                <span>Video</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

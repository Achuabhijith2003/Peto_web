import { useState, useRef } from "react";
import { Image, Smile, X } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface MediaItem {
  file: File;
  preview: string;
  id?: string;
}

interface CreatePostProps {
  onPostCreated?: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user, openAuthModal } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    if (!user) {
      openAuthModal("share photos or posts");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      openAuthModal("share photos or posts");
      return;
    }
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const response = await api.post("/media/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        const uploadedData = response.data.data;
        const newMediaItems = files.map((file, idx) => ({
          file,
          preview: URL.createObjectURL(file),
          id: uploadedData[idx]?.id,
        }));
        setMediaFiles((prev) => [...prev, ...newMediaItems]);
      }
    } catch (error) {
      console.error("Failed to upload image(s)", error);
    } finally {
      setUploadingMedia(false);
      // Reset input so same file can be chosen again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!user) {
      openAuthModal("share posts with pet lovers");
      return;
    }
    if (!text.trim() && mediaFiles.length === 0) return;
    try {
      setLoading(true);
      const mediaIds = mediaFiles.map((m) => m.id).filter(Boolean);
      
      await api.post("/posts", { 
        text, 
        visibility: "public",
        media: mediaIds
      });

      setText("");
      setMediaFiles([]);
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error("Failed to create post", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex gap-4">
        <img
          src={user?.profile?.avatar_url || user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.username || "Guest") + "&background=f59e0b&color=fff"}
          alt="User"
          className="h-12 w-12 rounded-full object-cover shrink-0"
        />

        <div className="w-full space-y-4">
          <textarea
            rows={3}
            placeholder={user ? "Share something about your pet..." : "Log in to share something about your pet..."}
            value={text}
            onFocus={() => {
              if (!user) openAuthModal("share posts with pet lovers");
            }}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />

          {mediaFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {mediaFiles.map((item, idx) => (
                <div key={idx} className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={item.preview} alt="Upload preview" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/60 p-1 text-white hover:bg-slate-900"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handlePhotoClick}
            disabled={uploadingMedia}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 hover:bg-slate-200 text-slate-700"
          >
            <Image size={18} />
            {uploadingMedia ? "Uploading..." : "Photo"}
          </button>

          <button type="button" className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 hover:bg-slate-200 text-slate-700">
            <Smile size={18} />
            Feeling
          </button>
        </div>

        <button 
          onClick={handlePost}
          disabled={loading || uploadingMedia || (!text.trim() && mediaFiles.length === 0)}
          className="rounded-xl bg-amber-500 px-6 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50 shadow-sm transition"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
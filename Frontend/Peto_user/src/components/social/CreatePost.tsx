import { useState, useRef } from "react";
import { Image, X, Loader2, Sparkles, PawPrint } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface CreatePostProps {
  onPostCreated?: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user, openAuthModal } = useAuth();
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: "image" | "video" }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    if (!user) {
      openAuthModal("share photos of your pets");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const newMedia = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
    }));

    setMediaFiles((prev) => [...prev, ...newMedia]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("share posts with pet lovers");
      return;
    }

    if (!text.trim() && mediaFiles.length === 0) return;

    try {
      setSubmitting(true);
      const uploadedMedia: { url: string; type: "image" | "video" }[] = [];

      if (mediaFiles.length > 0) {
        setUploadingMedia(true);
        for (const item of mediaFiles) {
          const formData = new FormData();
          formData.append("file", item.file);

          const uploadRes = await api.post("/media/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (uploadRes.data?.success && uploadRes.data?.mediaUrl) {
            uploadedMedia.push({
              url: uploadRes.data.mediaUrl,
              type: item.type,
            });
          }
        }
      }

      await api.post("/posts", {
        content: text.trim(),
        media: uploadedMedia,
      });

      setText("");
      setMediaFiles([]);
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setSubmitting(false);
      setUploadingMedia(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/80 transition hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-amber-500" />
        <h3 className="font-headline font-bold text-base text-slate-900">
          Create Post
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-4">
          {user?.profile?.avatar_url && user.profile.avatar_url !== "null" ? (
            <img
              src={user.profile.avatar_url}
              alt={user.username}
              className="h-11 w-11 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 font-bold shrink-0">
              <PawPrint size={20} />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <textarea
              rows={3}
              placeholder={user ? "Share something wonderful about your pet..." : "Log in to share a post with the community..."}
              value={text}
              onFocus={() => {
                if (!user) openAuthModal("share posts with pet lovers");
              }}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-none rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 placeholder-slate-400 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition duration-200"
            />

            {mediaFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {mediaFiles.map((item, idx) => (
                  <div key={idx} className="relative h-20 w-20 rounded-2xl overflow-hidden border border-slate-200 group shadow-xs">
                    <img src={item.preview} alt="Upload preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900 transition"
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

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <button 
            type="button"
            onClick={handlePhotoClick}
            disabled={uploadingMedia}
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition border border-amber-200/50"
          >
            <Image size={16} className="text-amber-600" />
            <span>{uploadingMedia ? "Uploading..." : "Add Photo"}</span>
          </button>

          <button
            type="submit"
            disabled={submitting || (!text.trim() && mediaFiles.length === 0)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition duration-200"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <span>Post</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
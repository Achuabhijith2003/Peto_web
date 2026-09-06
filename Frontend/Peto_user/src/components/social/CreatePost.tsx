import { useState, useRef } from "react";
import { Image, Video, X, Loader2, Sparkles, PawPrint, Play } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface CreatePostProps {
  onPostCreated?: () => void;
  communityId?: string;
  communityName?: string;
}

const CreatePost = ({ onPostCreated, communityId, communityName }: CreatePostProps) => {
  const { user, openAuthModal } = useAuth();
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: "image" | "video" }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    if (!user) {
      openAuthModal("share photos of your pets");
      return;
    }
    photoInputRef.current?.click();
  };

  const handleVideoClick = () => {
    if (!user) {
      openAuthModal("share videos of your pets");
      return;
    }
    videoInputRef.current?.click();
  };

  const MAX_MEDIA = 5;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, forcedType?: "image" | "video") => {
    if (!e.target.files || e.target.files.length === 0) return;
    const remainingSlots = MAX_MEDIA - mediaFiles.length;
    if (remainingSlots <= 0) {
      alert("You can upload a maximum of 5 media items per post.");
      e.target.value = "";
      return;
    }

    const selectedFiles = Array.from(e.target.files).slice(0, remainingSlots);

    const newMedia = selectedFiles.map((file) => {
      const type = forcedType || (file.type.startsWith("video/") ? "video" : "image");
      return {
        file,
        preview: URL.createObjectURL(file),
        type,
      };
    });

    setMediaFiles((prev) => [...prev, ...newMedia]);
    e.target.value = "";
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
      const mediaPayload: any[] = [];

      if (mediaFiles.length > 0) {
        setUploadingMedia(true);
        for (const item of mediaFiles) {
          const formData = new FormData();
          formData.append("media", item.file);

          const uploadRes = await api.post("/media/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (uploadRes.data?.success) {
            const returnedItem = Array.isArray(uploadRes.data?.data) ? uploadRes.data.data[0] : uploadRes.data.data;
            const mediaId = returnedItem?.id;
            const mediaUrl = uploadRes.data?.mediaUrl || returnedItem?.url || returnedItem?.path;

            if (mediaId) {
              mediaPayload.push(mediaId);
            } else if (mediaUrl) {
              mediaPayload.push({
                url: mediaUrl,
                type: item.type,
              });
            }
          }
        }
      }

      await api.post("/posts", {
        text: text.trim(),
        content: text.trim(),
        visibility: "public",
        media: mediaPayload,
        community_id: communityId || undefined,
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
          {communityName ? `Create Discussion in ${communityName}` : "Create Post"}
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
              placeholder={
                communityName
                  ? `Share your thoughts with members of ${communityName}...`
                  : user
                  ? "Share something wonderful about your pet..."
                  : "Log in to share a post with the community..."
              }
              value={text}
              onFocus={() => {
                if (!user) openAuthModal("share posts with pet lovers");
              }}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-none rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 placeholder-slate-400 outline-none border-2 border-transparent focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100/50 transition duration-200"
            />

            {mediaFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {mediaFiles.map((item, idx) => (
                  <div key={idx} className="relative h-24 w-24 rounded-2xl overflow-hidden border border-slate-200 group shadow-xs bg-slate-900 flex items-center justify-center">
                    {item.type === "video" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        <video src={item.preview} className="h-full w-full object-cover opacity-80" />
                        <Play size={20} className="absolute text-white drop-shadow-md fill-white" />
                      </div>
                    ) : (
                      <img src={item.preview} alt="Upload preview" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-white hover:bg-slate-900 transition"
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
          ref={photoInputRef}
          onChange={(e) => handleFileChange(e, "image")}
          multiple
          accept="image/*"
          className="hidden"
        />

        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileChange(e, "video")}
          multiple
          accept="video/*"
          className="hidden"
        />

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handlePhotoClick}
              disabled={uploadingMedia || mediaFiles.length >= MAX_MEDIA}
              className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition border border-amber-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={mediaFiles.length >= MAX_MEDIA ? "Maximum 5 media items reached" : "Add photo"}
            >
              <Image size={16} className="text-amber-600" />
              <span>Photo</span>
            </button>

            <button 
              type="button"
              onClick={handleVideoClick}
              disabled={uploadingMedia || mediaFiles.length >= MAX_MEDIA}
              className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition border border-rose-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={mediaFiles.length >= MAX_MEDIA ? "Maximum 5 media items reached" : "Add video"}
            >
              <Video size={16} className="text-rose-600" />
              <span>Video</span>
            </button>

            {mediaFiles.length > 0 && (
              <span className="text-xs font-medium text-slate-400 ml-1">
                {mediaFiles.length}/{MAX_MEDIA} items
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || (!text.trim() && mediaFiles.length === 0)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition duration-200"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{uploadingMedia ? "Uploading..." : "Posting..."}</span>
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
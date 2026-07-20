import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
} from "lucide-react";

const PostActions = () => {
  return (
    <div className="mt-5 flex items-center justify-between border-t pt-4">
      <button className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100">
        <Heart size={20} />
        Like
      </button>

      <button className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100">
        <MessageCircle size={20} />
        Comment
      </button>

      <button className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100">
        <Send size={20} />
        Share
      </button>

      <button className="rounded-lg p-2 transition hover:bg-slate-100">
        <Bookmark size={20} />
      </button>
    </div>
  );
};

export default PostActions;
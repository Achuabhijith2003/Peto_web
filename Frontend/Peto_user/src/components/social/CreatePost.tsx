import {
  Image,
  Smile,
} from "lucide-react";

import avatar from "../../assets/hero.png";

const CreatePost = () => {
  return (
    <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <img
          src={avatar}
          alt="User"
          className="h-12 w-12 rounded-full object-cover"
        />

        <textarea
          rows={3}
          placeholder="Share something about your pet..."
          className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-blue-500"
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 hover:bg-slate-200">
            <Image size={18} />
            Photo
          </button>

          <button className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 hover:bg-slate-200">
            <Smile size={18} />
            Feeling
          </button>
        </div>

        <button className="rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700">
          Post
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
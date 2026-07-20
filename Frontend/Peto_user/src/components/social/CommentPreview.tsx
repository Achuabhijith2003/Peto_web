interface CommentPreviewProps {
  avatar: string;
  name: string;
  comment: string;
}

const CommentPreview = ({
  avatar,
  name,
  comment,
}: CommentPreviewProps) => {
  return (
    <div className="flex gap-3 px-6 py-4">
      <img
        src={avatar}
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
      />

      <div className="rounded-2xl bg-slate-100 px-4 py-3">
        <p className="font-semibold">
          {name}
        </p>

        <p className="text-slate-600">
          {comment}
        </p>
      </div>
    </div>
  );
};

export default CommentPreview;
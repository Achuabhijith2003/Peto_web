const CircleSkeleton = () => {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white shadow">
      <div className="h-52 bg-slate-200" />

      <div className="space-y-4 p-5">
        <div className="h-6 w-2/3 rounded bg-slate-200" />

        <div className="h-4 w-1/2 rounded bg-slate-200" />

        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-slate-200" />
          <div className="h-6 w-20 rounded-full bg-slate-200" />
        </div>

        <div className="h-11 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
};

export default CircleSkeleton;
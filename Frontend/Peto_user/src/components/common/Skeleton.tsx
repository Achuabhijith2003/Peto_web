import React from "react";

export const Skeleton: React.FC<{
  className?: string;
}> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-md ${className}`}
    />
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Profile Header Card Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Cover Skeleton */}
        <div className="h-32 sm:h-40 w-full bg-slate-200/70 animate-pulse" />
        <div className="px-5 pb-5 relative z-10">
          <div className="flex justify-between items-end -mt-10 sm:-mt-12 mb-3">
            {/* Avatar Skeleton */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-white bg-slate-200 animate-pulse shadow-micro shrink-0" />

            {/* Action Button Skeleton */}
            <div className="w-24 h-8 rounded-lg bg-slate-200 animate-pulse" />
          </div>

          <div className="space-y-2">
            {/* Name */}
            <div className="w-44 h-6 rounded bg-slate-200 animate-pulse" />
            {/* Username */}
            <div className="w-28 h-4 rounded bg-slate-200/80 animate-pulse" />
            {/* Bio */}
            <div className="w-full max-w-md h-4 rounded bg-slate-200/70 animate-pulse mt-2" />
            <div className="w-64 h-4 rounded bg-slate-200/70 animate-pulse" />

            {/* Stats row */}
            <div className="flex items-center gap-6 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded bg-slate-200 animate-pulse" />
                <div className="w-14 h-4 rounded bg-slate-200/80 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded bg-slate-200 animate-pulse" />
                <div className="w-16 h-4 rounded bg-slate-200/80 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded bg-slate-200 animate-pulse" />
                <div className="w-16 h-4 rounded bg-slate-200/80 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b border-slate-200/80 pb-2">
        <div className="w-24 h-9 rounded-lg bg-slate-200 animate-pulse" />
        <div className="w-24 h-9 rounded-lg bg-slate-200/70 animate-pulse" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-slate-200/80 animate-pulse border border-slate-100"
          />
        ))}
      </div>
    </div>
  );
};

export const PetProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Card Skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
          {/* Cover Photo */}
          <div className="h-44 sm:h-56 w-full bg-slate-200 animate-pulse" />
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-4 mb-4">
              {/* Pet Avatar */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white bg-slate-200 animate-pulse shadow-md shrink-0" />
              {/* Action Buttons */}
              <div className="flex gap-2">
                <div className="w-28 h-9 rounded-xl bg-slate-200 animate-pulse" />
                <div className="w-28 h-9 rounded-xl bg-slate-200 animate-pulse" />
              </div>
            </div>

            {/* Pet Info */}
            <div className="space-y-3">
              <div className="w-48 h-7 rounded-lg bg-slate-200 animate-pulse" />
              <div className="w-36 h-4 rounded bg-slate-200/80 animate-pulse" />
              <div className="w-full max-w-lg h-4 rounded bg-slate-200/70 animate-pulse" />

              {/* Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-7 rounded-full bg-slate-200 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Showcase / Media Grid Skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
          <div className="w-40 h-6 rounded bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

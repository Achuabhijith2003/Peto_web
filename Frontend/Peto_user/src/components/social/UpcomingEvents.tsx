import { Calendar, MapPin } from "lucide-react";

const UpcomingEvents = () => {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold">
        Upcoming Events
      </h3>

      <div className="space-y-5">
        <div className="rounded-xl border p-4">
          <h4 className="font-semibold">
            Pet Adoption Day
          </h4>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Calendar size={16} />
            28 July 2026
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={16} />
            Central Park
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <h4 className="font-semibold">
            Puppy Training Camp
          </h4>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Calendar size={16} />
            02 August 2026
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={16} />
            Pet Center
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingEvents;
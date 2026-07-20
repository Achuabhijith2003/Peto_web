import { Bell } from "lucide-react";

const NotificationPanel = () => {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Bell size={18} />
        <h3 className="font-bold">
          Notifications
        </h3>
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-xl bg-slate-100 p-4">
          Emma liked your post ❤️
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          Alex started following you.
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          New community event this weekend.
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
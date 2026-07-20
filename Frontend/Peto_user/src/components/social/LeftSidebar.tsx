import {
  Bookmark,
  Calendar,
  House,
  MessageCircle,
  PawPrint,
  Users,
} from "lucide-react";

const menu = [
  { icon: House, label: "Home" },
  { icon: Users, label: "Communities" },
  { icon: MessageCircle, label: "Messages" },
  { icon: Calendar, label: "Events" },
  { icon: Bookmark, label: "Saved Posts" },
];

const LeftSidebar = () => {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <PawPrint className="text-amber-600" />
            </div>

            <div>
              <h3 className="font-semibold">John Doe</h3>
              <p className="text-sm text-slate-500">
                Pet Parent
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="space-y-2">
            {menu.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-slate-100"
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;

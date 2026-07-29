import {
  Bookmark,
  Calendar,
  House,
  MessageCircle,
  PawPrint,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

const menu = [
  { icon: House, label: "Home", path: "/social" },
  { icon: Users, label: "Communities", path: "/community" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Bookmark, label: "Saved Posts", path: "/bookmarks" },
];

const LeftSidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            {user?.profile?.avatar_url && user.profile.avatar_url !== "null" ? (
              <img 
                src={user.profile.avatar_url} 
                alt={user.username} 
                className="h-14 w-14 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <PawPrint className="text-amber-600" />
              </div>
            )}

            <div>
              <h3 className="font-semibold">{user?.profile?.full_name || user?.username || "Guest"}</h3>
              <p className="text-sm text-slate-500">
                {user?.profile?.bio ? (user.profile.bio.length > 20 ? user.profile.bio.substring(0, 20) + "..." : user.profile.bio) : "Pet Parent"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="space-y-2">
            {menu.map(({ icon: Icon, label, path }) => (
              <Link
                to={path}
                key={label}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-slate-100 text-slate-700"
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;

import React from "react";
import { X, Bell, Volume2, Smartphone, Heart, MessageSquare, UserPlus, AtSign } from "lucide-react";
import type { NotificationSettings } from "../../hooks/useNotifications";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: Partial<NotificationSettings>) => void;
  onRequestPush: () => Promise<boolean>;
}

const NotificationSettingsModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRequestPush,
}) => {
  if (!isOpen) return null;

  const handlePushToggle = async () => {
    if (!settings.push_enabled) {
      const granted = await onRequestPush();
      if (!granted) return;
    } else {
      onUpdateSettings({ push_enabled: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Bell className="text-amber-500" size={22} />
            <h2 className="text-lg font-bold text-slate-800">Notification Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Setting Items */}
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          {/* Likes */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-500">
                <Heart size={18} />
              </div>
              <div>
                <p className="font-semibold">Likes</p>
                <p className="text-xs text-slate-500">When someone likes your posts</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.likes_enabled}
              onChange={(e) => onUpdateSettings({ likes_enabled: e.target.checked })}
              className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Comments */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-500">
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="font-semibold">Comments</p>
                <p className="text-xs text-slate-500">When someone comments on your post</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.comments_enabled}
              onChange={(e) => onUpdateSettings({ comments_enabled: e.target.checked })}
              className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Follows */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-500">
                <UserPlus size={18} />
              </div>
              <div>
                <p className="font-semibold">Follows</p>
                <p className="text-xs text-slate-500">When someone starts following you</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.follows_enabled}
              onChange={(e) => onUpdateSettings({ follows_enabled: e.target.checked })}
              className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Mentions */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-2 text-purple-500">
                <AtSign size={18} />
              </div>
              <div>
                <p className="font-semibold">Mentions</p>
                <p className="text-xs text-slate-500">When someone @mentions you</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mentions_enabled}
              onChange={(e) => onUpdateSettings({ mentions_enabled: e.target.checked })}
              className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Browser Push */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-500">
                <Smartphone size={18} />
              </div>
              <div>
                <p className="font-semibold">Push Notifications</p>
                <p className="text-xs text-slate-500">Browser push notification alerts</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.push_enabled}
              onChange={handlePushToggle}
              className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Sound Alerts */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2 text-indigo-500">
                <Volume2 size={18} />
              </div>
              <div>
                <p className="font-semibold">Sound Alerts</p>
                <p className="text-xs text-slate-500">Play audio chime on new notification</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sound_enabled}
              onChange={(e) => onUpdateSettings({ sound_enabled: e.target.checked })}
              className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white hover:bg-amber-600 transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsModal;

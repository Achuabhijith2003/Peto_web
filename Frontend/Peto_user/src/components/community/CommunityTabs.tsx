import { MessageSquare, Users, BookOpen, ShieldAlert } from "lucide-react";

interface CommunityTabsProps {
  activeTab: "discussion" | "members" | "about" | "moderation";
  onChangeTab: (tab: "discussion" | "members" | "about" | "moderation") => void;
  showModTab?: boolean;
  memberCount?: number;
  rulesCount?: number;
  reportsCount?: number;
}

const CommunityTabs = ({
  activeTab,
  onChangeTab,
  showModTab = false,
  memberCount,
  rulesCount,
  reportsCount,
}: CommunityTabsProps) => {
  const tabs: Array<{
    id: "discussion" | "members" | "about" | "moderation";
    label: string;
    icon: any;
    badge?: string | number;
  }> = [
    {
      id: "discussion",
      label: "Discussions",
      icon: MessageSquare,
    },
    {
      id: "members",
      label: "Members",
      icon: Users,
      badge: memberCount !== undefined ? memberCount.toLocaleString() : undefined,
    },
    {
      id: "about",
      label: "Rules & Info",
      icon: BookOpen,
      badge: rulesCount !== undefined ? rulesCount : undefined,
    },
  ];

  if (showModTab) {
    tabs.push({
      id: "moderation",
      label: "Moderator Queue",
      icon: ShieldAlert,
      badge: reportsCount !== undefined && reportsCount > 0 ? reportsCount : undefined,
    });
  }

  return (
    <div className="flex border-b border-slate-200/80 bg-white rounded-2xl p-1 shadow-xs mb-6 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-amber-100"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CommunityTabs;

import SuggestedFriends from "./SuggestedFriends";
// import TrendingTopics from "./TrendingTopics";
// import UpcomingEvents from "./UpcomingEvents";
// import SponsoredCard from "./SponsoredCard";
import OnlineFriends from "./OnlineFriends";
import NotificationPanel from "./NotificationPanel";
// import ChatWidget from "./ChatWidget";

const RightSidebar = () => {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto space-y-6 pr-1.5 pb-8 [::-webkit-scrollbar]:w-1.5 [::-webkit-scrollbar-thumb]:bg-slate-200 [::-webkit-scrollbar-thumb]:rounded-full hover:[::-webkit-scrollbar-thumb]:bg-amber-300">
        <NotificationPanel />

        <SuggestedFriends />

        {/* <TrendingTopics /> */}

        {/* <UpcomingEvents /> */}

        <OnlineFriends />

        {/* <SponsoredCard /> */}

        {/* <ChatWidget /> */}
      </div>
    </aside>
  );
};

export default RightSidebar;
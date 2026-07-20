import SuggestedFriends from "./SuggestedFriends";
import TrendingTopics from "./TrendingTopics";
import UpcomingEvents from "./UpcomingEvents";
import SponsoredCard from "./SponsoredCard";
import OnlineFriends from "./OnlineFriends";
import NotificationPanel from "./NotificationPanel";
import ChatWidget from "./ChatWidget";

const RightSidebar = () => {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-6">
        <NotificationPanel />

        <SuggestedFriends />

        <TrendingTopics />

        <UpcomingEvents />

        <OnlineFriends />

        <SponsoredCard />

        <ChatWidget />
      </div>
    </aside>
  );
};

export default RightSidebar;
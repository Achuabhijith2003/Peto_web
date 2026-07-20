import Navbar from "../components/layout/Navbar";

import Feed from "../components/social/Feed";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";

import MobileBottomNav from "../components/social/MobileBottomNav";
import FloatingChatButton from "../components/social/FloatingChatButton";

const Social = () => {
  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <SocialLayout
        left={<LeftSidebar />}
        center={<Feed />}
        right={<RightSidebar />}
      />

      <FloatingChatButton />

      <MobileBottomNav />
    </main>
  );
};

export default Social;
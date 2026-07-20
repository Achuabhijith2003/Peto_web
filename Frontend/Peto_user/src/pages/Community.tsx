import CommunityLayout from "../components/community/CommunityLayout";
import CommunityHero from "../components/community/CommunityHero";
import TrendingCircles from "../components/community/TrendingCircles";
import ExpertCircles from "../components/community/ExpertCircles";
import CreateCircleCTA from "../components/community/CreateCircleCTA";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";

const Community = () => {
  return (
    <CommunityLayout>
      <Navbar />

      <CommunityHero />

      <TrendingCircles />

      <ExpertCircles />

      <CreateCircleCTA />

      <Footer />
    </CommunityLayout>
  );
};

export default Community;
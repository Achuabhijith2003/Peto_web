import Navbar from "../components/layout/Navbar";
import Hero from "../components/home/Hero";
import Features from "../components/home/Features";
import ProductSection from "../components/home/ProductSection";
import CommunitySection from "../components/home/CommunitySection";
import Newsletter from "../components/home/Newsletter";
import Footer from "../components/layout/Footer";

const Home = () => {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <Hero />

      <Features />

      <ProductSection />

      <CommunitySection />

      <Newsletter />

      <Footer />
    </main>
  );
};

export default Home;
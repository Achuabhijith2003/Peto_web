import CircleCard from "./CircleCard";
import { useCommunity } from "../../hooks/useCommunity";
import CircleSkeleton from "./CircleSkeleton";
import AnimatedSection from "./AnimatedSection";

// import dog from "../../assets/hero.png";
// import cat from "../../assets/hero.png";
// import bird from "../../assets/hero.png";
// import training from "../../assets/hero.png";

const { circles, loading } = useCommunity();

const TrendingCircles = () => {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold">
              Trending Circles
            </h2>

            <p className="mt-2 text-slate-500">
              The most active packs this week
            </p>
          </div>

          <button className="font-medium text-amber-500 hover:underline">
            View All →
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
  {loading
    ? Array.from({ length: 4 }).map((_, index) => (
        <CircleSkeleton key={index} />
      ))
    : circles.map((circle) => (
        <AnimatedSection key={circle.id}>
          <CircleCard {...circle} />
        </AnimatedSection>
      ))}
</div>
      </div>
    </section>
  );
};

export default TrendingCircles;
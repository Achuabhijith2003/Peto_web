import CommunityCard from "./CommunityCard";
import SectionTitle from "./SectionTitle";
import AvatarGroup from "./AvatarGroup";

import post1 from "../../assets/hero.png";
import post2 from "../../assets/hero.png";

import avatar1 from "../../assets/hero.png";
import avatar2 from "../../assets/hero.png";
import avatar3 from "../../assets/hero.png";

const CommunitySection = () => {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="Trending Community"
          subtitle="See what pet parents are sharing today."
        />

        <div className="mb-12 flex items-center justify-between rounded-3xl bg-blue-600 p-8 text-white">
          <div>
            <h3 className="text-3xl font-bold">
              Join 50,000+ Pet Lovers
            </h3>

            <p className="mt-3 opacity-90">
              Share stories, ask questions, and connect with pet parents.
            </p>

            <button className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-blue-600 transition hover:bg-slate-100">
              Join Community
            </button>
          </div>

          <AvatarGroup
            avatars={[avatar1, avatar2, avatar3]}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <CommunityCard
            image={post1}
            avatar={avatar1}
            user="Emma Wilson"
            location="New York"
            caption="Charlie loved his first beach adventure today! 🐶🌊"
            likes={284}
            comments={41}
          />

          <CommunityCard
            image={post2}
            avatar={avatar2}
            user="Alex Brown"
            location="California"
            caption="Trying a new healthy meal plan recommended by Pawfect AI!"
            likes={173}
            comments={29}
          />
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
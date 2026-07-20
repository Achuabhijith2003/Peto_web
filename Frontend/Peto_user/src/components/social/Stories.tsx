import StoryCard from "./StoryCard";

import story1 from "../../assets/hero.png";
import story2 from "../../assets/hero.png";
import story3 from "../../assets/hero.png";
import story4 from "../../assets/hero.png";

import avatar1 from "../../assets/hero.png";
import avatar2 from "../../assets/hero.png";
import avatar3 from "../../assets/hero.png";
import avatar4 from "../../assets/hero.png";

const Stories = () => {
  const stories = [
    {
      image: story1,
      avatar: avatar1,
      name: "Emma",
    },
    {
      image: story2,
      avatar: avatar2,
      name: "Alex",
    },
    {
      image: story3,
      avatar: avatar3,
      name: "Sophia",
    },
    {
      image: story4,
      avatar: avatar4,
      name: "Ryan",
    },
  ];

  return (
    <div className="mb-8 flex gap-4 overflow-x-auto pb-2">
      {stories.map((story) => (
        <StoryCard
          key={story.name}
          {...story}
        />
      ))}
    </div>
  );
};

export default Stories;
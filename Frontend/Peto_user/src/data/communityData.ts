export interface Circle {
  id: number;
  title: string;
  image: string;
  members: string;
  badge?: string;
  tags: string[];
}

import dog from "../assets/hero.png";
import cat from "../assets/hero.png";
import bird from "../assets/hero.png";
import training from "../assets/hero.png";

export const circles: Circle[] = [
  {
    id: 1,
    title: "Golden Retriever Lovers",
    image: dog,
    members: "12.4k",
    badge: "Popular",
    tags: ["DailyLife", "TrainingTips"],
  },
  {
    id: 2,
    title: "Senior Cat Care",
    image: cat,
    members: "8.2k",
    tags: ["AgingGracefully", "HealthTips"],
  },
  {
    id: 3,
    title: "Exotic Birds",
    image: bird,
    members: "3.5k",
    tags: ["AvianHealth", "ParrotLife"],
  },
  {
    id: 4,
    title: "Puppy Training 101",
    image: training,
    members: "15.1k",
    tags: ["NewPuppy", "Behavior"],
  },
];
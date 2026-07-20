import { Circle } from "lucide-react";

import user1 from "../../assets/hero.png";
import user2 from "../../assets/hero.png";
import user3 from "../../assets/hero.png";

const users = [
  { id: 1, name: "Emma", avatar: user1 },
  { id: 2, name: "Alex", avatar: user2 },
  { id: 3, name: "Sophia", avatar: user3 },
];

const OnlineFriends = () => {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold">
        Online Friends
      </h3>

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="h-12 w-12 rounded-full object-cover"
              />

              <Circle
                size={12}
                className="absolute bottom-0 right-0 fill-green-500 text-green-500"
              />
            </div>

            <span>{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnlineFriends;
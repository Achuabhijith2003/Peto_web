interface Friend {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

import user3 from "../../assets/hero.png";
import user4 from "../../assets/hero.png";
import user5 from "../../assets/hero.png";

const friends: Friend[] = [
  {
    id: 1,
    name: "Sophia Carter",
    role: "Dog Trainer",
    avatar: user3,
  },
  {
    id: 2,
    name: "Daniel Lee",
    role: "Pet Lover",
    avatar: user4,
  },
  {
    id: 3,
    name: "Olivia Smith",
    role: "Veterinarian",
    avatar: user5,
  },
];

const SuggestedFriends = () => {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold">
        Suggested Friends
      </h3>

      <div className="space-y-5">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <img
                src={friend.avatar}
                alt={friend.name}
                className="h-12 w-12 rounded-full object-cover"
              />

              <div>
                <p className="font-medium">
                  {friend.name}
                </p>

                <span className="text-sm text-slate-500">
                  {friend.role}
                </span>
              </div>
            </div>

            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedFriends;

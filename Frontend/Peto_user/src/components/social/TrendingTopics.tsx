const topics = [
  "#GoldenRetriever",
  "#PetNutrition",
  "#PuppyTraining",
  "#AdoptDontShop",
  "#HealthyPets",
];

const TrendingTopics = () => {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold">
        Trending Topics
      </h3>

      <div className="space-y-3">
        {topics.map((topic) => (
          <button
            key={topic}
            className="block w-full rounded-xl bg-slate-100 px-4 py-3 text-left transition hover:bg-blue-50"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrendingTopics;
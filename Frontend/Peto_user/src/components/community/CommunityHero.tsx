import SearchBar from "./SearchBar";
import CategoryPills from "./CategoryPills";

const CommunityHero = () => {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
          Community Hub
        </span>

        <h1 className="mt-8 text-5xl font-bold leading-tight text-slate-900">
          Every Pet has a Story.
          <br />

          <span className="text-amber-500">
            Join the Conversation.
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-600">
          Connect with thousands of pet parents, share advice,
          celebrate milestones and discover communities
          built around every breed and interest.
        </p>

        <SearchBar />

        <CategoryPills />
      </div>
    </section>
  );
};

export default CommunityHero;
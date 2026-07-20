import { Search } from "lucide-react";

const SearchBar = () => {
  return (
    <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-4 md:flex-row">
      <div className="relative flex-1">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          placeholder="Find your pack (Golden Retriever, Cats...)"
          className="w-full rounded-xl border border-gray-300 py-4 pl-12 pr-4 outline-none focus:border-amber-500"
        />
      </div>

      <button className="rounded-xl bg-amber-500 px-8 py-4 font-semibold text-white transition hover:bg-amber-600">
        Explore All Circles
      </button>
    </div>
  );
};

export default SearchBar;
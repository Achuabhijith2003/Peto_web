const CreateCircleCTA = () => {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-[32px] bg-amber-500 px-10 py-20 text-center text-white shadow-xl">
          <h2 className="text-5xl font-bold">
            Can't find your perfect circle?
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg opacity-90">
            Start your own community and connect with pet lovers
            who share your passion. Whether it's a breed, rescue,
            or unique hobby—there's a place for everyone.
          </p>

          <button className="mt-10 rounded-xl bg-white px-8 py-4 font-semibold text-amber-600 shadow transition hover:scale-105">
            Create a New Circle
          </button>
        </div>
      </div>
    </section>
  );
};

export default CreateCircleCTA;
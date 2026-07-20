import Button from "../common/Button";

const Newsletter = () => {
  return (
    <section className="bg-amber-500 py-20">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-12 shadow-xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
              Newsletter
            </span>

            <h2 className="mt-5 text-4xl font-bold text-slate-900">
              Stay Updated With Pet Care Tips
            </h2>

            <p className="mt-4 text-slate-600">
              Receive expert advice, exclusive offers and new product launches
              directly in your inbox.
            </p>
          </div>

          <form className="flex flex-col gap-4 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-slate-300 px-5 py-4 outline-none focus:border-blue-500"
            />

            <Button className="sm:w-auto px-8">
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
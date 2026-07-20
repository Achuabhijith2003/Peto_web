import product from "../../assets/hero.png";

const SponsoredCard = () => {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <img
        src={product}
        alt="Sponsored Product"
        className="h-52 w-full object-cover"
      />

      <div className="p-5">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Sponsored
        </span>

        <h3 className="mt-4 text-lg font-bold">
          Premium Pet Nutrition
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Give your furry friend a healthier lifestyle with balanced nutrition.
        </p>

        <button className="mt-5 w-full rounded-xl bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600">
          Shop Now
        </button>
      </div>
    </div>
  );
};

export default SponsoredCard;
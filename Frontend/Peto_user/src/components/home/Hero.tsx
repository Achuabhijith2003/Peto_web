import { motion } from "framer-motion";

import hero from "../../assets/hero.png";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <img
        src={hero}
        alt=""
        className="h-[700px] w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent" />

      <div className="absolute left-12 top-1/2 max-w-xl -translate-y-1/2">
        <span className="rounded-full bg-green-100 px-4 py-2 text-sm text-green-700">
          Trusted by 10k+ Pet Parents
        </span>

        <motion.h1
          className="mt-6 text-6xl font-bold leading-tight"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Your Pet's Happiness,
          <br />

          <span className="text-amber-500">
            Our Passion.
          </span>
        </motion.h1>

        <p className="mt-6 text-lg text-slate-600">
          Experience premium pet care with AI-powered
          nutrition, veterinary guidance and an active
          community.
        </p>

        <div className="mt-8 flex gap-4">
          <button className="rounded-xl bg-amber-500 px-7 py-3 font-semibold text-white hover:bg-amber-600">
            Shop Now
          </button>

          <button className="rounded-xl border border-blue-600 px-7 py-3 font-semibold text-blue-600 hover:bg-blue-50">
            Talk to AI
          </button>
        </div>

        <button className="mt-5 rounded-xl bg-green-700 px-7 py-3 font-semibold text-white">
          Explore Social Feed
        </button>
      </div>
    </section>
  );
};

export default Hero;
import { CheckCircle } from "lucide-react";

import expertImage from "../../assets/hero.png";

const features = [
  "Verified professional advice",
  "Weekly Q&A live sessions",
  "Personalized health reminders",
];

const ExpertCircles = () => {
  return (
    <section className="bg-slate-100 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        {/* Left Image */}

        <div className="relative">
          <img
            src={expertImage}
            alt="Expert Circle"
            className="w-full rounded-3xl object-cover shadow-xl"
          />

          <div className="absolute bottom-6 left-6 rounded-2xl bg-white p-4 shadow-lg">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              WELLNESS TIP
            </span>

            <p className="mt-3 text-sm text-slate-600">
              Regular exercise can extend your pet's life by up to
              <span className="font-semibold"> 2 years.</span>
            </p>
          </div>
        </div>

        {/* Right Content */}

        <div>
          <h2 className="text-4xl font-bold text-slate-900">
            Expert-Led Circles
          </h2>

          <p className="mt-6 leading-8 text-slate-600">
            Join circles moderated by certified veterinarians and
            experienced trainers. Get reliable answers from trusted
            professionals whenever you need help.
          </p>

          <div className="mt-8 space-y-4">
            {features.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3"
              >
                <CheckCircle
                  className="text-green-600"
                  size={20}
                />

                <span>{item}</span>
              </div>
            ))}
          </div>

          <button className="mt-10 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700">
            Explore Health Circles →
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExpertCircles;
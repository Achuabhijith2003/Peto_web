import {
  Bot,
  Stethoscope,
  ShieldPlus,
} from "lucide-react";

import FeatureCard from "./FeatureCard";

const Features = () => {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Large Card */}

        <FeatureCard
          title="Meet Your Pet Care AI"
          description="Get instant answers to nutrition, training, health and behavior questions powered by AI."
          buttonText="Start Chatting"
          icon={<Bot size={40} />}
          variant="blue"
          className="min-h-[470px] lg:col-span-2"
        />

        {/* Right Column */}

        <div className="space-y-6">
          <FeatureCard
            title="Virtual Vet Visits"
            description="Connect with certified veterinarians in minutes from your home."
            buttonText="Book Consultation"
            icon={<Stethoscope size={40} />}
            variant="green"
          />

          <FeatureCard
            title="Health Reminders"
            description="Vaccinations, medications and checkups. Never miss an appointment."
            buttonText="Manage Records"
            icon={<ShieldPlus size={40} />}
            variant="light"
          />
        </div>
      </div>
    </section>
  );
};

export default Features;
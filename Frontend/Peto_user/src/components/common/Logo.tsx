import { PawPrint } from "lucide-react";

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <PawPrint className="text-amber-500" size={28} />

      <span className="font-heading text-2xl font-bold">
        Pawfect Pals
      </span>
    </div>
  );
};

export default Logo;
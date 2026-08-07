import { PawPrint } from "lucide-react";
import { Link } from "react-router-dom";

const Logo = () => {
  return (
    <Link to="/" className="group flex items-center gap-2.5 transition">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-md shadow-amber-500/20 transition group-hover:scale-105">
        <PawPrint size={22} className="stroke-[2.2px]" />
      </div>

      <div className="flex flex-col">
        <span className="font-headline text-2xl font-bold tracking-tight text-slate-900 group-hover:text-amber-600 transition">
          Peto
        </span>
        <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase -mt-1 font-sans">
          Pet Parent Community
        </span>
      </div>
    </Link>
  );
};

export default Logo;
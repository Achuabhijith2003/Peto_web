import {
  Search,
  ShoppingBag,
  Heart,
  User,
} from "lucide-react";

import Logo from "../common/Logo";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-8 text-sm lg:flex">
          <a className="font-semibold text-amber-600" href="#">
            Shop
          </a>

          <a href="#">Pet Care AI</a>

          <a href="#">Vets</a>

          <a href="#">Services</a>

          <a href="#">About</a>

          <a href="#">Social</a>

          <a href="#">Communities</a>
        </nav>

        <div className="flex items-center gap-5">
          <div className="hidden items-center rounded-full bg-slate-100 px-4 py-2 lg:flex">
            <Search size={18} />

            <input
              placeholder="Search..."
              className="ml-2 bg-transparent outline-none"
            />
          </div>

          <ShoppingBag size={20} />

          <Heart size={20} />

          <User size={20} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
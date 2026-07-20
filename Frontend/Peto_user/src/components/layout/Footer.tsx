import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

import Logo from "../common/Logo";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}

          <div className="lg:col-span-2">
            <Logo />

            <p className="mt-5 max-w-sm text-slate-400">
              Helping pet parents provide healthier, happier lives through AI,
              expert guidance, premium products and an active community.
            </p>

            <div className="flex gap-4">
              <a href="#">
                <FaFacebookF size={22} />
              </a>

              <a href="#">
                <FaInstagram size={22} />
              </a>

              <a href="#">
                <FaXTwitter size={22} />
              </a>

              <a href="#">
                <FaYoutube size={22} />
              </a>
            </div>
          </div>

          {/* Shop */}

          <div>
            <h4 className="mb-5 text-lg font-semibold">
              Shop
            </h4>

            <ul className="space-y-3 text-slate-400">
              <li><a href="#">Food</a></li>
              <li><a href="#">Accessories</a></li>
              <li><a href="#">Toys</a></li>
              <li><a href="#">Health</a></li>
            </ul>
          </div>

          {/* Services */}

          <div>
            <h4 className="mb-5 text-lg font-semibold">
              Services
            </h4>

            <ul className="space-y-3 text-slate-400">
              <li><a href="#">AI Assistant</a></li>
              <li><a href="#">Virtual Vet</a></li>
              <li><a href="#">Pet Grooming</a></li>
              <li><a href="#">Insurance</a></li>
            </ul>
          </div>

          {/* Company */}

          <div>
            <h4 className="mb-5 text-lg font-semibold">
              Company
            </h4>

            <ul className="space-y-3 text-slate-400">
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
          © 2026 Pawfect Pals. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
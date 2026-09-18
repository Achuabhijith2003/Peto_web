import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

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

          {/* Company & Legal */}

          <div>
            <h4 className="mb-5 text-lg font-semibold">
              Legal & Policies
            </h4>

            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <Link to="/terms-of-service" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/community-guidelines" className="hover:text-white transition">
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link to="/policies" className="hover:text-white transition">
                  All Policies & PDFs
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-slate-700 pt-8 text-center text-sm text-slate-400 flex flex-wrap items-center justify-between gap-4">
          <div>© 2026 Peto (Pawfect Pals). All rights reserved.</div>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link to="/privacy-policy" className="hover:text-slate-300 transition">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-300 transition">
              Terms
            </Link>
            <Link to="/community-guidelines" className="hover:text-slate-300 transition">
              Guidelines
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
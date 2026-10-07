import type { ReactNode } from "react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { PawPrint, Heart, Users, ShieldCheck } from "lucide-react";

interface Props {
  image?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const AuthLayout = ({
  title,
  subtitle,
  children,
}: Props) => {
  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 py-10 min-h-[85vh] grid items-center gap-12 lg:grid-cols-2">
        {/* Left Hero: Content-First Pet Parent Showcase */}
        <section className="hidden lg:flex flex-col justify-between h-[600px] rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-12 text-white shadow-xl relative overflow-hidden">
          {/* Subtle background paw prints */}
          <div className="absolute -top-10 -right-10 opacity-10">
            <PawPrint size={240} />
          </div>
          <div className="absolute -bottom-12 -left-12 opacity-10">
            <PawPrint size={200} />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <PawPrint size={14} className="text-white" />
              <span>Pet Parent Community & Ecosystem</span>
            </div>

            <h2 className="font-headline text-4xl xl:text-5xl font-bold leading-tight">
              Where pet parents connect, share, and care together.
            </h2>

            <p className="text-sm xl:text-base text-amber-100 max-w-md leading-relaxed">
              Join thousands of pet lovers sharing daily adventures, finding expert advice, and celebrating the joy our furry companions bring to life.
            </p>
          </div>

          {/* Social Proof & Features */}
          <div className="relative z-10 space-y-4 pt-8 border-t border-white/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                  <Users size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Dedicated Circles</h4>
                  <p className="text-[11px] text-amber-100">Breed & regional groups</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                  <Heart size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Pet Profiles</h4>
                  <p className="text-[11px] text-amber-100">Showcase your companions</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-amber-100">
              <ShieldCheck size={16} className="text-white" />
              <span>Safe, verified community with zero ad-spam.</span>
            </div>
          </div>
        </section>

        {/* Right Form Card */}
        <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-xl border border-slate-100">
          <h1 className="font-headline text-3xl font-bold text-slate-900">
            {title}
          </h1>

          <p className="mt-2 mb-8 text-sm text-slate-500">
            {subtitle}
          </p>

          {children}
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AuthLayout;
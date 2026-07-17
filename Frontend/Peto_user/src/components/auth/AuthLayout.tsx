import type { ReactNode } from "react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";

interface Props {
  image: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const AuthLayout = ({
  image,
  title,
  subtitle,
  children,
}: Props) => {
  return (
    <>
      <Navbar />

      <main className="container grid min-h-[85vh] items-center gap-12 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <img
            src={image}
            alt={title}
            className="h-[650px] w-full rounded-3xl object-cover shadow-xl"
          />
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">
          <h1 className="font-heading text-4xl font-bold">
            {title}
          </h1>

          <p className="mt-3 mb-8 text-gray-500">
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
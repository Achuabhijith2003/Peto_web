import type { ReactNode } from "react";

interface SocialLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

const SocialLayout = ({
  left,
  center,
  right,
}: SocialLayoutProps) => {
  return (
    <div className="mx-auto grid w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1680px] gap-6 xl:gap-8 px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_340px] 2xl:grid-cols-[300px_1fr_380px]">
      {left}

      {center}

      {right}
    </div>
  );
};

export default SocialLayout;
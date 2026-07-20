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
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_320px]">
      {left}

      {center}

      {right}
    </div>
  );
};

export default SocialLayout;
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const CommunityLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
};

export default CommunityLayout;
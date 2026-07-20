import {
  House,
  Users,
  PlusSquare,
  Bell,
  User,
} from "lucide-react";

const MobileBottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t bg-white py-3 shadow lg:hidden">
      <House />

      <Users />

      <PlusSquare />

      <Bell />

      <User />
    </nav>
  );
};

export default MobileBottomNav;
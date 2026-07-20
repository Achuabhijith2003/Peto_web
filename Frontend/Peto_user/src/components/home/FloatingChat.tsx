import { Bot } from "lucide-react";

const FloatingChat = () => {
  return (
    <button
      className="
      fixed
      bottom-8
      right-8
      z-50
      flex
      h-14
      w-14
      items-center
      justify-center
      rounded-full
      bg-blue-600
      text-white
      shadow-xl
      transition
      hover:scale-110"
    >
      <Bot size={26} />
    </button>
  );
};

export default FloatingChat;
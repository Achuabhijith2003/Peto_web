import { Bot } from "lucide-react";

const FloatingChatButton = () => {
  return (
    <button className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition hover:scale-110">
      <Bot size={28} />
    </button>
  );
};

export default FloatingChatButton;
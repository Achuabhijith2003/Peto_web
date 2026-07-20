import { MessageCircle } from "lucide-react";

const ChatWidget = () => {
  return (
    <div className="rounded-3xl bg-blue-600 p-6 text-white shadow">
      <MessageCircle size={30} />

      <h3 className="mt-4 text-xl font-bold">
        Need Help?
      </h3>

      <p className="mt-3 text-sm opacity-90">
        Chat with our AI Pet Assistant for instant guidance.
      </p>

      <button className="mt-5 w-full rounded-xl bg-white py-3 font-semibold text-blue-600">
        Start Chat
      </button>
    </div>
  );
};

export default ChatWidget;
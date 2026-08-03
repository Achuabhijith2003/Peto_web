import React from "react";
import { useNavigate } from "react-router-dom";
import { X, PawPrint,  UserPlus, LogIn } from "lucide-react";

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  actionName,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getActionText = () => {
    if (!actionName) return "interact with pet parents";
    return actionName;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X size={18} />
        </button>

        {/* Modal Content */}
        <div className="text-center pt-2 pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-400 shadow-md text-white">
            <PawPrint size={32} />
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Join the Peto Community! 🐾
          </h2>

          <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
            You need an account to <span className="font-semibold text-amber-600">{getActionText()}</span>. Sign in or create a free account to connect with pet lovers, share updates, and join discussions!
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                onClose();
                navigate("/login");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-600 transition"
            >
              <LogIn size={18} />
              Sign In to Your Account
            </button>

            <button
              onClick={() => {
                onClose();
                navigate("/register");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              <UserPlus size={18} />
              Create a Free Account
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
            >
              Continue Browsing as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;

import {
  forwardRef,
 type InputHTMLAttributes,
  useState,
} from "react";

import { Eye, EyeOff } from "lucide-react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const PasswordField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="space-y-2">
        <label className="font-medium">
          {label}
        </label>

        <div className="relative">
          <input
            ref={ref}
            type={show ? "text" : "password"}
            {...props}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 pr-12 outline-none transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2"
            onClick={() => setShow((prev) => !prev)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";

export default PasswordField;
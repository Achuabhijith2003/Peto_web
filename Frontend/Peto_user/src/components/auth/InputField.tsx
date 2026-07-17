import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const InputField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label className="font-medium text-gray-700">
          {label}
        </label>

        <input
          ref={ref}
          {...props}
          className="w-full rounded-xl bg-gray-100 px-4 py-3 outline-none transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-blue-500"
        />

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = "InputField";

export default InputField;
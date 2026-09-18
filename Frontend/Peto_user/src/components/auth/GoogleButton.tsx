import React, { useState } from "react";
import Button from "../common/Button";
import { supabase } from "../../utils/supabaseClient";

interface GoogleButtonProps {
  className?: string;
  redirectTo?: string;
}

const GoogleButton: React.FC<GoogleButtonProps> = ({ className, redirectTo }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetRedirect = redirectTo || `${window.location.origin}/auth/callback`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: targetRedirect,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to start Google sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      <Button
        type="button"
        variant="secondary"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className={`flex items-center justify-center gap-3 w-full cursor-pointer ${className || ""}`}
      >
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google"
          className="h-5 w-5"
        />
        <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
      </Button>
      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
    </div>
  );
};

export default GoogleButton;
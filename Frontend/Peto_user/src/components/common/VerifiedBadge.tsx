import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  verified?: boolean;
  size?: number;
  verificationType?: "PERSON_VERIFIED" | "BUSINESS_VERIFIED" | "PERSON" | "BUSINESS" | string;
  className?: string;
}

export default function VerifiedBadge({
  verified,
  size = 15,
  verificationType = "PERSON_VERIFIED",
  className = "",
}: VerifiedBadgeProps) {
  if (!verified) return null;
  const isBusiness =
    verificationType === "BUSINESS_VERIFIED" ||
    verificationType === "BUSINESS" ||
    verificationType === "BUSINESS_PARTNER";
  const label = isBusiness ? "Business verified" : "Person verified";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 align-middle ${
        isBusiness ? "text-amber-500" : "text-blue-500"
      } ${className}`}
    >
      <BadgeCheck
        size={size}
        fill={isBusiness ? "#fef3c7" : "#dbeafe"}
        aria-hidden="true"
      />
    </span>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { PawPrint } from "lucide-react";

interface MentionTextProps {
  text: string;
  mentions?: { id: string; username: string; full_name?: string }[];
  taggedPets?: { id: string; name: string; species?: string; avatar_url?: string }[];
  className?: string;
  showPetChips?: boolean;
}

export const MentionText: React.FC<MentionTextProps> = ({
  text,
  mentions = [],
  taggedPets = [],
  className = "",
  showPetChips = true,
}) => {
  if (!text) {
    if (showPetChips && taggedPets.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {taggedPets.map((pet) => (
            <Link
              key={pet.id}
              to={`/pets/${pet.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition shadow-2xs"
            >
              <PawPrint size={12} className="text-amber-600" />
              <span>{pet.name}</span>
            </Link>
          ))}
        </div>
      );
    }
    return null;
  }

  // Create lookup for mentioned users by lowercase username
  const mentionMap = new Map<string, string>();
  for (const m of mentions) {
    if (m.username) {
      mentionMap.set(m.username.toLowerCase(), m.id);
    }
  }

  // Regex tokenizing @username while keeping text segments
  const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
  const parts = text.split(mentionRegex);

  return (
    <div className={className}>
      <p className="whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          if (part.startsWith("@")) {
            const rawUsername = part.substring(1);
            const lowerUsername = rawUsername.toLowerCase();
            const userId = mentionMap.get(lowerUsername);

            const profileRoute = userId ? `/profile/${userId}` : `/profile/${rawUsername}`;

            return (
              <Link
                key={i}
                to={profileRoute}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-amber-600 hover:text-amber-700 hover:underline transition inline-block mx-0.5"
              >
                {part}
              </Link>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </p>

      {showPetChips && taggedPets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-1">
          <span className="text-xs font-medium text-slate-400 mr-0.5">With:</span>
          {taggedPets.map((pet) => (
            <Link
              key={pet.id}
              to={`/pets/${pet.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 hover:scale-105 transition shadow-2xs"
            >
              {pet.avatar_url ? (
                <img
                  src={pet.avatar_url}
                  alt={pet.name}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
              ) : (
                <PawPrint size={11} className="text-amber-600" />
              )}
              <span>{pet.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionText;

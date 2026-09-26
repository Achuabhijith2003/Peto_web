export type PetSpecies =
  | "DOG"
  | "CAT"
  | "BIRD"
  | "RABBIT"
  | "HAMSTER"
  | "GUINEA_PIG"
  | "FISH"
  | "REPTILE"
  | "HORSE"
  | "OTHER";

export type PetSex = "MALE" | "FEMALE" | "UNKNOWN";

export type PetSize = "EXTRA_SMALL" | "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";

export type PetStatus = "ACTIVE" | "MISSING" | "REHOMED" | "DECEASED" | "ARCHIVED";

export type PetVisibility = "PUBLIC" | "CONNECTIONS" | "PRIVATE";

export type PetRelationship =
  | "OWNER"
  | "CO_OWNER"
  | "PET_PARENT"
  | "FAMILY_MEMBER"
  | "CAREGIVER"
  | "FOSTER_PARENT"
  | "GUARDIAN";

export type PetParentStatus = "ACTIVE" | "PENDING_INVITE" | "DECLINED" | "REMOVED";

export type PetPermission =
  | "VIEW_PROFILE"
  | "EDIT_PROFILE"
  | "UPLOAD_MEDIA"
  | "CREATE_PET_POST"
  | "MANAGE_PARENTS"
  | "MANAGE_PRIVACY";

export interface PetParentProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface PetParent {
  id: string;
  pet_id: string;
  user_id: string;
  relationship: PetRelationship;
  is_primary: boolean;
  status: PetParentStatus;
  permissions: PetPermission[];
  created_at: string;
  updated_at: string;
  user?: PetParentProfile;
}

export interface PetMediaItem {
  id: string;
  pet_id: string;
  media_id: string;
  role: "PROFILE" | "COVER" | "GALLERY" | "MEMORY";
  visibility: "INHERIT" | "PUBLIC" | "PRIVATE";
  caption?: string | null;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
  created_by?: string | null;
  created_at: string;
  url?: string | null;
  media_url?: string | null;
  type?: string | null;
  media_type?: string | null;
  thumbnail_url?: string | null;
  is_profile?: boolean;
  is_cover?: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  species_name?: string | null;
  breed?: string | null;
  breed_secondary?: string | null;
  sex: PetSex;
  date_of_birth?: string | null;
  is_date_of_birth_approximate: boolean;
  color?: string | null;
  size?: PetSize | null;
  bio?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  profile_visibility: PetVisibility;
  profile_media_id?: string | null;
  cover_media_id?: string | null;
  status: PetStatus;
  created_at: string;
  updated_at: string;

  // Joined/resolved fields
  visibility?: PetVisibility;
  profile_photo_url?: string | null;
  cover_photo_url?: string | null;
  profile_media_url?: string | null;
  cover_media_url?: string | null;
  parents?: PetParent[];
  media?: PetMediaItem[];
  current_user_relationship?: PetParent | null;
  is_parent?: boolean;
  can_edit?: boolean;
  can_manage_parents?: boolean;
  viewer_permissions?: {
    can_view: boolean;
    can_edit: boolean;
    can_upload_media: boolean;
    can_manage_parents: boolean;
    can_manage_privacy: boolean;
  };
  viewer_relationship?: {
    is_parent: boolean;
    is_primary?: boolean;
    relationship_type?: string;
    permissions?: string[];
  };
}

export interface CreatePetInput {
  name: string;
  species: PetSpecies;
  species_name?: string;
  breed?: string;
  breed_secondary?: string;
  sex?: PetSex;
  date_of_birth?: string;
  is_date_of_birth_approximate?: boolean;
  color?: string;
  size?: PetSize;
  bio?: string;
  country?: string;
  state?: string;
  city?: string;
  profile_visibility?: PetVisibility;
  profile_media_id?: string;
  profile_media_url?: string;
  cover_media_id?: string;
  cover_media_url?: string;
  relationship?: PetRelationship;
}

export interface UpdatePetInput {
  name?: string;
  species?: PetSpecies;
  species_name?: string;
  breed?: string;
  breed_secondary?: string;
  sex?: PetSex;
  date_of_birth?: string;
  is_date_of_birth_approximate?: boolean;
  color?: string;
  size?: PetSize;
  bio?: string;
  country?: string;
  state?: string;
  city?: string;
  profile_visibility?: PetVisibility;
  profile_media_id?: string;
  profile_media_url?: string;
  profile_photo_url?: string;
  cover_media_id?: string;
  status?: PetStatus;
}

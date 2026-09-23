import React, { useState, useEffect } from "react";
import { X, Search, PawPrint, Check, Loader2 } from "lucide-react";
import api from "../../utils/api";

export interface TaggablePet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  avatar_url?: string;
  profile_visibility?: string;
  is_own_pet?: boolean;
}

interface PetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPets: TaggablePet[];
  onSelectPets: (pets: TaggablePet[]) => void;
  maxPets?: number;
}

export const PetPickerModal: React.FC<PetPickerModalProps> = ({
  isOpen,
  onClose,
  selectedPets,
  onSelectPets,
  maxPets = 5,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [pets, setPets] = useState<TaggablePet[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempSelected, setTempSelected] = useState<TaggablePet[]>(selectedPets);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedPets);
      fetchPets("");
    }
  }, [isOpen, selectedPets]);

  const fetchPets = async (query: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/pets/taggable?q=${encodeURIComponent(query)}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPets(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load taggable pets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    fetchPets(q);
  };

  const togglePet = (pet: TaggablePet) => {
    const exists = tempSelected.some((p) => p.id === pet.id);
    if (exists) {
      setTempSelected(tempSelected.filter((p) => p.id !== pet.id));
    } else {
      if (tempSelected.length >= maxPets) {
        alert(`You can tag up to ${maxPets} pets.`);
        return;
      }
      setTempSelected([...tempSelected, pet]);
    }
  };

  const handleDone = () => {
    onSelectPets(tempSelected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <PawPrint size={18} />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-slate-900">Tag Pets</h3>
              <p className="text-xs text-slate-500">Tag animals featured in this post (up to {maxPets})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pets by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-2xl bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 border border-slate-200/80 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100 transition"
          />
        </div>

        {/* Selected preview chips */}
        {tempSelected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-3">
            {tempSelected.map((pet) => (
              <span
                key={pet.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full text-xs font-semibold bg-amber-100/70 text-amber-900 border border-amber-200"
              >
                <span>{pet.name}</span>
                <button
                  type="button"
                  onClick={() => togglePet(pet)}
                  className="rounded-full hover:bg-amber-200/80 p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Pets List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin text-amber-500 mr-2" />
              <span className="text-xs">Loading pets...</span>
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-12">
              <PawPrint size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-500">No taggable pets found</p>
              <p className="text-2xs text-slate-400 mt-0.5">Add pets to your profile to tag them</p>
            </div>
          ) : (
            pets.map((pet) => {
              const isSelected = tempSelected.some((p) => p.id === pet.id);
              return (
                <div
                  key={pet.id}
                  onClick={() => togglePet(pet)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition ${
                    isSelected
                      ? "bg-amber-50/70 border-amber-300 shadow-2xs"
                      : "bg-white border-slate-100 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {pet.avatar_url ? (
                      <img
                        src={pet.avatar_url}
                        alt={pet.name}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <PawPrint size={18} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{pet.name}</h4>
                        {pet.is_own_pet && (
                          <span className="px-1.5 py-0.2 rounded-md text-2xs font-semibold bg-emerald-100 text-emerald-800">
                            Your Pet
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-slate-400">
                        {pet.species} {pet.breed ? `• ${pet.breed}` : ""}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                      isSelected
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-400">
            {tempSelected.length} of {maxPets} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetPickerModal;

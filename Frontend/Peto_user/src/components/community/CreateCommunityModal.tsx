import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Upload,
} from "lucide-react";
import api from "../../utils/api";

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCommunity: any) => void;
}

const CATEGORIES = [
  "Dogs",
  "Cats",
  "Birds",
  "Fish & Aquatics",
  "Reptiles",
  "Small Pets",
  "Pet Training",
  "Health & Care",
  "Adoption & Rescue",
  "Pet Photography",
  "General",
];

const CreateCommunityModal = ({ isOpen, onClose, onSuccess }: CreateCommunityModalProps) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Dogs");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [rules, setRules] = useState<{ title: string; description: string }[]>([
    { title: "Be Kind and Respectful", description: "Treat all members and their pets with respect." },
    { title: "No Spam or Self-Promotion", description: "Keep discussions relevant and authentic." },
  ]);
  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMsg("");
    if (step === 1) {
      if (!name.trim() || name.trim().length < 3) {
        setErrorMsg("Community name must be at least 3 characters.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleAddRule = () => {
    if (!newRuleTitle.trim()) return;
    setRules([...rules, { title: newRuleTitle.trim(), description: newRuleDesc.trim() }]);
    setNewRuleTitle("");
    setNewRuleDesc("");
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "icon" | "cover") => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append("media", file);

      const res = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const returnedItem = Array.isArray(res.data?.data) ? res.data.data[0] : res.data.data;
        const uploadedUrl = res.data?.mediaUrl || returnedItem?.url || returnedItem?.path;
        if (uploadedUrl) {
          if (target === "icon") setIconUrl(uploadedUrl);
          if (target === "cover") setCoverUrl(uploadedUrl);
        }
      }
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setErrorMsg("Failed to upload image.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        visibility,
        cover_image_url: coverUrl || null,
        icon_url: iconUrl || null,
        rules: rules.filter((r) => r.title.trim().length > 0),
      };

      const res = await api.post("/communities", payload);
      if (res.data?.success) {
        const newComm = res.data.data;
        onClose();
        if (onSuccess) onSuccess(newComm);
        navigate(`/community/${newComm.slug || newComm.id}`);
      }
    } catch (err: any) {
      console.error("Create community error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to create community. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-all border border-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-slate-900">Create a Community</h3>
              <p className="text-[11px] text-slate-400">Step {step} of 4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-100">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Community Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Golden Retriever Pals"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none border border-slate-200 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none border border-slate-200 focus:border-amber-500 focus:bg-white transition cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What is this community all about? Who should join?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  className="w-full resize-none rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 outline-none border border-slate-200 focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Privacy / Visibility */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Community Privacy</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    onClick={() => setVisibility("public")}
                    className={`flex items-start gap-3 rounded-2xl p-4 border-2 transition cursor-pointer ${
                      visibility === "public"
                        ? "border-amber-500 bg-amber-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Public</h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Anyone can view, join, and post in this community instantly.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setVisibility("private")}
                    className={`flex items-start gap-3 rounded-2xl p-4 border-2 transition cursor-pointer ${
                      visibility === "private"
                        ? "border-amber-500 bg-amber-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Private</h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Users must request to join. Discussions are visible to members only.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Rules */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Community Rules (Optional)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Clear rules keep your community safe, friendly, and enjoyable for all pet lovers.
                </p>

                <div className="space-y-2 mb-4">
                  {rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100"
                    >
                      <div className="pr-3">
                        <h5 className="font-bold text-xs text-slate-800">
                          {idx + 1}. {rule.title}
                        </h5>
                        {rule.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Rule Form */}
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 space-y-2.5">
                  <input
                    type="text"
                    placeholder="Rule title (e.g. Respect all members)"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none border border-slate-200 focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Rule description (optional detail)"
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none border border-slate-200 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Rule</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Branding */}
          {step === 4 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Visual Branding (Icon & Cover)
              </label>

              {/* Cover & Icon Upload Previews */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <div className="relative h-24 w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover Preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-white/80">Default Cover Gradient</span>
                  )}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/60 transition cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>Change Cover</span>
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, "cover")}
                  />
                </div>

                <div className="flex items-center gap-3 p-4">
                  <div className="relative -mt-8 h-14 w-14 overflow-hidden rounded-2xl border-2 border-white bg-amber-100 shadow-md flex items-center justify-center font-bold text-amber-700">
                    {iconUrl ? (
                      <img src={iconUrl} alt="Icon Preview" className="h-full w-full object-cover" />
                    ) : (
                      name.slice(0, 2).toUpperCase() || "PE"
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                    >
                      Upload Icon
                    </button>
                    <p className="text-[10px] text-slate-400">Square avatar recommended</p>
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "icon")}
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100 text-xs space-y-1.5 text-slate-700">
                <p>
                  <strong className="text-slate-900">Name:</strong> {name}
                </p>
                <p>
                  <strong className="text-slate-900">Category:</strong> {category}
                </p>
                <p>
                  <strong className="text-slate-900">Visibility:</strong>{" "}
                  <span className="capitalize">{visibility}</span>
                </p>
                <p>
                  <strong className="text-slate-900">Rules configured:</strong> {rules.length}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || uploadingMedia}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Community...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Launch Community</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCommunityModal;

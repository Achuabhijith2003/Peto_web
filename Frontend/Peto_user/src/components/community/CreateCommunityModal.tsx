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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-popover border border-slate-200/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 tracking-tight">Create a Circle</h3>
              <p className="text-[11px] text-slate-400">Step {step} of 4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Content */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200/60">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Community Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Golden Retriever Pals"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs text-slate-900 outline-none border border-slate-200 shadow-micro focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs text-slate-900 outline-none border border-slate-200 shadow-micro focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What is this community all about? Who should join?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  className="w-full resize-none rounded-lg bg-white p-3.5 text-xs text-slate-900 outline-none border border-slate-200 shadow-micro focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Privacy / Visibility */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Circle Privacy</label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div
                    onClick={() => setVisibility("public")}
                    className={`flex items-start gap-2.5 rounded-lg p-3 border transition cursor-pointer ${
                      visibility === "public"
                        ? "border-slate-900 bg-slate-50/80 shadow-micro"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      <Globe size={15} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">Public</h4>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                        Anyone can view, join, and post in this community instantly.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setVisibility("private")}
                    className={`flex items-start gap-2.5 rounded-lg p-3 border transition cursor-pointer ${
                      visibility === "private"
                        ? "border-slate-900 bg-slate-50/80 shadow-micro"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                      <Lock size={15} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">Private</h4>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
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
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Community Rules (Optional)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Clear rules keep your community safe and friendly for all members.
                </p>

                <div className="space-y-2 mb-3">
                  {rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-200/60"
                    >
                      <div className="pr-2">
                        <h5 className="font-semibold text-xs text-slate-800">
                          {idx + 1}. {rule.title}
                        </h5>
                        {rule.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Rule Form */}
                <div className="rounded-lg border border-dashed border-slate-200 p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Rule title (e.g. Respect all members)"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className="w-full rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Rule description (optional detail)"
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    className="w-full rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-micro"
                  >
                    <Plus size={13} />
                    <span>Add Rule</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Branding */}
          {step === 4 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visual Branding (Icon & Cover)
              </label>

              {/* Cover & Icon Upload Previews */}
              <div className="relative rounded-lg overflow-hidden border border-slate-200/80 bg-slate-50 shadow-micro">
                <div className="relative h-20 w-full bg-slate-200 flex items-center justify-center">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover Preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500">Default Cover</span>
                  )}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md border border-slate-200/60 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 backdrop-blur-xs hover:bg-white transition cursor-pointer shadow-micro"
                  >
                    <Upload size={11} />
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

                <div className="flex items-center gap-3 p-3">
                  <div className="relative -mt-6 h-12 w-12 overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-micro flex items-center justify-center font-bold text-slate-700 text-sm">
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
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
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
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-xs space-y-1 text-slate-700">
                <p>
                  <strong className="text-slate-900 font-semibold">Name:</strong> {name}
                </p>
                <p>
                  <strong className="text-slate-900 font-semibold">Category:</strong> {category}
                </p>
                <p>
                  <strong className="text-slate-900 font-semibold">Visibility:</strong>{" "}
                  <span className="capitalize">{visibility}</span>
                </p>
                <p>
                  <strong className="text-slate-900 font-semibold">Rules configured:</strong> {rules.length}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-micro hover:bg-slate-800 transition cursor-pointer border border-slate-950/20 active:scale-[0.98]"
            >
              <span>Continue</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || uploadingMedia}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-micro hover:bg-slate-800 transition cursor-pointer border border-slate-950/20 disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating Circle...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Launch Circle</span>
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


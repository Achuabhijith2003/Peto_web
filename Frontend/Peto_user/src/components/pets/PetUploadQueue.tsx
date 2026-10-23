import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { dismissPetUpload, listPetUploads, petUploadEvents, retryPetUpload, setPetUploadOwner } from "../../services/petUploadQueue";
import type { PetUploadJob } from "../../services/petUploadTask";

export function PetUploadQueue() {
  const {user} = useAuth();
  const [jobs, setJobs] = useState<PetUploadJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    setPetUploadOwner(user?.id);
    setJobs([]);
    const refresh = () => {
      if (!user) return;
      void listPetUploads().then(next => {
        if (!disposed) setJobs(next.filter(job => job.ownerId === user.id));
      }).catch(() => { /* Enqueue reports storage availability errors to the user. */ });
    };
    const resume = () => { setPetUploadOwner(user?.id); refresh(); };
    petUploadEvents.addEventListener("change", refresh);
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    const timer = setInterval(refresh, 1000);
    refresh();
    return () => {
      disposed = true;
      clearInterval(timer);
      petUploadEvents.removeEventListener("change", refresh);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
    };
  }, [user?.id]);
  if (!jobs.length) return null;
  const perform = (operation: Promise<void>) => { setError(null); void operation.catch(() => setError("Unable to update this saved upload. Please retry.")); };
  return <aside aria-label="Pet background uploads" className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] sm:w-80 max-h-[45vh] overflow-y-auto space-y-2">
    {jobs.map(job => <section key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg space-y-2">
      <div className="flex justify-between gap-2">
        <strong className="text-sm">{job.petName}: {job.state === "complete" ? "Gallery updated" : job.state === "linking" ? "Adding to gallery" : job.state === "processing" ? "Preparing media" : job.state === "retrying" ? "Waiting to retry" : job.state === "failed" ? "Upload needs attention" : "Uploading media"}</strong>
        {["complete", "failed"].includes(job.state) && <button type="button" aria-label="Dismiss upload" onClick={() => perform(dismissPetUpload(job.id))}>×</button>}
      </div>
      {!["complete", "failed"].includes(job.state) && <>
        <progress aria-label="Media transfer" max={100} value={["processing", "linking", "retrying"].includes(job.state) ? undefined : Math.floor(job.progress * 100)} className="w-full" />
        <p className="text-xs text-slate-500">{Math.floor(job.progress * 100)}% transferred. You can keep browsing. Keep a Peto tab open for uploads to continue.</p>
      </>}
      {job.error && <p role="status" className="text-xs text-red-700">{job.error}</p>}
      {job.state === "failed" && <button type="button" className="text-sm font-semibold text-amber-700" onClick={() => perform(retryPetUpload(job.id))}>Retry upload</button>}
    </section>)}
    {error && <p role="alert" className="bg-white p-3 text-sm text-red-700">{error}</p>}
  </aside>;
}

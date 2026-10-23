import { useState } from "react";

export default function CommunityDeleteSettings({ community, onDeleted, onDelete }: {community: {id:string;name:string}; onDeleted:()=>void; onDelete:(confirmation:string)=>Promise<void>}) {
  const [open,setOpen]=useState(false);
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  return <section className="rounded-2xl border border-red-200 bg-white p-5 space-y-3">
    <h3 className="font-bold text-red-700">Delete Community</h3>
    <p className="text-sm text-slate-600">Deletion affects every member. The community and its discussions will become inaccessible. Content is retained under Peto’s retention policies.</p>
    <button type="button" onClick={()=>{setOpen(true);setError("");setConfirmation("");}} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Delete Community</button>
    {open && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="community-delete-title" className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4 shadow-xl" onSubmit={async e=>{
        e.preventDefault();if(busy || confirmation!==community.name)return;setBusy(true);setError("");
        try {await onDelete(confirmation);onDeleted();}
        catch(err:any){setError(err.response?.data?.message || "Unable to delete this community. Please try again.");}
        finally{setBusy(false);}
      }}>
        <h2 id="community-delete-title" className="font-bold text-lg">Delete {community.name} for everyone?</h2>
        <p className="text-sm text-slate-600">All members will lose access. This action cannot be undone here.</p>
        <label className="block text-sm font-semibold">Type {community.name} to confirm
          <input autoFocus disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2"/>
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy || confirmation!==community.name} className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50">{busy?"Deleting…":"Delete Community"}</button>
        </div>
      </form>
    </div>}
  </section>;
}

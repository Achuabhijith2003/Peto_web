import api from "../utils/api";
import { runPetUpload, type PetUploadJob, type PetUploadTransport } from "./petUploadTask";

let database: Promise<IDBDatabase> | undefined;
let owner: string | undefined;
let running = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
export const petUploadEvents = new EventTarget();
const emit = () => petUploadEvents.dispatchEvent(new Event("change"));
const active = new Map<string, PetUploadJob>();

function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("peto-pet-uploads", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("jobs", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}
async function save(job: PetUploadJob) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("jobs", "readwrite");
    transaction.objectStore("jobs").put(job);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("Unable to save upload"));
  });
}
export async function listPetUploads(): Promise<PetUploadJob[]> {
  const db = await openDatabase();
  const stored = await new Promise<PetUploadJob[]>((resolve, reject) => {
    const request = db.transaction("jobs").objectStore("jobs").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return stored.map(job => active.get(job.id) || job);
}
export async function enqueuePetUpload(ownerId: string, petId: string, petName: string, file: File) {
  const job: PetUploadJob = { id: crypto.randomUUID(), ownerId, petId, petName, file, filename: file.name,
    state: "queued", progress: 0, attempts: 0 };
  // Persist the Blob before letting the picker/profile release it.
  await save(job);
  emit();
  void kick();
}
export function setPetUploadOwner(userId?: string) { owner = userId; void kick(); }
export async function retryPetUpload(id: string) {
  const job = (await listPetUploads()).find(j => j.id === id && j.ownerId === owner);
  if (!job || active.has(id) || job.state === "complete") return;
  job.state = "queued"; job.attempts = 0; job.error = undefined; job.retryAt = undefined;
  await save(job); emit(); void kick();
}
export async function dismissPetUpload(id: string) {
  const job = (await listPetUploads()).find(j => j.id === id && j.ownerId === owner);
  if (!job || active.has(id) || !["failed", "complete"].includes(job.state)) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("jobs", "readwrite");
    transaction.objectStore("jobs").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
  emit();
}
const transport: PetUploadTransport = {
  async verify(job) {
    const response = await api.get(`/pets/${job.petId}`, { expectedOwnerId: job.ownerId });
    if (!response.data?.data?.viewer_permissions?.can_upload_media) throw new Error("You no longer have permission to upload to this pet.");
  },
  async recover(job) {
    try {
      const response = await api.get(`/media/status/${job.id}`, { expectedOwnerId: job.ownerId });
      return response.data?.data?.id || response.data?.mediaId;
    } catch (error: any) { if (error.response?.status === 404) return undefined; throw error; }
  },
  async upload(job, progress) {
    const body = new FormData();
    body.append("media", job.file, job.filename);
    body.append("client_media_id", job.id);
    const response = await api.post("/media/upload", body, { expectedOwnerId: job.ownerId, timeout: 300000,
      onUploadProgress: event => { if (event.total) progress(event.loaded / event.total); } });
    const item = Array.isArray(response.data?.data) ? response.data.data[0] : response.data?.data;
    return item?.id || response.data?.mediaId;
  },
  async link(job) {
    await api.post(`/pets/${job.petId}/media`, {media_id: job.mediaId, client_pet_media_id: job.id, role: "GALLERY"}, {expectedOwnerId: job.ownerId});
  },
};
async function drain() {
  for (const job of await listPetUploads()) {
    if (!owner || job.ownerId !== owner || ["failed", "complete"].includes(job.state)) continue;
    if (job.retryAt && job.retryAt > Date.now()) continue;
    active.set(job.id, job);
    try {
      await runPetUpload(job, transport, save, emit);
      petUploadEvents.dispatchEvent(new CustomEvent("complete", {detail: {petId: job.petId, ownerId: job.ownerId}}));
    } catch (error: any) {
      const status = error.response?.status;
      const transient = error.code !== "ERR_CANCELED" && (!status ? Boolean(error.isAxiosError) : status >= 500 || status === 429);
      job.state = transient && job.attempts < 5 ? "retrying" : "failed";
      job.error = error.response?.data?.message || error.message || "Upload interrupted. Please retry.";
      job.retryAt = job.state === "retrying" ? Date.now() + Math.min(60000, 2000 * 2 ** job.attempts) : undefined;
      await save(job);
    } finally { active.delete(job.id); emit(); }
  }
}
async function kick() {
  if (running || !owner) return;
  running = true;
  clearTimeout(retryTimer);
  try {
    if (navigator.locks) await navigator.locks.request("peto-pet-upload", {ifAvailable: true}, async lock => { if (lock) await drain(); });
    else await drain();
  } catch { /* Storage errors are shown when enqueueing/listing, never discard files. */ }
  finally {
    running = false;
    retryTimer = setTimeout(() => void kick(), 5000);
  }
}

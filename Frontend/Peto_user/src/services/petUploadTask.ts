export interface PetUploadJob {
  id: string;
  ownerId: string;
  petId: string;
  petName: string;
  file: Blob;
  filename: string;
  mediaId?: string;
  transferComplete?: boolean;
  state: "queued" | "uploading" | "processing" | "linking" | "complete" | "failed" | "retrying";
  progress: number;
  attempts: number;
  error?: string;
  retryAt?: number;
}

export interface PetUploadTransport {
  verify: (job: PetUploadJob) => Promise<void>;
  recover: (job: PetUploadJob) => Promise<string | undefined>;
  upload: (job: PetUploadJob, progress: (fraction: number) => void) => Promise<string>;
  link: (job: PetUploadJob) => Promise<void>;
}

/** Checkpoint uploaded media before linking, and reuse both request IDs on retries. */
export async function runPetUpload(job: PetUploadJob, transport: PetUploadTransport,
  save: (job: PetUploadJob) => Promise<void>, changed: () => void) {
  job.attempts++;
  job.error = undefined;
  await transport.verify(job);
  if (!job.mediaId) {
    if (job.transferComplete) job.mediaId = await transport.recover(job);
    if (!job.mediaId) {
      job.state = "uploading";
      let checkpoint = Promise.resolve();
      job.mediaId = await transport.upload(job, fraction => {
        job.progress = Math.max(0, Math.min(1, fraction));
        if (fraction >= 1) {
          job.transferComplete = true;
          job.state = "processing";
          checkpoint = checkpoint.then(() => save(job));
        }
        changed();
      }).finally(() => checkpoint);
    }
    if (!job.mediaId) throw new Error("Upload returned no media ID. Retry to recover your upload.");
    await save(job);
  }
  job.state = "linking";
  job.progress = 1;
  await save(job);
  changed();
  await transport.link(job);
  job.state = "complete";
  // Release the durable local file only after attachment is confirmed.
  job.file = new Blob();
  job.error = undefined;
  await save(job);
  changed();
}

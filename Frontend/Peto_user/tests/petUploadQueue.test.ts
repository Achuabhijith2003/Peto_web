import test from "node:test";
import assert from "node:assert/strict";
import { runPetUpload, type PetUploadJob, type PetUploadTransport } from "../src/services/petUploadTask";
const createJob = (): PetUploadJob => ({id:"stable-request",ownerId:"owner",petId:"pet",petName:"Poppy",file:new Blob(["video"]),filename:"video.mp4",state:"queued",progress:0,attempts:0});

test("failed gallery attachment retries reuse uploaded media and stable association ID", async () => {
  const job=createJob(); let uploads=0,links=0;
  const transport: PetUploadTransport={verify:async()=>{},recover:async()=>undefined,
    upload:async(current,progress)=>{uploads++;assert.equal(current.id,"stable-request");progress(1);return "media";},
    link:async current=>{links++;assert.equal(current.mediaId,"media");assert.equal(current.id,"stable-request");if(links===1)throw new Error("Temporary failure");}};
  let checkpoint: PetUploadJob|undefined;
  const save=async(current:PetUploadJob)=>{checkpoint={...current};};
  await assert.rejects(runPetUpload(job,transport,save,()=>{}));
  assert.equal(checkpoint!.mediaId,"media");assert.equal(job.file.size,5);
  await runPetUpload(job,transport,save,()=>{});
  assert.equal(uploads,1);assert.equal(links,2);assert.equal(job.state,"complete");assert.equal(job.file.size,0);
});

test("lost upload response recovers the persisted media ID before attaching", async () => {
  const job=createJob(); let uploads=0;let persisted:PetUploadJob|undefined;
  const transport:PetUploadTransport={verify:async()=>{},recover:async()=>"recovered-media",
    upload:async(_job,progress)=>{uploads++;progress(1);throw new Error("Response lost");},link:async current=>{assert.equal(current.mediaId,"recovered-media");}};
  const save=async(current:PetUploadJob)=>{persisted={...current};};
  await assert.rejects(runPetUpload(job,transport,save,()=>{}));
  assert.equal(persisted!.transferComplete,true);
  await runPetUpload(persisted!,transport,save,()=>{});
  assert.equal(uploads,1);assert.equal(persisted!.state,"complete");
});

test("permission or account denial prevents uploading and linking", async () => {
  let mutations=0;
  await assert.rejects(runPetUpload(createJob(),{verify:async()=>{throw new Error("Forbidden");},recover:async()=>undefined,
    upload:async()=>{mutations++;return "media";},link:async()=>{mutations++;}},async()=>{},()=>{}),/Forbidden/);
  assert.equal(mutations,0);
});

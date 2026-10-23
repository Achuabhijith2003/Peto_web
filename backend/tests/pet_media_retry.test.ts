import test from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../src/config/supabase';
import { addPetMediaService } from '../src/pets/pet.service';

test('pet media retries reuse one association and cannot reuse its ID for another pet', async () => {
  const original=supabase.from;
  const rows=new Map<string,any>();
  (supabase as any).from=(table:string)=>{
    const filters:Record<string,any>={};let inserted:any;
    const builder:any={
      select(){return this;},eq(key:string,value:any){filters[key]=value;return this;},insert(value:any){inserted=value;return this;},
      async maybeSingle(){
        if(table==='pets')return {data:{deleted_at:null},error:null};
        if(table==='pet_parents')return {data:{is_primary:true,status:'ACTIVE',permissions:[]},error:null};
        if(table==='media')return {data:filters.id==='owned-media'?{id:filters.id}:null,error:null};
        if(table==='pet_media') {
          const row=rows.get(filters.id);
          return {data:row && Object.entries(filters).every(([key,value])=>row[key]===value)?row:null,error:null};
        }
        throw new Error('Unexpected query '+table);
      },
      async single(){
        if(table==='pets')return {data:{profile_visibility:'PUBLIC'},error:null};
        assert.equal(table,'pet_media');
        if(rows.has(inserted.id))return {data:null,error:{code:'23505',message:'Duplicate'}};
        const row={...inserted,media:{id:inserted.media_id,url:'https://example.com/pet.jpg',type:'image'}};
        rows.set(row.id,row);return {data:row,error:null};
      },
    };
    return builder;
  };
  try {
    const input={media_id:'owned-media',client_pet_media_id:'00000000-0000-4000-8000-000000000001',role:'GALLERY'} as any;
    const first=await addPetMediaService('pet','owner',input);
    const retry=await addPetMediaService('pet','owner',input);
    assert.equal(first.id,retry.id);assert.equal(rows.size,1);
    await assert.rejects(addPetMediaService('other-pet','owner',input),(error:any)=>error.status===409);
    await assert.rejects(addPetMediaService('pet','owner',{...input,media_id:'someone-elses-media'}),(error:any)=>error.status===404);
  } finally {supabase.from=original;}
});

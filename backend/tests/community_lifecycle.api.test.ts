import test from 'node:test';
import assert from 'node:assert/strict';
import {supabase} from '../src/config/supabase';
import {deleteCommunity} from '../src/communities/community.controller';
import {getPostById} from '../src/posts/post.service';

test('community deletion derives actor from authentication, ignores supplied owner and maps authorization errors',async()=>{
 const original=supabase.rpc;let calls=0;
 (supabase as any).rpc=async(name:string,args:any)=>{
  calls++;assert.equal(name,'community_owner_action');assert.equal(args.p_actor,'authenticated-user');assert.equal(args.p_confirmation,'Circle');
  return {data:null,error:{code:'42501',message:'Only the current owner'}};
 };
 let status=200;const res:any={status(code:number){status=code;return this;},json(){return this;}};
 try {
  await deleteCommunity({user:{id:'authenticated-user'},params:{id:'circle'},body:{confirmation:'Circle',owner_id:'spoofed'}} as any,res);
  assert.equal(status,403);assert.equal(calls,1);
  await deleteCommunity({params:{id:'circle'},body:{owner_id:'spoofed'}} as any,res);
  assert.equal(status,401);assert.equal(calls,1);
 }finally{supabase.rpc=original;}
});
test('direct public post retrieval includes deleted-community exclusion',async()=>{
 const original=supabase.from;let excluded=false;
 (supabase as any).from=(table:string)=>{
  assert.equal(table,'posts');const q:any={select(){return q;},eq(){return q;},is(field:string,value:any){assert.equal(field,'community_deleted_at');assert.equal(value,null);excluded=true;return q;},async maybeSingle(){assert.equal(excluded,true);return {data:null,error:null};}};return q;
 };
 try {assert.equal(await getPostById('00000000-0000-4000-8000-000000000001'),null);}
 finally{supabase.from=original;}
});

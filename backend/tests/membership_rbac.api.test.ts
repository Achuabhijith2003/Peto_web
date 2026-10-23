import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePermission } from '../src/admin/middleware/adminAuth.middleware';
import { supabase } from '../src/config/supabase';
import { rbacAction } from '../src/admin/services/adminManagement.service';
import { petLifecycle } from '../src/pets/pet.service';
import { evaluatePetVisibility } from '../src/pets/pet.permission';

test('custom roles use granular API permission checks and missing scopes return 403', () => {
  const req: any = {admin:{role:{name:'Custom support',is_system:false},permissions:['users.view']}};
  let status=200, continued=false;
  const res: any = {status(n:number){status=n;return this;},json(){return this;}};
  requirePermission('users.view')(req,res,()=>{continued=true;});
  assert.equal(continued,true);
  continued=false;
  requirePermission('users.ban')(req,res,()=>{continued=true;});
  assert.equal(status,403);assert.equal(continued,false);
  req.admin.permissions=[];
  requirePermission('users.view')(req,res,()=>{continued=true;});
  assert.equal(status,403);assert.equal(continued,false);
  req.admin.role={name:'Super Admin',is_system:false};
  requirePermission('users.ban')(req,res,()=>{continued=true;});
  assert.equal(continued,false);
});

test('deleted public pets cannot be viewed even by a former member', async () => {
  assert.equal((await evaluatePetVisibility('actor',{id:'pet',profile_visibility:'PUBLIC',deleted_at:'2026-10-23'})).allowed,false);
});

test('atomic RPC adapters map authorization errors to 403 and keep actor separate from input', async () => {
  const original=supabase.rpc;
  const calls:any[]=[];
  (supabase as any).rpc=async(name:string,args:any)=>{calls.push({name,args});return {data:null,error:{code:'42501',message:'Denied'}};};
  try {
    await assert.rejects(rbacAction('trusted','role_create',null,{p_actor:'spoofed'}), (e:any)=>e.status===403);
    assert.equal(calls[0].args.p_actor,'trusted');
    await assert.rejects(petLifecycle('pet','trusted','remove','another'),(e:any)=>e.status===403);
    assert.equal(calls[1].args.p_actor,'trusted');
    assert.equal(calls[1].args.p_target,'another');
  } finally {supabase.rpc=original;}
});

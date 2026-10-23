import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from '../../../.test-tools/node_modules/jsdom/lib/api.js';
import {createElement,act} from '../node_modules/react/index.js';
import CommunityDeleteSettings from '../src/components/community/CommunityDeleteSettings';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://peto.test'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('../node_modules/react-dom/client.js');

async function mount(onDelete:(confirmation:string)=>Promise<void>,onDeleted:()=>void) {
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 await act(async()=>root.render(createElement(CommunityDeleteSettings,{community:{id:'circle',name:'Circle'},onDelete,onDeleted})));
 const button=(label:string)=>Array.from(node.querySelectorAll('button')).find(b=>b.textContent===label)!;
 await act(async()=>button('Delete Community').click());
 const input=node.querySelector('input')!;
 const type=async(value:string)=>act(async()=>{
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(input,value);
  input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 });
 return {node,button,type,cleanup:async()=>{await act(async()=>root.unmount());node.remove();}};
}
await test('web deletion requires exact name, disables controls during request and reports success',async()=>{
 let calls=0,completed=false,release!:()=>void;
 const view=await mount(async name=>{assert.equal(name,'Circle');calls++;await new Promise<void>(resolve=>{release=resolve;});},()=>{completed=true;});
 try {
  assert.equal(view.button('Delete Community').disabled,false); // The owner settings trigger remains outside the dialog.
  const submit=()=>view.node.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  assert.equal(submit().disabled,true);
  await view.type('wrong');assert.equal(submit().disabled,true);
  await view.type('Circle');assert.equal(submit().disabled,false);
  await act(async()=>submit().click());assert.equal(calls,1);
  assert.equal(submit().disabled,true);assert.equal(view.button('Cancel').disabled,true);
  await act(async()=>release());assert.equal(completed,true);
 } finally {await view.cleanup();}
});
await test('web failed deletion displays error and permits retry without success',async()=>{
 let completed=false;
 const view=await mount(async()=>{throw {response:{data:{message:'Ownership changed. Refresh and retry.'}}};},()=>{completed=true;});
 try {
  await view.type('Circle');
  await act(async()=>view.node.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
  assert.match(view.node.querySelector('[role="alert"]')!.textContent!,/Ownership changed/);
  assert.equal(completed,false);
  assert.equal(view.node.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,false);
 } finally {await view.cleanup();}
});
dom.window.close();

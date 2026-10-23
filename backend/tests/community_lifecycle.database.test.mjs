import {PGlite} from '../../.test-tools/node_modules/@electric-sql/pglite/dist/index.js';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const db=new PGlite();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const scalar=async sql=>Object.values((await db.query(sql)).rows[0])[0];
const action=(community,actor,kind,target=null,confirmation=null)=>db.query('select community_owner_action($1,$2,$3,$4,$5)',[community,actor,kind,target,confirmation]);
try {
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
CREATE TABLE profiles(id uuid PRIMARY KEY); CREATE TABLE posts(id uuid PRIMARY KEY,user_id uuid,text text,created_at timestamptz DEFAULT now());
CREATE TABLE comments(id uuid PRIMARY KEY,post_id uuid REFERENCES posts,user_id uuid,comment text);
CREATE TABLE media(id uuid PRIMARY KEY,post_id uuid REFERENCES posts,url text);
CREATE TABLE compliance_retention_policies(category text PRIMARY KEY,retention_days integer);
INSERT INTO compliance_retention_policies VALUES('DELETED_POSTS',30),('REPORTS',365);
CREATE PUBLICATION supabase_realtime;
`);
for(const name of ['10_communities.sql','11_admin_rbac_audit.sql','42_community_lifecycle.sql']) {
 try {await db.exec(await readFile(new URL('../../docs/database/'+name,import.meta.url),'utf8'));}
 catch(error){console.error('Migration failed:',name,error.message);throw error;}
}
await db.exec(`INSERT INTO profiles SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,6) n;
INSERT INTO communities(id,owner_id,name,slug) VALUES('${id(100)}','${id(1)}','Circle','circle'),('${id(101)}','${id(1)}','Other','other');
INSERT INTO community_members(community_id,user_id,role) VALUES('${id(100)}','${id(1)}','owner'),('${id(100)}','${id(2)}','moderator'),('${id(100)}','${id(3)}','member');
INSERT INTO community_members(community_id,user_id,role,status) VALUES('${id(100)}','${id(4)}','member','pending');
INSERT INTO posts(id,user_id,text,community_id) VALUES('${id(200)}','${id(3)}','Retained','${id(100)}'),('${id(201)}','${id(3)}','Unrelated',null);
INSERT INTO comments VALUES('${id(300)}','${id(200)}','${id(3)}','Retained comment');
INSERT INTO media VALUES('${id(400)}','${id(200)}','https://example.com/shared.jpg');
INSERT INTO community_rules(community_id,title) VALUES('${id(100)}','Be kind');
`);
await test('owner-only authorization, eligible transfer and existing moderator management',async()=>{
 for(const actor of [2,3,5])await assert.rejects(action(id(100),id(actor),'delete',null,'Circle'),/Only the current/);
 await assert.rejects(action(id(100),id(2),'owner',id(3)),/Only the current/);
 await assert.rejects(action(id(100),id(1),'owner',id(4)),/active existing/);
 await action(id(100),id(1),'moderator',id(3));
 assert.equal(await scalar(`select role from community_members where community_id='${id(100)}' and user_id='${id(3)}'`),'moderator');
 await action(id(100),id(1),'member',id(3));
 await action(id(100),id(1),'owner',id(3));
 assert.equal(await scalar(`select owner_id from communities where id='${id(100)}'`),id(3));
 assert.equal(await scalar(`select role from community_members where community_id='${id(100)}' and user_id='${id(1)}'`),'member');
 await assert.rejects(action(id(100),id(1),'delete',null,'Circle'),/Only the current/);
 await assert.rejects(action(id(100),id(1),'moderator',id(2)),/Only the current/);
 await assert.rejects(db.exec(`delete from community_members where community_id='${id(100)}' and user_id='${id(3)}'`),/Transfer ownership/);
});
await test('failed audit rolls back deletion, then new owner deletes atomically and retry is safe',async()=>{
 await db.exec(`CREATE FUNCTION test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test audit failure'; END $$;
 CREATE TRIGGER test_audit_fail BEFORE INSERT ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION test_reject_audit();`);
 await assert.rejects(action(id(100),id(3),'delete',null,'Circle'),/Test audit failure/);
 assert.equal(await scalar(`select deleted_at from communities where id='${id(100)}'`),null);
 assert.equal(await scalar(`select community_deleted_at from posts where id='${id(200)}'`),null);
 await db.exec('DROP TRIGGER test_audit_fail ON admin_audit_logs');
 await assert.rejects(action(id(100),id(3),'delete',null,'wrong'),/Type the current/);
 await action(id(100),id(3),'delete',null,'Circle');await action(id(100),id(3),'delete',null,'Circle');
 assert.equal(await scalar(`select count(*)::int from admin_audit_logs where action='COMMUNITY_DELETED'`),1);
 assert.equal(await scalar(`select public.community_can_view('${id(100)}','${id(3)}')`),false);
 assert.equal(await scalar(`select count(*)::int from posts where community_deleted_at is null`),1);
 assert.equal(await scalar('select count(*)::int from comments'),1);
 assert.equal(await scalar('select count(*)::int from media'),1);
 assert.equal(await scalar('select count(*)::int from community_rules'),1);
 assert.equal(await scalar(`select extract(day from purge_after-deleted_at)::int from communities where id='${id(100)}'`),365);
});
await test('deleted communities reject new joins, posts, comments, rules and moderator changes',async()=>{
 await assert.rejects(db.exec(`INSERT INTO community_members(community_id,user_id) VALUES('${id(100)}','${id(6)}')`),/Community not found/);
 await assert.rejects(db.exec(`INSERT INTO posts(id,community_id) VALUES('${id(202)}','${id(100)}')`),/Community not found/);
 await assert.rejects(db.exec(`INSERT INTO comments(id,post_id) VALUES('${id(301)}','${id(200)}')`),/Community not found/);
 await assert.rejects(db.exec(`UPDATE posts SET community_id=null,community_deleted_at=null WHERE id='${id(200)}'`),/Community not found/);
 await assert.rejects(action(id(100),id(3),'moderator',id(2)),/Community not found/);
 // Another live community and personal posting still work.
 await db.exec(`INSERT INTO community_members(community_id,user_id) VALUES('${id(101)}','${id(6)}'); INSERT INTO posts(id,community_id) VALUES('${id(203)}','${id(101)}');`);
 await db.exec(`GRANT SELECT ON communities,community_members,posts,comments TO authenticated;
 ALTER TABLE posts ENABLE ROW LEVEL SECURITY; CREATE POLICY posts_read ON posts FOR SELECT USING(true);
 CREATE POLICY comments_read ON comments FOR SELECT USING(true); SET ROLE authenticated;`);
 assert.equal(await scalar(`select count(*)::int from communities where id='${id(100)}'`),0);
 assert.equal(await scalar(`select count(*)::int from community_members where community_id='${id(100)}'`),0);
 assert.equal(await scalar(`select count(*)::int from posts where id='${id(200)}'`),0);
 assert.equal(await scalar(`select count(*)::int from comments where id='${id(300)}'`),0);
 await assert.rejects(action(id(101),id(1),'delete',null,'Other'),/permission denied/);
 await assert.rejects(db.exec(`UPDATE communities SET owner_id='${id(6)}'`),/permission denied/);
 await db.exec('RESET ROLE');
});
} catch(error) {console.error(error.message);process.exitCode=1;} finally {await db.close();}

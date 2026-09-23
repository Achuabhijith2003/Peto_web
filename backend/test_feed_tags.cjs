require("dotenv").config({ path: "./backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
        *,
        profiles(id, username, full_name, avatar_url, verified),
        media(*)
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("Found posts:", posts?.length);
  const postIds = (posts || []).map(p => p.id);

  // Query post_mentions
  const { data: mentions } = await supabase
    .from("post_mentions")
    .select(`
        post_id,
        mentioned_user:profiles!post_mentions_mentioned_user_id_fkey(
            id, username, full_name, avatar_url, verified
        )
    `)
    .in("post_id", postIds);

  // Query post_pets
  const { data: petTags, error: petErr } = await supabase
    .from("post_pets")
    .select(`
        post_id,
        pet:pets!post_pets_pet_id_fkey(
            id, name, species, breed, profile_visibility,
            profile_media:media!pets_profile_media_id_fkey(url)
        )
    `)
    .in("post_id", postIds);

  console.log("Mentions count:", mentions?.length);
  console.log("Pet tags count:", petTags?.length);
  console.log("Pet tags sample:", JSON.stringify(petTags, null, 2));

  for (const p of posts) {
    if (p.pet_id) {
      console.log(`Post ${p.id} has pet_id = ${p.pet_id}`);
    }
  }
}

test();

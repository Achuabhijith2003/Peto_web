require("dotenv").config({ path: "./backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: postsWithPetId } = await supabase
    .from("posts")
    .select("id, text, pet_id, pets(id, name, species, breed)")
    .not("pet_id", "is", null)
    .limit(5);

  console.log("Posts with pet_id in posts table:", JSON.stringify(postsWithPetId, null, 2));

  const { data: allPostPets } = await supabase
    .from("post_pets")
    .select("post_id, pet_id")
    .limit(5);

  console.log("Records in post_pets table:", JSON.stringify(allPostPets, null, 2));
}

test();

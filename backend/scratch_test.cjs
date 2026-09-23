const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function run() {
  const { data: postSample } = await supabase.from('posts').select('*').limit(1).maybeSingle();
  console.log('posts sample keys:', Object.keys(postSample || {}));
  const { data: commentSample } = await supabase.from('comments').select('*').limit(1).maybeSingle();
  console.log('comments sample keys:', Object.keys(commentSample || {}));
}

run();

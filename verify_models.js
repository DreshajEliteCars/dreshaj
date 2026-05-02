const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const envKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
process.env.NEXT_PUBLIC_SUPABASE_URL = envUrlMatch[1].trim();
process.env.SUPABASE_SERVICE_ROLE_KEY = envKeyMatch[1].trim();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('cars')
    .select('make, model, photo_count, seller_name')
    .order('photo_count', { ascending: false })
    .limit(10);
  console.log("By photo_count:", data);

  const { data: data2 } = await supabase
    .from('cars')
    .select('make, model, photo_count, seller_name')
    .order('seller_name', { ascending: false, nullsFirst: false })
    .limit(10);
  console.log("By seller_name:", data2);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  // Group by make and collect unique models
  const dbModels = {};
  for (const row of data) {
    if (!dbModels[row.make]) dbModels[row.make] = new Set();
    dbModels[row.make].add(row.model);
  }

  for (const make of Object.keys(dbModels)) {
    console.log(`\n--- ${make} ---`);
    console.log(Array.from(dbModels[make]).sort().join(', '));
  }
}

run();

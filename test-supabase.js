require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testBucket() {
  const { data, error } = await supabase.storage.getBucket('subepe-archivos');
  if (error) {
    console.error('Error con el bucket:', error.message);
  } else {
    console.log('Bucket existe:', data.name);
  }
}

testBucket();


const fs = require('fs');
const path = require('path');

function checkEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('.env.local not found at ' + envPath);
    return;
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('--- .env.local Check ---');
  console.log('File size:', content.length, 'bytes');
  
  const hasOld = content.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  const hasNew = content.includes('SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('Has NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (Old):', hasOld);
  console.log('Has SUPABASE_SERVICE_ROLE_KEY (New):', hasNew);
  
  // Actually load it using dotenv-like manual parsing for verification
  const match = content.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (match) {
    console.log('SUPABASE_SERVICE_ROLE_KEY is present and starts with:', match[1].substring(0, 10) + '...');
  } else {
    console.log('SUPABASE_SERVICE_ROLE_KEY was not found by regex');
  }
}

checkEnv();

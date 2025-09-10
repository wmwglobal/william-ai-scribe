const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function createSession(visitorId) {
  const response = await fetch(`${supabaseUrl}/functions/v1/create_session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Origin': 'http://localhost:5173',
      'Referer': 'http://localhost:5173/'
    },
    body: JSON.stringify({
      visitor_id: visitorId,
      consent: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  return await response.json();
}

async function updateSession(sessionId, sessionSecret, updates) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // We'll need to update via SQL or find another way since we can't directly update with RLS
  console.log(`Session ${sessionId} created, but cannot update due to RLS policies`);
  return { id: sessionId };
}

async function seedData() {
  console.log('Creating test sessions via API...\n');

  const testSessions = [
    {
      visitor_id: 'test-visitor-001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      intent: 'purchase_intent',
      score: 90,
      notes: 'Very interested in enterprise plan'
    },
    {
      visitor_id: 'test-visitor-002',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      intent: 'product_inquiry',
      score: 65,
      notes: 'Asking about pricing and features'
    },
    {
      visitor_id: 'test-visitor-003',
      name: null,
      email: null,
      intent: 'browsing',
      score: 20,
      notes: 'Just looking around'
    },
    {
      visitor_id: 'test-visitor-004',
      name: 'Mike Wilson',
      email: 'mike.wilson@startup.io',
      intent: 'demo_request',
      score: 75,
      notes: 'Startup founder, interested in AI features'
    }
  ];

  const createdSessions = [];
  
  for (const testSession of testSessions) {
    try {
      const result = await createSession(testSession.visitor_id);
      createdSessions.push({
        ...result,
        ...testSession
      });
      console.log(`✓ Created session for ${testSession.visitor_id} (${testSession.intent})`);
    } catch (error) {
      console.error(`✗ Failed to create session for ${testSession.visitor_id}:`, error.message);
    }
  }

  console.log('\n=== Test Sessions Created ===');
  console.log(`Total sessions: ${createdSessions.length}`);
  console.log('\nYou can now view this data in your admin dashboard at http://localhost:5173/admin');
  console.log('\nNote: Due to RLS policies, these sessions have minimal data.');
  console.log('To see full functionality, you would need to:');
  console.log('1. Use a service role key (not available in this setup)');
  console.log('2. Or run the SQL script directly in Supabase SQL Editor');
  console.log('\nSQL script location: scripts/seed-test-data.sql');
}

seedData().catch(console.error);
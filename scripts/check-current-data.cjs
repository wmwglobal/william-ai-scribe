const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentData() {
  console.log('Checking current database status...\n');
  console.log('='.repeat(50));

  try {
    // Check sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    } else {
      console.log(`📊 Total Sessions: ${sessions?.length || 0}`);
      
      if (sessions && sessions.length > 0) {
        console.log('\nRecent Sessions:');
        sessions.slice(0, 5).forEach((session, idx) => {
          console.log(`  ${idx + 1}. ${session.contact_name || 'Anonymous'} (${session.visitor_id})`);
          console.log(`     - Score: ${session.lead_score || 0}`);
          console.log(`     - Intent: ${session.final_intent || 'none'}`);
          console.log(`     - Created: ${new Date(session.created_at).toLocaleString()}`);
        });
      }
    }

    // Check utterances
    const { data: utterances, error: utterancesError } = await supabase
      .from('utterances')
      .select('session_id')
      .limit(100);

    if (!utterancesError) {
      console.log(`\n💬 Total Utterances: ${utterances?.length || 0}+`);
    }

    // Check summaries
    const { data: summaries, error: summariesError } = await supabase
      .from('summaries')
      .select('session_id');

    if (!summariesError) {
      console.log(`📝 Total Summaries: ${summaries?.length || 0}`);
    }

    // Check events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('kind')
      .limit(100);

    if (!eventsError) {
      console.log(`📊 Total Events: ${events?.length || 0}+`);
    }

    console.log('\n' + '='.repeat(50));
    
    if (sessions && sessions.length === 0) {
      console.log('✅ Database is clean - ready for new sessions!');
      console.log('\nTo create a new session:');
      console.log('1. Go to http://localhost:5173');
      console.log('2. Click "Start Talking" or use the chat');
      console.log('3. Have a conversation');
      console.log('4. Check the admin dashboard at http://localhost:5173/admin');
    } else {
      console.log('ℹ️  Database contains existing data');
      console.log('\nTo delete all data, run:');
      console.log('  scripts/delete-all-data.sql in Supabase SQL Editor');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkCurrentData();
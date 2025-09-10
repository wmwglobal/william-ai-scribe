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

async function checkData() {
  console.log('Checking database for sessions...\n');

  try {
    // Check all sessions
    const { data: allSessions, error: allError } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('Error fetching all sessions:', allError);
    } else {
      console.log(`Total sessions found: ${allSessions?.length || 0}`);
      if (allSessions && allSessions.length > 0) {
        console.log('\nFirst few sessions:');
        allSessions.slice(0, 3).forEach(session => {
          console.log(`- ID: ${session.id}`);
          console.log(`  Visitor: ${session.visitor_id}`);
          console.log(`  Created: ${session.created_at}`);
          console.log(`  Intent: ${session.final_intent || 'none'}`);
          console.log(`  Score: ${session.lead_score || 0}`);
          console.log('');
        });
      }
    }

    // Check test sessions specifically
    const { data: testSessions, error: testError } = await supabase
      .from('sessions')
      .select('*')
      .like('visitor_id', 'test-%');

    if (testError) {
      console.error('Error fetching test sessions:', testError);
    } else {
      console.log(`\nTest sessions (visitor_id starting with 'test-'): ${testSessions?.length || 0}`);
      if (testSessions && testSessions.length > 0) {
        testSessions.forEach(session => {
          console.log(`- ${session.visitor_id}: Intent=${session.final_intent}, Score=${session.lead_score}`);
        });
      }
    }

    // Check sessions from last 7 days
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - 7);
    
    const { data: recentSessions, error: recentError } = await supabase
      .from('sessions')
      .select('*')
      .gte('created_at', dateThreshold.toISOString());

    if (recentError) {
      console.error('Error fetching recent sessions:', recentError);
    } else {
      console.log(`\nSessions from last 7 days: ${recentSessions?.length || 0}`);
    }

    // Check if we have any summaries
    const { data: summaries, error: summariesError } = await supabase
      .from('summaries')
      .select('*')
      .limit(5);

    if (summariesError) {
      console.error('Error fetching summaries:', summariesError);
    } else {
      console.log(`\nSummaries found: ${summaries?.length || 0}`);
    }

    // Check if we have any utterances
    const { data: utterances, error: utterancesError } = await supabase
      .from('utterances')
      .select('session_id')
      .limit(10);

    if (utterancesError) {
      console.error('Error fetching utterances:', utterancesError);
    } else {
      console.log(`Utterances found: ${utterances?.length || 0}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkData();
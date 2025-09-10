const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedData() {
  console.log('Starting to seed admin dashboard data...');

  try {
    // Create test sessions using the edge function for proper authorization
    console.log('Creating test sessions via edge function...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .insert([
        {
          visitor_id: 'test-visitor-001',
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          final_intent: 'purchase_intent',
          lead_score: 90,
          email: 'john.doe@example.com',
          contact_name: 'John Doe',
          cta_chosen: 'schedule_demo',
          channel: 'web',
          consent: true,
          notes: 'Very interested in enterprise plan'
        },
        {
          visitor_id: 'test-visitor-002',
          started_at: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
          final_intent: 'product_inquiry',
          lead_score: 65,
          email: 'jane.smith@company.com',
          contact_name: 'Jane Smith',
          cta_chosen: null,
          channel: 'web',
          consent: true,
          notes: 'Asking about pricing and features'
        },
        {
          visitor_id: 'test-visitor-003',
          started_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 47.75 * 60 * 60 * 1000).toISOString(),
          final_intent: 'browsing',
          lead_score: 20,
          email: null,
          contact_name: null,
          cta_chosen: null,
          channel: 'web',
          consent: false,
          notes: 'Just looking around'
        },
        {
          visitor_id: 'test-visitor-004',
          started_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 71.25 * 60 * 60 * 1000).toISOString(),
          final_intent: 'demo_request',
          lead_score: 75,
          email: 'mike.wilson@startup.io',
          contact_name: 'Mike Wilson',
          cta_chosen: 'request_demo',
          channel: 'web',
          consent: true,
          notes: 'Startup founder, interested in AI features'
        },
        {
          visitor_id: 'test-visitor-005',
          started_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 95.67 * 60 * 60 * 1000).toISOString(),
          final_intent: 'support_inquiry',
          lead_score: 30,
          email: 'support@client.com',
          contact_name: 'Support User',
          cta_chosen: null,
          channel: 'web',
          consent: true,
          notes: 'Existing customer with questions'
        },
        {
          visitor_id: 'test-visitor-006',
          started_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 119 * 60 * 60 * 1000).toISOString(),
          final_intent: 'consulting_inquiry',
          lead_score: 85,
          email: 'enterprise@bigcorp.com',
          contact_name: 'Enterprise Buyer',
          cta_chosen: 'book_consultation',
          channel: 'web',
          consent: true,
          notes: 'Fortune 500 company exploring options'
        },
        {
          visitor_id: 'test-visitor-007',
          started_at: new Date(Date.now() - 144 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 143.5 * 60 * 60 * 1000).toISOString(),
          final_intent: 'feature_inquiry',
          lead_score: 50,
          email: 'product@agency.com',
          contact_name: 'Agency Manager',
          cta_chosen: null,
          channel: 'web',
          consent: true,
          notes: 'Digital agency evaluating for clients'
        },
        {
          visitor_id: 'test-visitor-008',
          started_at: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 167.33 * 60 * 60 * 1000).toISOString(),
          final_intent: 'partnership_vendor',
          lead_score: 80,
          email: 'partner@vendor.com',
          contact_name: 'Partner Manager',
          cta_chosen: 'partner_application',
          channel: 'web',
          consent: true,
          notes: 'Potential integration partner'
        }
      ])
      .select();

    if (sessionsError) {
      console.error('Error creating sessions:', sessionsError);
      return;
    }

    console.log(`Created ${sessions.length} test sessions`);

    // Add utterances for the high-value lead
    const highValueSession = sessions.find(s => s.visitor_id === 'test-visitor-001');
    if (highValueSession) {
      console.log('Adding conversation for high-value lead...');
      const baseTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const { error: utterancesError } = await supabase
        .from('utterances')
        .insert([
          {
            session_id: highValueSession.id,
            speaker: 'visitor',
            text: 'Hi, I am looking for an AI voice assistant for our enterprise',
            ts: new Date(baseTime).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'agent',
            text: 'Hello! I would be happy to help you explore our AI voice assistant solutions. Can you tell me more about your enterprise needs?',
            ts: new Date(baseTime.getTime() + 5000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'visitor',
            text: 'We need something that can handle customer support calls at scale',
            ts: new Date(baseTime.getTime() + 30000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'agent',
            text: 'Our enterprise solution is perfect for high-volume customer support. We offer advanced features like multi-language support, custom voice training, and seamless CRM integration. Would you like to see a demo?',
            ts: new Date(baseTime.getTime() + 35000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'visitor',
            text: 'Yes, definitely. We have a budget of around $50,000 per year',
            ts: new Date(baseTime.getTime() + 60000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'agent',
            text: 'Excellent! That budget aligns well with our enterprise tier. Let me help you schedule a personalized demo with our enterprise team. What is your email address?',
            ts: new Date(baseTime.getTime() + 65000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'visitor',
            text: 'john.doe@example.com',
            ts: new Date(baseTime.getTime() + 90000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'agent',
            text: 'Perfect! I have noted your email. Our enterprise team will reach out within 24 hours to schedule your demo. Is there anything specific you would like us to cover?',
            ts: new Date(baseTime.getTime() + 95000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'visitor',
            text: 'We need API access and the ability to train on our own data',
            ts: new Date(baseTime.getTime() + 120000).toISOString()
          },
          {
            session_id: highValueSession.id,
            speaker: 'agent',
            text: 'Noted! Full API access and custom model training are included in our enterprise plan. I have added these requirements to your demo request.',
            ts: new Date(baseTime.getTime() + 125000).toISOString()
          }
        ]);

      if (utterancesError) {
        console.error('Error creating utterances:', utterancesError);
      } else {
        console.log('Added conversation transcript');
      }
    }

    // Add summaries for high-value sessions
    console.log('Adding summaries for high-value leads...');
    const highValueSessions = sessions.filter(s => s.lead_score >= 70);
    
    for (const session of highValueSessions) {
      let summary = '';
      let actionItems = [];
      
      if (session.visitor_id === 'test-visitor-001') {
        summary = 'High-value enterprise lead interested in AI voice assistant for customer support. Budget: $50k/year. Needs API access and custom training.';
        actionItems = [
          { owner: 'sales', text: 'Schedule enterprise demo within 24 hours', priority: 'high' },
          { owner: 'solutions', text: 'Prepare custom training documentation', priority: 'medium' }
        ];
      } else if (session.visitor_id === 'test-visitor-004') {
        summary = 'Startup founder requesting demo. Interested in AI features for customer engagement.';
        actionItems = [{ owner: 'sales', text: 'Follow up within 48 hours', priority: 'medium' }];
      } else if (session.visitor_id === 'test-visitor-006') {
        summary = 'Fortune 500 company exploring enterprise options. High potential for large-scale deployment.';
        actionItems = [{ owner: 'sales', text: 'Follow up within 48 hours', priority: 'medium' }];
      } else if (session.visitor_id === 'test-visitor-008') {
        summary = 'Potential integration partner interested in API collaboration and white-label solutions.';
        actionItems = [{ owner: 'sales', text: 'Follow up within 48 hours', priority: 'medium' }];
      } else {
        summary = 'Qualified lead showing strong interest in our solution.';
        actionItems = [{ owner: 'sales', text: 'Follow up within 48 hours', priority: 'medium' }];
      }
      
      const { error: summaryError } = await supabase
        .from('summaries')
        .insert({
          session_id: session.id,
          executive_summary: summary,
          action_items: actionItems,
          crm_payload: {
            lead_status: 'qualified',
            next_step: 'demo_scheduled',
            potential_value: session.lead_score >= 85 ? 'high' : 'medium'
          }
        });
      
      if (summaryError) {
        console.error('Error creating summary:', summaryError);
      }
    }
    
    console.log('Added summaries for high-value leads');

    // Add some events for analytics
    console.log('Adding analytics events...');
    for (const session of sessions) {
      const { error: eventsError } = await supabase
        .from('events')
        .insert([
          {
            session_id: session.id,
            kind: 'page_view',
            payload: { page: '/', duration: 5 }
          },
          {
            session_id: session.id,
            kind: 'feature_explored',
            payload: { feature: 'voice_demo', interaction_time: 30 }
          },
          {
            session_id: session.id,
            kind: 'cta_viewed',
            payload: { cta: 'schedule_demo', shown_after: 60 }
          }
        ]);
      
      if (eventsError) {
        console.error('Error creating events:', eventsError);
      }
    }
    
    console.log('Added analytics events');

    // Output summary
    console.log('\n=== Test Data Created Successfully ===');
    console.log(`Total sessions: ${sessions.length}`);
    console.log(`High-value leads (score >= 70): ${sessions.filter(s => s.lead_score >= 70).length}`);
    console.log(`Average lead score: ${Math.round(sessions.reduce((acc, s) => acc + s.lead_score, 0) / sessions.length)}`);
    console.log('\nYou can now view this data in your admin dashboard at http://localhost:5173/admin');

  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

seedData();
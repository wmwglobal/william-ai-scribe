import { supabase } from './client';

/**
 * Helper to access tables in the scribe schema directly
 * This provides better performance by avoiding views
 */
export const scribeDb = {
  sessions: () => supabase.from('sessions').schema('scribe'),
  utterances: () => supabase.from('utterances').schema('scribe'),
  summaries: () => supabase.from('summaries').schema('scribe'),
  events: () => supabase.from('events').schema('scribe'),
  extracts: () => supabase.from('extracts').schema('scribe'),
  profiles: () => supabase.from('profiles').schema('scribe'),
  rag_collections: () => supabase.from('rag_collections').schema('scribe'),
  rag_documents: () => supabase.from('rag_documents').schema('scribe'),
  rag_chunks: () => supabase.from('rag_chunks').schema('scribe'),
  rag_embeddings: () => supabase.from('rag_embeddings').schema('scribe'),
};

// Export the regular supabase client for auth and other operations
export { supabase };
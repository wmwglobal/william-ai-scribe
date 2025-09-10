# Schema Migration Guide

## Overview
This guide explains how to migrate from the public schema to the new `scribe` schema for better organization and security.

## Migration Steps

### 1. Run the Schema Migration
Execute the migration script in your Supabase SQL Editor:

```sql
-- Run this file in Supabase SQL Editor
supabase/migrations/20250106_create_scribe_schema.sql
```

This script will:
- Create a new `scribe` schema
- Move all tables from `public` to `scribe` 
- Set up proper RLS policies for both anonymous and authenticated users
- Create backward-compatible views in the public schema
- Grant appropriate permissions

### 2. Seed Test Data (Optional)
After the migration, you can populate test data:

```sql
-- Run this file in Supabase SQL Editor
scripts/seed-scribe-schema.sql
```

This will create:
- 8 test sessions with varying lead scores
- Conversation transcripts
- Summaries and action items
- Analytics events

### 3. Update Edge Functions
All Edge Functions need to be updated to use the `scribe` schema:

Replace all occurrences of:
- `from('sessions')` → `from('sessions').schema('scribe')`
- `from('utterances')` → `from('utterances').schema('scribe')`
- `from('summaries')` → `from('summaries').schema('scribe')`
- `from('events')` → `from('events').schema('scribe')`
- `from('extracts')` → `from('extracts').schema('scribe')`
- `from('profiles')` → `from('profiles').schema('scribe')`

### 4. Update Application Code (Optional)
The migration creates views in the public schema for backward compatibility, so the application will continue to work without changes. However, for better performance, you can update your code to use the scribe schema directly:

#### Option A: Use the scribe client helper
```typescript
import { scribeDb } from '@/integrations/supabase/scribe-client';

// Instead of:
const { data } = await supabase.from('sessions').select('*');

// Use:
const { data } = await scribeDb.sessions().select('*');
```

#### Option B: Add schema to queries
```typescript
// Add .schema('scribe') to all queries
const { data } = await supabase
  .from('sessions')
  .schema('scribe')
  .select('*');
```

## Benefits of the New Schema

1. **Better Organization**: All application tables are in a dedicated schema
2. **Enhanced Security**: Clear separation between system and application data
3. **Easier Permissions**: Schema-level grants are simpler to manage
4. **Performance**: Direct schema access is faster than views
5. **Maintainability**: Easier to backup, migrate, or replicate the schema

## RLS Policy Overview

### Anonymous Users (Visitors)
- Can create and read sessions (with session_secret validation)
- Can create utterances, events, extracts, and summaries
- Cannot modify or delete data

### Authenticated Users (Admins)
- Full read access to all data when role is 'admin' or 'owner'
- Full write access to all data when role is 'admin' or 'owner'
- Regular users can only read their own profile

## Rollback Plan
If you need to rollback the migration:

```sql
-- Move tables back to public schema
ALTER TABLE scribe.sessions SET SCHEMA public;
ALTER TABLE scribe.utterances SET SCHEMA public;
ALTER TABLE scribe.summaries SET SCHEMA public;
ALTER TABLE scribe.events SET SCHEMA public;
ALTER TABLE scribe.extracts SET SCHEMA public;
ALTER TABLE scribe.profiles SET SCHEMA public;
ALTER TABLE scribe.rag_collections SET SCHEMA public;
ALTER TABLE scribe.rag_documents SET SCHEMA public;
ALTER TABLE scribe.rag_chunks SET SCHEMA public;
ALTER TABLE scribe.rag_embeddings SET SCHEMA public;

-- Drop the views
DROP VIEW IF EXISTS public.sessions CASCADE;
DROP VIEW IF EXISTS public.utterances CASCADE;
DROP VIEW IF EXISTS public.summaries CASCADE;
DROP VIEW IF EXISTS public.events CASCADE;
DROP VIEW IF EXISTS public.extracts CASCADE;
DROP VIEW IF EXISTS public.profiles CASCADE;

-- Drop the scribe schema
DROP SCHEMA scribe CASCADE;
```

## Testing Checklist
After migration, verify:
- [ ] Admin dashboard loads and shows data
- [ ] Chat sessions can be created
- [ ] Utterances are saved correctly
- [ ] Summaries are generated
- [ ] Events are tracked
- [ ] Admin authentication works
- [ ] Lead scoring functions properly
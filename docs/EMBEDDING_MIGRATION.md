# HuggingFace Embedding Migration Guide

This document outlines the migration from OpenAI embeddings to HuggingFace embeddings for the William AI voice agent project.

## Overview

The RAG (Retrieval-Augmented Generation) memory system has been upgraded to support both OpenAI and HuggingFace embedding providers, with HuggingFace as the default for cost optimization.

### Key Changes

- **Dual Embedding Support**: The system now supports both 1536d (OpenAI) and 1024d (HuggingFace) embeddings
- **Zero Downtime Migration**: Existing OpenAI embeddings continue to work while new memories use HuggingFace
- **Cost Optimization**: HuggingFace Inference API is free (1000 req/hour) vs OpenAI's paid service
- **Improved Caching**: 24-hour in-memory cache reduces API calls
- **Rate Limit Management**: Built-in rate limiting for HuggingFace free tier

## Technical Implementation

### Database Schema Changes

```sql
-- New columns added to memories table
ALTER TABLE public.memories 
ADD COLUMN embedding_hf vector(1024);  -- HuggingFace embeddings
ADD COLUMN embedding_provider text DEFAULT 'openai';  -- Provider tracking
```

### Edge Functions Updated

1. **`generate_embeddings`**: Now supports both providers with caching and rate limiting
2. **`save_memory`**: Uses appropriate embedding column based on provider
3. **`recall_memories`**: Handles dimension compatibility and provider selection

### Environment Variables

Set in Supabase Edge Function secrets:

```bash
EMBEDDING_PROVIDER=huggingface  # or 'openai'
HUGGINGFACE_API_KEY=your_hf_token
```

## Migration Steps

### 1. Deploy Updated Schema

```bash
# Apply database migration
supabase db push

# Or run the migration SQL manually:
psql -f supabase/migrations/20250910_add_huggingface_embeddings.sql
```

### 2. Update Edge Functions

```bash
# Deploy updated functions
supabase functions deploy generate_embeddings
supabase functions deploy save_memory  
supabase functions deploy recall_memories
```

### 3. Configure Environment

In Supabase dashboard → Project Settings → Edge Functions:

```bash
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=hf_your_token_here
```

### 4. Test Implementation

```bash
# Run the test suite
node scripts/test_embeddings.js
```

### 5. Migrate Existing Data (Optional)

```sql
-- Mark existing embeddings as OpenAI
UPDATE public.memories 
SET embedding_provider = 'openai' 
WHERE embedding IS NOT NULL 
AND embedding_provider IS NULL;
```

## Provider Comparison

| Feature | OpenAI | HuggingFace |
|---------|--------|-------------|
| **Model** | text-embedding-3-small | BAAI/bge-large-en-v1.5 |
| **Dimensions** | 1536 | 1024 |
| **Cost** | $0.02 per 1M tokens | Free (1000/hour) |
| **Rate Limits** | 3,000 RPM | 1,000 RPH |
| **Quality** | Excellent | Very Good |
| **Latency** | ~200ms | ~300ms |

## Fallback Behavior

The system includes multiple fallback layers:

1. **Primary**: Use configured provider (HuggingFace/OpenAI)
2. **Cache Fallback**: Return cached embeddings if API fails
3. **Provider Fallback**: Try alternative provider if primary fails
4. **Hash Fallback**: Generate deterministic hash-based embeddings

## Monitoring

### Rate Limit Monitoring

```sql
-- Check HuggingFace usage in Edge Function logs
SELECT * FROM edge_logs 
WHERE message LIKE '%HF Rate limit%' 
ORDER BY timestamp DESC;
```

### Migration Status

```sql
-- Check embedding distribution
SELECT 
    embedding_provider,
    COUNT(*) as memories,
    COUNT(embedding) as openai_embeddings,
    COUNT(embedding_hf) as huggingface_embeddings
FROM public.memories 
GROUP BY embedding_provider;
```

## Performance Considerations

### Caching Strategy

- **TTL**: 24 hours for embedding cache
- **Memory Usage**: ~1MB per 1000 cached embeddings
- **Cache Hit Rate**: Expected 60-80% for repeated queries

### Batch Processing

- **Max Batch Size**: 50 texts per request (HuggingFace limit)
- **Optimal Batch**: 10-20 texts for best latency
- **Retry Logic**: Exponential backoff for rate limits

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   ```
   Error: HuggingFace API rate limit exceeded (1000/hour)
   ```
   - **Solution**: System automatically uses fallback embeddings
   - **Prevention**: Implement request batching and caching

2. **Dimension Mismatch**
   ```
   Warning: Dimension mismatch: query(1024) vs memory(1536)
   ```
   - **Cause**: Mixing providers during migration
   - **Solution**: System falls back to importance-based ranking

3. **API Key Missing**
   ```
   Error: HUGGINGFACE_API_KEY not configured
   ```
   - **Solution**: Set API key in Supabase Edge Function secrets

### Debug Queries

```sql
-- Find memories with missing embeddings
SELECT id, scope, embedding_provider, 
       embedding IS NOT NULL as has_openai,
       embedding_hf IS NOT NULL as has_huggingface
FROM public.memories 
WHERE (embedding_provider = 'openai' AND embedding IS NULL) OR
      (embedding_provider = 'huggingface' AND embedding_hf IS NULL);

-- Performance check
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.memories 
WHERE embedding_provider = 'huggingface';
```

## Cost Analysis

### Expected Savings

For 20-30 daily users with ~100 memory operations/day:

- **Before**: ~3,000 OpenAI API calls/month = $0.60/month
- **After**: HuggingFace free tier = $0/month
- **Savings**: 100% cost reduction for embedding generation

### Scale Considerations

- **Free Tier Limit**: 24,000 requests/month (1000/hour)
- **Projected Usage**: ~3,000 requests/month
- **Headroom**: 8x safety margin
- **Upgrade Path**: HuggingFace Pro ($20/month) for 1M requests/month if needed

## Rollback Plan

If issues arise, rollback to OpenAI:

1. **Set Environment Variable**:
   ```bash
   EMBEDDING_PROVIDER=openai
   ```

2. **Existing Data**: No changes needed - OpenAI embeddings remain intact

3. **New Memories**: Will use OpenAI embeddings going forward

## Next Steps

1. ✅ Deploy and test in staging environment
2. ✅ Monitor rate limits and performance
3. ⏳ Deploy to production
4. ⏳ Monitor for 48 hours
5. ⏳ Consider regenerating old embeddings with HuggingFace for consistency

## Support

For issues or questions:
- Check Edge Function logs in Supabase dashboard
- Run the test script: `node scripts/test_embeddings.js`
- Review this migration guide
- Check the backup files in `/backups/` directory
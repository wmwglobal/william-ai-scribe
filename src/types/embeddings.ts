// Type definitions for the embedding system

export type EmbeddingProvider = 'openai' | 'huggingface';

export interface EmbeddingResponse {
  embeddings: number[][];
  provider: EmbeddingProvider;
  dimensions: number;
  cached?: boolean;
}

export interface Memory {
  id: string;
  session_id?: string;
  user_id?: string;
  visitor_id?: string;
  scope: 'short' | 'medium' | 'long' | 'episodic';
  content: any;
  summary?: string;
  importance: number;
  last_referenced?: string;
  embedding?: number[]; // OpenAI embeddings (1536d)
  embedding_hf?: number[]; // HuggingFace embeddings (1024d)
  embedding_provider?: EmbeddingProvider;
  tags?: string[];
  created_at: string;
  updated_at: string;
  
  // Runtime fields added by recall
  similarity?: number;
  embedding_used?: 'vector' | 'importance';
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  dimensions: number;
  model: string;
  maxBatchSize: number;
  rateLimits?: {
    maxRequests: number;
    windowMs: number;
  };
}

export const EMBEDDING_CONFIGS: Record<EmbeddingProvider, EmbeddingConfig> = {
  huggingface: {
    provider: 'huggingface',
    dimensions: 1024,
    model: 'BAAI/bge-large-en-v1.5',
    maxBatchSize: 50,
    rateLimits: {
      maxRequests: 900, // HuggingFace free tier buffer
      windowMs: 60 * 60 * 1000, // 1 hour
    },
  },
  openai: {
    provider: 'openai',
    dimensions: 1536,
    model: 'text-embedding-3-small',
    maxBatchSize: 100,
    // OpenAI has higher rate limits, no explicit tracking needed
  },
};

export interface EmbeddingGenerationOptions {
  provider?: EmbeddingProvider;
  useCache?: boolean;
  cacheTTL?: number;
  fallbackOnError?: boolean;
}

export interface MemoryRecallOptions {
  session_id: string;
  session_secret: string;
  query: string;
  scopes?: string[];
  limit?: number;
  embeddingProvider?: EmbeddingProvider;
}

export interface MemoryRecallResponse {
  memories: Memory[];
  count: number;
  provider_used?: EmbeddingProvider;
  embedding_stats?: {
    vector_matches: number;
    importance_fallbacks: number;
    dimension_mismatches: number;
  };
}
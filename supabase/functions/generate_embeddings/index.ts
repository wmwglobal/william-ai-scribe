// Edge Function to generate embeddings using HuggingFace or OpenAI
// Supports BAAI/bge-large-en-v1.5 (1024d) and OpenAI text-embedding-3-small (1536d)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const EMBEDDING_PROVIDER = Deno.env.get('EMBEDDING_PROVIDER') || 'huggingface' // 'huggingface' | 'openai'
const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Rate limiting for HuggingFace free tier (1000 requests/hour)
const rateLimitMap = new Map()
const HF_RATE_LIMIT = {
  maxRequests: 900, // Leave buffer for safety
  windowMs: 60 * 60 * 1000, // 1 hour
}

interface EmbeddingResponse {
  embeddings: number[][]
  provider: string
  dimensions: number
  cached?: boolean
}

// Simple in-memory cache for embeddings (production should use Redis)
const embeddingCache = new Map<string, { embedding: number[], timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function checkHuggingFaceRateLimit(): boolean {
  const now = Date.now()
  const clientData = rateLimitMap.get('hf_global') || { count: 0, windowStart: now }
  
  if (now - clientData.windowStart > HF_RATE_LIMIT.windowMs) {
    rateLimitMap.set('hf_global', { count: 1, windowStart: now })
    return true
  }
  
  if (clientData.count >= HF_RATE_LIMIT.maxRequests) {
    console.warn(`HuggingFace rate limit reached: ${clientData.count}/${HF_RATE_LIMIT.maxRequests}`)
    return false
  }
  
  clientData.count++
  return true
}

async function generateHuggingFaceEmbeddings(texts: string[]): Promise<number[][]> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY not configured')
  }

  if (!checkHuggingFaceRateLimit()) {
    throw new Error('HuggingFace API rate limit exceeded (1000/hour)')
  }

  const response = await fetch(
    'https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-large-en-v1.5',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: texts,
        options: { wait_for_model: true }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('HuggingFace API error:', errorText)
    throw new Error(`HuggingFace API error: ${response.status}`)
  }

  const result = await response.json()
  
  // Handle different response formats
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result // Multiple texts
  } else if (Array.isArray(result)) {
    return [result] // Single text
  } else {
    throw new Error('Unexpected HuggingFace API response format')
  }
}

async function generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}

// Fallback embedding generation (hash-based, maintains backward compatibility)
function generateFallbackEmbeddings(texts: string[], dimensions: number = 1024): number[][] {
  return texts.map(text => {
    const vector = new Array(dimensions).fill(0)
    const words = text.toLowerCase().split(/\s+/)
    
    words.forEach((word, i) => {
      const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const index = hash % dimensions
      vector[index] = Math.sin(hash + i) * 0.5 + 0.5
    })
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector
  })
}

function getCacheKey(text: string, provider: string): string {
  // Create a simple hash for the cache key
  const hash = text.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * i, 0)
  return `${provider}:${hash}:${text.length}`
}

async function generateEmbeddingsWithCache(texts: string[]): Promise<EmbeddingResponse> {
  const provider = EMBEDDING_PROVIDER
  const dimensions = provider === 'huggingface' ? 1024 : 1536
  const now = Date.now()
  
  // Check cache for all texts
  const cachedResults: { [index: number]: number[] } = {}
  const textsToProcess: string[] = []
  const textIndexMap: { [text: string]: number } = {}
  
  texts.forEach((text, index) => {
    const cacheKey = getCacheKey(text, provider)
    const cached = embeddingCache.get(cacheKey)
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      cachedResults[index] = cached.embedding
    } else {
      textsToProcess.push(text)
      textIndexMap[text] = index
    }
  })
  
  let embeddings: number[][] = new Array(texts.length)
  
  // Fill in cached results
  Object.entries(cachedResults).forEach(([index, embedding]) => {
    embeddings[parseInt(index)] = embedding
  })
  
  // Process remaining texts
  if (textsToProcess.length > 0) {
    try {
      let freshEmbeddings: number[][]
      
      if (provider === 'huggingface') {
        freshEmbeddings = await generateHuggingFaceEmbeddings(textsToProcess)
      } else if (provider === 'openai') {
        freshEmbeddings = await generateOpenAIEmbeddings(textsToProcess)
      } else {
        console.warn(`Unknown provider ${provider}, falling back to hash-based embeddings`)
        freshEmbeddings = generateFallbackEmbeddings(textsToProcess, dimensions)
      }
      
      // Cache and assign fresh embeddings
      textsToProcess.forEach((text, i) => {
        const originalIndex = textIndexMap[text]
        const embedding = freshEmbeddings[i]
        embeddings[originalIndex] = embedding
        
        // Cache the result
        const cacheKey = getCacheKey(text, provider)
        embeddingCache.set(cacheKey, { embedding, timestamp: now })
      })
      
    } catch (error) {
      console.warn(`${provider} embedding failed, using fallback:`, error.message)
      
      // Generate fallback embeddings for failed texts
      const fallbackEmbeddings = generateFallbackEmbeddings(textsToProcess, dimensions)
      textsToProcess.forEach((text, i) => {
        const originalIndex = textIndexMap[text]
        embeddings[originalIndex] = fallbackEmbeddings[i]
      })
    }
  }
  
  return {
    embeddings,
    provider,
    dimensions,
    cached: Object.keys(cachedResults).length > 0
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const { texts } = await req.json()
    
    if (!texts || !Array.isArray(texts)) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts array cannot be empty' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Limit batch size to prevent timeout
    if (texts.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Maximum 50 texts per request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Generating embeddings for ${texts.length} texts using ${EMBEDDING_PROVIDER}`)
    
    const result = await generateEmbeddingsWithCache(texts)
    const processingTime = Date.now() - startTime
    
    console.log(`Embeddings generated in ${processingTime}ms (${result.dimensions}d, cached: ${result.cached})`)
    
    // Log rate limit status for monitoring
    if (EMBEDDING_PROVIDER === 'huggingface') {
      const rateLimitData = rateLimitMap.get('hf_global')
      if (rateLimitData) {
        console.log(`HF Rate limit: ${rateLimitData.count}/${HF_RATE_LIMIT.maxRequests}`)
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate_embeddings:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        provider: EMBEDDING_PROVIDER 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
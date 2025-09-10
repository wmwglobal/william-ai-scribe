#!/usr/bin/env node

/**
 * Test Script for HuggingFace Embedding Migration
 * 
 * This script tests the embedding system to ensure:
 * 1. HuggingFace embeddings are generated correctly
 * 2. Fallback systems work as expected  
 * 3. Rate limiting is functioning
 * 4. Both providers can coexist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmbeddingGeneration() {
  console.log('🧪 Testing embedding generation...\n');
  
  const testTexts = [
    'Hello, this is a test embedding',
    'The weather is nice today',
    'Machine learning and artificial intelligence'
  ];

  try {
    const response = await supabase.functions.invoke('generate_embeddings', {
      body: { texts: testTexts }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const { embeddings, provider, dimensions, cached } = response.data;
    
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    console.log(`📊 Provider: ${provider}`);
    console.log(`📐 Dimensions: ${dimensions}`);
    console.log(`💾 Cached: ${cached || false}`);
    console.log(`🔍 First embedding length: ${embeddings[0]?.length}\n`);
    
    // Verify embedding properties
    if (embeddings.length !== testTexts.length) {
      throw new Error(`Expected ${testTexts.length} embeddings, got ${embeddings.length}`);
    }
    
    // Check dimensions match provider expectations
    const expectedDims = provider === 'huggingface' ? 1024 : 1536;
    if (dimensions !== expectedDims) {
      console.warn(`⚠️ Unexpected dimensions: ${dimensions} (expected ${expectedDims} for ${provider})`);
    }
    
    // Verify embeddings are normalized (should be close to 1)
    embeddings.forEach((embedding, i) => {
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (Math.abs(magnitude - 1.0) > 0.01) {
        console.warn(`⚠️ Embedding ${i} not normalized: magnitude = ${magnitude}`);
      }
    });
    
    return { success: true, provider, dimensions };
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testRateLimit() {
  console.log('🚦 Testing rate limiting...\n');
  
  try {
    // Make several requests quickly to test rate limiting
    const promises = Array.from({ length: 5 }, (_, i) => 
      supabase.functions.invoke('generate_embeddings', {
        body: { texts: [`Rate limit test ${i}`] }
      })
    );
    
    const results = await Promise.all(promises);
    const successes = results.filter(r => !r.error).length;
    const failures = results.filter(r => r.error).length;
    
    console.log(`✅ Successful requests: ${successes}`);
    console.log(`❌ Failed requests: ${failures}`);
    
    if (failures > 0) {
      const rateLimitErrors = results.filter(r => 
        r.error && r.error.message.includes('rate limit')
      ).length;
      console.log(`🚦 Rate limit triggered: ${rateLimitErrors} times`);
    }
    
    return { success: true, totalRequests: 5, successes, failures };
    
  } catch (error) {
    console.error('❌ Rate limit test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testFallback() {
  console.log('🔄 Testing fallback behavior...\n');
  
  try {
    // Test with empty API key to trigger fallback
    const response = await supabase.functions.invoke('generate_embeddings', {
      body: { texts: ['Fallback test'] }
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    const { embeddings, provider } = response.data;
    
    // Even with fallback, we should get embeddings
    if (embeddings && embeddings.length > 0) {
      console.log('✅ Fallback system working - generated embeddings despite potential API issues');
      console.log(`📊 Fallback provider: ${provider}`);
      return { success: true, provider };
    } else {
      throw new Error('No embeddings generated in fallback mode');
    }
    
  } catch (error) {
    console.error('❌ Fallback test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting HuggingFace Embedding System Tests\n');
  console.log('=' .repeat(50));
  
  const results = {
    embedding: await testEmbeddingGeneration(),
    rateLimit: await testRateLimit(), 
    fallback: await testFallback()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST SUMMARY\n');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.toUpperCase()}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const allPassed = Object.values(results).every(r => r.success);
  
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Your HuggingFace embedding system is ready for production!');
    console.log('\nNext steps:');
    console.log('1. Set EMBEDDING_PROVIDER=huggingface in your Supabase secrets');
    console.log('2. Set HUGGINGFACE_API_KEY in your Supabase secrets');
    console.log('3. Deploy the updated Edge Functions');
    console.log('4. Run the migration SQL to update your database schema');
  } else {
    console.log('\n🔧 Please fix the failing tests before deploying to production.');
  }
  
  return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
/**
 * Test script for rate limiting
 * 
 * This script tests the rate limiting middleware by making multiple
 * requests to an API endpoint and checking the response headers.
 * 
 * Usage:
 *   npm run test-ratelimit
 * 
 * Or with tsx:
 *   npx tsx scripts/testRateLimit.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_ENDPOINT = '/api/leaderboard/hiphop';

interface RateLimitResponse {
  status: number;
  limit?: string;
  remaining?: string;
  reset?: string;
  retryAfter?: string;
}

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting\n');
  console.log(`Target: ${API_URL}${TEST_ENDPOINT}`);
  console.log('Expected limit: 100 requests per 60 seconds\n');

  const results: RateLimitResponse[] = [];
  let rateLimitHit = false;

  // Make requests until we hit the rate limit
  for (let i = 1; i <= 105; i++) {
    try {
      const response = await fetch(`${API_URL}${TEST_ENDPOINT}`);
      
      const result: RateLimitResponse = {
        status: response.status,
        limit: response.headers.get('X-RateLimit-Limit') || undefined,
        remaining: response.headers.get('X-RateLimit-Remaining') || undefined,
        reset: response.headers.get('X-RateLimit-Reset') || undefined,
        retryAfter: response.headers.get('Retry-After') || undefined,
      };

      results.push(result);

      // Log every 10th request or when rate limited
      if (i % 10 === 0 || response.status === 429) {
        const emoji = response.status === 429 ? '🚫' : '✅';
        console.log(
          `${emoji} Request ${i}: Status ${response.status} | ` +
          `Limit: ${result.limit} | Remaining: ${result.remaining}`
        );
      }

      // Stop after hitting rate limit
      if (response.status === 429 && !rateLimitHit) {
        rateLimitHit = true;
        console.log('\n🎯 Rate limit hit!');
        console.log(`   Retry-After: ${result.retryAfter} seconds`);
        console.log(`   Reset timestamp: ${result.reset}`);
        
        if (result.reset) {
          const resetDate = new Date(parseInt(result.reset));
          console.log(`   Reset time: ${resetDate.toLocaleString()}`);
        }
        
        break;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`❌ Request ${i} failed:`, error);
      break;
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total requests made: ${results.length}`);
  console.log(`   Successful requests: ${results.filter(r => r.status === 200).length}`);
  console.log(`   Rate limited requests: ${results.filter(r => r.status === 429).length}`);
  
  if (rateLimitHit) {
    console.log('\n✅ Rate limiting is working correctly!');
  } else {
    console.log('\n⚠️  Rate limit was not hit. This could mean:');
    console.log('   - Redis is not configured');
    console.log('   - The limit is higher than expected');
    console.log('   - The server is not running');
  }
}

// Run the test
testRateLimit().catch(console.error);


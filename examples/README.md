# Rate Limiting Examples

This directory contains example code demonstrating how to handle rate limiting in the Music Charts application.

## Files

### `RateLimitAwareComponent.tsx`

A complete React component example showing best practices for handling rate limits, including:

- **Visual feedback**: Progress bar showing remaining requests
- **Warning states**: Alert users when approaching the limit
- **Error handling**: Graceful handling of rate limit errors
- **Automatic retry**: Smart retry logic with countdown
- **Developer info**: Debug panel showing rate limit state

#### Usage

To use this component in your application:

```tsx
import RateLimitAwareComponent from '@/examples/RateLimitAwareComponent';

export default function Page() {
  return <RateLimitAwareComponent />;
}
```

#### Key Features

1. **Rate Limit Display**
   - Shows remaining requests out of total limit
   - Countdown timer until limit resets
   - Color-coded status (green/yellow/red)

2. **Progressive Warnings**
   - Green: Plenty of requests remaining
   - Yellow: Approaching limit (< 20% remaining)
   - Red: Rate limited

3. **User Experience**
   - Disables actions when rate limited
   - Shows clear error messages
   - Provides countdown for retry

## Integration Guide

### Step 1: Use the API Client

Import and use the rate-limit-aware API client:

```tsx
import { apiRequestSimple, RateLimitInfo } from '@/lib/api-client';

const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>();

const fetchData = async () => {
  const response = await apiRequestSimple('/api/endpoint');
  
  if (response.rateLimitInfo) {
    setRateLimitInfo(response.rateLimitInfo);
  }
  
  if (response.isRateLimited) {
    // Handle rate limit error
    console.error('Rate limited!');
    return;
  }
  
  // Use response.data
};
```

### Step 2: Display Rate Limit Info

Show users their current rate limit status:

```tsx
{rateLimitInfo && (
  <div>
    <p>{rateLimitInfo.remaining} / {rateLimitInfo.limit} requests remaining</p>
    <progress 
      value={rateLimitInfo.remaining} 
      max={rateLimitInfo.limit}
    />
  </div>
)}
```

### Step 3: Handle Rate Limit Errors

Provide clear feedback when rate limited:

```tsx
{isRateLimited && (
  <div className="error">
    <p>You've made too many requests.</p>
    <p>Please wait {timeUntilReset} seconds.</p>
  </div>
)}
```

### Step 4: Implement Smart Polling

For features that poll APIs (like live activity), adjust polling based on rate limits:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    // Check if approaching rate limit
    if (isApproachingRateLimit(rateLimitInfo, 0.2)) {
      // Slow down polling
      return;
    }
    
    fetchData();
  }, 5000); // Poll every 5 seconds
  
  return () => clearInterval(interval);
}, [rateLimitInfo]);
```

## Best Practices

### 1. Cache Responses

Reduce API calls by caching responses:

```tsx
import useSWR from 'swr';

const { data, error } = useSWR('/api/leaderboard/hiphop', fetcher, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshInterval: 60000, // Only refresh every minute
});
```

### 2. Debounce User Actions

Prevent rapid-fire requests:

```tsx
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  await apiRequestSimple(`/api/search?q=${query}`);
}, 500); // Wait 500ms after user stops typing
```

### 3. Show Loading States

Keep users informed during requests:

```tsx
{loading && <Spinner />}
{!loading && data && <Results data={data} />}
```

### 4. Implement Exponential Backoff

For automatic retries, use exponential backoff:

```tsx
import { apiRequest } from '@/lib/api-client';

// Automatically retries with exponential backoff
const response = await apiRequest('/api/endpoint', {}, {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
});
```

### 5. Monitor Rate Limit Headers

Always check rate limit headers in responses:

```tsx
const response = await fetch('/api/endpoint');
const remaining = response.headers.get('X-RateLimit-Remaining');
const limit = response.headers.get('X-RateLimit-Limit');

console.log(`${remaining}/${limit} requests remaining`);
```

## Testing Rate Limits

### Manual Testing

Use the test script to verify rate limiting:

```bash
npm run test-ratelimit
```

### Browser Testing

1. Open browser DevTools (Network tab)
2. Make multiple requests to an API endpoint
3. Watch for 429 responses
4. Check response headers for rate limit info

### Automated Testing

```typescript
describe('Rate Limiting', () => {
  it('should return 429 after exceeding limit', async () => {
    // Make requests until rate limited
    for (let i = 0; i < 35; i++) {
      const response = await fetch('/api/endpoint');
      if (response.status === 429) {
        expect(response.headers.get('Retry-After')).toBeDefined();
        return;
      }
    }
  });
});
```

## Troubleshooting

### Rate Limiting Not Working

1. **Check Redis configuration**
   ```bash
   # Verify environment variables are set
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. **Check server logs**
   ```
   [Middleware] Rate limiting skipped - Redis not configured
   ```

3. **Verify middleware is running**
   - Check `middleware.ts` exists in project root
   - Verify matcher pattern includes your route

### High Rate Limit Consumption

1. **Check for polling loops**
   - Look for `setInterval` or `setTimeout` in components
   - Verify polling intervals are reasonable (> 5 seconds)

2. **Review network requests**
   - Open DevTools Network tab
   - Look for duplicate or unnecessary requests

3. **Implement caching**
   - Use SWR or React Query
   - Cache responses in localStorage/sessionStorage

### Rate Limit Headers Missing

If rate limit headers are not appearing:

1. Verify middleware is running (check server logs)
2. Ensure Redis is properly configured
3. Check that the route matches the middleware pattern

## Additional Resources

- [Rate Limiting Documentation](../RATE_LIMITING.md)
- [Upstash Rate Limit Docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)


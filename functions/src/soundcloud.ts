import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getRedisClient } from './redis';
import fetch from 'node-fetch';

interface RequestData {
  urls: string[];
}

interface ResponseData {
  [url: string]: string | null; 
}

interface SoundCloudOEmbed {
  thumbnail_url?: string;
}

const CACHE_TTL = 604800;

/** 
 * Cloud Function to fetch SoundCloud cover images with Redis caching.
 * @param request - Callable request containing the 'urls' array.
 * @returns A map of { trackUrl: coverImageUrl }
 */
export const getSoundcloudCovers = onCall(
  {
    secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    ingressSettings: 'ALLOW_ALL',
  },
  async (request): Promise<ResponseData> => {
    const data = request.data as RequestData;
    const client = getRedisClient();

    const { urls } = data;
    if (!urls || !Array.isArray(urls)) {
      throw new HttpsError(
        'invalid-argument',
        'The function must be called with an array of track URLs.',
      );
    }

    const results: ResponseData = {};

    await Promise.all(
      urls.map(async (url) => {
        const cacheKey = `sc_cover:${url}`;

        try {
          const cachedUrl = await client.get(cacheKey);
          const imageUrlString = cachedUrl ? String(cachedUrl) : null;

          if (imageUrlString) {
            results[url] = imageUrlString;
            return;
          }

          const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(
            url,
          )}`;

          const response = await fetch(oembedUrl);

          if (!response.ok) {
            console.error(`SoundCloud oEmbed error ${response.status} for ${url}`);
            results[url] = null;
            return;
          }

          const scData = (await response.json()) as SoundCloudOEmbed;

          if (scData && scData.thumbnail_url) {
            const imageUrl: string = scData.thumbnail_url;
            await client.set(cacheKey, imageUrl, { ex: CACHE_TTL });

            results[url] = imageUrl;
          } else {
            results[url] = null;
          }
        } catch (error) {
          console.error(`General processing error for ${url}:`, error);
          results[url] = null;
        }
      }),
    );

    return results;
  },
);



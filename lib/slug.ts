/**
 * Map of common emojis to text equivalents for SEO-friendly slugs
 */
const EMOJI_TO_TEXT: Record<string, string> = {
  '🔥': 'fire',
  '💯': '100',
  '💀': 'skull',
  '💊': 'pill',
  '🎵': 'music',
  '🎶': 'notes',
  '🎤': 'mic',
  '🎧': 'headphones',
  '🎸': 'guitar',
  '🎹': 'piano',
  '🥁': 'drums',
  '🎺': 'trumpet',
  '🎷': 'sax',
  '🎻': 'violin',
  '💃': 'dance',
  '🕺': 'dance',
  '🎉': 'party',
  '🎊': 'celebration',
  '⭐': 'star',
  '✨': 'sparkle',
  '💫': 'dizzy',
  '🌟': 'star',
  '💎': 'diamond',
  '👑': 'crown',
  '🚀': 'rocket',
  '💥': 'boom',
  '⚡': 'lightning',
  '🌊': 'wave',
  '🔊': 'loud',
  '📢': 'announce',
  '💰': 'money',
  '💸': 'money',
  '❤️': 'love',
  '💙': 'love',
  '💚': 'love',
  '💛': 'love',
  '💜': 'love',
  '🖤': 'love',
  '🤍': 'love',
  '😈': 'devil',
  '👿': 'devil',
  '😎': 'cool',
  '🤑': 'money',
  '🤯': 'mind-blown',
  '😤': 'triumph',
  '💪': 'strong',
  '🙏': 'pray',
  '🌙': 'moon',
  '☀️': 'sun',
  '🌞': 'sun',
  '🌈': 'rainbow',
  '🔮': 'crystal',
  '👻': 'ghost',
  '💣': 'bomb',
  '🎯': 'target',
  '🏆': 'trophy',
  '🥇': 'gold',
  '🥈': 'silver',
  '🥉': 'bronze',
};

/**
 * Converts emojis in text to their text equivalents
 */
function convertEmojisToText(text: string): string {
  let result = text;
  
  // Replace known emojis with text
  for (const [emoji, textEquiv] of Object.entries(EMOJI_TO_TEXT)) {
    result = result.replace(new RegExp(emoji, 'g'), ` ${textEquiv} `);
  }
  
  // Remove any remaining emojis (unknown ones)
  // This regex matches most emoji ranges
  result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E0}-\u{1F1FF}]/gu, ' ');
  
  return result;
}

/**
 * Normalizes unicode characters (removes accents, diacritics)
 */
function normalizeUnicode(text: string): string {
  return text
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
}

/**
 * Converts a track name to a URL-friendly slug with emoji support.
 * - Converts emojis to text equivalents (🔥 → "fire")
 * - Removes unknown emojis
 * - Normalizes unicode (removes accents)
 * - Converts to lowercase
 * - Replaces special characters and spaces with dashes
 * - Ensures URL-safe output
 * 
 * @param trackName - The original track name
 * @returns A URL-friendly slug
 * 
 * @example
 * trackNameToSlug("My Awesome Track") // "my-awesome-track"
 * trackNameToSlug("Song 🔥") // "song-fire"
 * trackNameToSlug("Fire 🔥 Vibes 💯") // "fire-fire-vibes-100"
 * trackNameToSlug("Don't Stop") // "dont-stop"
 * trackNameToSlug("Rock & Roll") // "rock-and-roll"
 * trackNameToSlug("Café Música") // "cafe-musica"
 */
export function trackNameToSlug(trackName: string): string {
  if (!trackName) return '';
  
  let slug = trackName;
  
  // Convert emojis to text
  slug = convertEmojisToText(slug);
  
  // Normalize unicode (remove accents)
  slug = normalizeUnicode(slug);
  
  // Convert to lowercase
  slug = slug.toLowerCase();
  
  // Replace & with 'and'
  slug = slug.replace(/&/g, ' and ');
  
  // Replace common special characters with space
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  
  // Replace multiple dashes with single dash
  slug = slug.replace(/-+/g, '-');
  
  // Remove leading/trailing dashes
  slug = slug.replace(/^-+|-+$/g, '');
  
  // If slug is empty after processing, return a default
  if (!slug) return 'untitled';
  
  return slug;
}

/**
 * Converts a slug back to a track name for database retrieval.
 * NOTE: This is now deprecated. Use the slug field directly for queries.
 * This function cannot reliably reconstruct the original title.
 * 
 * @deprecated Use slug field for DB queries instead
 */
export function slugToTrackName(slug: string): string {
  if (!slug) return '';
  
  return slug
    .replace(/-+/g, ' ') // Replace dashes with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Generates a unique slug for a track by appending a number if necessary
 * 
 * @param baseSlug - The base slug generated from track name
 * @param existingSlugs - Array of slugs that already exist for this user
 * @returns A unique slug
 * 
 * @example
 * makeSlugUnique("my-track", ["my-track"]) // "my-track-2"
 * makeSlugUnique("my-track", ["my-track", "my-track-2"]) // "my-track-3"
 */
export function makeSlugUnique(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}


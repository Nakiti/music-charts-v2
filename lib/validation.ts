/**
 * Validation utilities for usernames, track titles, and artist names
 * Enforces strict rules to prevent URL issues and ensure data consistency
 */

/**
 * Username validation rules:
 * - 3-20 characters
 * - Only alphanumeric, underscore, and hyphen
 * - Must start with alphanumeric
 * - No emojis, spaces, or special characters
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters` };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Username can only contain letters, numbers, underscores, and hyphens (must start with letter or number)' 
    };
  }

  // Check for emojis (additional safety check)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiRegex.test(trimmed)) {
    return { valid: false, error: 'Username cannot contain emojis' };
  }

  return { valid: true };
}

/**
 * Track title validation rules:
 * - 2-100 characters
 * - No emojis or special unicode characters
 * - Only alphanumeric, spaces, and basic punctuation (. , ! ? ' " - & () [])
 * - Must result in non-empty slug
 */
export const TRACK_TITLE_MIN_LENGTH = 2;
export const TRACK_TITLE_MAX_LENGTH = 100;
export const TRACK_TITLE_REGEX = /^[a-zA-Z0-9\s.,!?'"&()\[\]-]+$/;

export function validateTrackTitle(title: string): { valid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Track title is required' };
  }

  const trimmed = title.trim();

  if (trimmed.length < TRACK_TITLE_MIN_LENGTH) {
    return { valid: false, error: `Track title must be at least ${TRACK_TITLE_MIN_LENGTH} characters` };
  }

  if (trimmed.length > TRACK_TITLE_MAX_LENGTH) {
    return { valid: false, error: `Track title must be at most ${TRACK_TITLE_MAX_LENGTH} characters` };
  }

  if (!TRACK_TITLE_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Track title can only contain letters, numbers, spaces, and basic punctuation (.,!?\'"&-()[])'
    };
  }

  // Check for emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiRegex.test(trimmed)) {
    return { valid: false, error: 'Track title cannot contain emojis' };
  }

  // Ensure it has at least some alphanumeric content (won't create empty slug)
  const alphanumericRegex = /[a-zA-Z0-9]/;
  if (!alphanumericRegex.test(trimmed)) {
    return { valid: false, error: 'Track title must contain at least one letter or number' };
  }

  return { valid: true };
}

/**
 * Artist name validation rules:
 * - 2-50 characters
 * - No emojis or special unicode characters
 * - Only alphanumeric, spaces, and basic punctuation (. , - & ')
 */
export const ARTIST_NAME_MIN_LENGTH = 2;
export const ARTIST_NAME_MAX_LENGTH = 50;
export const ARTIST_NAME_REGEX = /^[a-zA-Z0-9\s.,&'-]+$/;

export function validateArtistName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Artist name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < ARTIST_NAME_MIN_LENGTH) {
    return { valid: false, error: `Artist name must be at least ${ARTIST_NAME_MIN_LENGTH} characters` };
  }

  if (trimmed.length > ARTIST_NAME_MAX_LENGTH) {
    return { valid: false, error: `Artist name must be at most ${ARTIST_NAME_MAX_LENGTH} characters` };
  }

  if (!ARTIST_NAME_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Artist name can only contain letters, numbers, spaces, and basic punctuation (.,&\'-)'
    };
  }

  // Check for emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiRegex.test(trimmed)) {
    return { valid: false, error: 'Artist name cannot contain emojis' };
  }

  return { valid: true };
}

/**
 * Check if a string contains emojis
 */
export function containsEmojis(text: string): boolean {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E0}-\u{1F1FF}]/gu;
  return emojiRegex.test(text);
}

/**
 * Sanitize a string by removing emojis and special characters
 * Use this for displaying user input that might contain problematic characters
 */
export function sanitizeForDisplay(text: string): string {
  // Remove emojis
  let sanitized = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  return sanitized.trim();
}


// Utility for randomly selecting AI William avatar images

const WILLIAM_AVATARS = [
  '/lovable-uploads/4e4a0df0-6324-48a2-8c35-0b8ae7db33bc.png', // Original anime-style AI William avatar
];

/**
 * Get a random AI William avatar image
 * @returns {string} Random avatar image path
 */
export function getRandomWilliamAvatar(): string {
  // Now we just return the main AI William avatar
  return WILLIAM_AVATARS[0];
}

/**
 * Get a consistent avatar for a session (based on session ID)
 * @param sessionId {string} Session identifier
 * @returns {string} Consistent avatar image path for the session
 */
export function getSessionAvatar(sessionId: string): string {
  // Always return the main AI William avatar
  return WILLIAM_AVATARS[0];
}
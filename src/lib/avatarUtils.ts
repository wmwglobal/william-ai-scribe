// Utility for randomly selecting AI William avatar images

const WILLIAM_AVATARS = [
  '/lovable-uploads/9f844319-76a5-47dd-abea-a4d6ae44f096.png', // Centered anime-style AI William avatar
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
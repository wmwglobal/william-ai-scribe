// Utility for randomly selecting AI William avatar images

const WILLIAM_AVATARS = [
  '/lovable-uploads/e36e4c4b-528b-4abb-958e-b8bc6327dbad.png', // Minecraft style 1
  '/lovable-uploads/d270a15c-db0e-498a-8db2-b1ae54c82721.png', // Anime style 1
  '/lovable-uploads/eb872405-6610-4904-95be-610f33844a47.png', // Anime style 2
  '/lovable-uploads/4ee59304-98c0-470b-9fe6-e868d59fd132.png', // Anime style 3 (younger)
  '/lovable-uploads/4a580abb-6c46-4558-89fe-9484b4467952.png', // Minecraft style 2
];

/**
 * Get a random AI William avatar image
 * @returns {string} Random avatar image path
 */
export function getRandomWilliamAvatar(): string {
  // Prefer the anime style images (indices 1, 2, 3) which are better centered
  const preferredIndices = [1, 2, 3];
  const randomIndex = preferredIndices[Math.floor(Math.random() * preferredIndices.length)];
  return WILLIAM_AVATARS[randomIndex];
}

/**
 * Get a consistent avatar for a session (based on session ID)
 * @param sessionId {string} Session identifier
 * @returns {string} Consistent avatar image path for the session
 */
export function getSessionAvatar(sessionId: string): string {
  if (!sessionId) return getRandomWilliamAvatar();
  
  // Use session ID to create a consistent but pseudo-random selection
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % WILLIAM_AVATARS.length;
  return WILLIAM_AVATARS[index];
}
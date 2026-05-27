export const PERSONA_NAMES = [
  "The Last Bencher",
  "Midnight Thinker",
  "Cafeteria Critic",
  "Lost Freshman",
  "Senior Ghost",
  "Library Sleeper",
  "Campus Cryptid",
  "The Overthinker",
  "Silent Observer",
  "Local Legend",
  "Study Hall Scholar",
  "Hallway Roamer"
];

// Returns the display info for a post depending on its anonymity and who is viewing
export function getPersonaDisplay(post: any, isAdmin = false) {
  if (post.isAnonymous) {
    if (isAdmin) {
      // Admins see real identity + the persona they chose
      return {
        name: post.authorName,
        username: post.authorUsername,
        profilePicture: post.authorProfilePicture,
        badge: `Posted as ${post.personaName || 'Anonymous'}`,
        isAnonymous: true,
        realName: post.authorName,
        school: post.school
      };
    }
    
    // Public sees only the anonymous persona
    return {
      name: post.personaName || 'Anonymous',
      username: 'anonymous',
      profilePicture: undefined, // Let the UI handle generic avatar
      isAnonymous: true,
      realName: null,
      school: post.school
    };
  }

  // Not anonymous
  return {
    name: post.authorName,
    username: post.authorUsername,
    profilePicture: post.authorProfilePicture,
    isAnonymous: false,
    realName: post.authorName,
    school: post.school
  };
}

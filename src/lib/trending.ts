// ─── Trending Engine ────────────────────────────────────────
// Pure scoring functions for NextBench's hyperlocal trending system.
// No side effects — receives data, returns scored + labeled results.

export interface TrendablePost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  authorUsername?: string;
  school: string;
  city?: string;
  type: string;
  imageUrl?: string;
  imageUrls?: string[];
  upvotesCount: number;
  repliesCount: number;
  sharesCount?: number;
  createdAt: any;
}

export interface TrendableProduct {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  image: string;
  status: string;
  sellerId: string;
  sellerName: string;
  sellerSchool: string;
  city?: string;
  createdAt: any;
  wishlistCount?: number;
  inquiryCount?: number;
}

export type TrendLabel =
  | '⚡ Exploding'
  | '🔥 Heating Up'
  | '👀 Everyone\'s Watching'
  | '📈 Trending in Your School'
  | '🌆 Trending in Your City'
  | null;

export interface ScoredPost extends TrendablePost {
  trendScore: number;
  velocity: number;
  trendLabel: TrendLabel;
}

export interface ScoredProduct extends TrendableProduct {
  trendScore: number;
  trendLabel: TrendLabel;
}

// ─── Scoring Constants ──────────────────────────────────────

const WEIGHTS = {
  likes: 3,
  comments: 5,
  shares: 7,
} as const;

const DECAY_EXPONENT = 1.5;
const DECAY_OFFSET = 2; // prevents division by zero for brand-new posts

const VELOCITY_THRESHOLDS = {
  exploding: 10,   // engagement/hr
  heatingUp: 5,
} as const;

const VELOCITY_MULTIPLIERS = {
  exploding: 1.5,
  heatingUp: 1.3,
  normal: 1.0,
} as const;

const LOCALITY = {
  school: {
    sameSchool: 2.0,
    sameCity: 1.3,
    other: 0.5,
  },
  city: {
    sameCity: 2.0,
    other: 0.3,
  },
} as const;

// Anti-manipulation
const MAX_AUTHOR_IN_TRENDING = 2;
const MIN_POST_AGE_MINUTES = 5;
const BOT_LIKE_RATIO_THRESHOLD = 50; // likes with 0 comments → suspicious
const BOT_SCORE_PENALTY = 0.7;

// ─── Core Scoring ───────────────────────────────────────────

function getHoursSince(timestamp: any): number {
  if (!timestamp) return 999;
  const ms = typeof timestamp.toMillis === 'function'
    ? timestamp.toMillis()
    : (typeof timestamp.seconds === 'number' ? timestamp.seconds * 1000 : Date.now());
  return Math.max(0, (Date.now() - ms) / (1000 * 60 * 60));
}

function getMinutesSince(timestamp: any): number {
  return getHoursSince(timestamp) * 60;
}

function computeWeightedEngagement(post: TrendablePost): number {
  return (
    (post.upvotesCount || 0) * WEIGHTS.likes +
    (post.repliesCount || 0) * WEIGHTS.comments +
    (post.sharesCount || 0) * WEIGHTS.shares
  );
}

function computeDecay(hoursSincePost: number): number {
  return Math.pow(hoursSincePost + DECAY_OFFSET, DECAY_EXPONENT);
}

function computeVelocity(engagement: number, hoursSincePost: number): number {
  // Engagement per hour — clamped to prevent infinity for brand new posts
  return engagement / Math.max(hoursSincePost, 0.5);
}

function getVelocityMultiplier(velocity: number): number {
  if (velocity >= VELOCITY_THRESHOLDS.exploding) return VELOCITY_MULTIPLIERS.exploding;
  if (velocity >= VELOCITY_THRESHOLDS.heatingUp) return VELOCITY_MULTIPLIERS.heatingUp;
  return VELOCITY_MULTIPLIERS.normal;
}

function getSchoolLocalityMultiplier(
  postSchool: string,
  postCity: string | undefined,
  userSchool: string,
  userCity: string | undefined
): number {
  if (postSchool === userSchool) return LOCALITY.school.sameSchool;
  if (postCity && userCity && postCity === userCity) return LOCALITY.school.sameCity;
  return LOCALITY.school.other;
}

function getCityLocalityMultiplier(
  postCity: string | undefined,
  userCity: string | undefined
): number {
  if (postCity && userCity && postCity === userCity) return LOCALITY.city.sameCity;
  return LOCALITY.city.other;
}

function isSuspiciousEngagement(post: TrendablePost): boolean {
  // Bot pattern: many likes, zero comments
  return (post.upvotesCount || 0) >= BOT_LIKE_RATIO_THRESHOLD && (post.repliesCount || 0) === 0;
}

// ─── Public Scoring Functions ───────────────────────────────

export function scorePostForSchool(
  post: TrendablePost,
  userSchool: string,
  userCity?: string
): ScoredPost {
  const hours = getHoursSince(post.createdAt);
  const engagement = computeWeightedEngagement(post);
  const decay = computeDecay(hours);
  const velocity = computeVelocity(engagement, hours);
  const velocityMult = getVelocityMultiplier(velocity);
  const localityMult = getSchoolLocalityMultiplier(post.school, post.city, userSchool, userCity);
  const suspiciousPenalty = isSuspiciousEngagement(post) ? BOT_SCORE_PENALTY : 1.0;

  const trendScore = (engagement / decay) * velocityMult * localityMult * suspiciousPenalty;

  return {
    ...post,
    trendScore,
    velocity,
    trendLabel: null, // assigned later by percentile
  };
}

export function scorePostForCity(
  post: TrendablePost,
  userCity?: string
): ScoredPost {
  const hours = getHoursSince(post.createdAt);
  const engagement = computeWeightedEngagement(post);
  const decay = computeDecay(hours);
  const velocity = computeVelocity(engagement, hours);
  const velocityMult = getVelocityMultiplier(velocity);
  const localityMult = getCityLocalityMultiplier(post.city, userCity);
  const suspiciousPenalty = isSuspiciousEngagement(post) ? BOT_SCORE_PENALTY : 1.0;

  const trendScore = (engagement / decay) * velocityMult * localityMult * suspiciousPenalty;

  return {
    ...post,
    trendScore,
    velocity,
    trendLabel: null,
  };
}

export function scoreProduct(product: TrendableProduct): ScoredProduct {
  const hours = getHoursSince(product.createdAt);
  const engagement = (product.wishlistCount || 0) * 4 + (product.inquiryCount || 0) * 8;
  const decay = computeDecay(hours);
  const trendScore = engagement / decay;

  return {
    ...product,
    trendScore,
    trendLabel: null,
  };
}

// ─── Trend Label Assignment ─────────────────────────────────

export function assignTrendLabels(
  posts: ScoredPost[],
  mode: 'school' | 'city'
): ScoredPost[] {
  if (posts.length === 0) return posts;

  // Sort by score desc for percentile calculation
  const sorted = [...posts].sort((a, b) => b.trendScore - a.trendScore);

  return sorted.map((post, index) => {
    const percentile = index / sorted.length;
    let label: TrendLabel = null;

    // Velocity-based labels take priority
    if (post.velocity >= VELOCITY_THRESHOLDS.exploding && percentile < 0.05) {
      label = '⚡ Exploding';
    } else if (post.velocity >= VELOCITY_THRESHOLDS.heatingUp && percentile < 0.15) {
      label = '🔥 Heating Up';
    } else if (percentile < 0.30 && (post.upvotesCount + post.repliesCount) >= 3) {
      label = '👀 Everyone\'s Watching';
    } else if (mode === 'school' && percentile < 0.50) {
      label = '📈 Trending in Your School';
    } else if (mode === 'city' && percentile < 0.50) {
      label = '🌆 Trending in Your City';
    }

    return { ...post, trendLabel: label };
  });
}

// ─── Pipeline: Filter, Score, Rank, Label ───────────────────

export function computeSchoolTrending(
  posts: TrendablePost[],
  userSchool: string,
  userCity?: string,
  maxResults: number = 5
): ScoredPost[] {
  // Filter: exclude too-new posts (anti-gaming) and only last 48h
  const now = Date.now();
  const eligible = posts.filter(p => {
    const mins = getMinutesSince(p.createdAt);
    const hours = mins / 60;
    return mins >= MIN_POST_AGE_MINUTES && hours <= 48;
  });

  // Score
  const scored = eligible.map(p => scorePostForSchool(p, userSchool, userCity));

  // Anti-manipulation: cap per author
  const authorCount: Record<string, number> = {};
  const diversified = scored
    .sort((a, b) => b.trendScore - a.trendScore)
    .filter(p => {
      authorCount[p.authorId] = (authorCount[p.authorId] || 0) + 1;
      return authorCount[p.authorId] <= MAX_AUTHOR_IN_TRENDING;
    });

  // Label and return top N
  const labeled = assignTrendLabels(diversified.slice(0, maxResults * 2), 'school');
  return labeled.slice(0, maxResults);
}

export function computeCityTrending(
  posts: TrendablePost[],
  userCity?: string,
  maxResults: number = 5
): ScoredPost[] {
  const eligible = posts.filter(p => {
    const mins = getMinutesSince(p.createdAt);
    const hours = mins / 60;
    return mins >= MIN_POST_AGE_MINUTES && hours <= 48;
  });

  const scored = eligible.map(p => scorePostForCity(p, userCity));

  const authorCount: Record<string, number> = {};
  const diversified = scored
    .sort((a, b) => b.trendScore - a.trendScore)
    .filter(p => {
      authorCount[p.authorId] = (authorCount[p.authorId] || 0) + 1;
      return authorCount[p.authorId] <= MAX_AUTHOR_IN_TRENDING;
    });

  const labeled = assignTrendLabels(diversified.slice(0, maxResults * 2), 'city');
  return labeled.slice(0, maxResults);
}

export function computeTrendingProduct(
  products: TrendableProduct[]
): ScoredProduct | null {
  if (products.length === 0) return null;

  const scored = products
    .filter(p => {
      const hours = getHoursSince(p.createdAt);
      return hours <= 72; // 3 days for products
    })
    .map(p => scoreProduct(p));

  scored.sort((a, b) => b.trendScore - a.trendScore);
  return scored[0] || null;
}

// ─── Utility: Active post count (last 24h) ──────────────────

export function countActiveToday(posts: TrendablePost[]): number {
  return posts.filter(p => getHoursSince(p.createdAt) <= 24).length;
}

// ─── Utility: Format relative time ──────────────────────────

export function formatRelativeTime(timestamp: any): string {
  const hours = getHoursSince(timestamp);
  if (hours < 1) {
    const mins = Math.floor(hours * 60);
    return mins <= 1 ? 'just now' : `${mins}m ago`;
  }
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1d ago' : `${days}d ago`;
}

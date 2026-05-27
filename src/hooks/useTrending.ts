import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import {
  TrendablePost,
  TrendableProduct,
  ScoredPost,
  ScoredProduct,
  computeSchoolTrending,
  computeCityTrending,
  computeTrendingProduct,
  countActiveToday,
} from '../lib/trending';

interface TrendingData {
  schoolTrending: ScoredPost[];
  cityTrending: ScoredPost[];
  trendingProduct: ScoredProduct | null;
  activeToday: number;
  loading: boolean;
}

export function useTrending(): TrendingData {
  const { user, userData } = useAuth();
  const [rawPosts, setRawPosts] = useState<TrendablePost[]>([]);
  const [rawProducts, setRawProducts] = useState<TrendableProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to approved posts
  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts: TrendablePost[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          title: data.title || '',
          content: data.content || '',
          authorId: data.authorId || '',
          authorName: data.authorName || 'Unknown',
          authorProfilePicture: data.authorProfilePicture || null,
          authorUsername: data.authorUsername || null,
          school: data.school || '',
          city: data.city,
          type: data.type || 'others',
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls,
          upvotesCount: data.upvotesCount || 0,
          repliesCount: data.repliesCount || 0,
          sharesCount: data.sharesCount || 0,
          createdAt: data.createdAt,
        });
      });
      setRawPosts(posts);
      setLoading(false);
    }, (error) => {
      console.error('Trending: Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to available products
  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('status', '==', 'available')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products: TrendableProduct[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        products.push({
          id: docSnap.id,
          title: data.title || '',
          price: data.price || 0,
          category: data.category || '',
          condition: data.condition || '',
          image: data.image || '',
          status: data.status || 'available',
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || 'Unknown',
          sellerSchool: data.sellerSchool || '',
          city: data.city,
          createdAt: data.createdAt,
          wishlistCount: data.wishlistCount || 0,
          inquiryCount: data.inquiryCount || 0,
        });
      });
      setRawProducts(products);
    }, (error) => {
      console.error('Trending: Error fetching products:', error);
    });

    return () => unsubscribe();
  }, []);

  // Compute trending — recomputes when raw data or user context changes
  const schoolTrending = useMemo(() => {
    if (!userData?.school) return [];
    return computeSchoolTrending(rawPosts, userData.school, userData.city, 5);
  }, [rawPosts, userData?.school, userData?.city]);

  const cityTrending = useMemo(() => {
    if (!userData?.city) return [];
    return computeCityTrending(rawPosts, userData.city, 5);
  }, [rawPosts, userData?.city]);

  const trendingProduct = useMemo(() => {
    return computeTrendingProduct(rawProducts);
  }, [rawProducts]);

  const activeToday = useMemo(() => {
    return countActiveToday(rawPosts);
  }, [rawPosts]);

  return {
    schoolTrending,
    cityTrending,
    trendingProduct,
    activeToday,
    loading,
  };
}

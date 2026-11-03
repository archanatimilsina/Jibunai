/**
 * The catalogue of cacheable resources.
 *
 * A resource = one API collection. The key is the cache key, the ttl decides
 * how long a cached copy is considered fresh.
 */
import { apiGet, apiList } from './http';

export const TTL = {
  LIVE: 30_000, // goals, tasks, challenges — change often
  EDITABLE: 60_000, // notes, day logs
  BLOG: 120_000, // publishing is rare
  STATIC: 300_000, // watchlist, hobbies, wishes, music vibes, archive
};

export const RESOURCES = {
  notes: { path: '/node-matrix/', ttl: TTL.EDITABLE, list: true },
  tasks: { path: '/tasks/', ttl: TTL.LIVE, list: true },
  goals: { path: '/goals/', ttl: TTL.LIVE, list: true },
  challenges: { path: '/challenges/', ttl: TTL.LIVE, list: true },
  watchlist: { path: '/watchlist/', ttl: TTL.STATIC, list: true },
  hobbies: { path: '/hobbies/', ttl: TTL.STATIC, list: true },
  wishes: { path: '/wishes/', ttl: TTL.STATIC, list: true },
  musicVibes: { path: '/music-vibes/', ttl: TTL.STATIC, list: true },
  archive: { path: '/archive/', ttl: TTL.STATIC, list: true },
  daylogs: { path: '/daylogs/', ttl: TTL.EDITABLE, list: true },
  blogPosts: { path: '/blog/posts/', ttl: TTL.BLOG, list: true },
  blogCategories: { path: '/blog/categories/', ttl: TTL.BLOG, list: true },
  blogStats: { path: '/blog/posts/stats/', ttl: TTL.LIVE, list: false },
};

/** Fetch a resource by key. */
export function fetchResource(key) {
  const meta = RESOURCES[key];
  if (!meta) throw new Error(`Unknown resource: ${key}`);
  return meta.list ? apiList(meta.path) : apiGet(meta.path);
}

/** The fetcher for a resource, bound to its key (used by the cache + lifecycle). */
export const resourceFetcher = (key) => () => fetchResource(key);

/**
 * Skeleton loaders are intentionally disabled site-wide.
 *
 * Every export below is a no-op (`null`) so that content simply appears the
 * moment it's ready instead of flashing a shimmer placeholder first. The
 * component surface (names + prop signatures) is preserved so the ~35 call
 * sites keep compiling untouched — to bring skeletons back, restore this file
 * from git history.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

function Skeleton(_props: { className?: string }) {
  return null;
}

/* ── Atoms ─────────────────────────────────────────────────────────── */

export function SkeletonLine(_props: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return null;
}

export function SkeletonAvatar(_props: {
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: "full" | "xl" | "2xl";
  className?: string;
}) {
  return null;
}

export function SkeletonButton(_props: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return null;
}

/* ── Molecules ──────────────────────────────────────────────────────── */

export function SkeletonCard(_props: { className?: string }) {
  return null;
}

export function SkeletonTable(_props: { rows?: number }) {
  return null;
}

export function SkeletonText(_props: { lines?: number; className?: string }) {
  return null;
}

export function SkeletonOrderCard() {
  return null;
}

export function SkeletonMenuItemCard() {
  return null;
}

/* ── Organisms ──────────────────────────────────────────────────────── */

export function SkeletonGrid(_props: {
  rows?: number;
  cols?: number;
  cardClass?: string;
  className?: string;
}) {
  return null;
}

export function SkeletonStatGrid(_props: {
  count?: number;
  className?: string;
}) {
  return null;
}

export function SkeletonDetailHero(_props: {
  showSuggestions?: boolean;
}) {
  return null;
}

export default Skeleton;

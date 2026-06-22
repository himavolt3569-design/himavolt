// Empty Suspense boundary (renders nothing). Required so route segments
// whose pages call useSearchParams() still build, with no visible skeleton.
export default function Loading() {
  return null;
}

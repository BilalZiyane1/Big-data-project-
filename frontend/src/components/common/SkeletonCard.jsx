/** Animated loading skeleton shaped like a ProductCard */
const pulse = 'animate-pulse rounded-xl bg-ink/8';

const SkeletonCard = () => (
  <div className="card-surface overflow-hidden">
    <div className={`aspect-[4/5] w-full ${pulse}`} />
    <div className="space-y-2 p-4">
      <div className={`h-2.5 w-20 ${pulse}`} />
      <div className={`h-4 w-full ${pulse}`} />
      <div className={`h-4 w-3/4 ${pulse}`} />
      <div className="flex items-center justify-between pt-1">
        <div className={`h-4 w-16 ${pulse}`} />
        <div className={`h-3 w-10 ${pulse}`} />
      </div>
    </div>
  </div>
);

/** Grid of n skeleton cards – use while loading product lists */
export const SkeletonGrid = ({ count = 8, cols = 'sm:grid-cols-2 lg:grid-cols-4' }) => (
  <div className={`grid gap-4 ${cols}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default SkeletonCard;

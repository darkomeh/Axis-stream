import { motion } from "motion/react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-white/5 rounded-md ${className}`} 
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
        backgroundSize: '200% 100%'
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative w-full aspect-[21/9] bg-transparent overflow-hidden mb-12">
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="min-h-screen bg-[#080808] text-white pb-20 relative overflow-hidden">
      {/* Skeleton Top Bar */}
      <div className="absolute top-safe pt-4 px-4 w-full flex justify-between items-center z-50 max-w-[1200px] mx-auto left-0 right-0">
        <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
          <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Skeleton Video/Trailer Player Area */}
      <div className="w-full aspect-video max-w-[1200px] mx-auto md:rounded-2xl md:mt-4 overflow-hidden relative">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Main Content Info Area */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8 space-y-6">
        {/* Title */}
        <Skeleton className="h-10 w-2/3 md:w-1/2 rounded-lg" />
        
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Action pills */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>

        {/* Description / Story Line */}
        <div className="space-y-2 max-w-3xl">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* You May Also Like / Recommendations */}
        <div className="pt-8 border-t border-white/5 space-y-4">
          <Skeleton className="h-6 w-44 rounded" />
          <div className="flex gap-3 overflow-hidden pb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="flex-none w-[110px] md:w-[140px] aspect-[2/3] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WatchPartySkeleton() {
  return (
    <div className="h-[100dvh] w-full bg-[#080808] flex flex-col md:flex-row overflow-hidden relative">
      {/* Left: Player Area */}
      <div className="w-full aspect-video md:h-full md:aspect-auto md:flex-grow md:flex-1 p-4 flex flex-col gap-4">
        <Skeleton className="w-full h-full rounded-2xl" />
      </div>
      {/* Right: Chat Area */}
      <div className="w-full h-1/2 md:h-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-white/5 bg-[#0e0e0e] flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex-1 space-y-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-3 w-11/12 rounded" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ActorSkeleton() {
  return (
    <div className="min-h-screen bg-[#080808] text-white pb-20 relative overflow-hidden">
      {/* Skeleton Top Bar */}
      <div className="absolute top-safe pt-4 px-4 w-full flex justify-between items-center z-50 max-w-[1200px] mx-auto left-0 right-0">
        <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-20 space-y-12">
        {/* Split info section */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left: Avatar skeleton */}
          <Skeleton className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shrink-0 mx-auto md:mx-0" />
          {/* Right: Biography details skeleton */}
          <div className="flex-1 space-y-4 w-full">
            <Skeleton className="h-10 w-2/3 rounded-lg" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>

        {/* Bottom section: Movies */}
        <div className="space-y-4 pt-8 border-t border-white/5">
          <Skeleton className="h-6 w-48 rounded" />
          <ListSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}





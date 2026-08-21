import React from "react";

interface ComboCoverCollageProps {
  images: string[];
  alt?: string;
  fallback?: string;
}

export default function ComboCoverCollage({
  images,
  alt = "Combo",
  fallback = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
}: ComboCoverCollageProps) {
  if (images.length === 0) {
    return <img src={fallback} alt={alt} className="h-full w-full object-cover" />;
  }

  if (images.length === 1) {
    return <img src={images[0]} alt={alt} className="h-full w-full object-cover" />;
  }

  if (images.length === 2) {
    return (
      <div className="flex h-full w-full">
        <div className="h-full w-1/2 overflow-hidden border-r border-[var(--canvas)]/20">
          <img src={images[0]} alt={alt} className="h-full w-full object-cover" />
        </div>
        <div className="h-full w-1/2 overflow-hidden">
          <img src={images[1]} alt={alt} className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="flex h-full w-full">
        <div className="h-full w-1/2 overflow-hidden border-r border-[var(--canvas)]/20">
          <img src={images[0]} alt={alt} className="h-full w-full object-cover" />
        </div>
        <div className="flex h-full w-1/2 flex-col">
          <div className="h-1/2 w-full overflow-hidden border-b border-[var(--canvas)]/20">
            <img src={images[1]} alt={alt} className="h-full w-full object-cover" />
          </div>
          <div className="h-1/2 w-full overflow-hidden">
            <img src={images[2]} alt={alt} className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  // 4 or more
  return (
    <div className="flex h-full w-full flex-wrap">
      <div className="h-1/2 w-1/2 overflow-hidden border-b border-r border-[var(--canvas)]/20">
        <img src={images[0]} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="h-1/2 w-1/2 overflow-hidden border-b border-[var(--canvas)]/20">
        <img src={images[1]} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="h-1/2 w-1/2 overflow-hidden border-r border-[var(--canvas)]/20">
        <img src={images[2]} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="h-1/2 w-1/2 overflow-hidden">
        <img src={images[3]} alt={alt} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

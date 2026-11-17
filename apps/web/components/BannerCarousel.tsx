'use client';

import { useEffect, useState } from 'react';
import { imageSrc } from '@/lib/images';

const SECONDS_PER_BANNER = 5;

/** The banners of a store. One stays still; two or more turn by themselves and can be stepped by hand. */
export function BannerCarousel({
  ids,
  alt,
  aspect,
}: {
  ids: string[];
  alt: string;
  aspect: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = ids.length;
  const current = index % count;

  useEffect(() => {
    if (count < 2 || paused) return;
    // People who asked their system for less motion step by hand only.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(
      () => setIndex((old) => (old + 1) % count),
      SECONDS_PER_BANNER * 1000,
    );
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc(ids[0])}
        alt={alt}
        className={`w-full rounded-lg object-cover ${aspect}`}
      />
    );
  }

  const go = (to: number) => setIndex((to + count) % count);
  const arrow =
    'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-lg text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white';
  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={alt}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={`relative w-full overflow-hidden rounded-lg ${aspect}`}>
        {ids.map((id, position) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            src={imageSrc(id)}
            alt={position === current ? alt : ''}
            aria-hidden={position !== current}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${position === current ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="Previous banner"
        onClick={() => go(current - 1)}
        className={`${arrow} left-2`}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next banner"
        onClick={() => go(current + 1)}
        className={`${arrow} right-2`}
      >
        ›
      </button>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
        {ids.map((id, position) => (
          <button
            key={id}
            type="button"
            aria-label={`Show banner ${position + 1} of ${count}`}
            aria-current={position === current}
            onClick={() => go(position)}
            className={`h-2.5 w-2.5 rounded-full border border-white ${position === current ? 'bg-white' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

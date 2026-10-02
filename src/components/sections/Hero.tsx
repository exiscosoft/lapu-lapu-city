import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '../ui/Heading';
import { Text } from '../ui/Text';
import HeroIllustration from './HeroIllustration';

// How far down the sun drifts (in SVG units) while the statue scrolls up,
// so it reads as further away.
const SUN_DRIFT = 220;
// Share of the hero the statue's feet stop above, clear of the bottom fade.
const FEET_CLEARANCE = 0.1;

export default function Hero() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<SVGSVGElement>(null);
  const sunRef = useRef<SVGGElement>(null);

  // The statue starts at half body and scrolls down to the feet as the hero
  // scrolls out of view.
  useEffect(() => {
    const hero = heroRef.current;
    const art = artRef.current;
    const sun = sunRef.current;
    if (!hero || !art || !sun) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const heroHeight = hero.offsetHeight;
      const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
      const travel =
        art.getBoundingClientRect().height - heroHeight * (1 - FEET_CLEARANCE);
      art.style.transform = `translate3d(0, ${-progress * travel}px, 0)`;
      sun.style.transform = `translateY(${progress * SUN_DRIFT}px)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative flex items-center overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12 md:py-24 min-h-[480px] md:min-h-[560px] lg:min-h-[640px]"
    >
      {/* Statue shown from the head down to the waist; the rest is revealed
          on scroll. The bottom edge fades out instead of cutting hard. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          maskImage: 'linear-gradient(to bottom, black 75%, transparent)',
        }}
      >
        <HeroIllustration
          ref={artRef}
          sunRef={sunRef}
          className="absolute top-0 -right-24 h-[175%] w-auto text-white opacity-20 will-change-transform md:right-0 lg:right-[4%] lg:opacity-60"
        />
      </div>
      <div className="relative container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left section with title and search */}
          <div className="animate-fade-in">
            <Text transform="uppercase">Welcome to</Text>
            <Heading>{import.meta.env.VITE_GOVERNMENT_NAME}</Heading>
            <Text>{t('hero.subtitle')}</Text>
          </div>
        </div>
      </div>
    </div>
  );
}

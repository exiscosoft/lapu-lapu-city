import { useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
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
  const navigate = useNavigate();
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

  // The search page reads the query from ?q= and loads the results itself.
  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    navigate(
      query ? `/search?${new URLSearchParams({ q: query })}` : '/search'
    );
  };

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

            <form role="search" className="mt-8" onSubmit={handleSearch}>
              <label
                htmlFor="hero-search"
                className="block mb-3 text-xl font-bold"
              >
                {t('hero.searchLabel')}
              </label>
              <div className="flex focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white">
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  placeholder={t('hero.searchPlaceholder')}
                  className="min-w-0 flex-1 h-14 px-4 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label={t('hero.searchLabel')}
                  className="flex h-14 w-16 shrink-0 items-center justify-center bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100 focus:outline-none focus-visible:bg-primary-100"
                >
                  <Search className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

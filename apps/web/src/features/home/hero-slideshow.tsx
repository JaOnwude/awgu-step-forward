"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { HERO_SLIDES } from "@/lib/images";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Decorative background for the home hero: graduation photos that cross-fade
 * in turn, with a slow zoom on the one showing. People who ask their device
 * for reduced motion get the first photo, still. Anyone can pause it
 * (WCAG 2.2.2), and it stops while the tab is hidden.
 */
export function HeroSlideshow() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !paused && !reduced;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((current) => (current + 1) % HERO_SLIDES.length);
      }
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#0b2a20]">
        {HERO_SLIDES.map((slide, slideIndex) => {
          const visible = slideIndex === index;
          return (
            <Image
              key={slide.src}
              src={slide.src}
              alt=""
              fill
              sizes="100vw"
              // The first photo is the page's largest image: load it at once.
              priority={slideIndex === 0}
              className={cn(
                "object-cover transition-opacity duration-[1600ms] ease-in-out",
                visible ? "opacity-100" : "opacity-0",
                visible && playing && "animate-hero-zoom",
              )}
            />
          );
        })}
        {/* Keeps white text readable over any photo, in light and dark mode. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08201a]/80 via-[#08201a]/55 to-[#08201a]/15" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08201a]/70 to-transparent" />
      </div>

      <div className="absolute right-4 bottom-4 flex items-center gap-3 sm:right-6 sm:bottom-6">
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
          {HERO_SLIDES.map((slide, slideIndex) => (
            <span
              key={slide.src}
              className={cn(
                "h-1.5 rounded-full bg-white/50 transition-all duration-500",
                slideIndex === index ? "w-6 bg-white" : "w-1.5",
              )}
            />
          ))}
        </div>
        {reduced ? null : (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Play background photos" : "Pause background photos"}
            className="grid size-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
          >
            {paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
          </button>
        )}
      </div>
    </>
  );
}

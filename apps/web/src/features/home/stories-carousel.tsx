"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { categoryImage } from "@/lib/images";
import { cn } from "@/lib/utils";

// Illustrative only: these people are made up, and the section says so.
const STORIES = [
  {
    name: "Chiamaka, 19",
    town: "Mgbowo",
    category: "scholarship",
    outcome: "Secondary school scholarship",
    quote:
      "I found the scholarship two weeks before it closed. The reminder made sure I didn’t miss the deadline.",
  },
  {
    name: "Emeka, 21",
    town: "Awgu",
    category: "apprenticeship",
    outcome: "Mechanic apprenticeship",
    quote:
      "I knew the workshop was checked before I went. Now I’m learning a trade I can live on.",
  },
  {
    name: "Ngozi, 23",
    town: "Ugbo",
    category: "local_work",
    outcome: "Paid market stall build",
    quote:
      "The pay and the hours were written down before I started. No one asked me for a fee.",
  },
  {
    name: "Tobenna, 20",
    town: "Awgu",
    category: "training",
    outcome: "Digital skills course",
    quote:
      "A help desk session showed me how to fill the form. I start my computer course next month.",
  },
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function StoriesCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function goTo(index: number) {
    const node = track.current;
    if (!node) return;
    const next = (index + STORIES.length) % STORIES.length;
    node.scrollTo({
      left: next * node.clientWidth,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function onScroll() {
    const node = track.current;
    if (!node) return;
    setActive(Math.round(node.scrollLeft / node.clientWidth));
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Example stories"
      className="grid gap-5"
    >
      {/* Focusable so keyboard users can scroll it with the arrow keys. */}
      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Stories, scroll sideways"
        className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-scrollbar]:hidden"
      >
        {STORIES.map((story, index) => {
          const image = categoryImage(story.category);
          return (
            <div
              key={story.name}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${STORIES.length}`}
              inert={index !== active}
              className="grid w-full shrink-0 snap-center overflow-hidden rounded-3xl border bg-card md:grid-cols-2"
            >
              <Image
                src={image.src}
                width={image.width}
                height={image.height}
                alt=""
                sizes="(min-width: 768px) 36rem, 100vw"
                className="aspect-[3/2] h-full w-full object-cover"
              />
              <figure className="grid content-center gap-5 p-6 sm:p-10">
                <Quote aria-hidden className="size-8 text-highlight" />
                <blockquote className="font-display text-xl leading-snug sm:text-2xl">
                  “{story.quote}”
                </blockquote>
                <figcaption className="grid gap-0.5">
                  <span className="font-bold">
                    {story.name} · {story.town}
                  </span>
                  <span className="text-sm text-muted-foreground">{story.outcome}</span>
                </figcaption>
              </figure>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {STORIES.map((story, index) => (
            <button
              key={story.name}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show story ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                index === active ? "w-8 bg-primary" : "w-2.5 bg-border hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goTo(active - 1)}
            aria-label="Previous story"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goTo(active + 1)}
            aria-label="Next story"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

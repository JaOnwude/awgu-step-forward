"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldAlert, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OpportunityCardView } from "@/features/discovery/opportunity-card";
import {
  askAssistant,
  engineLabel,
  fetchAssistantStatus,
  type AssistantFilters,
} from "@/lib/api/assistant";
import { queryKeys } from "@/lib/query/keys";

function filtersHref(filters: AssistantFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/opportunities?${qs}` : "/opportunities";
}

/**
 * Optional plain-language search (spec R46). Renders nothing while the
 * assistant is switched off, so ordinary search is the only path then.
 */
export function AssistantPanel() {
  const status = useQuery({
    queryKey: queryKeys.assistantStatus,
    queryFn: fetchAssistantStatus,
    staleTime: 5 * 60 * 1000,
  });
  const [query, setQuery] = useState("");
  // Folded by default so the ordinary search bar stays the main way in.
  const [open, setOpen] = useState(false);
  const ask = useMutation({ mutationFn: (text: string) => askAssistant(text) });

  if (!status.data?.enabled) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls="assistant-panel"
        className="inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Sparkles aria-hidden className="size-4" />
        Not sure what to search? Describe it in your own words
      </button>
    );
  }

  const result = ask.data;

  return (
    <section
      id="assistant-panel"
      aria-labelledby="assistant-title"
      className="grid gap-3 rounded-2xl border border-primary/25 bg-primary-muted/40 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-primary" />
          <h2 id="assistant-title" className="text-base font-bold">
            Describe what you’re looking for
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded
          aria-label="Close"
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim().length >= 2) ask.mutate(query.trim());
        }}
      >
        <Textarea
          aria-label="Describe what you’re looking for"
          autoFocus
          rows={2}
          maxLength={300}
          value={query}
          placeholder="e.g. a free computer course in Awgu, or paid day work near Mgbowo"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert aria-hidden className="size-3.5" />
            {status.data.notice}
          </p>
          <Button type="submit" disabled={ask.isPending || query.trim().length < 2}>
            Find matches
          </Button>
        </div>
      </form>
      <InlineError error={ask.error} />

      {result ? (
        <div className="grid gap-4" aria-live="polite">
          <div className="grid gap-2 rounded-2xl bg-card p-4">
            <p className="text-sm font-semibold">
              {result.total} {result.total === 1 ? "match" : "matches"} — here’s how your words
              were used:
            </p>
            <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
              {result.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {result.redacted ? (
                <li>Personal details (like a phone number) were removed before searching.</li>
              ) : null}
            </ul>
            {/* Say honestly what read the request (AI or keyword rules). */}
            <p className="text-xs text-muted-foreground">
              Understood by {engineLabel(result.engine)}.
              {result.fell_back ? " The AI was unavailable, so simple keyword rules were used." : ""}{" "}
              {result.disclaimer}
            </p>
            <Link
              href={filtersHref(result.filters)}
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
            >
              Use these filters in the full search <ArrowRight aria-hidden />
            </Link>
          </div>
          {result.items.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {result.items.slice(0, 6).map((item) => (
                <OpportunityCardView key={item.id} opportunity={item} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

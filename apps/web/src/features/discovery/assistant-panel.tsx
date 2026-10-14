"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OpportunityCardView } from "@/features/discovery/opportunity-card";
import { askAssistant, fetchAssistantStatus, type AssistantFilters } from "@/lib/api/assistant";
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
  const ask = useMutation({ mutationFn: (text: string) => askAssistant(text) });

  if (!status.data?.enabled) return null;

  const result = ask.data;

  return (
    <section
      aria-labelledby="assistant-title"
      className="grid gap-4 rounded-3xl border border-primary/25 bg-primary-muted/50 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-5 text-primary" />
        <h2 id="assistant-title" className="text-lg font-bold">
          Describe what you’re looking for
        </h2>
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
            <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
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

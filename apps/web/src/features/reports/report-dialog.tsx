"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Flag } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_CATEGORIES,
  submitReport,
  type ReportCategory,
  type ReportTarget,
} from "@/lib/api/reports";

/**
 * "Report this listing" (spec R21). Works signed in or not; the reporter is
 * never shown to the provider, and only staff see the report.
 */
export function ReportDialog({
  targetType,
  targetId,
  targetLabel = "listing",
}: {
  targetType: ReportTarget;
  targetId: string;
  targetLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [details, setDetails] = useState("");

  const report = useMutation({
    mutationFn: () =>
      submitReport({
        target_type: targetType,
        target_id: targetId,
        category: category as ReportCategory,
        details: details.trim() || null,
      }),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      report.reset();
      setCategory("");
      setDetails("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Flag aria-hidden className="size-4" /> Report this {targetLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        {report.isSuccess ? (
          <div className="grid justify-items-center gap-3 py-4 text-center">
            <CheckCircle2 aria-hidden className="size-10 text-success" />
            <DialogTitle className="font-display text-2xl">Report received</DialogTitle>
            <DialogDescription>{report.data.message}</DialogDescription>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (category) report.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Report this {targetLabel}</DialogTitle>
              <DialogDescription>
                Only our staff see reports. The provider is never told who reported. Safety
                and money problems are reviewed the same day.
              </DialogDescription>
            </DialogHeader>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-semibold">What’s wrong?</legend>
              <RadioGroup
                value={category}
                onValueChange={(value) => setCategory(value as ReportCategory)}
                className="grid gap-2"
              >
                {REPORT_CATEGORIES.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`report-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 font-normal has-[:checked]:border-primary has-[:checked]:bg-primary-muted"
                  >
                    <RadioGroupItem id={`report-${option.value}`} value={option.value} />
                    <span className="flex-1">{option.label}</span>
                    {option.urgent ? (
                      <span className="text-xs font-semibold text-danger">Same day</span>
                    ) : null}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="report-details">Details (optional)</Label>
              <Textarea
                id="report-details"
                rows={3}
                maxLength={2000}
                value={details}
                placeholder="What happened? Don’t include your phone number or address."
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>
            <InlineError error={report.error} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={!category || report.isPending}>
                Send report
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  ErrorState,
  FieldError,
  InlineError,
  SectionSkeleton,
} from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { signInHref } from "@/lib/sign-in";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  createApplication,
  fetchApplicationForm,
  submitApplication,
  updateApplicationAnswers,
} from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { isUnauthorized, toApiErrorInfo } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

// Answered by the review checkbox (backend/app/features/applications/form.py).
const CONSENT_QUESTION_KEY = "confirm_accuracy";

const SHARED_PROFILE_FIELDS = [
  "Preferred name",
  "Age band",
  "LGA",
  "Community",
  "Education level",
  "Interests",
  "Skills",
  "Experience",
];

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `key-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function signInAware(error: unknown, action: string): unknown {
  if (isUnauthorized(error)) {
    return new ApiError(401, "auth_required", `Please sign in to ${action}.`);
  }
  return error;
}

export function ApplyFlow({
  opportunityId,
  opportunityTitle,
  providerName,
}: {
  opportunityId: string;
  opportunityTitle: string;
  providerName: string;
}) {
  const queryClient = useQueryClient();
  const formQuery = useQuery({
    queryKey: queryKeys.applicationForm(opportunityId),
    queryFn: () => fetchApplicationForm(opportunityId),
  });
  const questions = formQuery.data?.questions ?? [];
  // The consent checkbox answers the server's accuracy question, so it isn't
  // asked twice.
  const shownQuestions = questions.filter((q) => q.key !== CONSENT_QUESTION_KEY);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const receiptHeading = useRef<HTMLHeadingElement>(null);

  // One draft and one idempotency key per visit: retries of the same submit
  // reuse the key, so the server creates exactly one application.
  const draftIdRef = useRef<string | null>(null);
  const idempotencyRef = useRef<string | null>(null);

  async function persistDraft(): Promise<string> {
    if (!draftIdRef.current) {
      const draft = await createApplication(opportunityId);
      draftIdRef.current = draft.id;
    }
    await updateApplicationAnswers(
      draftIdRef.current,
      questions.map((q) => ({
        question_key: q.key,
        answer_value:
          q.key === CONSENT_QUESTION_KEY
            ? confirmed
              ? "yes"
              : null
            : (answers[q.key] ?? "").trim() || null,
      })),
    );
    return draftIdRef.current;
  }

  const saveDraft = useMutation({
    mutationFn: async () => {
      try {
        await persistDraft();
      } catch (error) {
        throw signInAware(error, "start your application");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      try {
        const draftId = await persistDraft();
        idempotencyRef.current ??= newIdempotencyKey();
        return await submitApplication(draftId, idempotencyRef.current);
      } catch (error) {
        throw signInAware(error, "submit your application");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
  });

  const error = submit.error ?? saveDraft.error;
  const fieldErrors = error ? toApiErrorInfo(error).fieldErrors : {};
  const busy = submit.isPending || saveDraft.isPending;

  // The receipt replaces a long form; on a phone the page would otherwise stay
  // scrolled down at the footer. Focusing it also announces it to screen readers.
  const submitted = Boolean(submit.data);
  useEffect(() => {
    if (!submitted) return;
    window.scrollTo({ top: 0 });
    receiptHeading.current?.focus({ preventScroll: true });
  }, [submitted]);

  function handleSubmit() {
    const unanswered = shownQuestions
      .filter((q) => q.required && !(answers[q.key] ?? "").trim())
      .map((q) => q.label);
    setMissing(unanswered);
    if (unanswered.length === 0) submit.mutate();
  }

  function setAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  if (formQuery.isPending) {
    return <SectionSkeleton label="Loading application form…" />;
  }

  if (formQuery.isError) {
    if (isUnauthorized(formQuery.error)) {
      return (
        <ErrorState error={formQuery.error}>
          <Link
            href={signInHref(`/opportunities/${opportunityId}/apply`)}
            className={buttonVariants({ size: "sm" })}
          >
            Sign in to apply
          </Link>
        </ErrorState>
      );
    }
    return <ErrorState error={formQuery.error} onRetry={() => formQuery.refetch()} />;
  }

  if (submit.data) {
    const receipt = submit.data;
    return (
      <Card className="border-verified/40 bg-verified/5">
        <CardHeader>
          <h2 ref={receiptHeading} tabIndex={-1} className="text-lg font-bold outline-none">
            Application submitted
          </h2>
          <CardDescription>{receipt.message} Keep this reference safe:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-2xl font-semibold tracking-tight">{receipt.reference}</p>
          <p className="text-sm text-muted-foreground">
            {opportunityTitle} · {providerName}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/account/applications/${receipt.id}`}>
                View application status
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/opportunities">Browse more opportunities</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold">Application form</h2>
          <CardDescription>
            Applying to{" "}
            <span className="font-medium text-foreground">{opportunityTitle}</span>{" "}
            at {providerName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {shownQuestions.map((question) => {
            const id = `answer-${question.key}`;
            const value = answers[question.key] ?? "";
            const invalid = Boolean(fieldErrors[question.key]);
            return (
              <div key={question.key} className="grid gap-1.5">
                <Label htmlFor={id}>
                  {question.label}
                  {question.required ? (
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                  ) : null}
                </Label>
                {question.type === "long_text" ? (
                  <Textarea
                    id={id}
                    rows={4}
                    value={value}
                    required={question.required}
                    aria-invalid={invalid}
                    onChange={(event) => setAnswer(question.key, event.target.value)}
                  />
                ) : question.type === "yes_no" ? (
                  <NativeSelect
                    id={id}
                    value={value}
                    required={question.required}
                    aria-invalid={invalid}
                    onChange={(event) => setAnswer(question.key, event.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </NativeSelect>
                ) : (
                  <Input
                    id={id}
                    value={value}
                    required={question.required}
                    aria-invalid={invalid}
                    onChange={(event) => setAnswer(question.key, event.target.value)}
                  />
                )}
                <FieldError message={fieldErrors[question.key]} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold">Review before you submit</h3>
          <CardDescription>
            {providerName} will receive exactly what is listed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div>
            <p className="text-sm font-medium">Your answers</p>
            <dl className="mt-2 grid gap-3">
              {shownQuestions.map((question) => (
                <div key={question.key}>
                  <dt className="text-xs text-muted-foreground">{question.label}</dt>
                  <dd className="text-sm whitespace-pre-line">
                    {(answers[question.key] ?? "").trim() || "Not answered"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="text-sm font-medium">From your private profile</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SHARED_PROFILE_FIELDS.map((field) => (
                <li
                  key={field}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {field}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="apply-confirm"
              className="mt-0.5"
              checked={confirmed}
              onCheckedChange={(state) => setConfirmed(state === true)}
            />
            <Label htmlFor="apply-confirm" className="leading-snug font-normal">
              I confirm the information I provide is accurate and I agree to share
              my answers and profile summary with {providerName}.
            </Label>
          </div>
        </CardContent>
      </Card>

      {missing.length > 0 ? (
        <p role="alert" className="text-sm text-destructive">
          Please answer: {missing.join(", ")}
        </p>
      ) : null}
      <InlineError error={error} />
      {saveDraft.isSuccess ? (
        <p role="status" className="text-sm text-muted-foreground">
          Draft saved. You can come back and finish later.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleSubmit} disabled={busy || !confirmed}>
          Submit application
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => saveDraft.mutate()}
          disabled={busy}
        >
          Save draft
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/opportunities/${opportunityId}`}>Back to listing</Link>
        </Button>
      </div>
    </div>
  );
}

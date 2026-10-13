"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  createApplication,
  fetchApplicationForm,
  submitApplication,
  updateApplicationAnswers,
  type ApplicationReceipt,
  type FormQuestion,
} from "@/lib/api/applications";
import { toApiErrorInfo, isUnauthorized } from "@/lib/api/errors";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/lib/ui";

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

export function ApplyFlow({
  opportunityId,
  opportunityTitle,
  providerName,
}: {
  opportunityId: string;
  opportunityTitle: string;
  providerName: string;
}) {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);

  const draftIdRef = useRef<string | null>(null);
  const idempotencyRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const form = await fetchApplicationForm(opportunityId);
        if (active) setQuestions(form.questions);
      } catch (caught) {
        if (active) setError(toApiErrorInfo(caught).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [opportunityId]);

  function validate(): string | null {
    const missing = questions
      .filter((q) => q.required && !(answers[q.key] ?? "").trim())
      .map((q) => q.label);
    if (missing.length > 0) {
      setError(`Please answer: ${missing.join(", ")}`);
      return null;
    }
    return "ok";
  }

  async function persistDraft(): Promise<string | null> {
    if (!draftIdRef.current) {
      const draft = await createApplication(opportunityId);
      draftIdRef.current = draft.id;
    }
    const payload = questions.map((q) => ({
      question_key: q.key,
      answer_value: (answers[q.key] ?? "").trim() || null,
    }));
    await updateApplicationAnswers(draftIdRef.current, payload);
    return draftIdRef.current;
  }

  async function handleSaveDraft() {
    setBusy(true);
    setError("");
    setFieldErrors({});
    setDraftSaved(false);
    try {
      await persistDraft();
      setDraftSaved(true);
    } catch (caught) {
      const info = toApiErrorInfo(caught);
      setError(
        isUnauthorized(caught)
          ? "Please sign in to start your application."
          : info.message,
      );
      setFieldErrors(info.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!validate()) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const draftId = await persistDraft();
      if (!draftId) throw new Error("missing draft");
      if (!idempotencyRef.current) {
        idempotencyRef.current = newIdempotencyKey();
      }
      const result = await submitApplication(draftId, idempotencyRef.current);
      setReceipt(result);
    } catch (caught) {
      const info = toApiErrorInfo(caught);
      setError(
        isUnauthorized(caught)
          ? "Please sign in to submit your application."
          : info.message,
      );
      setFieldErrors(info.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading application form…</p>;
  }

  if (receipt) {
    return (
      <section className="rounded-2xl border border-verified/40 bg-verified/5 p-6">
        <h2 className="text-lg font-medium">Application submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {receipt.message} Keep this reference safe:
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">
          {receipt.reference}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {opportunityTitle} · {providerName}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/account/applications/${receipt.id}`} className={primaryButton}>
            View application status
          </Link>
          <Link href="/opportunities" className={secondaryButton}>
            Browse more opportunities
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-medium">Application form</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Applying to <span className="font-medium text-foreground">{opportunityTitle}</span>{" "}
          at {providerName}.
        </p>

        <div className="mt-5 grid gap-5">
          {questions.map((question) => (
            <label key={question.key} className={labelClass}>
              <span className="text-muted-foreground">
                {question.label}
                {question.required ? " *" : ""}
              </span>
              {question.type === "long_text" ? (
                <textarea
                  className={inputClass}
                  rows={4}
                  value={answers[question.key] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.key]: event.target.value,
                    }))
                  }
                />
              ) : question.type === "yes_no" ? (
                <select
                  className={inputClass}
                  value={answers[question.key] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.key]: event.target.value,
                    }))
                  }
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              ) : (
                <input
                  className={inputClass}
                  value={answers[question.key] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.key]: event.target.value,
                    }))
                  }
                />
              )}
              {fieldErrors[question.key] ? (
                <span className="text-xs text-danger">{fieldErrors[question.key]}</span>
              ) : null}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-medium">Before you submit</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The provider will see your application answers and these profile
          details:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SHARED_PROFILE_FIELDS.map((field) => (
            <li
              key={field}
              className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {field}
            </li>
          ))}
        </ul>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I confirm the information I provide is accurate and I agree to share
            my profile summary with {providerName}.
          </span>
        </label>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {draftSaved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Draft saved. You can come back and finish later.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButton}
          onClick={handleSubmit}
          disabled={busy || !confirmed}
        >
          Submit application
        </button>
        <button
          type="button"
          className={secondaryButton}
          onClick={handleSaveDraft}
          disabled={busy}
        >
          Save draft
        </button>
        <Link
          href={`/opportunities/${opportunityId}`}
          className={secondaryButton}
        >
          Back to listing
        </Link>
      </div>
    </div>
  );
}

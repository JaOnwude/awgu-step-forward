"use client";

import { useState } from "react";

import {
  APPLICANT_EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  AGE_BAND_LABELS,
  updateProfile,
  type ApplicantProfile,
} from "@/lib/api/applicant";
import { toApiErrorInfo } from "@/lib/api/errors";
import { inputClass, labelClass, primaryButton } from "@/lib/ui";

interface Draft {
  preferred_name: string;
  date_of_birth: string;
  lga: string;
  community: string;
  education_level: string;
  interests: string;
  skills: string;
  experience: string;
}

function draftFrom(profile: ApplicantProfile | null): Draft {
  return {
    preferred_name: profile?.preferred_name ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    lga: profile?.lga ?? "",
    community: profile?.community ?? "",
    education_level: profile?.education_level ?? "",
    interests: profile?.interests ?? "",
    skills: profile?.skills ?? "",
    experience: profile?.experience ?? "",
  };
}

export function ProfileForm({
  profile,
  onSaved,
}: {
  profile: ApplicantProfile | null;
  onSaved: (profile: ApplicantProfile) => void;
}) {
  const [draft, setDraft] = useState<Draft>(draftFrom(profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    setSaved(false);
    try {
      const result = await updateProfile({
        preferred_name: draft.preferred_name.trim(),
        date_of_birth: draft.date_of_birth,
        lga: draft.lga.trim() || null,
        community: draft.community.trim() || null,
        education_level: draft.education_level || null,
        interests: draft.interests.trim() || null,
        skills: draft.skills.trim() || null,
        experience: draft.experience.trim() || null,
      });
      onSaved(result);
      setSaved(true);
    } catch (caught) {
      const info = toApiErrorInfo(caught);
      setError(info.message);
      setFieldErrors(info.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">
          {profile ? "Your private profile" : "Create your applicant profile"}
        </h2>
        {profile ? (
          <span className="text-xs text-muted-foreground">
            Age band {AGE_BAND_LABELS[profile.age_band] ?? profile.age_band}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your name, date of birth, and details are private. They are only shared
        with a provider when you submit an application.
      </p>

      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className={labelClass}>
          <span className="text-muted-foreground">Preferred name</span>
          <input
            className={inputClass}
            value={draft.preferred_name}
            onChange={(event) => update("preferred_name", event.target.value)}
            required
            minLength={2}
          />
          {fieldErrors.preferred_name ? (
            <span className="text-xs text-danger">{fieldErrors.preferred_name}</span>
          ) : null}
        </label>
        <label className={labelClass}>
          <span className="text-muted-foreground">Date of birth</span>
          <input
            className={inputClass}
            type="date"
            value={draft.date_of_birth}
            onChange={(event) => update("date_of_birth", event.target.value)}
            required
          />
          {fieldErrors.date_of_birth ? (
            <span className="text-xs text-danger">{fieldErrors.date_of_birth}</span>
          ) : null}
        </label>
        <label className={labelClass}>
          <span className="text-muted-foreground">LGA</span>
          <input
            className={inputClass}
            value={draft.lga}
            onChange={(event) => update("lga", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          <span className="text-muted-foreground">Community / town</span>
          <input
            className={inputClass}
            value={draft.community}
            onChange={(event) => update("community", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          <span className="text-muted-foreground">Education level</span>
          <select
            className={inputClass}
            value={draft.education_level}
            onChange={(event) => update("education_level", event.target.value)}
          >
            <option value="">Prefer not to say</option>
            {APPLICANT_EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {EDUCATION_LEVEL_LABELS[level] ?? level}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className="text-muted-foreground">Interests</span>
          <input
            className={inputClass}
            value={draft.interests}
            placeholder="e.g. solar, tailoring, ICT"
            onChange={(event) => update("interests", event.target.value)}
          />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          <span className="text-muted-foreground">Skills</span>
          <input
            className={inputClass}
            value={draft.skills}
            placeholder="e.g. customer service, basic accounting"
            onChange={(event) => update("skills", event.target.value)}
          />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          <span className="text-muted-foreground">Experience</span>
          <textarea
            className={inputClass}
            rows={3}
            value={draft.experience}
            onChange={(event) => update("experience", event.target.value)}
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" className={primaryButton} disabled={busy}>
            {profile ? "Save changes" : "Create profile"}
          </button>
          {saved ? (
            <span role="status" className="text-sm text-verified">
              Profile saved.
            </span>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import { useState } from "react";

import { FieldError, InlineError } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  AGE_BAND_LABELS,
  APPLICANT_EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  type ApplicantProfile,
} from "@/lib/api/applicant";
import { toApiErrorInfo } from "@/lib/api/errors";

import { useUpdateProfile } from "./queries";

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

function draftFrom(profile: ApplicantProfile | null | undefined): Draft {
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
}: {
  profile: ApplicantProfile | null | undefined;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const save = useUpdateProfile();
  const fieldErrors = save.error ? toApiErrorInfo(save.error).fieldErrors : {};

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate({
      preferred_name: draft.preferred_name.trim(),
      date_of_birth: draft.date_of_birth,
      lga: draft.lga.trim() || null,
      community: draft.community.trim() || null,
      education_level: draft.education_level || null,
      interests: draft.interests.trim() || null,
      skills: draft.skills.trim() || null,
      experience: draft.experience.trim() || null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {profile ? "Your private profile" : "Create your applicant profile"}
          </h2>
          {profile ? (
            <span className="text-xs text-muted-foreground">
              Age band {AGE_BAND_LABELS[profile.age_band] ?? profile.age_band}
            </span>
          ) : null}
        </div>
        <CardDescription>
          Your name, date of birth, and details are private. They are only shared
          with a provider when you submit an application.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-name">Preferred name</Label>
            <Input
              id="profile-name"
              value={draft.preferred_name}
              onChange={(event) => update("preferred_name", event.target.value)}
              aria-invalid={Boolean(fieldErrors.preferred_name)}
              required
              minLength={2}
            />
            <FieldError message={fieldErrors.preferred_name} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-dob">Date of birth</Label>
            <Input
              id="profile-dob"
              type="date"
              value={draft.date_of_birth}
              onChange={(event) => update("date_of_birth", event.target.value)}
              aria-invalid={Boolean(fieldErrors.date_of_birth)}
              required
            />
            <FieldError message={fieldErrors.date_of_birth} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-lga">LGA</Label>
            <Input
              id="profile-lga"
              value={draft.lga}
              onChange={(event) => update("lga", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-community">Community / town</Label>
            <Input
              id="profile-community"
              value={draft.community}
              onChange={(event) => update("community", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-education">Education level</Label>
            <NativeSelect
              id="profile-education"
              value={draft.education_level}
              onChange={(event) => update("education_level", event.target.value)}
            >
              <option value="">Prefer not to say</option>
              {APPLICANT_EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {EDUCATION_LEVEL_LABELS[level] ?? level}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-interests">Interests</Label>
            <Input
              id="profile-interests"
              value={draft.interests}
              placeholder="e.g. solar, tailoring, ICT"
              onChange={(event) => update("interests", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="profile-skills">Skills</Label>
            <Input
              id="profile-skills"
              value={draft.skills}
              placeholder="e.g. customer service, basic accounting"
              onChange={(event) => update("skills", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="profile-experience">Experience</Label>
            <Textarea
              id="profile-experience"
              rows={3}
              value={draft.experience}
              onChange={(event) => update("experience", event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {profile ? "Save changes" : "Create profile"}
            </Button>
            {save.isSuccess ? (
              <span role="status" className="text-sm text-verified">
                Profile saved.
              </span>
            ) : null}
          </div>
        </form>
        <InlineError error={save.error} />
      </CardContent>
    </Card>
  );
}

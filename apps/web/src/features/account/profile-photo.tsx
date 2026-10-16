"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InlineError } from "@/components/shared/query-states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { removeAvatar, uploadAvatar, type UserPublic } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query/keys";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Upload, change or remove your profile picture. */
export function ProfilePhotoCard({ user }: { user: UserPublic }) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const done = (updated: UserPublic, message: string) => {
    queryClient.setQueryData(queryKeys.me, updated);
    toast.success(message);
  };
  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => done(updated, "Profile picture updated"),
  });
  const remove = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (updated) => done(updated, "Profile picture removed"),
  });
  const busy = upload.isPending || remove.isPending;

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    // Quick checks here save a slow upload on a mobile connection; the server
    // checks again and is the one that decides.
    if (!ACCEPT.split(",").includes(file.type)) {
      setLocalError("Use a JPEG, PNG or WebP picture.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("Pictures must be 5 MB or smaller.");
      return;
    }
    setLocalError(null);
    upload.mutate(file);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Profile picture</h2>
        <CardDescription>
          Only you see it. We crop it to a square and remove hidden details such as
          where the photo was taken.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-5">
        <UserAvatar user={user} size="lg" />
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              id={inputId}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={onFile}
              disabled={busy}
            />
            <Button type="button" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              <Camera aria-hidden />
              {upload.isPending ? "Uploading…" : user.avatar_url ? "Change photo" : "Upload photo"}
            </Button>
            {user.avatar_url ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => remove.mutate()}
              >
                <Trash2 aria-hidden /> Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB.</p>
          {localError ? (
            <p role="alert" className="text-sm text-destructive">
              {localError}
            </p>
          ) : (
            <InlineError error={upload.error ?? remove.error} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MY_DATA_EXPORT_PATH } from "@/lib/api/auth";
import { env } from "@/lib/env";

import { useDeleteAccount } from "./queries";

const CONFIRM_WORD = "DELETE";

/** Your NDPA rights on the account page: a copy of your data, or deletion. */
export function YourDataCard() {
  const remove = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck aria-hidden className="size-5 text-primary" /> Your data
        </h2>
        <CardDescription>
          Get a copy of everything we store about you, or delete your account. See the{" "}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            privacy notice
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {/* A plain link: the server sends the file with a download header. */}
        <a
          href={`${env.apiBaseUrl}${MY_DATA_EXPORT_PATH}`}
          className={buttonVariants({ variant: "outline", className: "justify-self-start" })}
        >
          <Download aria-hidden /> Download my data
        </a>
        <p className="text-xs text-muted-foreground">
          A JSON file you can open in any text editor.
        </p>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setTyped("");
              remove.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="destructive" className="mt-2 justify-self-start">
              <Trash2 aria-hidden /> Delete my account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This removes your profile, picture, saved listings, applications and
                session sign-ups straight away. It can&rsquo;t be undone. Download your
                data first if you want a copy.
              </DialogDescription>
            </DialogHeader>
            <form
              id="delete-account-form"
              className="grid gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                remove.mutate();
              }}
            >
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={typed}
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(event) => setTyped(event.target.value)}
              />
            </form>
            <InlineError error={remove.error} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Keep my account
                </Button>
              </DialogClose>
              <Button
                type="submit"
                form="delete-account-form"
                variant="destructive"
                disabled={typed.trim() !== CONFIRM_WORD || remove.isPending}
              >
                {remove.isPending ? "Deleting…" : "Delete forever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

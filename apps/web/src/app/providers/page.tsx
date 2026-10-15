import type { Metadata } from "next";
import Image from "next/image";

import { ProviderWorkspace } from "@/features/provider/provider-workspace";
import { PROVIDERS_IMAGE } from "@/lib/images";

export const metadata: Metadata = {
  title: "Provider workspace — Awgu StepForward",
  description:
    "Request provider access, track verification, and submit listings and support sessions for review.",
};

export default function ProvidersPage() {
  return (
    <>
      <div className="border-b bg-muted">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="grid gap-4">
            <p className="eyebrow text-highlight">For providers &amp; employers</p>
            <h1 className="font-display text-4xl leading-[1.08] font-semibold sm:text-5xl">
              Share opportunities, <em className="font-normal">safely.</em>
            </h1>
            <p className="text-lg text-muted-foreground">
              Request access, get verified, then submit scholarships, jobs, training or paid
              local work. Our team reviews every listing and session before it goes public.
            </p>
          </div>
          <Image
            src={PROVIDERS_IMAGE.src}
            width={PROVIDERS_IMAGE.width}
            height={PROVIDERS_IMAGE.height}
            alt=""
            loading="eager"
            sizes="(min-width: 1024px) 30rem, 100vw"
            className="aspect-[3/2] w-full rounded-3xl object-cover shadow-[var(--shadow-soft)]"
          />
        </div>
      </div>
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <ProviderWorkspace />
      </section>
    </>
  );
}

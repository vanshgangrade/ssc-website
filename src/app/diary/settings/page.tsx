import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import ProfileSettings from "@/components/films/ProfileSettings";
import SignInPrompt from "@/components/films/SignInPrompt";

export const metadata: Metadata = { title: "Edit profile" };

export default async function SettingsPage() {
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  if (!session?.user?.id) {
    return (
      <main className="s-wrap profile">
        <SignInPrompt text="Sign in with your BITS Google account to set up your film diary profile." />
      </main>
    );
  }
  await ensureProfile(session.user.id);
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId: session.user.id },
    select: { handle: true, displayName: true, bio: true },
  });

  return (
    <main className="s-wrap profile">
      <ProfileSettings
        base={base}
        initial={{ handle: profile.handle, displayName: profile.displayName ?? "", bio: profile.bio }}
        googleName={session.user.name ?? ""}
      />
    </main>
  );
}

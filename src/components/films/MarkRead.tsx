"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/diary/actions";

// Opening the notifications page marks everything read (after it has been shown once as unread).
export default function MarkRead() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      markNotificationsRead().then(() => router.refresh());
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}

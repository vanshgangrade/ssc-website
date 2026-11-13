import { headers } from "next/headers";
import { diaryBase } from "@/lib/diaryHost";

// Link prefix for diary pages in this request: "" on the subdomain, "/diary" elsewhere (local, previews).
export async function getDiaryBase(): Promise<string> {
  return diaryBase((await headers()).get("host"));
}

import { z } from "zod";
import { MAX_POSTER_BYTES } from "@/lib/movies";

function base64Size(dataUri: string): number {
  const commaIndex = dataUri.indexOf(",");
  const base64 = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
  return Math.floor((base64.length * 3) / 4);
}

export const movieInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  meta: z.string().trim().min(1, "Meta is required").max(120),
  tagline: z.string().trim().min(1, "Tagline is required").max(400),
  posterUrl: z
    .string()
    .min(1, "Poster is required")
    .refine((v) => v.startsWith("data:image/") || v.startsWith("http"), {
      message: "Poster must be an uploaded image or an image URL",
    })
    .refine((v) => !v.startsWith("data:image/") || base64Size(v) <= MAX_POSTER_BYTES, {
      message: "Poster image is too large (max 3MB)",
    }),
  order: z.number().int().optional(),
});

// The film diary lives on its own subdomain. Shared by the proxy, server pages and the browser,
// so this file must stay free of Prisma and Node-only imports.

export const DIARY_HOST = process.env.NEXT_PUBLIC_DIARY_HOST ?? "films.silverscreenbitsgoa.com";
export const DIARY_ORIGIN = `https://${DIARY_HOST}`;
export const MAIN_ORIGIN = process.env.NEXT_PUBLIC_MAIN_ORIGIN ?? "https://www.silverscreenbitsgoa.com";

// Set NEXT_PUBLIC_DIARY_ONLY=1 on a deployment (e.g. a separate Vercel project for the diary)
// to serve the diary at the root of every domain it is given, whatever that domain is.
const DIARY_ONLY = process.env.NEXT_PUBLIC_DIARY_ONLY === "1";

// True for the diary subdomain, including films.localhost:3000 when testing locally.
export function isDiaryHost(host: string | null | undefined): boolean {
  if (DIARY_ONLY) return true;
  const name = (host ?? "").split(":")[0].toLowerCase();
  return name === DIARY_HOST || name.split(".")[0] === DIARY_HOST.split(".")[0];
}

// On the subdomain pages sit at the root (/film/x); anywhere else they sit under /diary.
export function diaryBase(host: string | null | undefined): string {
  return isDiaryHost(host) ? "" : "/diary";
}

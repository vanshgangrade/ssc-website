import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureProfile, getFilmPage, getViewer } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import FilmDiary from "@/components/films/FilmDiary";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getFilmPage(slug, null);
  if (!data) return { title: "Film not found" };
  return {
    title: data.film.title,
    description: `Ratings and reviews of ${data.film.title} from the BITS Goa campus.`,
  };
}

export default async function FilmPage({ params }: Props) {
  const { slug } = await params;
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  const viewer = await getViewer(session?.user);
  const userId = viewer?.userId ?? null;
  const [data, me] = await Promise.all([getFilmPage(slug, userId), userId ? ensureProfile(userId) : null]);
  if (!data) notFound();

  return (
    <FilmDiary
      film={data.film}
      stats={data.stats}
      reviews={data.reviews}
      mine={data.mine}
      me={me ? { handle: me.handle } : null}
      base={base}
      isMod={viewer?.isMod ?? false}
      checkedIn={data.checkedIn}
    />
  );
}

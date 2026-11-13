import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFilmPage } from "@/lib/films";
import FilmDiary from "@/components/films/FilmDiary";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getFilmPage(slug, null);
  if (!data) return { title: "Film diary — Silver Screen Club" };
  return {
    title: `${data.film.title} — Film diary — Silver Screen Club`,
    description: `Ratings and reviews of ${data.film.title} from the BITS Goa campus.`,
  };
}

export default async function FilmPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const data = await getFilmPage(slug, session?.user?.id ?? null);
  if (!data) notFound();

  return (
    <FilmDiary
      film={data.film}
      stats={data.stats}
      reviews={data.reviews}
      mine={data.mine}
      session={session?.user ? { name: session.user.name ?? null, image: session.user.image ?? null } : null}
    />
  );
}

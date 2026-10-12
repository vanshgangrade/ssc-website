import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./recap.css";

export const metadata: Metadata = {
  title: "Drishyam 3 Recap — Silver Screen Club",
  description:
    "Before Drishyam: The Conclusion, catch up on the story so far. A spoiler-heavy recap of Drishyam (2015) and Drishyam 2 (2022).",
};

const cast = [
  { name: "Vijay Salgaonkar", role: "Cable operator turned theatre owner; the man who will do anything for his family", actor: "Ajay Devgn" },
  { name: "Nandini Salgaonkar", role: "Vijay's wife", actor: "Shriya Saran" },
  { name: "Anju Salgaonkar", role: "Elder daughter; carries the trauma of that night", actor: "Ishita Dutta" },
  { name: "Anu Salgaonkar", role: "Younger daughter", actor: "Mrunal Jadhav" },
  { name: "Meera Deshmukh", role: "IG of police and Sam's mother", actor: "Tabu" },
  { name: "Mahesh Deshmukh", role: "Sam's father", actor: "Rajat Kapoor" },
  { name: "Laxmikant Gaitonde", role: "Police officer with a grudge against Vijay", actor: "Kamlesh Sawant" },
];

const quickRecap = [
  "A Goa cable operator, Vijay Salgaonkar, covers up the accidental death of Sam Deshmukh, the son of a police IG, to protect his family.",
  "He builds an alibi out of movie tickets, witnesses and a repeated trip to Panaji, and he outwits IG Meera Deshmukh.",
  "Seven years later the case is reopened. The body is found, Vijay confesses, and then the whole thing turns out to be a plot he had already written.",
  "Vijay swaps the body with another one before the DNA test and walks free. He then returns Sam's ashes to his parents.",
  "The families have not really made peace, and Drishyam: The Conclusion picks up from there.",
];

export default function Drishyam3RecapPage() {
  return (
    <main className="recap">
      <div className="rail left" aria-hidden="true">
        <div className="rail-holes" />
      </div>
      <div className="rail right" aria-hidden="true">
        <div className="rail-holes" />
      </div>

      <div className="recap-wrap">
        <header className="recap-hero">
          <p className="recap-eyebrow">Silver Screen Club</p>
          <h1 className="recap-title">
            Drishyam
            <span>The Conclusion</span>
          </h1>
          <a
            href="https://www.instagram.com/reels/DeECVALoq5S/"
            target="_blank"
            rel="noopener noreferrer"
            className="recap-video"
          >
            <Image
              src="/recap/drishyam-recap-reel.jpg"
              alt="Video thumbnail: Drishyam 1 & 2 in 90 seconds"
              width={360}
              height={640}
              className="recap-video-thumb"
              priority
            />
            <span className="recap-video-text">
              <span className="recap-video-kicker">In a hurry?</span>
              <strong>Watch Drishyam 1 &amp; 2 in 90 seconds</strong>
              <span className="recap-video-cta">▶ Watch on Instagram</span>
            </span>
          </a>
          <p className="recap-lede">
            The final chapter assumes you remember everything that came before. If it has been a while, here is the whole
            story in one read. Take a few minutes with it, then go find your seat.
          </p>
          <p className="recap-warning">
            Spoilers for Drishyam (2015) and Drishyam 2 (2022), including both endings. Nothing from Drishyam: The
            Conclusion is given away.
          </p>
        </header>

        <section className="recap-card" aria-labelledby="tldr">
          <h2 id="tldr" className="recap-h2">
            In 60 seconds
          </h2>
          <ol className="recap-tldr">
            {quickRecap.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="film-one">
          <p className="recap-part">Part One</p>
          <h2 id="film-one" className="recap-h2 big">
            Drishyam <em>(2015)</em>
          </h2>

          <h3 className="recap-h3">The family</h3>
          <p>
            Vijay Salgaonkar is a Goa cable operator who never finished school and has learned most of what he knows from
            films. He lives with his wife Nandini and their daughters Anju and Anu, and they are a close, ordinary family.
          </p>

          <h3 className="recap-h3">The night everything changed</h3>
          <p>
            Sameer &ldquo;Sam&rdquo; Deshmukh is the son of Inspector General Meera Deshmukh. At a school camp he secretly
            records a video of Anju and then uses it to blackmail her. When Nandini goes to plead with him, he sets
            humiliating terms. In the struggle that follows, Anju lashes out in panic and Sam dies.
          </p>
          <p>
            Anju and Nandini bury the body in a compost pit. Anu sees it happen. When Vijay returns, he finds a family
            that is terrified and about to fall apart.
          </p>

          <h3 className="recap-h3">The alibi</h3>
          <p>
            Vijay takes over. He decides that if the police come, the family must have an airtight story. He stages a trip
            to Panaji, with a film, a meal and a stay. He then repeats it with the dates changed so that witnesses will
            confirm it. He disposes of Sam&rsquo;s phone and car. Sub-inspector Gaitonde, who already dislikes Vijay,
            sees him dumping the car in a lake.
          </p>

          <h3 className="recap-h3">Meera closes in</h3>
          <p>
            Meera investigates relentlessly. The family sticks to the alibi, and a bank ATM camera in Panaji seems to
            confirm Vijay&rsquo;s whereabouts. Meera deduces that he has manipulated the witnesses, so she arrests the
            family. Gaitonde threatens to hit young Anu, and she reveals where Sam is buried.
          </p>
          <p>
            The police dig up the compost pit and find only the remains of a calf. Vijay turns the crowd against
            Gaitonde, who is beaten by an angry mob. Gaitonde is suspended and Meera resigns.
          </p>

          <h3 className="recap-h3">The last scene</h3>
          <p>
            Sam&rsquo;s parents, Meera and Mahesh, plan to move to London. Before they leave, they ask Vijay for the truth
            about their son, and he hints that he would do anything to protect his family. In the final scene Vijay signs
            a register at a new police station. Flashbacks show that the station was under construction on the night Sam
            died. The film never says it outright, but it is implied that Sam is buried beneath it.
          </p>
        </section>

        <div className="recap-divider" aria-hidden="true">
          <span />
          <i>Seven years later</i>
          <span />
        </div>

        <section aria-labelledby="film-two">
          <p className="recap-part">Part Two</p>
          <h2 id="film-two" className="recap-h2 big">
            Drishyam 2 <em>(2022)</em>
          </h2>

          <h3 className="recap-h3">A comfortable life, with cracks</h3>
          <p>
            Vijay now owns a movie theatre as well as the cable business, and he is working on a film script with
            screenwriter Murad Ali. Outwardly the family is doing well. Anju, though, suffers from PTSD and epileptic
            episodes tied to that night, and local gossip keeps the old wound open. Their neighbours Jenny and Shiv seem
            friendly, but they are undercover police officers placed there by IG Tarun Ahlawat.
          </p>

          <h3 className="recap-h3">The case reopens</h3>
          <p>
            Mahesh Deshmukh asks Vijay where his son is, and Vijay refuses to answer. Nandini confides in Jenny and lets
            slip that Anju caused Sam&rsquo;s death. Meanwhile, David Braganza is released from prison. On the night of the
            original crime he had been hiding near the unfinished police station and saw Vijay coming out of the site.
            He tells Tarun, who brings Meera and Mahesh back from London. David describes what he saw, the police excavate
            the station and a skeleton is found. Vijay watches the dig on his CCTV cameras and seems to give up.
          </p>

          <h3 className="recap-h3">The confession</h3>
          <p>
            The police have secretly bugged the Salgaonkar home. The recording of Nandini&rsquo;s admission to Jenny
            breaks the alibi, and the family is interrogated roughly. Gaitonde assaults Nandini, Anju and Anu, and Anju
            has a seizure. To save the others, Vijay confesses to killing Sam himself, and the rest of the family is
            released. Meera insists that they all be punished.
          </p>

          <h3 className="recap-h3">The reveal: Vijay already wrote this ending</h3>
          <p>
            At trial, Murad reveals that Vijay had written a crime thriller loosely based on Sam&rsquo;s murder. It became
            a novel called <em>Drishyam</em>, published under Murad&rsquo;s name. Vijay pleads not guilty, and his lawyer
            argues that the police copied the novel&rsquo;s plot to frame him. Then the judge reports that DNA tests show
            the skeleton is not Sam&rsquo;s.
          </p>
          <p>
            In the novel&rsquo;s alternate ending, the hero obtains the remains of another man who died of similar
            injuries. He befriends a gravedigger, Savio, and a morgue guard, Raghu, and swaps the bodies before DNA
            testing. Vijay had been planning exactly this in his fiction, and he carried it out in reality. He is granted
            bail for lack of evidence. The judge tells Tarun to drop the investigation, saying both families deserve
            justice but the legal system cannot deliver it.
          </p>

          <h3 className="recap-h3">Ashes</h3>
          <p>
            The novel&rsquo;s ending has the hero return the villain&rsquo;s cremated remains to the bereaved parents, and
            Vijay does the same. He has Sam&rsquo;s ashes delivered anonymously to Meera and Mahesh. Mahesh immerses them
            and persuades Meera to let go of her anger, believing they have found closure. Vijay watches from a distance
            and quietly walks away.
          </p>
        </section>

        <section className="recap-card" aria-labelledby="who">
          <h2 id="who" className="recap-h2">
            Who&rsquo;s who
          </h2>
          <ul className="recap-cast">
            {cast.map((c) => (
              <li key={c.name}>
                <strong>{c.name}</strong>
                <span>{c.role}</span>
                <em>{c.actor}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="recap-card" aria-labelledby="remember">
          <h2 id="remember" className="recap-h2">
            Keep in mind going in
          </h2>
          <ul className="recap-bullets">
            <li>Vijay plans ahead, and what looks like a loss may be part of his plan.</li>
            <li>Sam&rsquo;s real remains were never found by the police, and a different body was swapped in.</li>
            <li>Meera has not forgiven Vijay, whatever Mahesh believes.</li>
            <li>October 2, the date Vijay&rsquo;s alibi is built around, has a special place in this story.</li>
            <li>Anju and Anu are still carrying what happened.</li>
          </ul>
        </section>

        <footer className="recap-footer">
          <p>Now you&rsquo;re caught up. Lights down, phones off.</p>
          <a
            href="https://www.instagram.com/reels/DeECVALoq5S/"
            target="_blank"
            rel="noopener noreferrer"
            className="recap-cta"
          >
            Watch on Instagram
          </a>
          <br />
          <Link href="/" className="recap-cta secondary">
            Back to the Silver Screen Club
          </Link>
        </footer>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const POSTERS = [
  "https://media.themoviedb.org/t/p/w500/3HzGtM0JpfH2pWFGugJK22LRP6b.jpg", // Dune 2
  "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", // Oppenheimer
  "https://media.themoviedb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg", // Interstellar
  "https://image.tmdb.org/t/p/w600_and_h900_bestv2/74xTEgt7R36Fpooo50r9T25onhq.jpg", // Batman
  "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", // Spider-Verse
  "https://image.tmdb.org/t/p/w600_and_h900_bestv2/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg", // Barbie
  "https://image.tmdb.org/t/p/w600_and_h900_bestv2/qJ2tW6WMUDux911r6m7haRef0WH.jpg", // Dark Knight
  "https://media.themoviedb.org/t/p/w500/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg", // Fight Club
  "https://image.tmdb.org/t/p/w600_and_h900_bestv2/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", // Matrix
  "https://media.themoviedb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg", // Lord of the Rings
  "https://media.themoviedb.org/t/p/w500/v0Q2uYARIqui1sEBF0bCLJaliDI.jpg", // Deadpool & Wolverine
  "https://media.themoviedb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg", // Inside Out 2
  "https://media.themoviedb.org/t/p/w500/A7EByudX0eOzlkQ2FIbogzyazm2.jpg", // Jawan
  "https://media.themoviedb.org/t/p/w500/AjV6jFJ2YFIluYo4GQf13AA1tqu.jpg", // Stree 2
  "https://media.themoviedb.org/t/p/w500/hr9rjR3J0xBBKmlJ4n3gHId9ccx.jpg", // Animal
  "https://media.themoviedb.org/t/p/w500/tjpiEnZBUAA8pdNPRKa5vP2Zpqw.jpg", // RRR
  "https://media.themoviedb.org/t/p/w500/ulcAi4dKpAjHwYGS08vNyx9H6I9.jpg", // Kalki 2898 AD
  "https://media.themoviedb.org/t/p/w500/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg", // Top Gun Maverick
  "https://media.themoviedb.org/t/p/w500/qnzQm0PCVnSyv1dqpVmRgMWHbLD.jpg", // Avatar 2
  "https://media.themoviedb.org/t/p/w500/wWJbBo5yjw22AIjE8isBFoiBI3S.jpg", // The Godfather
  "https://media.themoviedb.org/t/p/w500/lGCEKlJo2CnWydQj7aamY7s1S7Q.jpg", // Casablanca
  "https://media.themoviedb.org/t/p/w500/w6N81vJWOfBBilbRU8zE0Y55fA.jpg", // Jaws
  "https://media.themoviedb.org/t/p/w500/iKP6wg3c6COUe8gYutoGG7qcPnO.jpg", // E.T.
  "https://media.themoviedb.org/t/p/w500/ya9bwgqA4eNl5bQ9QqS0jcmRoBS.jpg", // Sholay
  "https://media.themoviedb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg", // DDLJ
  "https://media.themoviedb.org/t/p/w500/jTV2QyjCaWk5gO19XKaZAEbD4gW.jpg", // Lagaan
  "https://media.themoviedb.org/t/p/w500/gmSRHU1Wtiatj8KoyVt8rT9ockx.jpg", // 3 Idiots
];

// Duplicate drastically to have a massive dense field
const ALL_POSTERS = [...POSTERS, ...POSTERS, ...POSTERS, ...POSTERS].sort(() => Math.random() - 0.5);

export default function HeroPosters() {
  const containerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !spacerRef.current) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    async function run() {
      const gsapModule = await import("gsap");
      const ScrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = ScrollTriggerModule.ScrollTrigger;
      
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const posters = gsap.utils.toArray(".hero-poster-wrapper") as HTMLElement[];
        
        gsap.set(containerRef.current, { perspective: 1000, transformStyle: "preserve-3d" });
        gsap.set(".cinematic-text", { z: -3000, opacity: 0, scale: 0.5 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: spacerRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5,
            // NO pin: true! We use a dummy spacer to drive the timeline!
          }
        });

        // Golden text animation
        tl.to(".cinematic-text", {
          z: 200,
          opacity: 1,
          scale: 1,
          duration: 0.2, // fast approach relative to scroll
          ease: "none",
        }, 0);
        
        tl.to(".cinematic-text", {
          z: 800,
          opacity: 0,
          scale: 1.5,
          duration: 0.1,
          ease: "none",
        }, 0.25);

        // Poster animations
        posters.forEach((poster) => {
          const startZ = Math.random() * -5000 - 1500;
          const startX = (Math.random() - 0.5) * window.innerWidth * 3;
          const startY = (Math.random() - 0.5) * window.innerHeight * 3;
          
          const rotX = (Math.random() - 0.5) * 60;
          const rotY = (Math.random() - 0.5) * 60;
          const rotZ = (Math.random() - 0.5) * 45;

          gsap.set(poster, {
            x: startX,
            y: startY,
            z: startZ,
            rotationX: rotX,
            rotationY: rotY,
            rotationZ: rotZ,
            opacity: 0,
          });

          // Posters keep spawning up to 90% of the timeline!
          const startTime = Math.random() * 0.9;
          const travelDuration = 0.5 + Math.random() * 0.5;

          tl.to(poster, {
            z: 800,
            rotationX: rotX + (Math.random() - 0.5) * 40,
            rotationY: rotY + (Math.random() - 0.5) * 40,
            rotationZ: rotZ + (Math.random() - 0.5) * 20,
            duration: travelDuration,
            ease: "none",
          }, startTime);

          tl.to(poster, { 
            opacity: Math.random() * 0.4 + 0.3, 
            duration: travelDuration * 0.3, 
            ease: "none" 
          }, startTime);
          
          // Fade out poster just before it hits the camera
          tl.to(poster, { 
            opacity: 0, 
            duration: travelDuration * 0.2, 
            ease: "none" 
          }, startTime + travelDuration * 0.8);
        });

        // Fade out the entire container at the very end of the scroll (when .hero is scrolling up)
        // This creates a seamless blend!
        tl.to(containerRef.current, {
          opacity: 0,
          duration: 0.2,
          ease: "power2.inOut",
        }, 1.7); // 1.7 is near the end of the timeline (0.9 + 1.0 = 1.9 max)

      }, containerRef);
    }
    
    run();
    
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <>
      {/* The invisible spacer that creates the scroll distance */}
      <div ref={spacerRef} style={{ height: "450vh", width: "100%" }} />

      {/* The fixed container that holds the 3D scene */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          pointerEvents: "none",
          background: "radial-gradient(circle at center, var(--void) 0%, #0d0304 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <h2 
          className="cinematic-text"
          style={{
            color: "#ffd700",
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: "4rem",
            letterSpacing: "0.1em",
            textAlign: "center",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)",
            background: "linear-gradient(to bottom, #fff 0%, #ffd700 50%, #b8860b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            zIndex: 10,
            transformStyle: "preserve-3d",
          }}
        >
          SILVER SCREEN CLUB<br/>BITS GOA<br/>
          <span style={{ fontSize: "2rem", letterSpacing: "0.2em", color: "#fff", WebkitTextFillColor: "#fff", textShadow: "none" }}>Presents...</span>
        </h2>

        <div 
          style={{
            position: "absolute",
            inset: -100,
            transformStyle: "preserve-3d"
          }}
        >
          {ALL_POSTERS.map((url, i) => (
            <div
              key={i}
              className="hero-poster-wrapper"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 240,
                height: 360,
                transformStyle: "preserve-3d",
                marginLeft: -120,
                marginTop: -180,
                willChange: "transform, opacity",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
                  opacity: 0.8,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

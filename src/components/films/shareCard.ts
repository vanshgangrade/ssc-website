// Builds an Instagram-story sized (1080×1920) image of a review, entirely in the browser.
import { starLabel } from "./starLabel";

type CardInput = {
  filmTitle: string;
  posterUrl: string;
  rating: number; // half-stars 1–10
  body: string;
  authorName: string;
  handle: string | null;
  atScreening: boolean;
  site: string;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// The page's own poster font (next/font gives it a generated family name).
function posterFont(): string {
  const probe = document.querySelector(".ssc h1, .ssc .brand") as HTMLElement | null;
  return (probe && getComputedStyle(probe).fontFamily) || "'Arial Narrow', sans-serif";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const used = lines.join(" ").length;
  if (used < text.trim().length && lines.length) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, value: number) {
  const gap = size * 0.18;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * (size + gap) + size / 2;
    const fill = Math.max(0, Math.min(1, value / 2 - i)); // 0, 0.5 or 1
    const path = new Path2D();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? size / 2 : size / 4.6;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = y + size / 2 + Math.sin(a) * r;
      if (k === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.closePath();
    ctx.fillStyle = "#3a352c";
    ctx.fill(path);
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - size / 2, y, size * fill, size);
      ctx.clip();
      ctx.fillStyle = "#ffd84a";
      ctx.fill(path);
      ctx.restore();
    }
  }
}

export async function makeShareCard(input: CardInput): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const font = posterFont();
  const poster = await loadImage(input.posterUrl);

  // Backdrop: the poster, blurred and darkened.
  ctx.fillStyle = "#060607";
  ctx.fillRect(0, 0, W, H);
  if (poster) {
    ctx.save();
    ctx.filter = "blur(60px) brightness(0.35) saturate(1.3)";
    const s = Math.max(W / poster.width, H / poster.height) * 1.2;
    ctx.drawImage(poster, (W - poster.width * s) / 2, (H - poster.height * s) / 2, poster.width * s, poster.height * s);
    ctx.restore();
  }
  const fade = ctx.createLinearGradient(0, H * 0.45, 0, H);
  fade.addColorStop(0, "rgba(6,6,7,0)");
  fade.addColorStop(1, "rgba(6,6,7,0.95)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);

  // Header.
  ctx.fillStyle = "#ece7dd";
  ctx.textAlign = "center";
  ctx.font = `600 34px ${font}`;
  ctx.fillText("SSC  FILM  DIARY", W / 2, 150);

  // Poster.
  const pw = 520;
  const ph = 780;
  const px = (W - pw) / 2;
  const py = 230;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#111";
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  if (poster) {
    const s = Math.max(pw / poster.width, ph / poster.height);
    const sw = pw / s;
    const sh = ph / s;
    ctx.drawImage(poster, (poster.width - sw) / 2, (poster.height - sh) / 2, sw, sh, px, py, pw, ph);
  }

  // Title, stars, badge.
  let y = py + ph + 110;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 84px ${font}`;
  for (const line of wrap(ctx, input.filmTitle.toUpperCase(), W - 140, 2)) {
    ctx.fillText(line, W / 2, y);
    y += 88;
  }
  const starSize = 70;
  const starsW = 5 * starSize + 4 * starSize * 0.18;
  drawStars(ctx, (W - starsW) / 2, y - 20, starSize, input.rating);
  y += 100;
  ctx.font = `500 34px ${font}`;
  ctx.fillStyle = "#a8a195";
  ctx.fillText(`${starLabel(input.rating)} / 5${input.atScreening ? "   ·   WATCHED AT THE SCREENING" : ""}`, W / 2, y);
  y += 90;

  // Review excerpt.
  if (input.body.trim()) {
    ctx.font = `italic 400 46px Georgia, serif`;
    ctx.fillStyle = "#e8e2d6";
    for (const line of wrap(ctx, `“${input.body.trim()}”`, W - 180, 5)) {
      ctx.fillText(line, W / 2, y);
      y += 64;
    }
  }

  // Footer.
  ctx.font = `600 40px ${font}`;
  ctx.fillStyle = "#ffd84a";
  ctx.fillText(input.handle ? `@${input.handle}` : input.authorName, W / 2, H - 150);
  ctx.font = `500 30px ${font}`;
  ctx.fillStyle = "#8f8a81";
  ctx.fillText(input.site, W / 2, H - 98);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

// Opens the phone's share sheet with the image, or downloads it where sharing files isn't supported.
export async function shareCard(input: CardInput): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await makeShareCard(input);
  if (!blob) return "failed";
  const name = `${input.filmTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-review.png`;
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `My review of ${input.filmTitle}` });
      return "shared";
    } catch {
      return "failed";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}

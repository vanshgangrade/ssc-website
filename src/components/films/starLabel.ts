// "3½" style label for a half-star value (1–10). Plain module so canvas code can use it too.
export function starLabel(value: number): string {
  const whole = Math.floor(value / 2);
  const half = value % 2 === 1;
  if (!whole) return "½";
  return `${whole}${half ? "½" : ""}`;
}

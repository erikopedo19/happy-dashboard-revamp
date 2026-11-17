/** 1200×630 share image: dark, grid behind, glow rising from the bottom edge, Cutzioo.com/<shop>. */
const W = 1200;
const H = 630;
const ROSE = "#FF2D46";
const CAL = '"Cal Sans", -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

export async function generateShareBanner(displayUrl: string, shopName?: string | null): Promise<Blob> {
  try {
    await document.fonts.load(`400 96px "Cal Sans"`);
  } catch {
    /* system font fallback */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  ctx.fillStyle = "#0A0A0C";
  ctx.fillRect(0, 0, W, H);

  // Grid, brightest near the glow and gone by the top corners.
  const cell = 60;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.beginPath();
  for (let x = cell; x < W; x += cell) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = cell / 2; y < H; y += cell) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
  const fade = ctx.createRadialGradient(W / 2, H, 80, W / 2, H, W * 0.72);
  fade.addColorStop(0, "rgba(10,10,12,0)");
  fade.addColorStop(0.55, "rgba(10,10,12,0.55)");
  fade.addColorStop(1, "rgba(10,10,12,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);

  // Low glow along the bottom edge.
  ctx.save();
  ctx.translate(W / 2, H + 40);
  ctx.scale(1, 0.42);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 620);
  glow.addColorStop(0, "rgba(255,45,70,0.62)");
  glow.addColorStop(0.45, "rgba(224,21,47,0.22)");
  glow.addColorStop(1, "rgba(224,21,47,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-W, -H * 2, W * 2, H * 4);
  ctx.restore();

  // Link, shrunk until it fits.
  const slash = displayUrl.indexOf("/");
  const host = slash < 0 ? displayUrl : displayUrl.slice(0, slash);
  const path = slash < 0 ? "" : displayUrl.slice(slash);
  const z = host.search(/z/i);
  const parts: { t: string; c: string }[] =
    z < 0
      ? [{ t: host, c: "rgba(255,255,255,0.62)" }]
      : [
          { t: host.slice(0, z), c: "rgba(255,255,255,0.62)" },
          { t: host[z], c: ROSE },
          { t: host.slice(z + 1), c: "rgba(255,255,255,0.62)" },
        ];
  parts.push({ t: path, c: "#FFFFFF" });

  let size = 104;
  const measure = () => {
    ctx.font = `400 ${size}px ${CAL}`;
    return parts.reduce((w, p) => w + ctx.measureText(p.t).width, 0);
  };
  let total = measure();
  while (total > W - 140 && size > 36) {
    size -= 4;
    total = measure();
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let x = (W - total) / 2;
  for (const p of parts) {
    ctx.fillStyle = p.c;
    ctx.fillText(p.t, x, H / 2 + 6);
    x += ctx.measureText(p.t).width;
  }

  ctx.textAlign = "center";
  ctx.font = `500 28px "Geist Variable", -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  if (shopName) ctx.fillText(shopName.slice(0, 48), W / 2, H / 2 - size * 0.5 - 44);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("Book online, any time", W / 2, H / 2 + size * 0.5 + 64);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to export banner"))), "image/png"),
  );
}

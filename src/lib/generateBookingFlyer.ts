function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return loadImage(url).finally(() => URL.revokeObjectURL(url));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxWidth: number) {
  let px = start;
  ctx.font = font(px);
  while (ctx.measureText(text).width > maxWidth && px > 28) {
    px -= 2;
    ctx.font = font(px);
  }
}

const SYSTEM = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

/** Story-sized flyer: dark, grid behind, glow rising from the bottom edge, QR, shop name and its link. */
export async function generateBookingFlyer(
  qrBlob: Blob,
  businessName: string,
  displayUrl = ""
): Promise<Blob> {
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  try {
    await document.fonts.load(`400 72px "Cal Sans"`);
  } catch {
    /* system font fallback */
  }

  ctx.fillStyle = "#0A0A0C";
  ctx.fillRect(0, 0, W, H);

  const cell = 72;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  for (let x = cell / 2; x < W; x += cell) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = H - cell; y > 0; y -= cell) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
  const fade = ctx.createRadialGradient(W / 2, H, 120, W / 2, H, H * 0.95);
  fade.addColorStop(0, "rgba(10,10,12,0)");
  fade.addColorStop(0.6, "rgba(10,10,12,0.6)");
  fade.addColorStop(1, "rgba(10,10,12,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H + 60);
  ctx.scale(1, 0.62);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
  glow.addColorStop(0, "rgba(255,45,70,0.6)");
  glow.addColorStop(0.45, "rgba(224,21,47,0.2)");
  glow.addColorStop(1, "rgba(224,21,47,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-W, -H, W * 2, H * 2);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 84px ${SYSTEM}`;
  ctx.fillText("Book here", W / 2, 250);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `36px ${SYSTEM}`;
  ctx.fillText("Scan with your camera", W / 2, 318);

  const qrSize = 620;
  const qrX = (W - qrSize) / 2;
  const qrY = 430;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 36);

  const qrImg = await blobToImage(qrBlob);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  const name = businessName.trim() || "Your barber";
  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, name, (px) => `bold ${px}px ${SYSTEM}`, 72, W - 160);
  ctx.fillText(name, W / 2, qrY + qrSize + 140);

  if (displayUrl) {
    const cal = (px: number) => `400 ${px}px "Cal Sans", ${SYSTEM}`;
    fitText(ctx, displayUrl, cal, 64, W - 160);
    const slash = displayUrl.indexOf("/");
    const host = slash < 0 ? displayUrl : displayUrl.slice(0, slash);
    const z = host.search(/z/i);
    const parts = [
      { t: z < 0 ? host : host.slice(0, z), c: "rgba(255,255,255,0.62)" },
      { t: z < 0 ? "" : host[z], c: "#FF2D46" },
      { t: z < 0 ? "" : host.slice(z + 1), c: "rgba(255,255,255,0.62)" },
      { t: slash < 0 ? "" : displayUrl.slice(slash), c: "#FFFFFF" },
    ];
    let x = (W - ctx.measureText(displayUrl).width) / 2;
    ctx.textAlign = "left";
    for (const p of parts) {
      ctx.fillStyle = p.c;
      ctx.fillText(p.t, x, qrY + qrSize + 250);
      x += ctx.measureText(p.t).width;
    }
    ctx.textAlign = "center";
  }

  let logo: HTMLImageElement | null = null;
  try {
    logo = await loadImage("/cutzioo-logo.webp");
  } catch {
    logo = null;
  }

  const footerText = "Powered by cutzioo.com";
  ctx.font = `34px ${SYSTEM}`;
  const textMetrics = ctx.measureText(footerText);
  const totalWidth = (logo ? 62 : 0) + textMetrics.width;
  const startX = (W - totalWidth) / 2;
  const footerY = H - 130;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "left";
  if (logo) ctx.drawImage(logo, startX, footerY - 12, 48, 48);
  ctx.fillText(footerText, startX + (logo ? 62 : 0), footerY + 20);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Flyer canvas empty"))),
      "image/png"
    );
  });
}

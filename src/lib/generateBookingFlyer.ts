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

export async function generateBookingFlyer(
  qrBlob: Blob,
  businessName: string
): Promise<Blob> {
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  // Dark base
  ctx.fillStyle = "#0A0A0C";
  ctx.fillRect(0, 0, W, H);

  // Rose dots scattered in the background
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 2 + Math.random() * 6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 45, 111, ${0.12 + Math.random() * 0.22})`;
    ctx.fill();
  }

  // Red-orange gradient wave in the top-left corner
  const grad = ctx.createLinearGradient(0, 0, 440, 440);
  grad.addColorStop(0, "#FF2D6F");
  grad.addColorStop(0.45, "#FF6B00");
  grad.addColorStop(1, "rgba(255, 45, 111, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(440, 0);
  ctx.bezierCurveTo(300, 160, 160, 300, 0, 440);
  ctx.closePath();
  ctx.fill();

  // "Book here" header
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 84px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  ctx.fillText("Book here", W / 2, 230);

  // White card behind the QR
  const qrSize = 620;
  const qrX = (W - qrSize) / 2;
  const qrY = 430;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 36);

  // QR code
  const qrImg = await blobToImage(qrBlob);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Business name under the QR
  const name = businessName.trim() || "Your barber";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 72px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  ctx.fillText(name, W / 2, qrY + qrSize + 130);

  // Footer: logo + "Powered by cutzioo.com"
  let logo: HTMLImageElement | null = null;
  try {
    logo = await loadImage("/cutzioo-logo.webp");
  } catch {
    logo = null;
  }

  const footerText = "Powered by cutzioo.com";
  ctx.font = "34px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  const textMetrics = ctx.measureText(footerText);
  const totalWidth = (logo ? 56 : 0) + 14 + textMetrics.width;
  const startX = (W - totalWidth) / 2;
  const footerY = H - 130;

  if (logo) {
    ctx.drawImage(logo, startX, footerY - 12, 48, 48);
    ctx.textAlign = "left";
    ctx.fillStyle = "#8E8E93";
    ctx.fillText(footerText, startX + 62, footerY + 20);
  } else {
    ctx.fillStyle = "#8E8E93";
    ctx.textAlign = "center";
    ctx.fillText(footerText, W / 2, footerY + 20);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Flyer canvas empty"))),
      "image/png"
    );
  });
}

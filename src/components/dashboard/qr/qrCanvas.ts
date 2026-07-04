// Shared QR print-card renderer.
// Produces a beautifully branded print card using only the Canvas 2D API.
// No html2canvas → no CSS color parsing → no lab() errors.
// Used by both the QR Codes tab (bulk) and the Tables tab (per-table quick QR).
//
// Design notes:
// - The QR always sits dark-on-white inside a rounded panel: inverted (light)
//   QR modules fail on many scanner apps, so even the dark "Modern" card keeps
//   a white QR panel.
// - Card corners are rounded; the outside stays transparent in the PNG.

export type CardStyle = "classic" | "modern" | "minimal";

export interface StyleConfig {
  label: string;
  /** Flat card background. Modern overrides this with a gradient at draw time. */
  bg: string;
  /** Filled header band behind the restaurant identity (null = no band). */
  headerBand: string | null;
  accent: string;
  qrFg: string;
  textPrimary: string;
  textSecondary: string;
  /** Restaurant name color in the header zone. */
  headerText: string;
  /** 1px outline around the whole card (null = none). */
  cardBorder: string | null;
  monogramBg: string;
  monogramText: string;
  pillBg: string;
  pillText: string;
}

export const STYLES: Record<CardStyle, StyleConfig> = {
  classic: {
    label: "Classic",
    bg: "#FFFCF5",
    headerBand: "#3e1e0c",
    accent: "#eaa94d",
    qrFg: "#2b1608",
    textPrimary: "#3e1e0c",
    textSecondary: "#8a7565",
    headerText: "#FFFFFF",
    cardBorder: "rgba(62,30,12,0.18)",
    monogramBg: "#eaa94d",
    monogramText: "#3e1e0c",
    pillBg: "#eaa94d",
    pillText: "#3e1e0c",
  },
  modern: {
    label: "Modern",
    bg: "#12161f",
    headerBand: null,
    accent: "#eaa94d",
    qrFg: "#10141c",
    textPrimary: "#f7f8fa",
    textSecondary: "#9aa1ad",
    headerText: "#f7f8fa",
    cardBorder: "rgba(255,255,255,0.10)",
    monogramBg: "#eaa94d",
    monogramText: "#10141c",
    pillBg: "#eaa94d",
    pillText: "#10141c",
  },
  minimal: {
    label: "Minimal",
    bg: "#FFFFFF",
    headerBand: null,
    accent: "#101216",
    qrFg: "#101216",
    textPrimary: "#101216",
    textSecondary: "#6b7280",
    headerText: "#101216",
    cardBorder: "rgba(16,18,22,0.14)",
    monogramBg: "#101216",
    monogramText: "#FFFFFF",
    pillBg: "#101216",
    pillText: "#FFFFFF",
  },
};

const FONT = `Poppins, "Segoe UI", ui-sans-serif, system-ui, sans-serif`;

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrink `size` until `text` fits in `maxW` at the given weight, then draw centered. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  baseline: number,
  maxW: number,
  weight: number,
  startSize: number,
  minSize: number,
) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (size > minSize && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  let out = text;
  if (ctx.measureText(out).width > maxW) {
    while (out.length > 1 && ctx.measureText(out + "…").width > maxW) out = out.slice(0, -1);
    out = out.trimEnd() + "…";
  }
  ctx.fillText(out, cx, baseline);
}

/**
 * Render a branded QR card to a canvas.
 *
 * @param container element containing the rendered QR <svg>
 * @param tableNo   numeric routing handle (encoded in the QR URL)
 * @param label     staff-chosen display name (e.g. "Garden Table"). When present it
 *                  becomes the hero text; otherwise we fall back to "TABLE <number>".
 */
export async function buildQRCanvas(
  container: HTMLElement,
  tableNo: number,
  restaurantName: string,
  slug: string,
  style: CardStyle,
  scale = 3,
  label?: string | null,
): Promise<HTMLCanvasElement> {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("SVG not found");

  const cfg = STYLES[style];

  // Card dimensions (logical px before scale)
  const W = 340;
  const H = 480;
  const R = 24; // card corner radius

  // ── Prepare the QR bitmap (recolored dark-on-white for scannability) ──
  const qrSize = 148;
  const cloned = svg.cloneNode(true) as SVGElement;
  cloned.setAttribute("width", String(qrSize));
  cloned.setAttribute("height", String(qrSize));
  cloned.querySelectorAll("path, rect").forEach((el) => {
    const fill = el.getAttribute("fill");
    if (fill && fill !== "none" && fill !== "transparent" && fill !== "#ffffff" && fill !== "white") {
      el.setAttribute("fill", cfg.qrFg);
    }
  });

  const qrBlobUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(cloned)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  const qrImg = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = qrBlobUrl;
  });
  URL.revokeObjectURL(qrBlobUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Everything stays inside the rounded card; corners remain transparent.
  roundedRectPath(ctx, 0, 0, W, H, R);
  ctx.save();
  ctx.clip();

  // ── Card background ──
  if (style === "modern") {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1b2130");
    grad.addColorStop(1, "#0b0e14");
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = cfg.bg;
  }
  ctx.fillRect(0, 0, W, H);

  // ── Header zone ──
  const bandH = 96;
  if (cfg.headerBand) {
    ctx.fillStyle = cfg.headerBand;
    ctx.fillRect(0, 0, W, bandH);
    // accent hairline under the band
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(0, bandH, W, 3);
  }

  // Monogram circle
  const initials = restaurantName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3) || "HV";
  ctx.beginPath();
  ctx.arc(W / 2, 40, 17, 0, Math.PI * 2);
  ctx.fillStyle = cfg.monogramBg;
  ctx.fill();
  ctx.fillStyle = cfg.monogramText;
  ctx.textAlign = "center";
  ctx.font = `700 ${initials.length === 3 ? 10 : 12}px ${FONT}`;
  ctx.fillText(initials, W / 2, 44);

  // Restaurant name
  ctx.fillStyle = cfg.headerText;
  ctx.letterSpacing = "2px";
  fitText(ctx, restaurantName.toUpperCase(), W / 2, 78, W - 60, 700, 13, 9);
  ctx.letterSpacing = "0px";

  // ── Table identity (name preferred, number as fallback) ──
  const displayName = label && label.trim() ? label.trim() : null;
  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `600 9px ${FONT}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(displayName ? "YOUR TABLE" : "TABLE", W / 2, 128);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = style === "modern" ? cfg.accent : cfg.textPrimary;
  if (displayName) {
    fitText(ctx, displayName, W / 2, 163, W - 56, 800, 32, 17);
  } else {
    ctx.font = `800 50px ${FONT}`;
    ctx.fillText(String(tableNo), W / 2, 168);
  }

  // ── White QR panel (always dark modules on white) ──
  const panel = 184;
  const px = (W - panel) / 2;
  const py = 182;
  ctx.save();
  ctx.shadowColor = style === "modern" ? "rgba(0,0,0,0.45)" : "rgba(62,30,12,0.16)";
  ctx.shadowBlur = 14 * scale;
  ctx.shadowOffsetY = 4 * scale;
  roundedRectPath(ctx, px, py, panel, panel, 20);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();
  roundedRectPath(ctx, px, py, panel, panel, 20);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.drawImage(qrImg, px + (panel - qrSize) / 2, py + (panel - qrSize) / 2, qrSize, qrSize);

  // ── "SCAN TO ORDER" pill ──
  const pillText = "SCAN TO ORDER";
  ctx.font = `700 10.5px ${FONT}`;
  ctx.letterSpacing = "2.5px";
  const pillTextW = ctx.measureText(pillText).width;
  const pillW = pillTextW + 34;
  const pillH = 30;
  const pillY = 388;
  roundedRectPath(ctx, W / 2 - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = cfg.pillBg;
  ctx.fill();
  ctx.fillStyle = cfg.pillText;
  ctx.fillText(pillText, W / 2 + 1, pillY + 19.5);
  ctx.letterSpacing = "0px";

  // ── Helper + footer ──
  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `500 10px ${FONT}`;
  ctx.fillText("No app needed — just point your camera", W / 2, 438);

  ctx.font = `600 8.5px ${FONT}`;
  ctx.fillText("Powered by HimaVolt", W / 2, 458);

  // Tiny accent bar to finish the card
  roundedRectPath(ctx, W / 2 - 22, 466, 44, 3, 1.5);
  ctx.fillStyle = cfg.accent;
  ctx.fill();

  ctx.restore(); // card clip

  // Crisp outline on top of the clipped artwork
  if (cfg.cardBorder) {
    roundedRectPath(ctx, 0.5, 0.5, W - 1, H - 1, R);
    ctx.strokeStyle = cfg.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  return canvas;
}

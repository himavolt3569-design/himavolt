// Shared QR print-card renderer.
// Produces a beautifully branded print card using only the Canvas 2D API.
// No html2canvas → no CSS color parsing → no lab() errors.
// Used by both the QR Codes tab (bulk) and the Tables tab (per-table quick QR).

export type CardStyle = "classic" | "modern" | "minimal";

export interface StyleConfig {
  label: string;
  bg: string;
  headerBg: string;
  headerText: string;
  accent: string;
  qrFg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  cornerAccent: boolean;
  roundedHeader: boolean;
}

export const STYLES: Record<CardStyle, StyleConfig> = {
  classic: {
    label: "Classic",
    bg: "#FFFDF7",
    headerBg: "#3e1e0c",
    headerText: "#FFFFFF",
    accent: "#eaa94d",
    qrFg: "#3e1e0c",
    textPrimary: "#3e1e0c",
    textSecondary: "#5a7a72",
    border: "#3e1e0c",
    cornerAccent: true,
    roundedHeader: false,
  },
  modern: {
    label: "Modern",
    bg: "#111827",
    headerBg: "#eaa94d",
    headerText: "#111827",
    accent: "#eaa94d",
    qrFg: "#F9FAFB",
    textPrimary: "#F9FAFB",
    textSecondary: "#9CA3AF",
    border: "#374151",
    cornerAccent: false,
    roundedHeader: true,
  },
  minimal: {
    label: "Minimal",
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    headerText: "#111827",
    accent: "#111827",
    qrFg: "#111827",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    cornerAccent: false,
    roundedHeader: false,
  },
};

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
  const cW = W * scale;
  const cH = H * scale;

  const qrSize = 170;
  const qrX = (W - qrSize) / 2;
  const qrY = 120;

  // Load QR SVG as image
  const cloned = svg.cloneNode(true) as SVGElement;
  cloned.setAttribute("width", String(qrSize));
  cloned.setAttribute("height", String(qrSize));
  // Replace QR foreground color to match style
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
  canvas.width = cW;
  canvas.height = cH;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  if (style === "modern") {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a2537");
    grad.addColorStop(1, "#0d1117");
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = cfg.bg;
  }
  ctx.fillRect(0, 0, W, H);

  if (style === "classic" || style === "minimal") {
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = style === "classic" ? 2.5 : 1;
    const bInset = style === "classic" ? 5 : 0;
    ctx.strokeRect(bInset, bInset, W - bInset * 2, H - bInset * 2);
  }

  // ── Corner accents (classic only) ───────────
  if (cfg.cornerAccent) {
    const cornerLen = 18;
    const cornerInset = 10;
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 3;
    const corners = [
      // top-left
      [[cornerInset, cornerInset + cornerLen], [cornerInset, cornerInset], [cornerInset + cornerLen, cornerInset]],
      // top-right
      [[W - cornerInset - cornerLen, cornerInset], [W - cornerInset, cornerInset], [W - cornerInset, cornerInset + cornerLen]],
      // bottom-left
      [[cornerInset, H - cornerInset - cornerLen], [cornerInset, H - cornerInset], [cornerInset + cornerLen, H - cornerInset]],
      // bottom-right
      [[W - cornerInset - cornerLen, H - cornerInset], [W - cornerInset, H - cornerInset], [W - cornerInset, H - cornerInset - cornerLen]],
    ] as [number, number][][];
    for (const pts of corners) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.stroke();
    }
  }

  const headerH = 72;
  if (cfg.roundedHeader) {
    // Pill-style header for Modern
    const r = 14;
    const hx = 16, hy = 16, hw = W - 32, hh = headerH - 8;
    ctx.fillStyle = cfg.headerBg;
    ctx.beginPath();
    ctx.moveTo(hx + r, hy);
    ctx.lineTo(hx + hw - r, hy);
    ctx.arcTo(hx + hw, hy, hx + hw, hy + r, r);
    ctx.lineTo(hx + hw, hy + hh - r);
    ctx.arcTo(hx + hw, hy + hh, hx + hw - r, hy + hh, r);
    ctx.lineTo(hx + r, hy + hh);
    ctx.arcTo(hx, hy + hh, hx, hy + hh - r, r);
    ctx.lineTo(hx, hy + r);
    ctx.arcTo(hx, hy, hx + r, hy, r);
    ctx.closePath();
    ctx.fill();
  } else if (style === "classic") {
    ctx.fillStyle = cfg.headerBg;
    ctx.fillRect(5, 5, W - 10, headerH);
  }
  // Minimal has no header block — just text

  ctx.textAlign = "center";
  ctx.fillStyle = style === "minimal" ? cfg.textSecondary : cfg.headerText;
  ctx.font = `bold ${style === "minimal" ? 11 : 12}px sans-serif`;
  const nameY = style === "modern" ? 54 : style === "minimal" ? 28 : 34;
  ctx.fillText(restaurantName.toUpperCase(), W / 2, nameY);

  // Restaurant initials badge in header
  if (style !== "minimal") {
    const initials = restaurantName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3);
    const badgeW = Math.max(24, initials.length * 9 + 10);
    const badgeX = W / 2 - badgeW / 2;
    const badgeY = (style === "modern" ? 22 : 10);
    const br = 3;
    ctx.fillStyle = cfg.accent;
    ctx.beginPath();
    ctx.moveTo(badgeX + br, badgeY);
    ctx.lineTo(badgeX + badgeW - br, badgeY);
    ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + br, br);
    ctx.lineTo(badgeX + badgeW, badgeY + 14 - br);
    ctx.arcTo(badgeX + badgeW, badgeY + 14, badgeX + badgeW - br, badgeY + 14, br);
    ctx.lineTo(badgeX + br, badgeY + 14);
    ctx.arcTo(badgeX, badgeY + 14, badgeX, badgeY + 14 - br, br);
    ctx.lineTo(badgeX, badgeY + br);
    ctx.arcTo(badgeX, badgeY, badgeX + br, badgeY, br);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style === "modern" ? "#111827" : "#ffffff";
    ctx.font = `bold 8px sans-serif`;
    ctx.fillText(initials, W / 2, badgeY + 10);
  }

  if (style === "classic") {
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, headerH + 5 + 5);
    ctx.lineTo(W - 30, headerH + 5 + 5);
    ctx.stroke();
  }

  // ── Table identity (name preferred, number as fallback) ──
  const tableLabelY = style === "minimal" ? 50 : style === "modern" ? 115 : 100;
  const heroColor = style === "modern" ? cfg.accent : cfg.textPrimary;
  const displayName = label && label.trim() ? label.trim() : null;
  ctx.textAlign = "center";

  if (displayName) {
    // Custom name is the hero — shrink to fit the card width, ellipsize if huge.
    const maxW = W - 40;
    let size = 40;
    ctx.font = `800 ${size}px sans-serif`;
    while (size > 16 && ctx.measureText(displayName).width > maxW) {
      size -= 2;
      ctx.font = `800 ${size}px sans-serif`;
    }
    let text = displayName;
    if (ctx.measureText(text).width > maxW) {
      while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
      text = text.trimEnd() + "…";
    }
    ctx.fillStyle = heroColor;
    ctx.fillText(text, W / 2, tableLabelY + 50);
  } else {
    ctx.fillStyle = cfg.textSecondary;
    ctx.font = `600 10px sans-serif`;
    ctx.letterSpacing = "3px";
    ctx.fillText("TABLE", W / 2, tableLabelY);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = heroColor;
    ctx.font = `900 56px sans-serif`;
    ctx.fillText(String(tableNo), W / 2, tableLabelY + 60);
  }

  // Draw background behind QR for contrast
  if (style === "modern") {
    const bx = qrX - 10, by = qrY - 10, bw = qrSize + 20, bh = qrSize + 20, br = 12;
    ctx.fillStyle = "#1a2537";
    ctx.beginPath();
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
    ctx.lineTo(bx + br, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
    ctx.lineTo(bx, by + br);
    ctx.arcTo(bx, by, bx + br, by, br);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
  }
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = style === "modern" ? cfg.accent : cfg.textPrimary;
  ctx.font = `bold 13px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Scan to Order", W / 2, qrY + qrSize + 28);

  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `11px sans-serif`;
  ctx.fillText("No app needed, just scan and order!", W / 2, qrY + qrSize + 46);

  ctx.fillStyle = cfg.textSecondary;
  ctx.font = `9px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Powered by HimaVolt", W / 2, H - 20);

  // ── Bottom accent bar (Classic / Modern) ─────
  if (style === "classic") {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(5, H - 9, W - 10, 4);
  } else if (style === "modern") {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(W / 2 - 30, H - 12, 60, 3);
  }

  return canvas;
}

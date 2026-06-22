/**
 * Kitchen (KOT) and Bar (BOT) ticket printing — one implementation shared by
 * the manual billing tab and the auto-print-on-accept flow. Tickets list items
 * and quantities only (no prices, no food images) on the kitchen paper roll.
 *
 * Must be called in response to a user gesture (the staff "accept"/"print"
 * click) so the print popup isn't blocked.
 */

export interface PrintTicketItem {
  name: string;
  quantity: number;
  /** "COLD" | "HOT" | "ALCOHOL" | null — used to group the bar ticket. */
  drinkCategory?: string | null;
}

export interface TicketContext {
  restaurantName?: string;
  tableNo?: number | string | null;
  roomNo?: string | null;
  orderNo?: string | null;
  guestName?: string | null;
  /** Kitchen roll width in mm (58 or 80). Defaults to 80. */
  width?: number;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[c],
  );
}

function widthMm(w?: number): 58 | 80 {
  return w === 58 ? 58 : 80;
}

/** Where the ticket was placed — "Table 5" / "Room 204" / "Counter". */
function locationLine(ctx: TicketContext): string {
  if (ctx.roomNo) return `Room: <b>${esc(ctx.roomNo)}</b>`;
  if (ctx.tableNo) return `Table: <b>${esc(ctx.tableNo)}</b>`;
  return `Table: <b>N/A</b>`;
}

function writeAndPrint(html: string): void {
  if (typeof window === "undefined") return;
  const pw = window.open("", "_blank");
  if (!pw) return;
  pw.document.write(html);
  pw.document.close();
}

/** Kitchen Order Ticket — all (food) items, quantity × name only. */
export function printKOT(items: PrintTicketItem[], ctx: TicketContext): void {
  if (!items.length) return;
  const mm = widthMm(ctx.width);
  const pad = mm === 58 ? "4mm" : "5mm";
  const html = `
    <html><head><meta charset="UTF-8"><title>KOT</title>
    <style>
      @page { size:${mm}mm auto; margin:0; }
      body { font-family:'Courier New',monospace; width:${mm}mm; max-width:${mm}mm; margin:0 auto; padding:${pad}; box-sizing:border-box; }
      .center { text-align:center; }
      .divider { border-top:1px dashed #333; margin:8px 0; }
      .row { display:flex; justify-content:space-between; padding:2px 0; font-size:13px; }
      h2 { margin:0 0 2px; font-size:14px; }
      .kot-lbl { font-size:18px; font-weight:900; letter-spacing:3px; margin:4px 0 0; }
      .item { padding:3px 0; font-size:14px; font-weight:bold; }
    </style></head><body>
    <div class="center">
      <div class="kot-lbl">*** KOT ***</div>
      <h2 style="margin-top:4px">${esc(ctx.restaurantName || "Restaurant")}</h2>
      <div style="font-size:10px;color:#555">Kitchen Order Ticket</div>
    </div>
    <div class="divider"></div>
    <div class="row"><span>${locationLine(ctx)}</span></div>
    ${ctx.orderNo ? `<div class="row"><span>Order: <b>#${esc(ctx.orderNo)}</b></span></div>` : ""}
    ${ctx.guestName ? `<div class="row"><span>Guest: ${esc(ctx.guestName)}</span></div>` : ""}
    <div class="row"><span style="font-size:11px;color:#555">${new Date().toLocaleString()}</span></div>
    <div class="divider"></div>
    ${items.map((b) => `<div class="item">${esc(b.quantity)} × ${esc(b.name)}</div>`).join("")}
    <div class="divider"></div>
    <div class="center" style="font-size:11px;margin-top:8px">— KITCHEN COPY —</div>
    <script>window.onload=function(){window.print();window.close();};<\/script>
    </body></html>`;
  writeAndPrint(html);
}

/** Bar Order Ticket — drink items only, grouped by category. */
export function printBOT(items: PrintTicketItem[], ctx: TicketContext): void {
  if (!items.length) return;
  const mm = widthMm(ctx.width);
  const pad = mm === 58 ? "4mm" : "5mm";
  const grouped: Record<string, PrintTicketItem[]> = {};
  items.forEach((b) => {
    const cat = b.drinkCategory || "OTHER";
    (grouped[cat] ??= []).push(b);
  });
  const catLabel: Record<string, string> = {
    COLD: "Cold Drinks",
    HOT: "Hot Drinks",
    ALCOHOL: "Alcohol / Cocktails",
    OTHER: "Beverages",
  };
  const html = `
    <html><head><meta charset="UTF-8"><title>BOT</title>
    <style>
      @page { size:${mm}mm auto; margin:0; }
      body { font-family:'Courier New',monospace; width:${mm}mm; max-width:${mm}mm; margin:0 auto; padding:${pad}; box-sizing:border-box; background:#fff; }
      .center { text-align:center; }
      .divider { border-top:2px dashed #1e3a5f; margin:8px 0; }
      .thin { border-top:1px dashed #93c5fd; margin:6px 0; }
      .row { display:flex; justify-content:space-between; padding:2px 0; font-size:13px; }
      h2 { margin:0 0 2px; font-size:13px; }
      .bot-lbl { font-size:20px; font-weight:900; letter-spacing:4px; color:#1e3a5f; margin:4px 0 0; }
      .cat-hdr { font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; color:#1d4ed8; margin:8px 0 4px; }
      .item { padding:3px 0; font-size:15px; font-weight:bold; color:#1e3a5f; }
      .meta { font-size:11px; color:#555; }
      .badge { display:inline-block; background:#1e3a5f; color:#fff; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:3px; letter-spacing:1px; }
    </style></head><body>
    <div class="center">
      <div class="bot-lbl">*** BOT ***</div>
      <h2 style="margin-top:4px">${esc(ctx.restaurantName || "Restaurant")}</h2>
      <span class="badge">Bar Order Ticket</span>
    </div>
    <div class="divider"></div>
    <div class="row"><span class="meta">${locationLine(ctx)}</span></div>
    ${ctx.orderNo ? `<div class="row"><span class="meta">Order: <b>#${esc(ctx.orderNo)}</b></span><span class="meta">${new Date().toLocaleDateString()}</span></div>` : ""}
    ${ctx.guestName ? `<div class="row"><span class="meta">Guest: ${esc(ctx.guestName)}</span></div>` : ""}
    <div class="divider"></div>
    ${Object.entries(grouped)
      .map(
        ([cat, list]) => `
      <div class="cat-hdr">${esc(catLabel[cat] || cat)}</div>
      ${list
        .map(
          (b) => `
        <div class="item">${esc(b.quantity)} × ${esc(b.name)}</div>
        ${b.drinkCategory === "ALCOHOL" ? `<div style="color:#dc2626;font-size:10px;padding-left:16px;">⚠ Verify age before serving</div>` : ""}
      `,
        )
        .join("")}
      <div class="thin"></div>
    `,
      )
      .join("")}
    <div class="center" style="font-size:11px;margin-top:8px;color:#1e3a5f;font-weight:bold">— BAR COPY —</div>
    <script>window.onload=function(){window.print();window.close();};<\/script>
    </body></html>`;
  writeAndPrint(html);
}

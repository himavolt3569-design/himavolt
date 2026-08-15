"use client";

/**
 * Sharing a link, safely, from any origin this app actually runs on.
 *
 * Two things make the naive version unreliable:
 *
 * 1. **`navigator.share()` on desktop is a native OS call.** On Windows it opens
 *    the system share flyout, which is outside the browser's control and has
 *    been observed taking the tab — and the browser with it — down. A `try` /
 *    `catch` around it cannot help: the failure is not a JavaScript exception.
 *    The Web Share API is a phone affordance, so it is only used on a device
 *    that actually looks like a phone. Everywhere else, copying the link is both
 *    safer and the better interaction.
 *
 * 2. **`navigator.clipboard` is undefined outside a secure context.** Staff open
 *    the dashboard over the venue's LAN (`http://192.168.x.x:3000`) and QR pages
 *    get opened on all sorts of devices, so `navigator.clipboard.writeText(...)`
 *    throws `TypeError: Cannot read properties of undefined` there. The legacy
 *    `execCommand` path still works on those origins and is used as a fallback.
 *
 * Callers get a result rather than a thrown error, so a share button is never
 * silently dead: every outcome has something to say to the user.
 */

export type ShareResult =
  /** Handed off to the OS share sheet (or the user dismissed it). */
  | "shared"
  /** The link is on the clipboard. */
  | "copied"
  /** Nothing worked — tell the user to copy it themselves. */
  | "failed";

/**
 * Only true on a device where the OS share sheet is the expected interaction:
 * coarse pointer, no hover. Deliberately conservative — a false negative just
 * copies the link, a false positive risks the native crash described above.
 */
function shouldUseWebShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** Copy text to the clipboard, falling back for non-secure origins. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Optional-chained: the whole `clipboard` object is absent on http://, not
    // just the method.
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* permission denied or not focused — try the legacy path below */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    // Off-screen rather than hidden: a display:none element cannot be selected.
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export async function shareLink({
  url,
  title,
  text,
}: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareResult> {
  if (shouldUseWebShare()) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      // Dismissing the sheet is a completed interaction, not a failure — don't
      // then shove the link on their clipboard uninvited.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "shared";
      }
      /* anything else: fall through and copy instead */
    }
  }

  return (await copyToClipboard(url)) ? "copied" : "failed";
}

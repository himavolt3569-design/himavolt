import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// In production a dedicated ENCRYPTION_KEY is mandatory: keying payment
// secrets off JWT_SECRET means a routine JWT rotation silently bricks every
// stored gateway credential. Fail at first use, loudly, instead.
function getPrimaryKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY is not set. Payment credentials cannot be encrypted/decrypted without it. " +
          "Set ENCRYPTION_KEY in the environment (rows encrypted under the old JWT_SECRET fallback are still readable).",
      );
    }
    // Dev convenience only
    return crypto.createHash("sha256").update(process.env.JWT_SECRET || "").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

// Legacy fallback: rows written before ENCRYPTION_KEY existed were encrypted
// under JWT_SECRET. Decrypt-only — never used for new encryptions. Rows are
// transparently re-encrypted under the primary key next time the config is
// saved.
function getLegacyKey(): Buffer | null {
  if (!process.env.JWT_SECRET) return null;
  return crypto.createHash("sha256").update(process.env.JWT_SECRET).digest();
}

export function encrypt(plainText: string): string {
  const key = getPrimaryKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

function decryptWithKey(encryptedText: string, key: Buffer): string {
  const [ivHex, tagHex, encrypted] = encryptedText.split(":");
  if (!ivHex || !tagHex || !encrypted) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function decrypt(encryptedText: string): string {
  try {
    return decryptWithKey(encryptedText, getPrimaryKey());
  } catch (primaryErr) {
    const legacy = getLegacyKey();
    if (legacy) {
      try {
        return decryptWithKey(encryptedText, legacy);
      } catch {
        /* fall through to the primary error */
      }
    }
    throw primaryErr;
  }
}

/** Encrypt a value if it's non-empty, otherwise return null */
export function encryptIfPresent(
  value: string | null | undefined,
): string | null {
  if (!value || value.trim() === "") return null;
  return encrypt(value.trim());
}

/** Decrypt a value if it's non-empty, otherwise return null */
export function decryptIfPresent(
  value: string | null | undefined,
): string | null {
  if (!value || value.trim() === "") return null;
  try {
    return decrypt(value);
  } catch (err) {
    // A stored credential that no longer decrypts is an incident (key
    // rotated, row corrupted) — payment verification will fail downstream.
    // Never silent: this tag is what you grep the Vercel logs for.
    console.error(
      "[encryption.decrypt_failed] Stored credential could not be decrypted — check ENCRYPTION_KEY:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

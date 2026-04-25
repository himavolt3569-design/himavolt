import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

const PIN_SALT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

export async function verifyPin(
  inputPin: string,
  storedPin: string,
): Promise<boolean> {
  if (storedPin.startsWith("$2")) {
    return bcrypt.compare(inputPin, storedPin);
  }
  // Legacy plaintext fallback — constant-time compare so we don't leak
  // length or position via timing. Legacy values are rehashed on next login.
  const a = Buffer.from(inputPin, "utf8");
  const b = Buffer.from(storedPin, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

import bcrypt from "bcryptjs";

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
  return inputPin === storedPin;
}

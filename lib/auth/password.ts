import bcrypt from "bcryptjs";

// bcryptjs is pure JS (Windows-friendly). If you later switch to argon2,
// keep the same function signatures to avoid touching calling code.
const DEFAULT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(DEFAULT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

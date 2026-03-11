import { db } from "./db";

function isClerkConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.CLERK_SECRET_KEY
  );
}

export async function getAuthUser() {
  if (!isClerkConfigured()) return null;

  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  return user;
}

export async function getOrCreateUser() {
  if (!isClerkConfigured()) return null;

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;

  let user = await db.user.findUnique({ where: { id: userId } });
  if (user) return user;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  // If a user with this email already exists (e.g. from dev Clerk), update their ID
  const existing = email
    ? await db.user.findUnique({ where: { email } })
    : null;
  if (existing) {
    user = await db.user.update({
      where: { email },
      data: {
        id: clerkUser.id,
        name:
          `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
          existing.name,
        imageUrl: clerkUser.imageUrl ?? existing.imageUrl,
      },
    });
    return user;
  }

  user = await db.user.create({
    data: {
      id: clerkUser.id,
      email,
      name:
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        "User",
      phone: clerkUser.phoneNumbers[0]?.phoneNumber,
      imageUrl: clerkUser.imageUrl,
    },
  });

  return user;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOwner() {
  const user = await requireAuth();
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    throw new Error("Forbidden: Owner access required");
  }
  return user;
}

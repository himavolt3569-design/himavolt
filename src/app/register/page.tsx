import { redirect } from "next/navigation";

/**
 * `/register` is a legacy entry point. Self-serve signup is fully handled by
 * `/sign-in` (email OTP or Google, with an owner/customer choice) →
 * `/auth/get-started` → Create New Restaurant. Redirect any bookmarked or
 * indexed `/register` links straight into the working flow rather than showing
 * a dead "invite-only" stub.
 */
export default function RegisterPage() {
  redirect("/sign-in");
}

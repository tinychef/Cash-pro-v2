// Single flag that flips the app between Clerk auth (production) and the
// dev tenant fallback. Driven purely by the presence of the Clerk key,
// so no code change is needed to switch modes — just env.
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

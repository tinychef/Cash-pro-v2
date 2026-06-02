import { SignIn } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {clerkEnabled ? (
        <SignIn />
      ) : (
        <p className="text-sm text-muted-foreground">
          Autenticación no configurada (modo desarrollo).
        </p>
      )}
    </div>
  );
}

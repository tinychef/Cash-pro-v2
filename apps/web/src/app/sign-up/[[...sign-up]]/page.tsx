import { SignUp } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {clerkEnabled ? (
        <SignUp />
      ) : (
        <p className="text-sm text-muted-foreground">
          Autenticación no configurada (modo desarrollo).
        </p>
      )}
    </div>
  );
}

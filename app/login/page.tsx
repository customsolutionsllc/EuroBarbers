import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff Login",
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return (
    <main className="section flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Staff</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Sign in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Admin and barber access only.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

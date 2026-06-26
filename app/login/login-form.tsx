"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin";
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage("Invalid email or password.");
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        required
      />
      <Button className="w-full" size="lg" disabled={status === "saving"}>
        {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in
      </Button>
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </form>
  );
}

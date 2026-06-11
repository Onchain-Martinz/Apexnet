"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SignOutButton({ size = "sm", className }: Pick<ButtonProps, "size" | "className">) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      loading={loading}
      onClick={handleSignOut}
    >
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}

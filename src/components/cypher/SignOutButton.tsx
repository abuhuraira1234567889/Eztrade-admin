"use client";

import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

type SignOutButtonProps = {
  className?: string;
  children: ReactNode;
};

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" onClick={() => void handleSignOut()} className={className}>
      {children}
    </button>
  );
}

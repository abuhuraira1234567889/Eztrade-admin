import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

/** Generate an 8-char uppercase referral code. */
export function generateReferralCode(): string {
 return Array.from({ length: 8 })
 .map(() => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)])
 .join("");
}

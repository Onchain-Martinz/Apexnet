import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind classes safely — resolves conflicts intelligently
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

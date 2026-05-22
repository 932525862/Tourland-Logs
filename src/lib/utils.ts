import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUzbekPhone(value: string | undefined | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("998")) {
    return "+" + digits.slice(0, 12);
  } else if (digits.length <= 2 && "998".startsWith(digits)) {
    return "+" + digits;
  }

  return "+998" + digits.slice(0, 9);
}

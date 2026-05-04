import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const normalizeDate = (date: any) => {
  if (date?.$date?.$numberLong) {
    return new Date(Number(date.$date.$numberLong));
  }
  return new Date(date);
};
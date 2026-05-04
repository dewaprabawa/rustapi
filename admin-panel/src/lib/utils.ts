import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const normalizeDate = (date: any): Date | null => {
  if (!date) return null;
  try {
    let d: Date;
    if (typeof date === 'object' && date.$date) {
      if (date.$date.$numberLong) {
        d = new Date(Number(date.$date.$numberLong));
      } else {
        d = new Date(date.$date);
      }
    } else {
      d = new Date(date);
    }
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};
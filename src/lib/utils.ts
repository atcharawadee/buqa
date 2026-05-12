import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAcademicYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  // Thai Year = Gregorian Year + 543
  const thaiYear = year + 543;
  
  // If Month >= 8 (August), Academic Year is the current Thai Year
  // If Month < 8, Academic Year is the current Thai Year - 1
  if (month >= 8) {
    return thaiYear.toString();
  } else {
    return (thaiYear - 1).toString();
  }
}

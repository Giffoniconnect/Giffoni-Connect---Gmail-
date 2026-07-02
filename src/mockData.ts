import { Publication } from './types';

// Business days helper in client-side to keep consistency
export function calculateBusinessDaysDate(startDate: Date, days: number): string {
  let resultDate = new Date(startDate);
  let count = 0;
  while (count < days) {
    resultDate.setDate(resultDate.getDate() + 1);
    const dayOfWeek = resultDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
  }
  return resultDate.toISOString();
}

export const initialPublications: Publication[] = [];

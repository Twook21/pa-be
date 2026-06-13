export interface CalendarDTO {
  id: number;
  date: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName: string | null;
  holidayType: string | null;
  createdAt: string;
  updatedAt: string;
}

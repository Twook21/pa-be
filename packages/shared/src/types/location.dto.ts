export interface LocationDTO {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSettingDTO {
  id: number;
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
  isActive: boolean;
}

export interface HolidayCheckResponse {
  is_holiday: boolean;
  holiday_name: string | null;
}

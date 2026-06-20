export type AttendanceStatus = 'present' | 'late' | 'absent' | 'sakit' | 'cuti' | 'dinas_luar';

export interface AttendanceDTO {
  id: number;
  userId: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInLocationName: string | null;
  checkOutLocationName: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  status: AttendanceStatus;
  notes: string | null;
  activityId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInDTO {
  latitude: number;
  longitude: number;
  photo: string; // Base64
  notes?: string;
}

export interface CheckOutDTO {
  latitude: number;
  longitude: number;
  photo: string; // Base64
  notes?: string;
}

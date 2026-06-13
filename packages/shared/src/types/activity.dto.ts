export interface ActivityDTO {
  id: number;
  name: string;
  date: string;
  description: string | null;
  photo: string | null;
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityDTO {
  name: string;
  date: string;
  description?: string;
  photo?: string;
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
}

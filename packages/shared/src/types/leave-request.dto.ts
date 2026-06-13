export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequestDTO {
  id: number;
  userId: number;
  type: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  photo: string | null;
  note: string | null;
  responseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestDTO {
  type: string;
  reason: string;
  startDate: string;
  endDate: string;
  photo?: string;
}

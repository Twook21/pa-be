import { RequestStatus } from './leave-request.dto.js';

export interface ExternalDutyDTO {
  id: number;
  userId: number;
  date: string;
  location: string;
  description: string;
  document: string | null;
  status: RequestStatus;
  approvedBy: number | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExternalDutyDTO {
  date: string;
  location: string;
  description: string;
  document?: string;
}

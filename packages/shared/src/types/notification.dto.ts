export interface NotificationDTO {
  id: string;
  type: string;
  notifiableType: string;
  notifiableId: number;
  data: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendNotificationDTO {
  type: string;
  recipient_user_id: number | string | null;
  data: Record<string, unknown>;
}

export interface UserLocationDTO {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

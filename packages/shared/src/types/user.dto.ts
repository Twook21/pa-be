export interface UserDTO {
  id: number;
  name: string;
  email: string;
  photo: string | null;
  role: 'admin' | 'user';
  division: string | null;
  phoneNumber: string | null;
  bio: string | null;
  status: 'active' | 'inactive' | 'resigned';
  fcmToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  division?: string;
  phoneNumber?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
}

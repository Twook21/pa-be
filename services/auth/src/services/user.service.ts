import { PrismaClient } from '../db.js';
import bcrypt from 'bcryptjs';
import {
  ValidationError,
  NotFoundError,
  type UserDTO,
  type PaginationParams,
} from '@fintap/shared';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function toUserDTO(user: any): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photo: user.photo,
    role: user.role,
    division: user.division,
    phoneNumber: user.phoneNumber,
    bio: user.bio,
    status: user.status,
    fcmToken: user.fcmToken,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function listUsers(pagination: PaginationParams): Promise<{
  users: UserDTO[];
  total: number;
}> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return {
    users: users.map(toUserDTO),
    total,
  };
}

export async function getUserById(id: number): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toUserDTO(user);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  division?: string;
  phoneNumber?: string;
  status?: 'active' | 'inactive' | 'resigned';
  resignDate?: string;
  photo?: string;
}): Promise<UserDTO> {
  // Validate input
  if (!data.name || data.name.length < 2 || data.name.length > 100) {
    throw new ValidationError('Validation failed', [
      { field: 'name', message: 'Name must be between 2 and 100 characters' },
    ]);
  }

  if (!data.email) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email is required' },
    ]);
  }

  if (!data.password || data.password.length < 6) {
    throw new ValidationError('Validation failed', [
      { field: 'password', message: 'Password must be at least 6 characters' },
    ]);
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email already in use' },
    ]);
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || 'user',
      division: data.division || null,
      phoneNumber: data.phoneNumber || null,
      status: data.status || 'active',
      resignDate: data.resignDate ? new Date(data.resignDate) : null,
      photo: data.photo || null,
    },
  });

  return toUserDTO(user);
}

export async function updateUser(
  id: number,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: 'admin' | 'user';
    division?: string;
    phoneNumber?: string;
    bio?: string;
    status?: 'active' | 'inactive' | 'resigned';
    resignDate?: string;
    photo?: string;
    fcmToken?: string;
    faceDescriptor?: string | null;
  }
): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Validate if name is provided
  if (data.name !== undefined && (data.name.length < 2 || data.name.length > 100)) {
    throw new ValidationError('Validation failed', [
      { field: 'name', message: 'Name must be between 2 and 100 characters' },
    ]);
  }

  // Validate if email uniqueness when changed
  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ValidationError('Validation failed', [
        { field: 'email', message: 'Email already in use' },
      ]);
    }
  }

  // Build update payload
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.division !== undefined) updateData.division = data.division;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.photo !== undefined) updateData.photo = data.photo;
  if (data.fcmToken !== undefined) updateData.fcmToken = data.fcmToken;
  if (data.faceDescriptor !== undefined) updateData.faceDescriptor = data.faceDescriptor;

  // Handle resignDate
  if (data.resignDate !== undefined) {
    updateData.resignDate = data.resignDate ? new Date(data.resignDate) : null;
  }

  // Hash password if provided
  if (data.password) {
    if (data.password.length < 6) {
      throw new ValidationError('Validation failed', [
        { field: 'password', message: 'Password must be at least 6 characters' },
      ]);
    }
    updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return toUserDTO(updated);
}

export async function deleteUser(id: number): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Soft delete - set status to inactive
  const updated = await prisma.user.update({
    where: { id },
    data: { status: 'inactive' },
  });

  return toUserDTO(updated);
}

/**
 * Get user by ID without password (for internal service communication).
 */
export async function getUserByIdInternal(id: number): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toUserDTO(user);
}

/**
 * Change user password. Verifies current password first.
 */
export async function changePassword(
  userId: number,
  data: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }
): Promise<void> {
  if (!data.currentPassword) {
    throw new ValidationError('Validation failed', [
      { field: 'current_password', message: 'Current password is required' },
    ]);
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    throw new ValidationError('Validation failed', [
      { field: 'new_password', message: 'New password must be at least 6 characters' },
    ]);
  }

  if (data.newPassword !== data.newPasswordConfirmation) {
    throw new ValidationError('Validation failed', [
      { field: 'new_password_confirmation', message: 'Password confirmation does not match' },
    ]);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isMatch = await bcrypt.compare(data.currentPassword, user.password);
  if (!isMatch) {
    throw new ValidationError('Validation failed', [
      { field: 'current_password', message: 'Current password is incorrect' },
    ]);
  }

  // Hash and save new password
  const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

/**
 * Retrieve the stringified face descriptor for a user.
 */
export async function getFaceDescriptor(id: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { faceDescriptor: true },
  });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user.faceDescriptor;
}

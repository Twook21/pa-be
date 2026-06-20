import { PrismaClient } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  type UserDTO,
  type AuthResponse,
} from '@fintap/shared';
import { notificationClient } from '../clients/notification-client.js';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function toUserDTO(user: any): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photo: user.photo,
    role: user.role,
    division: user.division,
    phoneNumber: user.phoneNumber,
    bio: user.bio || null,
    status: user.status,
    fcmToken: user.fcmToken,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function generateToken(user: { id: number; role: string; email: string }): string {
  const options: SignOptions = {};
  if (JWT_EXPIRES_IN) {
    options.expiresIn = JWT_EXPIRES_IN as any;
  }
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    options
  );
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  division?: string;
  phoneNumber?: string;
}): Promise<AuthResponse> {
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

  if (!data.password || data.password.length < 8) {
    throw new ValidationError('Validation failed', [
      { field: 'password', message: 'Password must be at least 8 characters' },
    ]);
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email already in use' },
    ]);
  }

  // Hash password with bcrypt 12 rounds
  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || 'user',
      division: data.division || null,
      phoneNumber: data.phoneNumber || null,
    },
  });

  const token = generateToken(user);
  return { user: toUserDTO(user), token };
}

export async function login(data: {
  email: string;
  password: string;
  deviceId?: string;
}): Promise<AuthResponse> {
  if (!data.email || !data.password) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email and password are required' },
    ]);
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new AuthenticationError('Account is inactive');
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Update the registered device for this user (soft binding: last login wins)
  if (data.deviceId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { deviceId: data.deviceId },
    });
  }

  const token = generateToken(user);
  return { user: toUserDTO(user), token };
}

export async function logout(): Promise<void> {
  // Stateless JWT - just return success
  // Could implement token blacklisting in the future
}

export async function forgotPassword(email: string): Promise<{ resetToken: string }> {
  if (!email) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email is required' },
    ]);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal if email exists - return success anyway
    return { resetToken: '' };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExp = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp },
  });

  // Send password reset notification via Notification Service
  // Wrapped in try/catch so notification failure doesn't block the response
  try {
    await notificationClient.sendNotification(
      'password_reset',
      user.id,
      { resetToken, email: user.email, name: user.name }
    );
  } catch {
    // Notification failure is non-blocking - log but continue
    console.error(`[auth-service] Failed to send password reset notification to user ${user.id}`);
  }

  return { resetToken };
}

export async function resetPassword(data: {
  token: string;
  password: string;
}): Promise<void> {
  if (!data.token) {
    throw new ValidationError('Validation failed', [
      { field: 'token', message: 'Reset token is required' },
    ]);
  }

  if (!data.password || data.password.length < 8) {
    throw new ValidationError('Validation failed', [
      { field: 'password', message: 'Password must be at least 8 characters' },
    ]);
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: data.token,
      resetTokenExp: { gte: new Date() },
    },
  });

  if (!user) {
    throw new ValidationError('Validation failed', [
      { field: 'token', message: 'Invalid or expired reset token' },
    ]);
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExp: null,
    },
  });
}

export async function getMe(userId: number): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toUserDTO(user);
}

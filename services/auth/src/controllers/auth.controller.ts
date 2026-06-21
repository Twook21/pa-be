import { Request, Response, NextFunction } from 'express';
import { formatSuccess } from '@fintap/shared';
import * as authService from '../services/auth.service.js';
import { extractUser } from '../middleware/internal-auth.js';

import * as userService from '../services/user.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role, division, phoneNumber } = req.body;
    const result = await authService.register({ name, email, password, role, division, phoneNumber });
    res.status(201).json(formatSuccess('User registered successfully', result));
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, device_id } = req.body;
    const result = await authService.login({ email, password, deviceId: device_id });
    res.status(200).json(formatSuccess('Login successful', result));
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout();
    res.status(200).json(formatSuccess('Logout successful'));
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    // Always return success to not reveal if email exists
    res.status(200).json(formatSuccess('If the email exists, a reset link has been sent'));
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;
    await authService.resetPassword({ token, password });
    res.status(200).json(formatSuccess('Password reset successful'));
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const user = await authService.getMe(userId);
    res.status(200).json(formatSuccess('User profile retrieved', user));
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const file = (req as any).file as Express.Multer.File | undefined;
    const { name, email, phone_number, phoneNumber } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone_number || phoneNumber) updateData.phoneNumber = phone_number || phoneNumber;
    if (file) {
      updateData.photo = (file as any).location || file.filename;
    }

    const user = await userService.updateUser(userId, updateData);
    res.status(200).json(formatSuccess('Profile updated successfully', user));
  } catch (error) {
    next(error);
  }
}

export async function getBiometricStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const descriptorStr = await userService.getFaceDescriptor(userId);
    const face_descriptor = descriptorStr ? JSON.parse(descriptorStr) : null;
    res.status(200).json(formatSuccess('Biometric status retrieved', {
      face_registered: !!descriptorStr,
      face_descriptor,
    }));
  } catch (error) {
    next(error);
  }
}

export async function registerBiometric(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const { face_descriptor } = req.body;

    if (!face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length === 0) {
      res.status(400).json({ status: 'error', message: 'face_descriptor must be a non-empty array of numbers', code: 'VALIDATION_ERROR' });
      return;
    }

    await userService.updateUser(userId, {
      faceDescriptor: JSON.stringify(face_descriptor),
    });

    res.status(200).json(formatSuccess('Biometric registered successfully', {
      face_registered: true,
    }));
  } catch (error) {
    next(error);
  }
}

export async function deleteBiometric(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    await userService.updateUser(userId, {
      faceDescriptor: null,
    });
    res.status(200).json(formatSuccess('Biometric deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function updateFcmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = extractUser(req);
    const { fcm_token } = req.body;

    if (!fcm_token) {
      res.status(400).json({ status: 'error', message: 'fcm_token is required', code: 'VALIDATION_ERROR' });
      return;
    }

    await userService.updateUser(userId, { fcmToken: fcm_token });
    res.status(200).json(formatSuccess('FCM token updated successfully'));
  } catch (error) {
    next(error);
  }
}

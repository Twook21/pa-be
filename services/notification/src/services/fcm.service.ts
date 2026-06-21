import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createLogger } from '@fintap/shared';

const logger = createLogger('fcm-service');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FCMService {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountStr) {
        const serviceAccount = JSON.parse(serviceAccountStr);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.isInitialized = true;
        logger.info('Firebase Admin SDK initialized successfully');
      } else {
        logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON environment variable not found. Push notifications will not work.');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    dataPayload?: Record<string, string>
  ): Promise<void> {
    if (!this.isInitialized || tokens.length === 0) return;

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: dataPayload,
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        logger.warn(`Failed to send push notification to ${response.failureCount} tokens`, { failedTokens });
      }
      
      logger.info(`Successfully sent FCM notification to ${response.successCount} devices`);
    } catch (error) {
      logger.error('Error sending FCM push notification', error);
    }
  }
}

export const fcmService = new FCMService();

import nodemailer, { Transporter } from 'nodemailer';
import { createLogger } from '@fintap/shared';

const logger = createLogger('notification-service');

/**
 * Mail service using Nodemailer for sending email notifications.
 */
export class MailService {
  private transporter: Transporter | null = null;

  /**
   * Initialize the Nodemailer transporter.
   */
  private initialize(): void {
    if (this.transporter) return;

    const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD;

    if (!host || !user || !pass) {
      logger.warn('SMTP configuration incomplete, email notifications disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    logger.info('Nodemailer transporter initialized');
  }

  /**
   * Send a notification email to a user.
   */
  async sendNotificationEmail(
    to: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    this.initialize();

    if (!this.transporter) {
      logger.warn('Email transporter not available, skipping email notification');
      return;
    }

    const normalizedType = type
      .replace('leave_request_approved', 'leave_request.approved')
      .replace('leave_request_rejected', 'leave_request.rejected')
      .replace('leave_request_created', 'leave_request.created')
      .replace('external_duty_approved', 'external_duty.approved')
      .replace('external_duty_rejected', 'external_duty.rejected')
      .replace('external_duty_created', 'external_duty.created')
      .replace('activity_created', 'activity.created')
      .replace('password_reset', 'password.reset');

    const envFrom = process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS;
    let from = envFrom || 'noreply@fintap-yplp.perwakilanyplppgrijawabarat.com';

    // If SMTP_FROM doesn't contain a formatted name (e.g. "Name <email>"), format it
    if (!from.includes('<')) {
      const fromName = process.env.MAIL_FROM_NAME || 'FinTap YPLP';
      from = `"${fromName}" <${from}>`;
    }
    
    const subject = this.getEmailSubject(normalizedType);
    const html = this.getEmailBody(normalizedType, data);

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    logger.info('Email notification sent', { to, type: normalizedType });
  }

  /**
   * Get email subject based on notification type.
   */
  private getEmailSubject(type: string): string {
    const subjects: Record<string, string> = {
      'attendance.late': '[FinTap] Peringatan Keterlambatan',
      'leave_request.created': '[FinTap] Pengajuan Izin/Cuti Baru',
      'leave_request.approved': '[FinTap] Pengajuan Disetujui',
      'leave_request.rejected': '[FinTap] Pengajuan Ditolak',
      'external_duty.created': '[FinTap] Pengajuan Dinas Luar Baru',
      'external_duty.approved': '[FinTap] Dinas Luar Disetujui',
      'external_duty.rejected': '[FinTap] Dinas Luar Ditolak',
      'activity.created': '[FinTap] Kegiatan Baru',
      'holiday.tomorrow': '[FinTap] Pengingat Hari Libur',
      'password.reset': '[FinTap] Reset Password',
    };
    return subjects[type] || '[FinTap] Notifikasi';
  }

  /**
   * Get email HTML body based on notification type and data.
   */
  private getEmailBody(type: string, data: Record<string, unknown>): string {
    const message = typeof data.message === 'string' ? data.message : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              line-height: 1.6; 
              color: #1e293b; 
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              padding: 40px 20px;
              width: 100%;
              box-sizing: border-box;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
              border: 1px solid #f1f5f9;
            }
            .header { 
              background: linear-gradient(135deg, #1e3a8a, #2563eb); 
              color: white; 
              padding: 32px 20px; 
              text-align: center; 
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: -1px;
            }
            .header h1 span {
              color: #93c5fd;
            }
            .content { 
              padding: 40px 32px; 
              font-size: 15px;
              color: #334155;
            }
            .content p {
              margin-top: 0;
              margin-bottom: 16px;
            }
            .details-box {
              background-color: #f8fafc;
              border-left: 4px solid #3b82f6;
              padding: 16px;
              margin-top: 24px;
              border-radius: 0 8px 8px 0;
              color: #475569;
            }
            .footer { 
              text-align: center; 
              padding: 24px; 
              color: #64748b; 
              font-size: 13px;
              background-color: #f8fafc;
              border-top: 1px solid #e2e8f0;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: linear-gradient(to right, #1d4ed8, #2563eb);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 50px;
              font-weight: bold;
              font-size: 15px;
              box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
              margin: 16px 0;
            }
            .muted-link {
              color: #2563eb;
              word-break: break-all;
              font-size: 13px;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <h1>Fin<span>tap</span></h1>
              </div>
              <div class="content">
                ${message || this.getDefaultMessage(type, data)}
                ${data.details ? `<div class="details-box"><strong>Catatan / Detail:</strong><br>${data.details}</div>` : ''}
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} FinTap YPLP. Hak Cipta Dilindungi.</p>
                <p>Email ini dikirim otomatis oleh sistem. Mohon tidak membalas email ini.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get default message based on type.
   */
  private getDefaultMessage(type: string, data: Record<string, unknown>): string {
    const messages: Record<string, string> = {
      'attendance.late': 'Anda tercatat terlambat hari ini. Mohon untuk hadir tepat waktu.',
      'leave_request.created': 'Ada pengajuan izin/cuti baru yang memerlukan persetujuan Anda.',
      'leave_request.approved': 'Pengajuan izin/cuti Anda telah disetujui.',
      'leave_request.rejected': 'Pengajuan izin/cuti Anda ditolak.',
      'external_duty.created': 'Ada pengajuan dinas luar baru yang memerlukan persetujuan Anda.',
      'external_duty.approved': 'Pengajuan dinas luar Anda telah disetujui.',
      'external_duty.rejected': 'Pengajuan dinas luar Anda ditolak.',
      'activity.created': 'Ada kegiatan baru yang telah dijadwalkan. Silakan cek detail di aplikasi.',
      'holiday.tomorrow': `Besok adalah hari libur: <strong>${data.holiday_name || 'Hari Libur'}</strong>. Selamat beristirahat!`,
      'password.reset': `<p>Permintaan reset password telah kami terima. Link ini berlaku selama <strong>1 jam</strong> ke depan.</p>
<div style="text-align: center; margin: 32px 0;">
  <a href="${process.env.FRONTEND_URL || 'https://pa-fe.vercel.app'}/reset-password?token=${data.resetToken}&email=${data.email}" class="button">Reset Password Sekarang</a>
</div>
<p style="font-size: 14px; color: #64748b;">Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:</p>
<a href="${process.env.FRONTEND_URL || 'https://pa-fe.vercel.app'}/reset-password?token=${data.resetToken}&email=${data.email}" class="muted-link">${process.env.FRONTEND_URL || 'https://pa-fe.vercel.app'}/reset-password?token=${data.resetToken}&email=${data.email}</a>
<p style="margin-top: 24px; font-size: 14px; color: #64748b;">Jika Anda tidak merasa meminta reset password, mohon abaikan email ini. Akun Anda tetap aman.</p>`,
    };
    return messages[type] || 'Anda memiliki notifikasi baru dari FinTap.';
  }
}

export const mailService = new MailService();

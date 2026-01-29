/**
 * Email Service
 * Handles sending emails via configured provider
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.provider = process.env.EMAIL_SERVICE || 'smtp';
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      if (this.provider === 'smtp') {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else if (this.provider === 'sendgrid') {
        // SendGrid implementation
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendgrid = sgMail;
      }

      logger.info(`Email service initialized with provider: ${this.provider}`);
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  async send({ to, subject, body, html }) {
    try {
      if (this.provider === 'smtp' && this.transporter) {
        const result = await this.transporter.sendMail({
          from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
          to,
          subject,
          text: body,
          html: html || body
        });

        logger.info(`Email sent via SMTP to ${to}`);
        return { success: true, messageId: result.messageId };

      } else if (this.provider === 'sendgrid' && this.sendgrid) {
        const msg = {
          to,
          from: process.env.FROM_EMAIL,
          subject,
          text: body,
          html: html || body
        };

        await this.sendgrid.send(msg);
        logger.info(`Email sent via SendGrid to ${to}`);
        return { success: true };

      } else {
        throw new Error('Email service not configured');
      }
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Verify email service configuration
   */
  async verify() {
    try {
      if (this.provider === 'smtp' && this.transporter) {
        await this.transporter.verify();
        logger.info('SMTP connection verified');
        return true;
      }
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();

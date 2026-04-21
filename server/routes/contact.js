/* ==========================================================================
   Contact API Routes
   Handles form submission with validation, email notification, and
   in-memory data storage for development.
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// ── Rate Limiter for Contact Form ────────────────────────────────────────────
// Stricter limit: 5 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many contact submissions. Please try again in 15 minutes.',
  },
});

// ── In-Memory Storage (for development / demo) ──────────────────────────────
// In production, replace with a database (MongoDB, PostgreSQL, etc.)
const submissions = [];

// ── Email Transporter Configuration ──────────────────────────────────────────
// Uses environment variables for configuration
// Supports Gmail, Outlook, custom SMTP, or any Nodemailer-compatible service
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Verify connection
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️  Email transporter verification failed:', error.message);
      console.warn('   Contact form submissions will be stored but not emailed.');
    } else {
      console.log('✅ Email transporter is ready to send messages');
    }
  });
} else {
  console.log('ℹ️  Email not configured. Submissions will be stored in-memory only.');
  console.log('   Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env to enable email.');
}

// ── Validation Rules ─────────────────────────────────────────────────────────
const contactValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Please provide a valid phone number'),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isIn(['reservation', 'private-dining', 'catering', 'feedback', 'other'])
    .withMessage('Please select a valid subject'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .escape(),
];

// ── POST /api/contact ────────────────────────────────────────────────────────
// Receives contact form submissions
router.post(
  '/contact',
  contactLimiter,
  contactValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array().map((e) => ({
            field: e.path,
            message: e.msg,
          })),
        });
      }

      const { name, email, phone, subject, message } = req.body;

      // Create submission record
      const submission = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name,
        email,
        phone: phone || 'Not provided',
        subject,
        message,
        submittedAt: new Date().toISOString(),
        ip: req.ip,
      };

      // Store in memory
      submissions.push(submission);
      console.log(`📩 New contact submission from ${name} <${email}>`);

      // Send email notification if configured
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"Saffron & Sage Website" <${process.env.EMAIL_USER}>`,
            to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER,
            replyTo: email,
            subject: `[Contact Form] ${formatSubject(subject)} — from ${name}`,
            html: generateEmailHTML(submission),
            text: generateEmailText(submission),
          });
          console.log(`✅ Email notification sent for submission ${submission.id}`);
        } catch (emailError) {
          console.error('⚠️  Failed to send email:', emailError.message);
          // Don't fail the request — the data is already stored
        }
      }

      // Return success
      res.status(201).json({
        success: true,
        message: 'Thank you! Your message has been received. We will get back to you within 24 hours.',
        id: submission.id,
      });
    } catch (error) {
      console.error('Error processing contact form:', error);
      res.status(500).json({
        error: 'An unexpected error occurred. Please try again later.',
      });
    }
  }
);

// ── GET /api/submissions (Dev only) ──────────────────────────────────────────
// View stored submissions — only in development mode
router.get('/submissions', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  res.json({
    total: submissions.length,
    submissions: submissions.slice(-20).reverse(), // Last 20, newest first
  });
});

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Format subject value into a readable label
 */
function formatSubject(subject) {
  const labels = {
    reservation: 'Table Reservation',
    'private-dining': 'Private Dining',
    catering: 'Catering Inquiry',
    feedback: 'Feedback',
    other: 'General Inquiry',
  };
  return labels[subject] || subject;
}

/**
 * Generate HTML email body for notifications
 */
function generateEmailHTML(data) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #f5f0e8; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #d4a574, #b8844e); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 22px; color: #1a1a2e;">🍃 New Contact Submission</h1>
      </div>
      <div style="padding: 32px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: #8e8e93; width: 100px; vertical-align: top;">Name</td>
            <td style="padding: 12px 0; color: #f5f0e8; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #8e8e93; vertical-align: top;">Email</td>
            <td style="padding: 12px 0;"><a href="mailto:${data.email}" style="color: #d4a574;">${data.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #8e8e93; vertical-align: top;">Phone</td>
            <td style="padding: 12px 0; color: #f5f0e8;">${data.phone}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #8e8e93; vertical-align: top;">Subject</td>
            <td style="padding: 12px 0; color: #d4a574; font-weight: 600;">${formatSubject(data.subject)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #8e8e93; vertical-align: top;">Message</td>
            <td style="padding: 12px 0; color: #f5f0e8; line-height: 1.6;">${data.message}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
        <p style="font-size: 12px; color: #636366;">
          Submitted at ${new Date(data.submittedAt).toLocaleString()} • IP: ${data.ip}
        </p>
      </div>
    </div>
  `;
}

/**
 * Generate plain text email body (fallback)
 */
function generateEmailText(data) {
  return `
New Contact Form Submission — Saffron & Sage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:    ${data.name}
Email:   ${data.email}
Phone:   ${data.phone}
Subject: ${formatSubject(data.subject)}

Message:
${data.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted: ${data.submittedAt}
  `.trim();
}

module.exports = router;

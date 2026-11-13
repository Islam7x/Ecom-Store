const logger = require("./logger");

const fromAddress =
  process.env.MAIL_FROM || "Ecom Store <noreply@localhost>";

const sendMail = async ({ to, subject, text, html }) => {
  if (!to) return { skipped: true };

  if (process.env.SMTP_HOST) {
    try {
      // Optional production transport — keep the core bootable without SMTP.
      // eslint-disable-next-line global-require
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });

      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html,
      });
      return { sent: true };
    } catch (error) {
      logger.error("SMTP send failed", { error: error.message, to });
      throw error;
    }
  }

  logger.warn("Email delivery skipped because SMTP is not configured", {
    to,
    subject,
  });
  return { skipped: true };
};

module.exports = { sendMail };

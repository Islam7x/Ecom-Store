jest.mock("../lib/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const logger = require("../lib/logger");
const { sendMail } = require("../lib/mailer");

describe("Mailer", () => {
  test("does not include email contents in logs when SMTP is unavailable", async () => {
    const previousSmtpHost = process.env.SMTP_HOST;
    const token = "private-reset-token";
    process.env.SMTP_HOST = "";

    try {
      await expect(
        sendMail({
          to: "customer@example.com",
          subject: "Reset your password",
          text: `Reset token: ${token}`,
        }),
      ).resolves.toEqual({ skipped: true });

      expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(token);
    } finally {
      if (previousSmtpHost === undefined) {
        delete process.env.SMTP_HOST;
      } else {
        process.env.SMTP_HOST = previousSmtpHost;
      }
    }
  });
});

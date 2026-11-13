/**
 * Request Validation Logging Middleware
 * Logs all validation errors, invalid inputs, and suspicious patterns
 */

const logger = {
  logValidationError: (req, errors, source = "body") => {
    const timestamp = new Date().toISOString();
    const context = {
      timestamp,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.id || "anonymous",
      source,
      errorCount: errors.length,
    };

    console.error(`[VALIDATION_ERROR] ${JSON.stringify(context)}`);
    errors.forEach((error, index) => {
      console.error(`  [${index + 1}] ${error.field}: ${error.message}`);
    });
  },

  logValidationSuccess: (req, _source = "body") => {
    if (process.env.LOG_VALIDATION_SUCCESS === "true") {
      const timestamp = new Date().toISOString();
      console.log(
        `[VALIDATION_SUCCESS] ${timestamp} ${req.method} ${req.originalUrl} from ${req.ip}`,
      );
    }
  },

  logSuspiciousInput: (req, field, reason) => {
    const timestamp = new Date().toISOString();
    console.warn(
      `[SUSPICIOUS_INPUT] ${timestamp} Field: ${field}, Reason: ${reason}, User: ${req.user?.id || "anonymous"}, IP: ${req.ip}`,
    );
  },

  logValidationMetrics: (validationStats) => {
    if (process.env.LOG_VALIDATION_METRICS === "true") {
      const timestamp = new Date().toISOString();
      console.log(`[VALIDATION_METRICS] ${timestamp}:`, validationStats);
    }
  },
};

/**
 * Validation metrics collector
 */
class ValidationMetrics {
  constructor() {
    this.errors = 0;
    this.successes = 0;
    this.suspicious = 0;
    this.startTime = Date.now();
  }

  recordError() {
    this.errors++;
  }

  recordSuccess() {
    this.successes++;
  }

  recordSuspicious() {
    this.suspicious++;
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    return {
      uptime,
      totalValidations: this.errors + this.successes,
      errors: this.errors,
      successes: this.successes,
      suspicious: this.suspicious,
      errorRate: this.errors / (this.errors + this.successes) || 0,
    };
  }

  reset() {
    this.errors = 0;
    this.successes = 0;
    this.suspicious = 0;
  }
}

const metrics = new ValidationMetrics();

/**
 * Detect suspicious input patterns
 */
const detectSuspiciousPatterns = (obj, req) => {
  const suspiciousPatterns = [
    { regex: /<script|javascript:|on\w+=/i, reason: "XSS attempt" },
    {
      regex: /union.*select|select.*from|insert|delete|update|drop/i,
      reason: "SQL injection attempt",
    },
    {
      regex: /^\s*\{[\s\S]*\$where[\s\S]*\}|db\.(collection|eval)/i,
      reason: "NoSQL injection attempt",
    },
  ];

  // Fields to skip suspicious pattern checking (e.g., URLs can have $ characters)
  const skipFields = ["picture", "image", "url", "link", "avatar", "thumbnail"];

  for (const [key, value] of Object.entries(obj || {})) {
    if (typeof value !== "string") continue;

    // Skip URL fields from suspicious pattern checking
    if (skipFields.some((field) => key.toLowerCase().includes(field))) {
      continue;
    }

    for (const { regex, reason } of suspiciousPatterns) {
      if (regex.test(value)) {
        logger.logSuspiciousInput(req, key, reason);
        metrics.recordSuspicious();
        return true;
      }
    }
  }

  return false;
};

/**
 * Validation logging middleware wrapper
 */
const withValidationLogging = (schema, source = "body") => {
  return (req, res, next) => {
    // Check for suspicious patterns
    if (detectSuspiciousPatterns(req[source], req)) {
      return res.status(400).json({ message: "Invalid input detected" });
    }

    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
        type: d.type,
      }));

      logger.logValidationError(req, errors, source);
      metrics.recordError();

      const messages = errors.map((e) => e.message);
      return res.status(400).json({
        message: messages.join("; "),
        errors: process.env.NODE_ENV === "development" ? errors : undefined,
      });
    }

    logger.logValidationSuccess(req, source);
    metrics.recordSuccess();

    req[source] = value;
    next();
  };
};

/**
 * Health check endpoint for validation metrics
 */
const metricsEndpoint = (req, res) => {
  const stats = metrics.getStats();
  res.json({
    validation: stats,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Reset metrics
 */
const resetMetrics = () => {
  metrics.reset();
};

module.exports = {
  withValidationLogging,
  logger,
  metricsEndpoint,
  resetMetrics,
  detectSuspiciousPatterns,
};

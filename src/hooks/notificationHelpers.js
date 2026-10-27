/**
 * Map a notification context to a small helper API.
 */

export const createNotificationHelpers = (notificationContext) => {
  return {
    // Success notifications (green)
    success: (message, duration = 4000) => {
      notificationContext.success(message, duration);
    },

    // Error notifications (red)
    error: (message, duration = 5000) => {
      notificationContext.error(message, duration);
    },

    // Warning notifications (yellow)
    warning: (message, duration = 4000) => {
      notificationContext.warning(message, duration);
    },

    // Info notifications (blue)
    info: (message, duration = 4000) => {
      notificationContext.info(message, duration);
    },
  };
};

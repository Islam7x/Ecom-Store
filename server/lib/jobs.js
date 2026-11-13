const logger = require("./logger");
const { withJobLock } = require("./jobLock");
const { releaseExpiredReservations } = require("./orderLifecycle");

const RESERVATION_LOCK_MS = 4 * 60 * 1000;
const RESERVATION_TICK_MS = 60 * 1000;

let reservationTimer;

const runReservationSweep = () =>
  withJobLock("release-reservations", RESERVATION_LOCK_MS, () =>
    releaseExpiredReservations(),
  ).catch((error) => {
    logger.error("Reservation sweep failed", { error: error.message });
  });

const startBackgroundJobs = () => {
  if (reservationTimer) return () => stopBackgroundJobs();

  runReservationSweep();
  reservationTimer = setInterval(runReservationSweep, RESERVATION_TICK_MS);
  reservationTimer.unref();

  return stopBackgroundJobs;
};

const stopBackgroundJobs = () => {
  if (reservationTimer) {
    clearInterval(reservationTimer);
    reservationTimer = undefined;
  }
};

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
  runReservationSweep,
};

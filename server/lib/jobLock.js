const JobLock = require("../models/JobLock");

/**
 * Claim a named lock so only one process runs a periodic job.
 * Safe for multiple API instances; expired locks can be taken over.
 */
async function withJobLock(jobName, ttlMs, work) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);
  const owner = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`;

  let claimed = false;
  try {
    await JobLock.create({ _id: jobName, lockedUntil, owner });
    claimed = true;
  } catch (error) {
    if (error.code !== 11000) throw error;

    const stolen = await JobLock.findOneAndUpdate(
      { _id: jobName, lockedUntil: { $lte: now } },
      { $set: { lockedUntil, owner } },
      { returnDocument: "after" },
    );
    claimed = Boolean(stolen);
  }

  if (!claimed) {
    return { ran: false };
  }

  try {
    const result = await work();
    return { ran: true, result };
  } finally {
    await JobLock.updateOne(
      { _id: jobName, owner },
      { $set: { lockedUntil: new Date(0) } },
    );
  }
}

module.exports = { withJobLock };

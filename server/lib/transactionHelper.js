/**
 * Transaction Helper Utilities
 * Provides wrapper functions for MongoDB transactions with a safe fallback
 * when the deployment does not support replica-set transactions (e.g. standalone dev DB).
 */

const mongoose = require("mongoose");

const TRANSACTION_UNSUPPORTED =
  /retryable writes|Transaction numbers are only allowed|not support.*transaction/i;

/** Build Mongoose options that include session only when one is active */
const withSession = (session, extra = {}) =>
  session ? { ...extra, session } : extra;

/**
 * Execute a database operation within a transaction when supported.
 * Falls back to sequential execution without a transaction on standalone MongoDB.
 *
 * @param {Function} operation - Async function receiving `(session|null)`
 */
async function withTransaction(operation) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction().catch(() => {});

    if (TRANSACTION_UNSUPPORTED.test(error.message)) {
      console.warn(
        "[transaction] Replica set unavailable — executing without transaction",
      );
      return operation(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute multiple operations atomically when transactions are supported.
 * @param {Array<Function>} operations - Array of async functions receiving session
 */
async function withTransactionMultiple(operations) {
  return withTransaction(async (session) => {
    const results = [];
    for (const operation of operations) {
      results.push(await operation(session));
    }
    return results;
  });
}

module.exports = {
  withTransaction,
  withTransactionMultiple,
  withSession,
};

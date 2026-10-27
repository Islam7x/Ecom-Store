const DEFAULT_TAX_RATE = 0.08;

/**
 * Keep monetary values at two decimal places at every calculation boundary.
 * Prices are still returned as normal numbers so this remains API-compatible.
 */
const toMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getTaxRate = () => {
  const configuredRate = Number(process.env.TAX_RATE ?? DEFAULT_TAX_RATE);

  if (!Number.isFinite(configuredRate) || configuredRate < 0 || configuredRate > 1) {
    throw new Error("TAX_RATE must be a number between 0 and 1");
  }

  return configuredRate;
};

const calculateTax = (subtotal) => toMoney(toMoney(subtotal) * getTaxRate());

module.exports = {
  DEFAULT_TAX_RATE,
  toMoney,
  getTaxRate,
  calculateTax,
};

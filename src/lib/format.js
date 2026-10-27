const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatMoney = (value) => {
  const amount = Number(value);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
};

export const productId = (product) => product?._id ?? product?.id;

export const isRecentlyAdded = (product, days = 21) => {
  if (!product?.createdAt) return false;
  const created = new Date(product.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < days * 24 * 60 * 60 * 1000;
};

export const PLACEHOLDER_IMAGE = "/images/logo.svg";

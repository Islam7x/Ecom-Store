export const parseProductsResponse = (data) => {
  if (Array.isArray(data)) {
    return { products: data, page: 1, pages: 1, total: data.length };
  }

  if (data && Array.isArray(data.products)) {
    return {
      products: data.products,
      page: data.page || 1,
      pages: data.pages || 1,
      total: data.total ?? data.products.length,
    };
  }

  return { products: [], page: 1, pages: 1, total: 0 };
};

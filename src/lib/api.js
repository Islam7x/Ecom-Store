const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors)) {
      return data.errors.map((e) => e.message || e).join("; ");
    }
  } catch {
    // response body wasn't JSON
  }
  return `Request failed (${response.status})`;
};

const request = async (method, endpoint, { body, params, headers } = {}) => {
  const fullEndpoint = endpoint.startsWith("/api")
    ? endpoint
    : `/api${endpoint}`;
  let url = `${BASE_URL}${fullEndpoint}`;

  if (params) {
    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        urlObj.searchParams.append(key, value);
      }
    });
    url = urlObj.toString();
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { data, response };
};

export const API = {
  get: (endpoint, options = {}) => request("GET", endpoint, options),
  post: (endpoint, data = {}, options = {}) =>
    request("POST", endpoint, { ...options, body: data }),
  put: (endpoint, data = {}, options = {}) =>
    request("PUT", endpoint, { ...options, body: data }),
  delete: (endpoint, options = {}) => request("DELETE", endpoint, options),
};

export const BASE_API_URL = BASE_URL;

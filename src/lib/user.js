import { API } from "./api";

/**
 * Get the current authenticated user from localStorage
 * Returns null if no user is logged in
 */
export function getCurrentUser() {
  try {
    const userInfo = localStorage.getItem("userInfo");
    return userInfo ? JSON.parse(userInfo) : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

/**
 * Persist user info after a successful auth response
 */
export function setCurrentUser(user) {
  localStorage.setItem("userInfo", JSON.stringify(user));
  window.dispatchEvent(new Event("auth:changed"));
}

/**
 * Clear user data (logout)
 */
export async function clearUser() {
  try {
    await API.post("/auth/logout");
  } catch {
    // Cookie may already be gone; still clear local session.
  }
  localStorage.removeItem("userInfo");
  window.dispatchEvent(new Event("auth:changed"));
}

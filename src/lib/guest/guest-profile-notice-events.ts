export const CART_PROFILE_NOTICE_EVENT = "farm-stays-cart-profile-notice";
export const FAVORITES_PROFILE_NOTICE_EVENT = "farm-stays-favorites-profile-notice";
export const CART_PROFILE_NOTICE_CLEAR_EVENT = "farm-stays-cart-profile-notice-clear";
export const FAVORITES_PROFILE_NOTICE_CLEAR_EVENT = "farm-stays-favorites-profile-notice-clear";

export function pushCartProfileNotice(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_PROFILE_NOTICE_EVENT));
}

export function pushFavoritesProfileNotice(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITES_PROFILE_NOTICE_EVENT));
}

export function clearCartProfileNotice(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_PROFILE_NOTICE_CLEAR_EVENT));
}

export function clearFavoritesProfileNotice(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITES_PROFILE_NOTICE_CLEAR_EVENT));
}

export function clearAllProfileNotices(): void {
  clearCartProfileNotice();
  clearFavoritesProfileNotice();
}

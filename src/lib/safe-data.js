export const asArray = (value) => (Array.isArray(value) ? value : []);

export const hasValidId = (item) => item?.id !== undefined && item?.id !== null && String(item.id).trim() !== "";

export const idValue = (value) => String(value ?? "");

export const safeText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export const byDisplayOrder = (a, b) => Number(a?.display_order ?? 0) - Number(b?.display_order ?? 0);

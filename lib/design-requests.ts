export const DESIGN_REQUEST_STATUSES = [
  "submitted", "reviewing", "designing", "ready", "completed", "declined",
] as const;

export type DesignRequestStatus = (typeof DESIGN_REQUEST_STATUSES)[number];

export function isDesignRequestStatus(value: unknown): value is DesignRequestStatus {
  return DESIGN_REQUEST_STATUSES.includes(value as DesignRequestStatus);
}

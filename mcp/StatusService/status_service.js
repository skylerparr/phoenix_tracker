// Status constants and utilities
export const STATUS_UNSTARTED = 0;
export const STATUS_IN_PROGRESS = 1;
export const STATUS_COMPLETED = 2;
export const STATUS_REJECTED = 3;
export const STATUS_ACCEPTED = 4;
export const STATUS_DELIVERED = 5;

const STATUS_MAP = new Map([
  [STATUS_UNSTARTED, "Unstarted"],
  [STATUS_IN_PROGRESS, "In Progress"],
  [STATUS_COMPLETED, "Completed"],
  [STATUS_DELIVERED, "Delivered"],
  [STATUS_REJECTED, "Rejected"],
  [STATUS_ACCEPTED, "Accepted"],
]);

export function getStatusArray() {
  return Array.from(STATUS_MAP.entries()).map(([id, name]) => ({ id, name }));
}

export function getStatusMap() {
  return new Map(STATUS_MAP);
}

export function getUnfinishedStatuses() {
  return Array.from(STATUS_MAP.keys()).filter((id) => id !== 5);
}

export function getStatusIdByName(name) {
  for (const [id, statusName] of Array.from(STATUS_MAP.entries())) {
    if (statusName === name) {
      return id;
    }
  }
  return undefined;
}

export default {
  STATUS_UNSTARTED,
  STATUS_IN_PROGRESS,
  STATUS_COMPLETED,
  STATUS_REJECTED,
  STATUS_ACCEPTED,
  STATUS_DELIVERED,
  getStatusArray,
  getStatusMap,
  getUnfinishedStatuses,
  getStatusIdByName,
};
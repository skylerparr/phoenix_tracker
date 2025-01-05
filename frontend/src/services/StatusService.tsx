export interface Status {
  id: number;
  name: string;
}
export const STATUS_UNSTARTED = 0;
export const STATUS_IN_PROGRESS = 1;
export const STATUS_COMPLETED = 2;
export const STATUS_REJECTED = 3;
export const STATUS_ACCEPTED = 4;

const STATUS_MAP = new Map<number, string>([
  [STATUS_UNSTARTED, "Unstarted"],
  [STATUS_IN_PROGRESS, "In Progress"],
  [STATUS_COMPLETED, "Completed"],
  [STATUS_REJECTED, "Rejected"],
  [STATUS_ACCEPTED, "Accepted"],
]);
export const getStatusArray = (): Status[] => {
  return Array.from(STATUS_MAP.entries()).map(([id, name]) => ({
    id,
    name,
  }));
};

export const getStatusMap = (): Map<number, string> => {
  return new Map(STATUS_MAP);
};

export const getUnfinishedStatuses = (): number[] => {
  return Array.from(STATUS_MAP.keys()).filter((id) => id !== 5);
};

export const getStatusIdByName = (name: string): number | undefined => {
  for (const [id, statusName] of Array.from(STATUS_MAP.entries())) {
    if (statusName === name) {
      return id;
    }
  }
  return undefined;
};

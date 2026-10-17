import type { Status } from "./api";

/** The todo key factory, general → specific. (Provided; you don't need to edit this file.) */
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (status: Status) => [...todoKeys.lists(), { status }] as const,
  details: () => [...todoKeys.all, "detail"] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

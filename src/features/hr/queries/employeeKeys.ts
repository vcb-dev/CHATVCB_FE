export const employeeKeys = {
  all: ["employees"] as const,
  list: () => [...employeeKeys.all, "list"] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
};

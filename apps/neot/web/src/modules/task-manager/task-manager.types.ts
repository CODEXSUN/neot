export type TodoStatus = string;
export type TodoPriority = string;
export type TodoCategory = string;
export type Todo = {
  id: string;
  title: string;
  description: string;
  category: TodoCategory;
  groupName: string;
  projectId: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};
export type TodoInput = Partial<
  Pick<
    Todo,
    | "title"
    | "description"
    | "category"
    | "groupName"
    | "projectId"
    | "status"
    | "priority"
    | "dueDate"
  >
> & { title: string };
export type TodoLookupKind = "category" | "group" | "status" | "priority";
export type TodoLookup = {
  id: string;
  kind: TodoLookupKind;
  name: string;
  value: string;
  createdAt: string;
};

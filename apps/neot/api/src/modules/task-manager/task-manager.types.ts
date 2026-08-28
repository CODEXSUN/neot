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
export type TodoInput = {
  category?: TodoCategory | undefined;
  description?: string | undefined;
  dueDate?: string | undefined;
  groupName?: string | undefined;
  projectId?: string | undefined;
  priority?: TodoPriority | undefined;
  status?: TodoStatus | undefined;
  title: string;
};
export type TodoUpdateInput = {
  category?: TodoCategory | undefined;
  description?: string | undefined;
  dueDate?: string | undefined;
  groupName?: string | undefined;
  projectId?: string | undefined;
  priority?: TodoPriority | undefined;
  status?: TodoStatus | undefined;
  title?: string | undefined;
};
export type TodoLookupKind = "category" | "group" | "status" | "priority";
export type TodoLookup = {
  id: string;
  kind: TodoLookupKind;
  name: string;
  value: string;
  createdAt: string;
};

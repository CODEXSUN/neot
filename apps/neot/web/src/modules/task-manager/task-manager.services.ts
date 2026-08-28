import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/neot-api";
import type { Todo, TodoInput, TodoLookup, TodoLookupKind, TodoStatus } from "./task-manager.types";
export const listTodos = () => apiGet<Todo[]>("/task-manager/todos", "dev");
export const listTodoLookups = () => apiGet<TodoLookup[]>("/task-manager/lookups", "dev");
export const createTodoLookup = (kind: TodoLookupKind, name: string) =>
  apiPost<TodoLookup>("/task-manager/lookups", { kind, name }, "dev");
export const createTodo = (input: TodoInput) => apiPost<Todo>("/task-manager/todos", input, "dev");
export const reorderTodos = (orderedIds: string[]) =>
  apiPost<Todo[]>("/task-manager/todos/reorder", { orderedIds }, "dev");
export const updateTodo = (id: string, input: Partial<TodoInput>) =>
  apiPut<Todo>(`/task-manager/todos/${id}`, input, "dev");
export const setTodoStatus = (id: string, status: TodoStatus) =>
  apiPost<Todo>(`/task-manager/todos/${id}/status`, { status }, "dev");
export const deleteTodo = (id: string) =>
  apiDelete<{ id: string; deleted: boolean }>(`/task-manager/todos/${id}`, "dev");

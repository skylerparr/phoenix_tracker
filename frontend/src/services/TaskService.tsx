import { BaseService } from "./base/BaseService";
import { Task } from "../models/Task";

interface CreateTaskRequest {
  title: string;
  issueId: number;
  completed: boolean;
  percent: number;
}

interface UpdateTaskRequest {
  title?: string;
  completed?: boolean;
  percent?: number;
}

export class TaskService extends BaseService<Task> {
  constructor() {
    super("/tasks");
  }

  protected createInstance(data: any): Task {
    return new Task(data);
  }

  async createTask(request: CreateTaskRequest): Promise<Task> {
    return this.post<Task>("", request);
  }

  async getTaskById(id: number): Promise<Task> {
    return this.get<Task>(`/${id}`);
  }

  async getTasksByIssue(issueId: number): Promise<Task[]> {
    return this.get<Task[]>(`/issue/${issueId}`);
  }

  async updateTask(id: number, request: UpdateTaskRequest): Promise<Task> {
    return this.put<Task>(`/${id}`, request);
  }

  async deleteTask(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }
}

export const taskService = new TaskService();

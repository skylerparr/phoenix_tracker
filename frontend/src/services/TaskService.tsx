import { API_BASE_URL } from "../config/ApiConfig";
import { Task } from "../models/Task";
import { sessionStorage } from "../store/Session";

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

export class TaskService {
  private baseUrl = `${API_BASE_URL}/tasks`;

  async createTask(request: CreateTaskRequest): Promise<Task> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create task");
    const data = await response.json();
    return new Task(data);
  }

  async getTaskById(id: number): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch task");
    const data = await response.json();
    return new Task(data);
  }

  async getTasksByIssue(issueId: number): Promise<Task[]> {
    const response = await fetch(`${this.baseUrl}/issue/${issueId}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch tasks by issue");
    const data = await response.json();
    return data.map((taskData: any) => new Task(taskData));
  }

  async updateTask(id: number, request: UpdateTaskRequest): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update task");
    const data = await response.json();
    return new Task(data);
  }

  async deleteTask(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete task");
  }
}

export const taskService = new TaskService();

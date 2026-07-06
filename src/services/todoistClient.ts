import { TodoistApi } from "@doist/todoist-api-typescript";

export const TODOIST_API_BASE = "https://api.todoist.com/rest/v2";

export interface SmokeTestResult {
  ok: boolean;
  provider: "sdk" | "sync" | "rest" | "none";
  tested: string[];
  workingMethod: string;
  failedMethods: { method: string; error: string }[];
  tokenLoaded: boolean;
  tokenSource: string;
  error: string | null;
}

/**
 * Checks in real time which API endpoint / SDK method actually works with the given token.
 */
export async function todoistSmokeTest(token: string): Promise<SmokeTestResult> {
  const tested: string[] = [];
  const failedMethods: { method: string; error: string }[] = [];
  let workingMethod = "";
  let provider: "sdk" | "sync" | "rest" | "none" = "none";
  let ok = false;
  let error: string | null = null;

  const tokenLoaded = !!token && token !== "env_secret";
  const tokenSource = token && token !== "env_secret" ? "SECRET" : "AUSENTE";

  if (!tokenLoaded) {
    return {
      ok: false,
      provider: "none",
      tested: [],
      workingMethod: "none",
      failedMethods: [],
      tokenLoaded: false,
      tokenSource,
      error: "Chave API do Todoist (TODOIST_API_KEY) ausente ou inválida."
    };
  }

  // 1. Try REST API v2 (Standard fallback base URL)
  tested.push("rest_v2_projects");
  try {
    const res = await fetch(`${TODOIST_API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      ok = true;
      provider = "rest";
      workingMethod = "rest_v2_projects";
    } else {
      const text = await res.text();
      failedMethods.push({ method: "rest_v2_projects", error: `HTTP ${res.status}: ${text || res.statusText}` });
    }
  } catch (err: any) {
    failedMethods.push({ method: "rest_v2_projects", error: err.message || String(err) });
  }

  // 2. Try SDK (If not already succeeded, or to check if SDK v2 works)
  if (!ok) {
    tested.push("sdk_get_projects");
    try {
      const api = new TodoistApi(token);
      await api.getProjects();
      ok = true;
      provider = "sdk";
      workingMethod = "sdk_get_projects";
    } catch (err: any) {
      failedMethods.push({ method: "sdk_get_projects", error: err.message || String(err) });
    }
  }

  // 3. Try Sync API v9 (As alternative if needed)
  if (!ok) {
    tested.push("sync_v9_api");
    try {
      const res = await fetch("https://api.todoist.com/sync/v9/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resource_types: ["projects"],
          sync_token: "*"
        })
      });
      if (res.ok) {
        ok = true;
        provider = "sync";
        workingMethod = "sync_v9_api";
      } else {
        const text = await res.text();
        failedMethods.push({ method: "sync_v9_api", error: `HTTP ${res.status}: ${text || res.statusText}` });
      }
    } catch (err: any) {
      failedMethods.push({ method: "sync_v9_api", error: err.message || String(err) });
    }
  }

  if (!ok) {
    error = `Todos os métodos de conexão falharam. Detalhes: ${JSON.stringify(failedMethods)}`;
  }

  return {
    ok,
    provider,
    tested,
    workingMethod,
    failedMethods,
    tokenLoaded,
    tokenSource,
    error
  };
}

/**
 * Universal helper to execute Todoist API operations based on the active provider.
 */
export async function callTodoistAPI(
  token: string,
  provider: "sdk" | "sync" | "rest",
  endpoint: string, // relative to base (e.g. '/tasks' or '/projects')
  options: {
    method?: string;
    body?: any;
    query?: Record<string, any>;
  } = {}
): Promise<any> {
  const method = options.method || "GET";
  
  // The Sync API does not support standard REST endpoints (like /tasks, /projects, etc.).
  // Therefore, we must always use the REST API v2 base URL for all REST resource endpoints.
  const useBase = TODOIST_API_BASE;
  
  let url = `${useBase}${endpoint}`;
  if (options.query) {
    const params = new URLSearchParams();
    Object.entries(options.query).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        params.append(key, String(val));
      }
    });
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Todoist API Error (${res.status}): ${text || res.statusText} on ${method} ${endpoint}`);
  }

  if (res.status === 204) {
    return { success: true };
  }

  return await res.json();
}

// Wrapper utility methods to interact with Todoist
export const todoistClient = {
  getProjects: (token: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/projects"),

  getProjectCollaborators: (token: string, projectId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/projects/${projectId}/collaborators`),

  getSections: (token: string, projectId: string | undefined, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/sections", { query: projectId ? { project_id: projectId } : {} }),

  getLabels: (token: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/labels"),

  getTasks: (token: string, queryParams: Record<string, any> = {}, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/tasks", { query: queryParams }),

  getTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/tasks/${taskId}`),

  createTask: (token: string, taskData: any, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/tasks", { method: "POST", body: taskData }),

  updateTask: (token: string, taskId: string, taskData: any, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/tasks/${taskId}`, { method: "POST", body: taskData }),

  deleteTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/tasks/${taskId}`, { method: "DELETE" }),

  closeTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/tasks/${taskId}/close`, { method: "POST" }),

  reopenTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/tasks/${taskId}/reopen`, { method: "POST" }),

  getComments: (token: string, params: { task_id?: string; project_id?: string }, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/comments", { query: params }),

  createComment: (token: string, commentData: any, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/comments", { method: "POST", body: commentData }),

  deleteComment: (token: string, commentId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, `/comments/${commentId}`, { method: "DELETE" })
};

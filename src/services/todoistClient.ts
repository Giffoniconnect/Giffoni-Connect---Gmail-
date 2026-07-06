import { TodoistApi } from "@doist/todoist-api-typescript";
// Note: the v7 TodoistApi client maps filter correctly, and we intercept it when bypassing.


export const TODOIST_API_BASE = "https://api.todoist.com/api/v1";

export interface SmokeTestResult {
  testedMethods: {
    name: string;
    url?: string;
    status: string;
    ok: boolean;
    rawResponse: string;
  }[];
  selectedProvider: "sdk" | "sync" | "rest" | "none";
  reason: string;
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
      testedMethods: [],
      selectedProvider: "none",
      reason: "Chave API do Todoist ausente ou inválida.",
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

  const testedMethods: SmokeTestResult["testedMethods"] = [];

  // 1. Try SDK First (Priority A)
  tested.push("sdk_get_projects");
  try {
    const api = new TodoistApi(token);
    await api.getProjects();
    ok = true;
    provider = "sdk";
    workingMethod = "sdk_get_projects";
    testedMethods.push({
      name: "sdk_get_projects",
      status: "200",
      ok: true,
      rawResponse: "SDK OK"
    });
  } catch (err: any) {
    failedMethods.push({ method: "sdk_get_projects", error: err.message || String(err) });
    testedMethods.push({
      name: "sdk_get_projects",
      status: "ERROR",
      ok: false,
      rawResponse: err.message || String(err)
    });
  }

  // 2. Try REST API v1 (Priority B)
  if (!ok) {
    tested.push("rest_v1_projects");
    try {
      const url = `${TODOIST_API_BASE}/projects`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      testedMethods.push({
        name: "rest_v1_projects",
        url,
        status: String(res.status),
        ok: res.ok,
        rawResponse: text.substring(0, 100)
      });
      if (res.ok) {
        ok = true;
        provider = "rest";
        workingMethod = "rest_v1_projects";
      } else {
        failedMethods.push({ method: "rest_v1_projects", error: `HTTP ${res.status}: ${text}` });
      }
    } catch (err: any) {
      failedMethods.push({ method: "rest_v1_projects", error: err.message || String(err) });
      testedMethods.push({
        name: "rest_v1_projects",
        url: `${TODOIST_API_BASE}/projects`,
        status: "ERROR",
        ok: false,
        rawResponse: err.message || String(err)
      });
    }
  }

  // 3. Try Sync API v9 (Priority C - But likely 410)
  if (!ok) {
    tested.push("sync_v9_api");
    try {
      const res = await fetch("https://api.todoist.com/sync/v9/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resource_types: ["projects"], sync_token: "*" })
      });
      const text = await res.text();
      testedMethods.push({
        name: "sync_v9_api",
        url: "https://api.todoist.com/sync/v9/sync",
        status: String(res.status),
        ok: res.ok,
        rawResponse: text.substring(0, 100)
      });
      if (res.ok) {
        ok = true;
        provider = "sync";
        workingMethod = "sync_v9_api";
      } else {
        failedMethods.push({ method: "sync_v9_api", error: `HTTP ${res.status}: ${text}` });
      }
    } catch (err: any) {
      failedMethods.push({ method: "sync_v9_api", error: err.message || String(err) });
      testedMethods.push({
        name: "sync_v9_api",
        url: "https://api.todoist.com/sync/v9/sync",
        status: "ERROR",
        ok: false,
        rawResponse: err.message || String(err)
      });
    }
  }

  if (!ok) {
    error = `Todos os métodos falharam. Detalhes: ${JSON.stringify(failedMethods)}`;
  }

  return {
    testedMethods,
    selectedProvider: provider,
    reason: ok ? `Successfully connected via ${provider}` : "All methods failed",
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

  const data = await res.json();
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return data;
}

// Wrapper utility methods to interact with Todoist
export const todoistClient = {
  getProjects: async (token: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      const res = await api.getProjects() as any;
      return res.results || res;
    }
    return callTodoistAPI(token, provider, "/projects");
  },

  getProjectCollaborators: async (token: string, projectId: string, provider: "sdk" | "sync" | "rest") => {
    return callTodoistAPI(token, provider, `/projects/${projectId}/collaborators`);
  },

  getSections: async (token: string, projectId: string | undefined, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      const res = await api.getSections(projectId ? { projectId } : undefined) as any;
      return res.results || res;
    }
    return callTodoistAPI(token, provider, "/sections", { query: projectId ? { project_id: projectId } : {} });
  },

  getLabels: async (token: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      const res = await api.getLabels() as any;
      return res.results || res;
    }
    return callTodoistAPI(token, provider, "/labels");
  },

  getTasks: async (token: string, queryParams: Record<string, any> = {}, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      const mappedArgs: any = {};
      if (queryParams.project_id) mappedArgs.projectId = queryParams.project_id;
      if (queryParams.section_id) mappedArgs.sectionId = queryParams.section_id;
      if (queryParams.label_id) mappedArgs.labelId = queryParams.label_id;
      if (queryParams.filter) mappedArgs.filter = queryParams.filter;
      if (queryParams.lang) mappedArgs.lang = queryParams.lang;
      const res = await api.getTasks(mappedArgs) as any;
      return res.results || res;
    }
    return callTodoistAPI(token, provider, "/tasks", { query: queryParams });
  },

  getTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.getTask(taskId);
    }
    return callTodoistAPI(token, provider, `/tasks/${taskId}`);
  },

  createTask: async (token: string, taskData: any, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.addTask(taskData);
    }
    return callTodoistAPI(token, provider, "/tasks", { method: "POST", body: taskData });
  },

  updateTask: async (token: string, taskId: string, taskData: any, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.updateTask(taskId, taskData);
    }
    return callTodoistAPI(token, provider, `/tasks/${taskId}`, { method: "POST", body: taskData });
  },

  deleteTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.deleteTask(taskId);
    }
    return callTodoistAPI(token, provider, `/tasks/${taskId}`, { method: "DELETE" });
  },

  closeTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.closeTask(taskId);
    }
    return callTodoistAPI(token, provider, `/tasks/${taskId}/close`, { method: "POST" });
  },

  reopenTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.reopenTask(taskId);
    }
    return callTodoistAPI(token, provider, `/tasks/${taskId}/reopen`, { method: "POST" });
  },

  getComments: async (token: string, params: { task_id?: string; project_id?: string }, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      const res = await api.getComments({ taskId: params.task_id, projectId: params.project_id } as any) as any;
      return res.results || res;
    }
    return callTodoistAPI(token, provider, "/comments", { query: params });
  },

  createComment: async (token: string, commentData: any, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.addComment(commentData);
    }
    return callTodoistAPI(token, provider, "/comments", { method: "POST", body: commentData });
  },

  deleteComment: async (token: string, commentId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.deleteComment(commentId);
    }
    return callTodoistAPI(token, provider, `/comments/${commentId}`, { method: "DELETE" });
  }
};

import fs from 'fs';

let content = fs.readFileSync('src/services/todoistClient.ts', 'utf8');

const target = `export const todoistClient = {
  getProjects: (token: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/projects"),

  getProjectCollaborators: (token: string, projectId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/projects/\${projectId}/collaborators\`),

  getSections: (token: string, projectId: string | undefined, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/sections", { query: projectId ? { project_id: projectId } : {} }),

  getLabels: (token: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/labels"),

  getTasks: (token: string, queryParams: Record<string, any> = {}, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/tasks", { query: queryParams }),

  getTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/tasks/\${taskId}\`),

  createTask: (token: string, taskData: any, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/tasks", { method: "POST", body: taskData }),

  updateTask: (token: string, taskId: string, taskData: any, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/tasks/\${taskId}\`, { method: "POST", body: taskData }),

  deleteTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/tasks/\${taskId}\`, { method: "DELETE" }),

  closeTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/tasks/\${taskId}/close\`, { method: "POST" }),

  reopenTask: (token: string, taskId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/tasks/\${taskId}/reopen\`, { method: "POST" }),

  getComments: (token: string, params: { task_id?: string; project_id?: string }, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/comments", { query: params }),

  createComment: (token: string, commentData: any, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, "/comments", { method: "POST", body: commentData }),

  deleteComment: (token: string, commentId: string, provider: "sdk" | "sync" | "rest") =>
    callTodoistAPI(token, provider, \`/comments/\${commentId}\`, { method: "DELETE" })
};`;

const replacement = `export const todoistClient = {
  getProjects: async (token: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      const res = await api.getProjects() as any;
      return res.results || res;
    }
    return callTodoistAPI(token, provider, "/projects");
  },

  getProjectCollaborators: async (token: string, projectId: string, provider: "sdk" | "sync" | "rest") => {
    return callTodoistAPI(token, provider, \`/projects/\${projectId}/collaborators\`);
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
    return callTodoistAPI(token, provider, \`/tasks/\${taskId}\`);
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
    return callTodoistAPI(token, provider, \`/tasks/\${taskId}\`, { method: "POST", body: taskData });
  },

  deleteTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.deleteTask(taskId);
    }
    return callTodoistAPI(token, provider, \`/tasks/\${taskId}\`, { method: "DELETE" });
  },

  closeTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.closeTask(taskId);
    }
    return callTodoistAPI(token, provider, \`/tasks/\${taskId}/close\`, { method: "POST" });
  },

  reopenTask: async (token: string, taskId: string, provider: "sdk" | "sync" | "rest") => {
    if (provider === "sdk") {
      const api = new TodoistApi(token);
      return api.reopenTask(taskId);
    }
    return callTodoistAPI(token, provider, \`/tasks/\${taskId}/reopen\`, { method: "POST" });
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
    return callTodoistAPI(token, provider, \`/comments/\${commentId}\`, { method: "DELETE" });
  }
};`;

content = content.replace(target, replacement);
fs.writeFileSync('src/services/todoistClient.ts', content);

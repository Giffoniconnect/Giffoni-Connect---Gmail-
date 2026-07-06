import { TodoistApi } from "@doist/todoist-api-typescript";
const api = new TodoistApi(process.env.TODOIST_API_KEY || "fake_token");
api.getProjects().then(projects => console.log("Projects:", Array.isArray(projects) ? "Array" : Object.keys(projects))).catch(console.error);

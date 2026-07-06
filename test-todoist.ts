import { TodoistApi } from "@doist/todoist-api-typescript";
const api = new TodoistApi(process.env.TODOIST_API_KEY || "fake_token");
api.getProjects().then(console.log).catch(console.error);

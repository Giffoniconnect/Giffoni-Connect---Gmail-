import { TodoistApi } from "@doist/todoist-api-typescript";
const api = new TodoistApi(process.env.TODOIST_API_KEY || "fake_token");
api.getTasks().then(tasks => console.log("SDK tasks:", tasks.length, Array.isArray(tasks))).catch(console.error);

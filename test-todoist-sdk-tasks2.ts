import { TodoistApi } from "@doist/todoist-api-typescript";
const api = new TodoistApi(process.env.TODOIST_API_KEY || "fake_token");
api.getTasks().then(tasks => console.log(Object.keys(tasks))).catch(console.error);

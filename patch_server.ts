import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `    let allTasks: any[] = [];
    try {
      const res = await todoistClient.getTasks(req.todoistToken, {}, provider);
      allTasks = Array.isArray(res) ? res : [];
    } catch (err: any) {
      console.error("Erro ao carregar tarefas do Todoist:", err);
    }`;

const replacement = `    let allTasks: any[] = [];
    try {
      const res = await todoistClient.getTasks(req.todoistToken, {}, provider);
      allTasks = Array.isArray(res) ? res : [];
    } catch (err: any) {
      console.error("Erro ao carregar tarefas do Todoist:", err);
      return res.status(200).json({ // We return 200 so UI can parse the custom error object, or maybe 500? UI expects success:false? No, if we return success:false it should probably be 200 with object, or UI handles 500 if we send it... Wait, the instructions say "Se o Todoist falhar, retornar: { success: false, errorType: 'TODOIST_CONNECTION_ERROR', ... }"
        success: false,
        errorType: "TODOIST_CONNECTION_ERROR",
        chosenTask: null,
        tasks: [],
        provider,
        endpoint: "/tasks",
        status: err.status || 410,
        rawError: err.message || String(err)
      });
    }`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);

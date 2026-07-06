import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const targetTasks = `  try {
    const provider = await getWorkingProvider(req.todoistToken);
    const data = await todoistClient.getTasks(req.todoistToken, { project_id }, provider);
    const allTasksRaw = Array.isArray(data) ? data : [];`;

const replacementTasks = `  try {
    const provider = await getWorkingProvider(req.todoistToken);
    
    const safeToken = req.todoistToken.length > 8 
      ? req.todoistToken.substring(0, 4) + "************************************"
      : "AUSENTE_OU_CURTO";
      
    console.log("[TODOIST] tokenLoaded: true");
    console.log("[TODOIST] tokenSource: SECRET");
    console.log("[TODOIST] providerSelected:", provider);
    console.log("[TODOIST] endpointCalled: /tasks");
    console.log("[TODOIST] searchTerm:", filter || "none");
    console.log("[TODOIST] tokenMasked: Bearer", safeToken);

    const data = await todoistClient.getTasks(req.todoistToken, { project_id }, provider);
    const allTasksRaw = Array.isArray(data) ? data : [];
    
    console.log("[TODOIST] httpStatus: 200");
    console.log("[TODOIST] tasksReturned:", allTasksRaw.length);`;

content = content.replace(targetTasks, replacementTasks);
fs.writeFileSync('server.ts', content);

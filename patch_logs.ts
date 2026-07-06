import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const targetSearchAll = `  try {
    const provider = await getWorkingProvider(req.todoistToken);

    // Fetch all active tasks directly`;

const replacementSearchAll = `  try {
    const provider = await getWorkingProvider(req.todoistToken);

    const safeToken = req.todoistToken.length > 8 
      ? req.todoistToken.substring(0, 4) + "************************************"
      : "AUSENTE_OU_CURTO";

    console.log("[TODOIST] tokenLoaded: true");
    console.log("[TODOIST] tokenSource: SECRET");
    console.log("[TODOIST] providerSelected:", provider);
    console.log("[TODOIST] endpointCalled: /search-all");
    console.log("[TODOIST] searchTerm:", matchCnjMasked);
    console.log("[TODOIST] tokenMasked: Bearer", safeToken);

    // Fetch all active tasks directly`;

content = content.replace(targetSearchAll, replacementSearchAll);
fs.writeFileSync('server.ts', content);

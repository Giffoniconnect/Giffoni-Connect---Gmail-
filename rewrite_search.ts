import fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');

const searchAllStart = serverTs.indexOf('app.all("/api/todoist/search-all"');
if (searchAllStart === -1) throw new Error("Could not find start");

const searchAllEndRegex = /\n\}\);\napp\.get\("\/api\/todoist\/tasks"/;
const match = searchAllEndRegex.exec(serverTs.substring(searchAllStart));
if (!match) throw new Error("Could not find end");

const searchAllEnd = searchAllStart + match.index + 4; // up to "});\n"

const newSearchAll = `app.all("/api/todoist/search-all", async (req: any, res) => {
  if (!req.todoistToken) {
    return res.status(401).json({ 
      success: false, 
      found: false,
      result: "connection_error",
      errorType: "TODOIST_CONNECTION_ERROR",
      message: "Token do Todoist ausente na requisição.",
      tasksRetrieved: 0,
      tasksProcessed: 0,
      chosenTask: null,
      mirrorReady: false
    });
  }

  const params = req.method === "POST" ? req.body : req.query;
  const cnj = String(params.cnj || params.query || "").trim();
  const autor = String(params.autor || "").trim();
  const reu = String(params.reu || "").trim();
  const tribunal = String(params.tribunal || "").trim();
  const assunto = String(params.assunto || "").trim();
  
  function normalizeText(txt: string) {
    if (!txt) return "";
    return txt.toLowerCase()
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function normalizeCNJ(c: string) {
    return c.replace(/[^0-9]/g, "");
  }

  const normalizedCNJ = normalizeCNJ(cnj);
  const cnjMasked = normalizedCNJ.length === 20 
    ? \`\${normalizedCNJ.substring(0, 7)}-\${normalizedCNJ.substring(7, 9)}.\${normalizedCNJ.substring(9, 13)}.\${normalizedCNJ.substring(13, 14)}.\${normalizedCNJ.substring(14, 16)}.\${normalizedCNJ.substring(16, 20)}\`
    : cnj;

  const autorNorm = normalizeText(autor);
  const reuNorm = normalizeText(reu);
  const assuntoNorm = normalizeText(assunto);

  try {
    const provider = await getWorkingProvider(req.todoistToken);
    
    console.log("[TODOIST MIRROR] rawFilter: search:" + cnj);
    console.log("[TODOIST MIRROR] normalizedCNJ: " + normalizedCNJ);
    console.log("[TODOIST MIRROR] endpointUsed: /api/todoist/search-all");
    console.log("[TODOIST MIRROR] provider:", provider);
    
    let pagesProcessed = 0;
    let tasksRetrieved = 0;
    let tasksProcessed = 0;
    let commentsChecked = 0;
    let subtasksChecked = 0;
    let candidatesFound = 0;
    
    let allTasks: any[] = [];
    let hasMorePages = true;
    let cursor: string | undefined = undefined;

    while (hasMorePages && pagesProcessed < 10) {
      pagesProcessed++;
      const queryParams: any = {};
      if (cursor) queryParams.cursor = cursor;
      else if (pagesProcessed > 1) queryParams.page_token = cursor; // format flexibility
      
      const resRaw = await todoistClient.getTasks(req.todoistToken, queryParams, provider);
      
      let tasksArray: any[] = [];
      let nextCursor: string | undefined = undefined;

      if (Array.isArray(resRaw)) {
        tasksArray = resRaw;
        console.log("[TODOIST MIRROR] responseShape: array");
      } else if (resRaw && Array.isArray(resRaw.results)) {
        tasksArray = resRaw.results;
        nextCursor = resRaw.next_cursor || resRaw.sync_token;
        console.log("[TODOIST MIRROR] responseShape: results");
      } else if (resRaw && Array.isArray(resRaw.tasks)) {
        tasksArray = resRaw.tasks;
        nextCursor = resRaw.next_cursor;
        console.log("[TODOIST MIRROR] responseShape: tasks");
      } else if (resRaw && Array.isArray(resRaw.items)) {
        tasksArray = resRaw.items;
        nextCursor = resRaw.next_page_token || resRaw.sync_token;
        console.log("[TODOIST MIRROR] responseShape: items");
      } else {
        console.log("[TODOIST MIRROR] responseShape: unknown");
        if (resRaw && typeof resRaw === 'object') {
           const possibleArray = Object.values(resRaw).find(Array.isArray);
           if (possibleArray) tasksArray = possibleArray as any[];
        }
      }

      tasksRetrieved += tasksArray.length;
      allTasks = allTasks.concat(tasksArray);
      
      if (!nextCursor || tasksArray.length === 0) {
        hasMorePages = false;
      } else {
        cursor = nextCursor;
      }
    }

    console.log("[TODOIST MIRROR] externalHttpStatus: 200");

    const activeTasks = allTasks.filter(t => !t.is_completed);
    const subtasksMap = new Map<string, string>(); // subtaskId -> parentId
    
    activeTasks.forEach(t => {
      if (t.parent_id) {
        subtasksMap.set(t.id, t.parent_id);
      }
    });

    const candidates = [];

    // Evaluate all tasks
    for (const task of activeTasks) {
      tasksProcessed++;
      const contentNorm = normalizeText(task.content);
      const descNorm = normalizeText(task.description);
      
      let score = 0;
      let matched = false;
      
      // CNJ matching
      if (normalizedCNJ) {
        if (task.content.includes(cnjMasked)) { score += 250; matched = true; }
        else if (contentNorm.includes(normalizedCNJ)) { score += 240; matched = true; }
        
        if (task.description && task.description.includes(cnjMasked)) { score += 220; matched = true; }
        else if (descNorm.includes(normalizedCNJ)) { score += 220; matched = true; }
      }
      
      // Author / Reu matching
      if (autorNorm && contentNorm.includes(autorNorm)) { score += 100; matched = true; }
      if (reuNorm && contentNorm.includes(reuNorm)) { score += 100; matched = true; }
      if (autorNorm && descNorm.includes(autorNorm)) { score += 70; matched = true; }
      if (reuNorm && descNorm.includes(reuNorm)) { score += 70; matched = true; }
      
      // Keywords
      if (contentNorm.includes("controladoria") || descNorm.includes("controladoria")) score += 30;
      if (contentNorm.includes("trabalhista") || descNorm.includes("trabalhista")) score += 30;

      if (matched || (contentNorm.includes("processo") || contentNorm.includes("audiencia") || contentNorm.includes("prazo"))) {
         // fetch comments for this task
         commentsChecked++;
         try {
           const comments = await todoistClient.getComments(req.todoistToken, { task_id: task.id }, provider);
           if (Array.isArray(comments)) {
             for (const c of comments) {
               const cNorm = normalizeText(c.content);
               if (normalizedCNJ && (c.content.includes(cnjMasked) || cNorm.includes(normalizedCNJ))) {
                 score += 200;
                 matched = true;
               }
             }
           }
         } catch(e) {}
      }

      // Check if it's a subtask that matched
      if (matched) {
        let finalTaskId = task.id;
        if (task.parent_id) {
          score += 190;
          subtasksChecked++;
          // if subtask matched, elevate match to parent
          finalTaskId = task.parent_id;
        }
        
        candidates.push({
          task: task.parent_id ? activeTasks.find(t => t.id === task.parent_id) || task : task,
          score
        });
      }
    }

    if (tasksRetrieved > 0 && tasksProcessed === 0) {
      console.log("[TODOIST MIRROR] PROCESSING CONTRACT ERROR: Tarefas foram recebidas, mas não foram entregues ao mecanismo de ranqueamento.");
      return res.json({
        success: false,
        found: false,
        result: "processing_error",
        provider,
        searchedCNJ: cnjMasked,
        normalizedCNJ,
        tasksRetrieved,
        tasksProcessed,
        pagesProcessed,
        commentsChecked,
        subtasksChecked,
        candidates: [],
        chosenTask: null,
        chosenTaskScore: null,
        confidence: "none",
        mirrorReady: false,
        reason: "Tarefas recebidas da API mas falha no mecanismo de processamento."
      });
    }

    candidatesFound = candidates.length;

    // Rank candidates
    candidates.sort((a, b) => b.score - a.score);
    
    let chosenTask = null;
    let chosenTaskScore = null;
    let result = "not_found";
    let confidence = "none";
    let mirrorReady = false;
    let finalCandidates = [];

    if (candidates.length > 0) {
      const topScore = candidates[0].score;
      const topCandidates = candidates.filter(c => c.score === topScore);
      
      // Deduplicate candidates
      const uniqueCandidates = new Map();
      candidates.forEach(c => {
         if (!uniqueCandidates.has(c.task.id)) {
            uniqueCandidates.set(c.task.id, c);
         } else if (c.score > uniqueCandidates.get(c.task.id).score) {
            uniqueCandidates.set(c.task.id, c);
         }
      });
      finalCandidates = Array.from(uniqueCandidates.values()).sort((a:any, b:any) => b.score - a.score);

      const topUnique = finalCandidates.filter((c:any) => c.score === finalCandidates[0].score);

      if (topUnique.length > 1) {
        result = "ambiguous_match";
        confidence = "medium";
      } else {
        chosenTask = topUnique[0].task;
        chosenTaskScore = topUnique[0].score;
        result = "found";
        confidence = "high";
        mirrorReady = true;
      }
    }

    console.log("[TODOIST MIRROR] pagesProcessed: " + pagesProcessed);
    console.log("[TODOIST MIRROR] tasksRetrieved: " + tasksRetrieved);
    console.log("[TODOIST MIRROR] tasksProcessed: " + tasksProcessed);
    console.log("[TODOIST MIRROR] commentsChecked: " + commentsChecked);
    console.log("[TODOIST MIRROR] subtasksChecked: " + subtasksChecked);
    console.log("[TODOIST MIRROR] candidatesFound: " + finalCandidates.length);
    console.log("[TODOIST MIRROR] chosenTaskId: " + (chosenTask ? chosenTask.id : "null"));
    console.log("[TODOIST MIRROR] chosenTaskScore: " + (chosenTaskScore !== null ? chosenTaskScore : "N/A"));
    console.log("[TODOIST MIRROR] finalResult: " + result);

    return res.json({
      success: true,
      found: !!chosenTask,
      result,
      provider,
      searchedCNJ: cnjMasked,
      normalizedCNJ,
      tasksRetrieved,
      tasksProcessed,
      pagesProcessed,
      commentsChecked,
      subtasksChecked,
      candidates: finalCandidates.map((c:any) => c.task),
      chosenTask,
      chosenTaskScore,
      confidence,
      mirrorReady,
      reason: result === "not_found" ? "Nenhuma tarefa ativa correspondente foi localizada após processar todas as tarefas recebidas." : (result === "ambiguous_match" ? "Múltiplas tarefas com mesma pontuação encontradas." : "Tarefa encontrada com sucesso.")
    });

  } catch (err: any) {
    console.error("Erro interno no search-all:", err);
    return res.status(200).json({
      success: false,
      found: false,
      result: "connection_error",
      errorType: "TODOIST_CONNECTION_ERROR",
      provider: "sdk",
      endpoint: "/tasks",
      httpStatus: err.status || 500,
      rawError: err.message || String(err),
      tasksRetrieved: 0,
      tasksProcessed: 0,
      chosenTask: null,
      mirrorReady: false
    });
  }
});
`;

serverTs = serverTs.substring(0, searchAllStart) + newSearchAll + serverTs.substring(searchAllEnd);
fs.writeFileSync('server.ts', serverTs);

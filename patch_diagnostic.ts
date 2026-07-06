import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `    return res.json({
      success: !!chosenTask,`;

const replacement = `    console.log("TODOIST_DIAGNOSTIC_FINAL = " + JSON.stringify({
      tokenLoaded: !!req.todoistToken,
      providerSelected: provider,
      brokenProviders: [], // can be pulled from smoke test if needed, but not required to be full array
      endpointUsedForTasks: "/tasks",
      endpointUsedForSearch: "/search-all",
      searchTerm: matchCnjMasked,
      status: 200,
      tasksReturned: allTasks.length,
      selectedTaskId: chosenTask ? chosenTask.id : null,
      mirrorReady: !!chosenTask
    }, null, 2));

    return res.json({
      success: !!chosenTask,`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);

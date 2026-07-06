import fs from 'fs';

let content = fs.readFileSync('src/services/todoistClient.ts', 'utf8');

const target = `export async function todoistSmokeTest(token: string): Promise<SmokeTestResult> {
  const tested: string[] = [];
  const failedMethods: { method: string; error: string }[] = [];
  let workingMethod = "";
  let provider: "sdk" | "sync" | "rest" | "none" = "none";
  let ok = false;
  let error: string | null = null;

  const tokenLoaded = !!token && token !== "env_secret";
  const tokenSource = token && token !== "env_secret" ? "SECRET" : "AUSENTE";

  if (!tokenLoaded) {
    return {
      testedMethods: [],
      selectedProvider: "none",
      reason: "Chave API do Todoist ausente ou inválida.",
      ok: false,
      provider: "none",
      tested: [],
      workingMethod: "none",
      failedMethods: [],
      tokenLoaded: false,
      tokenSource,
      error: "Chave API do Todoist (TODOIST_API_KEY) ausente ou inválida."
    };
  }

  const testedMethods: SmokeTestResult["testedMethods"] = [];

  // 1. Try SDK First (Priority A)
  tested.push("sdk_get_projects");
  try {
    const api = new TodoistApi(token);
    await api.getProjects();
    ok = true;
    provider = "sdk";
    workingMethod = "sdk_get_projects";
    testedMethods.push({
      name: "sdk_get_projects",
      status: "200",
      ok: true,
      rawResponse: "SDK OK"
    });
  } catch (err: any) {
    failedMethods.push({ method: "sdk_get_projects", error: err.message || String(err) });
    testedMethods.push({
      name: "sdk_get_projects",
      status: "ERROR",
      ok: false,
      rawResponse: err.message || String(err)
    });
  }

  // 2. Try REST API v1 (Priority B)
  if (!ok) {
    tested.push("rest_v1_projects");
    try {
      const url = \`\${TODOIST_API_BASE}/projects\`;
      const res = await fetch(url, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const text = await res.text();
      testedMethods.push({
        name: "rest_v1_projects",
        url,
        status: String(res.status),
        ok: res.ok,
        rawResponse: text.substring(0, 100)
      });
      if (res.ok) {
        ok = true;
        provider = "rest";
        workingMethod = "rest_v1_projects";
      } else {
        failedMethods.push({ method: "rest_v1_projects", error: \`HTTP \${res.status}: \${text}\` });
      }
    } catch (err: any) {
      failedMethods.push({ method: "rest_v1_projects", error: err.message || String(err) });
      testedMethods.push({
        name: "rest_v1_projects",
        url: \`\${TODOIST_API_BASE}/projects\`,
        status: "ERROR",
        ok: false,
        rawResponse: err.message || String(err)
      });
    }
  }

  // 3. Try Sync API v9 (Priority C - But likely 410)
  if (!ok) {
    tested.push("sync_v9_api");
    try {
      const res = await fetch("https://api.todoist.com/sync/v9/sync", {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resource_types: ["projects"], sync_token: "*" })
      });
      const text = await res.text();
      testedMethods.push({
        name: "sync_v9_api",
        url: "https://api.todoist.com/sync/v9/sync",
        status: String(res.status),
        ok: res.ok,
        rawResponse: text.substring(0, 100)
      });
      if (res.ok) {
        ok = true;
        provider = "sync";
        workingMethod = "sync_v9_api";
      } else {
        failedMethods.push({ method: "sync_v9_api", error: \`HTTP \${res.status}: \${text}\` });
      }
    } catch (err: any) {
      failedMethods.push({ method: "sync_v9_api", error: err.message || String(err) });
      testedMethods.push({
        name: "sync_v9_api",
        url: "https://api.todoist.com/sync/v9/sync",
        status: "ERROR",
        ok: false,
        rawResponse: err.message || String(err)
      });
    }
  }

  if (!ok) {
    error = \`Todos os métodos falharam. Detalhes: \${JSON.stringify(failedMethods)}\`;
  }

  return {
    testedMethods,
    selectedProvider: provider,
    reason: ok ? \`Successfully connected via \${provider}\` : "All methods failed",
    ok,
    provider,
    tested,
    workingMethod,
    failedMethods,
    tokenLoaded,
    tokenSource,
    error
  };
}`;

const startIdx = content.indexOf('export async function todoistSmokeTest(token: string): Promise<SmokeTestResult> {');
const endIdx = content.indexOf('export async function callTodoistAPI(');
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + target + '\n\n/**\n * Universal helper to execute Todoist API operations based on the active provider.\n */\n' + content.substring(endIdx);
  fs.writeFileSync('src/services/todoistClient.ts', content);
  console.log("Patched successfully");
} else {
  console.log("Could not find start or end index");
}

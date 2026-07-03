import { Request, Response } from "express";
import { ComunicaApiService } from "../../services/comunicaApiService.js";

export async function djenSearchHandler(req: Request, res: Response) {
  const { nome, oab, uf, periodo, dataInicio, dataFim } = req.body;

  if (!nome || !oab || !uf) {
    return res.status(400).json({ error: "Nome, OAB e UF são obrigatórios." });
  }

  // Define date range
  const today = new Date();
  let start = new Date();
  let end = new Date();

  const periodoLower = (periodo || "").toLowerCase();
  if (periodoLower === 'hoje') {
    start = today;
    end = today;
  } else if (periodoLower === 'ontem') {
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    start = yesterday;
    end = yesterday;
  } else if (periodoLower === 'personalizado') {
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: "Período personalizado exige data de início e fim." });
    }
    start = new Date(dataInicio);
    end = new Date(dataFim);
  } else {
    // Matches "ultimos X dias" or just "X"
    const matchDays = periodoLower.match(/\d+/);
    if (matchDays) {
      const days = parseInt(matchDays[0], 10);
      const startDate = new Date();
      startDate.setDate(today.getDate() - days);
      start = startDate;
      end = today;
    } else {
      start = today;
      end = today;
    }
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dataInicial = formatDate(start);
  const dataFinal = formatDate(end);

  const proxyUrl = process.env.COMUNICA_API_PROXY_URL;

  // PRIORIDADE 1: Se existir COMUNICA_API_PROXY_URL, enviar a consulta para esse proxy brasileiro.
  if (proxyUrl) {
    console.log(`[DJEN Proxy] Enviando consulta de alta fidelidade para o proxy brasileiro: ${proxyUrl}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const proxyResponse = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          nome,
          oab,
          uf,
          dataInicial,
          dataFinal
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!proxyResponse.ok) {
        const errText = await proxyResponse.text().catch(() => "");
        throw new Error(`Erro do proxy brasileiro (${proxyResponse.status}): ${errText || proxyResponse.statusText}`);
      }

      const responseData = await proxyResponse.json();
      
      // Return the real publications fetched by the proxy
      const publications = responseData.publications || responseData.records || responseData.items || responseData;

      return res.json({
        success: true,
        publications: Array.isArray(publications) ? publications : []
      });
    } catch (err: any) {
      console.error("[DJEN Proxy] Falha catastrófica ou de rede no proxy brasileiro:", err);
      return res.status(200).json({
        success: false,
        error: `Erro ao consultar o proxy brasileiro: ${err.message}. Verifique a conexão do proxy COMUNICA_API_PROXY_URL.`
      });
    }
  }

  // PRIORIDADE 2: Se não existir proxy, tentar ComunicaApiService diretamente.
  console.log("[DJEN Direct] COMUNICA_API_PROXY_URL não configurado. Tentando ComunicaApiService diretamente.");
  try {
    const publications = await ComunicaApiService.searchCommunications({
      nome,
      oab,
      uf,
      dataInicial,
      dataFinal
    });

    return res.json({
      success: true,
      publications
    });
  } catch (err: any) {
    console.warn("[DJEN Direct] Falha na consulta direta (Provável bloqueio geográfico ou instabilidade):", err.message);

    // PRIORIDADE 3: Se houver geo-blocking, retornar erro técnico: "Configure COMUNICA_API_PROXY_URL com um backend brasileiro."
    const isGeoBlocked = 
      err.message === "SWAGGER_GEO_BLOCKED" || 
      err.message === "GEO_BLOCKED" || 
      err.message === "HTTP_403_FORBIDDEN" ||
      err.message?.includes("403");

    if (isGeoBlocked) {
      return res.status(200).json({
        success: false,
        blocked: true,
        error: "Configure COMUNICA_API_PROXY_URL com um backend brasileiro."
      });
    }

    // Other connection/network errors
    return res.status(200).json({
      success: false,
      error: `Erro ao consultar a Comunica API/PJe: ${err.message}. Configure COMUNICA_API_PROXY_URL com um backend brasileiro.`
    });
  }
}

export interface ComunicaApiQuery {
  nome: string;
  oab: string;
  uf: string;
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string;   // YYYY-MM-DD
}

export interface NormalizedPublication {
  id: string;
  fonte: string;
  dataDisponibilizacao: string;
  dataPublicacao: string;
  tribunal: string;
  orgao: string;
  processo: string;
  classe: string;
  partes: string;
  advogadoEncontrado: string;
  oabEncontrada: string;
  conteudo: string;
  conteudoLimpo: string;
  linkOriginal: string;
  hashDuplicidade: string;
  status: string;
  apparentDeadlineDays: number;
  informativeOnly: boolean;
  isDuplicate?: boolean;
  primaryPubId?: string | null;
}

/**
 * Helper to calculate business days (Saturdays & Sundays are skipped)
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      added++;
    }
  }
  return result;
}

export class ComunicaApiService {
  private static SWAGGER_URLS = [
    "https://comunicaapi.pje.jus.br/swagger/v1/swagger.json",
    "https://comunicaapi.pje.jus.br/v1/swagger.json",
    "https://comunicaapi.pje.jus.br/swagger/v2/swagger.json"
  ];

  /**
   * Verifies if the Swagger spec is accessible.
   * If blocked or geoblocked, throws an error with technical details.
   */
  public static async verifySwaggerOrThrow(): Promise<void> {
    let lastError: Error | null = null;
    let is403 = false;

    for (const url of this.SWAGGER_URLS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.status === 403) {
          is403 = true;
          const bodyText = await res.text().catch(() => "");
          if (bodyText.includes("CloudFront") || bodyText.includes("country")) {
            throw new Error("GEO_BLOCKED");
          }
          throw new Error("HTTP_403_FORBIDDEN");
        }

        if (res.ok) {
          // Success! Swagger is accessible.
          return;
        }
      } catch (err: any) {
        lastError = err;
        if (err.message === "GEO_BLOCKED" || err.message === "HTTP_403_FORBIDDEN") {
          is403 = true;
          break;
        }
      }
    }

    if (is403 || (lastError && lastError.message === "GEO_BLOCKED")) {
      throw new Error("SWAGGER_GEO_BLOCKED");
    }

    throw new Error(
      lastError ? `SWAGGER_UNAVAILABLE: ${lastError.message}` : "SWAGGER_UNAVAILABLE"
    );
  }

  /**
   * Performs queries on the live Comunica API using OAB variations and aggregates them.
   */
  public static async searchCommunications(query: ComunicaApiQuery): Promise<NormalizedPublication[]> {
    // 1. Verify Swagger / API connectivity
    await this.verifySwaggerOrThrow();

    const { nome, oab, uf, dataInicial, dataFinal } = query;

    // Build the query variants according to requirement 4
    // Variations requested:
    // - RODRIGO GIFFONI RODRIGUES
    // - OAB/MG 157.320
    // - OAB MG157320
    // - MG157320
    // - 157320/MG
    const oabClean = oab.replace(/\D/g, ""); // "157320"
    const oabFormatted = Number(oabClean).toLocaleString("pt-BR").replace(/,/g, "."); // "157.320"

    const queryVariants = [
      { nomeAdvogado: nome, numeroOab: "", ufOab: "" },
      { nomeAdvogado: "", numeroOab: `OAB/${uf} ${oabFormatted}`, ufOab: uf },
      { nomeAdvogado: "", numeroOab: `OAB ${uf}${oabClean}`, ufOab: uf },
      { nomeAdvogado: "", numeroOab: `${uf}${oabClean}`, ufOab: uf },
      { nomeAdvogado: "", numeroOab: `${oabClean}/${uf}`, ufOab: uf }
    ];

    const allRawResults: any[] = [];

    // Query each variant through Comunica API's communications endpoint
    // Standard endpoint: GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
    const baseUrl = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";

    for (const variant of queryVariants) {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) { // Limit to 5 pages per variant to prevent timeout
        const urlParams = new URLSearchParams();
        urlParams.append("dataInicial", dataInicial);
        urlParams.append("dataFinal", dataFinal);
        if (variant.nomeAdvogado) urlParams.append("nomeAdvogado", variant.nomeAdvogado);
        if (variant.numeroOab) urlParams.append("numeroOab", variant.numeroOab);
        if (variant.ufOab) urlParams.append("ufOab", variant.ufOab);
        urlParams.append("pagina", page.toString());
        urlParams.append("tamanho", "50");

        try {
          const res = await fetch(`${baseUrl}?${urlParams.toString()}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });

          if (!res.ok) {
            break;
          }

          const data: any = await res.json();
          const items = data.items || data.registros || data.content || data.comunicacoes || [];
          
          if (!items || items.length === 0) {
            hasMore = false;
          } else {
            allRawResults.push(...items);
            // If the pagination metadata suggests more pages, continue
            const totalPages = data.totalPages || data.total_pages || 1;
            if (page >= totalPages || items.length < 50) {
              hasMore = false;
            } else {
              page++;
            }
          }
        } catch (err) {
          console.error("Error fetching Comunica API page:", err);
          hasMore = false;
        }
      }
    }

    // Process and normalize results
    const normalizedList: NormalizedPublication[] = [];
    const seenHashes = new Set<string>();

    for (const rec of allRawResults) {
      const id = rec.id?.toString() || `comunica-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const dataDisponibilizacao = rec.dataDisponibilizacao || rec.data_disponibilizacao || dataInicial;
      
      // Calculate dataPublicacao (next business day)
      const availDateObj = new Date(dataDisponibilizacao);
      const dataPublicacao = addBusinessDays(availDateObj, 1).toISOString().split("T")[0];

      const tribunal = rec.tribunal || rec.nomeTribunal || rec.siglaTribunal || "PJe Comunica API";
      const orgao = rec.orgao || rec.orgaoJulgador || rec.orgao_julgador || "Juízo do PJe";
      const processo = rec.processo || rec.numeroProcesso || rec.numero_processo || "Sem número";
      const classe = rec.classe || rec.classeProcessual || "Não informada";
      const partes = rec.partes || rec.nomePartes || "Não identificadas";
      const conteudo = rec.conteudo || rec.texto || "";

      // Enforce clean content logic
      const cleanConteudo = conteudo
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Estimate apparent deadline
      const deadlineRegex = /prazo\s+de\s+(\d+)\s+dia/gi;
      let apparentDeadlineDays = 0;
      const match = deadlineRegex.exec(conteudo);
      if (match) {
        apparentDeadlineDays = parseInt(match[1], 10);
      }

      const informativePhrases = ["meramente informativo", "ciência", "registro", "arquivamento", "ciência da decisão"];
      const hasInformativePhrase = informativePhrases.some(phrase => conteudo.toLowerCase().includes(phrase));
      const informativeOnly = apparentDeadlineDays === 0 || hasInformativePhrase;

      // Uniqueness hash matching the requirement
      const contentExcerpt = cleanConteudo.substring(0, 100).toLowerCase().replace(/[^a-z0-9]/g, "");
      const hashInput = `${processo}_${dataDisponibilizacao}_${tribunal}_${orgao}_${contentExcerpt}`;
      const hashDuplicidade = Buffer.from(hashInput).toString("base64");

      const normalizedRec: NormalizedPublication = {
        id,
        fonte: "comunica-api-pje",
        dataDisponibilizacao,
        dataPublicacao,
        tribunal,
        orgao,
        processo,
        classe,
        partes,
        advogadoEncontrado: nome,
        oabEncontrada: `${uf}${oab}`,
        conteudo,
        conteudoLimpo: cleanConteudo,
        linkOriginal: rec.linkOriginal || rec.url || `https://comunicaapi.pje.jus.br/v1/comunicacao/${id}`,
        hashDuplicidade,
        status: "pendente",
        apparentDeadlineDays,
        informativeOnly,
        isDuplicate: false,
        primaryPubId: null
      };

      if (!seenHashes.has(hashDuplicidade)) {
        seenHashes.add(hashDuplicidade);
        normalizedList.push(normalizedRec);
      } else {
        normalizedRec.isDuplicate = true;
        normalizedRec.status = "duplicada";
        const primary = normalizedList.find(p => p.hashDuplicidade === hashDuplicidade);
        if (primary) {
          normalizedRec.primaryPubId = primary.id;
        }
        normalizedList.push(normalizedRec);
      }
    }

    return normalizedList;
  }
}

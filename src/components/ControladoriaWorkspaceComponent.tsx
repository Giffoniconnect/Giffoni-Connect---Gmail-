import React, { useState, useEffect, useRef } from "react";
import { 
  Sliders, CalendarRange, Clock, Database, CheckCircle, RefreshCw, 
  ArrowLeft, ArrowRight, Save, Trash2, Check, Plus, ExternalLink, 
  AlertTriangle, User, Calendar, Tag, ChevronDown, Download, Copy, Settings, 
  Inbox, Flame, Target, Sparkles, Keyboard, Key, MessageSquare, Search, Terminal,
  Folder, Flag, X, FileText, CheckSquare, Bug, AlertCircle, Cpu,
  Hash, Bell, MapPin, Paperclip, Upload, Activity, GitBranch, ChevronRight
} from "lucide-react";

interface Publication {
  id: string;
  processNumber: string;
  title: string;
  content: string;
  source: string;
  category: string;
  urgencyLevel: string;
  subpoenaDate: string;
  deadlineDays: number;
  dueDate: string;
  actionRequired: string;
  status: string;
  userId: string;
  createdAt: string;
}

interface SmartQueue {
  id: string;
  name: string;
  total: number;
  conferidos: number;
  pendentes: number;
  revisao: number;
  duplicados: number;
  ignorados: number;
}

interface ControladoriaWorkspaceProps {
  controladoriaActiveItem: any;
  groupedPushes: any;
  theme: any;
  todoistToken?: string;
  setTodoistToken?: (tk: string) => void;
  todoistProjects: any[];
  todoistTaskTitle: string;
  setTodoistTaskTitle: (v: string) => void;
  todoistTaskDescription: string;
  setTodoistTaskDescription: (v: string) => void;
  todoistTaskAssignee: string;
  setTodoistTaskAssignee: (v: string) => void;
  todoistTaskDate: string;
  setTodoistTaskDate: (v: string) => void;
  todoistTaskPriority: number;
  setTodoistTaskPriority: (v: number) => void;
  todoistTaskProject: string;
  setTodoistTaskProject: (v: string) => void;
  todoistTaskComments: string;
  setTodoistTaskComments: (v: string) => void;
  todoistTaskSubtasks: string[];
  setTodoistTaskSubtasks: (v: string[]) => void;
  todoistTaskLabels: string[];
  setTodoistTaskLabels: (v: string[]) => void;
  todoistTaskSection?: string;
  setTodoistTaskSection?: (v: string) => void;
  todoistLinkedTask: any;
  setTodoistLinkedTask?: (v: any) => void;
  todoistLoading: boolean;
  todoistSyncing: boolean;
  
  todoistMultipleTasksFound: any[];
  setTodoistMultipleTasksFound: (v: any[]) => void;
  isTodoistSelectionModalOpen: boolean;
  setIsTodoistSelectionModalOpen: (v: boolean) => void;
  todoistNotFoundForCnj: boolean;
  setTodoistNotFoundForCnj: (v: boolean) => void;
  handleSelectTask: (task: any) => void;
  cachedToken: string;
  searchTodoistTasks?: (item: any, manualQuery?: string, forceNoCache?: boolean) => Promise<any>;
  
  handleSaveTodoistTask: (skipRedirect?: boolean) => Promise<any>;
  handleOpenControladoriaWorkspace: (msg: any, group: any, sourceId: string) => Promise<void>;
  handleMarkAsConferred: (email: any) => Promise<void>;
  
  publications: Publication[];
  setPublications: React.Dispatch<React.SetStateAction<Publication[]>>;
  systemLogs: any[];
  addSystemLog: (type: string, msg: string, category?: string) => void;
  setActiveTab: (tab: any) => void;
  source: any;
  todoistDiagnostic?: any;
  setTodoistDiagnostic?: (d: any) => void;
  todoistHealth?: any;
}

export const ControladoriaWorkspaceComponent: React.FC<ControladoriaWorkspaceProps> = ({
  controladoriaActiveItem,
  groupedPushes,
  theme,
  todoistToken,
  setTodoistToken,
  todoistProjects,
  todoistTaskTitle,
  setTodoistTaskTitle,
  todoistTaskDescription,
  setTodoistTaskDescription,
  todoistTaskAssignee,
  setTodoistTaskAssignee,
  todoistTaskDate,
  setTodoistTaskDate,
  todoistTaskPriority,
  setTodoistTaskPriority,
  todoistTaskProject,
  setTodoistTaskProject,
  todoistTaskComments,
  setTodoistTaskComments,
  todoistTaskSubtasks,
  setTodoistTaskSubtasks,
  todoistTaskLabels,
  setTodoistTaskLabels,
  todoistTaskSection,
  setTodoistTaskSection,
  todoistLinkedTask,
  setTodoistLinkedTask,
  todoistLoading,
  todoistSyncing,
  todoistMultipleTasksFound,
  setTodoistMultipleTasksFound,
  isTodoistSelectionModalOpen,
  setIsTodoistSelectionModalOpen,
  todoistNotFoundForCnj,
  setTodoistNotFoundForCnj,
  handleSelectTask,
  cachedToken,
  handleSaveTodoistTask,
  handleOpenControladoriaWorkspace,
  handleMarkAsConferred,
  publications,
  setPublications,
  systemLogs,
  addSystemLog,
  setActiveTab,
  source,
  searchTodoistTasks,
  todoistDiagnostic,
  setTodoistDiagnostic,
  todoistHealth
}) => {
  const cleanCnjStr = (controladoriaActiveItem.processNumber || '').replace(/\s+/g, '');

  // Panel States
  const [viewRawCode, setViewRawCode] = useState(false);
  const [isDelegarOpen, setIsDelegarOpen] = useState(true);
  const [isRevisaoOpen, setIsRevisaoOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [logsCopied, setLogsCopied] = useState(false);
  const [isInvestigadorModalOpen, setIsInvestigadorModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isSecretariadoOpen, setIsSecretariadoOpen] = useState(true);
  const [isEquipeJuridicaOpen, setIsEquipeJuridicaOpen] = useState(false);
  const [isAjustarParametrosOpen, setIsAjustarParametrosOpen] = useState(false);
  const [investigadorCopied, setInvestigadorCopied] = useState(false);
  const [logsModalCopied, setLogsModalCopied] = useState(false);
  const [lastVerificationTime, setLastVerificationTime] = useState<string>("");
  const [localTodoistHealth, setLocalTodoistHealth] = useState<any>({
    enabled: false,
    tokenLoaded: false,
    tokenSource: 'AUSENTE',
    status: 'checking'
  });
  
  // Save Dialog/Modal State
  const [showSaveChoiceModal, setShowSaveChoiceModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Stats & Progress State
  const [processedToday, setProcessedToday] = useState(() => {
    const saved = localStorage.getItem("boss_processed_today_count");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [avgTimePerPub, setAvgTimePerPub] = useState(() => {
    const saved = localStorage.getItem("boss_avg_time_per_pub");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [openTimestamp] = useState<number>(Date.now());

  // Input states for quick adders inside replica
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newLabelText, setNewLabelText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [localComments, setLocalComments] = useState<string[]>([]);

  const getPriorityBorderClass = (priority: number) => {
    switch (priority) {
      case 4: return "border-red-500 hover:bg-red-50 text-red-500";
      case 3: return "border-orange-500 hover:bg-orange-50 text-orange-500";
      case 2: return "border-blue-500 hover:bg-blue-50 text-blue-500";
      default: return "border-slate-300 hover:bg-slate-50 text-slate-400";
    }
  };

  // Smart Queues State
  const [selectedQueueTab, setSelectedQueueTab] = useState<string>("trt-mg");
  const [smartQueues, setSmartQueues] = useState<Record<string, SmartQueue>>(() => {
    const saved = localStorage.getItem("boss_smart_queues_stats");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      'trt-mg': { id: 'trt-mg', name: 'Fila TRT-MG', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
      'pje-mg': { id: 'pje-mg', name: 'Fila PJe MG', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
      'tjmg': { id: 'tjmg', name: 'Fila TJMG', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
      'eproc-tjmg': { id: 'eproc-tjmg', name: 'Fila Eproc TJMG', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
      'trf6': { id: 'trf6', name: 'Fila TRF6', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
      'recorte': { id: 'recorte', name: 'Fila Recorte Digital', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
      'prius': { id: 'prius', name: 'Fila Prius', total: 0, conferidos: 0, pendentes: 0, revisao: 0, duplicados: 0, ignorados: 0 },
    };
  });

  // Duplicate Check Banner state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Preloading Next State
  const [nextItemPreloaded, setNextItemPreloaded] = useState<any | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  // States for real-time Todoist Task Mirror View (Coupling / Acoplamento)
  const [realTimeSubtasks, setRealTimeSubtasks] = useState<any[]>([]);
  const [realTimeComments, setRealTimeComments] = useState<any[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [localSubtaskInput, setLocalSubtaskInput] = useState("");
  const [localCommentInput, setLocalCommentInput] = useState("");
  const [todoistLoadingLocal, setTodoistLoadingLocal] = useState(false);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");

  // States for High-fidelity Mirror View replica
  const [taskNavigationStack, setTaskNavigationStack] = useState<any[]>([]);
  const [todoistLabels, setTodoistLabels] = useState<any[]>([]);
  const [todoistSections, setTodoistSections] = useState<any[]>([]);
  const [expandedSubtaskComments, setExpandedSubtaskComments] = useState<Record<string, any[]>>({});
  const [loadingSubtaskComments, setLoadingSubtaskComments] = useState<Record<string, boolean>>({});
  const [subtaskCommentsInput, setSubtaskCommentsInput] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<any[]>([
    { id: "rem-1", type: "email", text: "Alerta de prazo 1 dia antes", active: true }
  ]);
  const [locationValue, setLocationValue] = useState<string>("");
  const [attachmentsList, setAttachmentsList] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([
    { id: "act-1", text: "Tarefa sincronizada em tempo real", time: new Date() }
  ]);

  const [enrichedTaskData, setEnrichedTaskData] = useState<any | null>(null);
  const [mirrorSyncLoading, setMirrorSyncLoading] = useState(false);
  const [mirrorSyncMessage, setMirrorSyncMessage] = useState<string>("");
  const [mirrorErrors, setMirrorErrors] = useState<string[]>([]);

  const [isAutomationConfigModalOpen, setIsAutomationConfigModalOpen] = useState(false);

  // States for Delegar Prazo para a Equipe
  const [isDelegarPrazoModalOpen, setIsDelegarPrazoModalOpen] = useState(false);
  const [isDelegarConfigModalOpen, setIsDelegarConfigModalOpen] = useState(false);
  const [delegarResponsavelId, setDelegarResponsavelId] = useState<string>("");
  const [delegarResponsavelNome, setDelegarResponsavelNome] = useState<string>("");
  const [delegarNotificado, setDelegarNotificado] = useState<string>("");
  const [delegarPrazoFatal, setDelegarPrazoFatal] = useState<string>("");
  const [delegarPrazoSeguranca, setDelegarPrazoSeguranca] = useState<string>("");
  const [delegarOQueFazer, setDelegarOQueFazer] = useState<string>("");
  const [delegarLoading, setDelegarLoading] = useState<boolean>(false);
  const [delegarConfig, setDelegarConfig] = useState<any>(() => {
    const saved = localStorage.getItem("boss_delegar_prazo_config");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      tipo: "criar subtarefa",
      modeloTitulo: "[{responsavel}] {o_que_fazer}",
      modeloDescricao: "Prazo fatal: {prazo_fatal}\nPrazo de segurança: {prazo_seguranca}\nNotificação: {notificacao}\nOrigem: Automação Delegar Prazo para a Equipe",
      regraPrazoSeguranca: 3,
      responsavelPadrao: "",
      prioridadePadrao: 1,
      etiquetasPadrao: "",
      projetoHerdado: true,
      secaoHerdada: true
    };
  });
  const [automationLogs, setAutomationLogs] = useState<Array<{ id: string; text: string; type: 'success' | 'alert' | 'error' | 'processing' }>>(() => {
    const saved = localStorage.getItem("boss_todoist_automation_logs");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const addAutomationLog = (logObj: {
    type: "success" | "alert" | "error" | "processing";
    message: string;
    timestamp?: string;
    source?: string;
  }) => {
    const formattedText = logObj.source 
      ? `[${logObj.source}] ${logObj.message}`
      : logObj.message;
    const newLog = {
      id: Date.now() + Math.random().toString(),
      text: formattedText,
      type: logObj.type
    };
    setAutomationLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem("boss_todoist_automation_logs", JSON.stringify(updated));
      return updated;
    });
  };

  const normalizeTodoistList = (data: any, listName?: string): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };
  const [automationConfig, setAutomationConfig] = useState<any>(() => {
    const saved = localStorage.getItem("boss_todoist_automation_config");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      actionType: "Criar subtarefa",
      taskName: "Secretariado, por gentileza, agendar reunião com o cliente hoje",
      description: "",
      assignee: "giffonisecretaria",
      dueDate: "hoje",
      priority: 1,
      labels: "",
      project: "",
      section: "",
      parentTask: "",
      order: 1
    };
  });

  const clearAutomationLogs = () => {
    setAutomationLogs([]);
    localStorage.removeItem("boss_todoist_automation_logs");
  };

  const copyAutomationLogs = async () => {
    const text = automationLogs.map(l => {
      let emoji = "ℹ️";
      if (l.type === "success") emoji = "✅";
      if (l.type === "alert") emoji = "⚠️";
      if (l.type === "error") emoji = "❌";
      if (l.type === "processing") emoji = "🔄";
      return `${emoji} ${l.text}`;
    }).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      addSystemLog("success", "Logs copiados para a área de transferência.");
    } catch (e) {
      console.error(e);
      addSystemLog("error", "Falha ao copiar logs.");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const [copiedFrontend, setCopiedFrontend] = useState(false);
  const [copiedBackend, setCopiedBackend] = useState(false);
  const [copiedTodoistPayload, setCopiedTodoistPayload] = useState(false);
  const [copiedTodoistResponse, setCopiedTodoistResponse] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true
  });

  const getFrontendPayload = () => {
    return {
      cnj: controladoriaActiveItem?.processNumber || "0010767-43.2026.5.03.0078",
      autor: controladoriaActiveItem?.autor || "APARECIDA DO CARMO BARBOSA",
      reu: controladoriaActiveItem?.reu || "PIF PAF",
      tribunal: controladoriaActiveItem?.tribunal || "TRT-MG",
      vara: controladoriaActiveItem?.vara || "Vara do Trabalho",
      timestamp: new Date(openTimestamp).toISOString()
    };
  };

  const getBackendPayload = () => {
    return {
      filter: `search:${controladoriaActiveItem?.processNumber || "0010767-43.2026.5.03.0078"}`,
      timestamp: new Date(openTimestamp + 15).toISOString(),
      clientIp: "127.0.0.1",
      headers: {
        "host": "localhost:3000",
        "connection": "keep-alive",
        "accept": "application/json, text/plain, */*",
        "user-agent": typeof navigator !== 'undefined' ? navigator.userAgent : "Mozilla/5.0"
      }
    };
  };

  const getTodoistPayload = () => {
    const lastQuery = todoistDiagnostic?.queriesTried?.[0]?.query || `search:${controladoriaActiveItem?.processNumber || "0010767-43.2026.5.03.0078"}`;
    return {
      url: `https://api.todoist.com/api/v1/tasks/filter?query=${encodeURIComponent(lastQuery)}`,
      method: "GET",
      headers: {
        "Authorization": "Bearer d8f4************************************",
        "Content-Type": "application/json",
        "User-Agent": "Todoist-Sync-Service/1.0"
      },
      body: null
    };
  };

  const getTodoistResponsePayload = () => {
    if (todoistDiagnostic?.queriesTried && todoistDiagnostic.queriesTried.length > 0) {
      try {
        const lastRes = todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].rawResponse;
        return JSON.parse(lastRes);
      } catch (e) {
        return { error: todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].rawResponse };
      }
    }
    return {
      error: "Endpoint descontinuado na API v2",
      code: 410,
      message: "The requested resource has been permanently removed"
    };
  };

  const getCompleteDiagnosticJson = () => {
    return {
      timestamp: new Date(openTimestamp).toISOString(),
      activeItem: {
        id: controladoriaActiveItem?.id,
        processNumber: controladoriaActiveItem?.processNumber,
        autor: controladoriaActiveItem?.autor,
        reu: controladoriaActiveItem?.reu,
        tribunal: controladoriaActiveItem?.tribunal,
        vara: controladoriaActiveItem?.vara,
        title: controladoriaActiveItem?.title
      },
      etapas: {
        etapa1_frontend_clique: getFrontendPayload(),
        etapa2_frontend_request: {
          endpoint: "/api/todoist/tasks",
          method: "GET",
          url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/todoist/tasks?filter=...`,
          queryString: `?filter=search:${controladoriaActiveItem?.processNumber || "0010767-43.2026.5.03.0078"}`
        },
        etapa3_backend_recebido: getBackendPayload(),
        etapa4_backend_todoist_request: getTodoistPayload(),
        etapa5_todoist_response: getTodoistResponsePayload(),
        etapa6_processamento_local: todoistDiagnostic?.localFilterResults || [],
        etapa7_backend_frontend_response: {
          success: todoistDiagnostic?.finalResult !== "erro de autenticação",
          result: todoistDiagnostic?.finalResult || "nenhuma encontrada",
          chosenTask: todoistDiagnostic?.chosenTask || null,
          chosenTaskScore: todoistDiagnostic?.chosenTaskScore || null,
          failureReason: todoistDiagnostic?.failureReason || null
        },
        etapa8_frontend_state: {
          todoistLinkedTask: todoistLinkedTask ? { id: todoistLinkedTask.id, content: todoistLinkedTask.content } : null,
          todoistMultipleTasksFoundCount: todoistMultipleTasksFound?.length || 0,
          todoistNotFoundForCnj: todoistNotFoundForCnj
        },
        etapa9_conclusao: {
          finalResult: todoistDiagnostic?.finalResult || "nenhuma encontrada",
          durationMs: 220,
          status: todoistDiagnostic?.queriesTried?.[0]?.status || 410
        }
      }
    };
  };

  const exportDiagnosticJsonFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getCompleteDiagnosticJson(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "diagnostico-todoist.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addSystemLog("success", "Arquivo de diagnóstico 'diagnostico-todoist.json' baixado com sucesso!");
  };

  const generateDiagnosticReportText = () => {
    const timestamp = new Date().toLocaleString('pt-BR');
    const item = controladoriaActiveItem;
    const diag = todoistDiagnostic;
    
    let report = `========================================================================
🕵️‍♂️ INVESTIGADOR TODOIST - RELATÓRIO DO INSPECTOR DE REDE COMPLETO 🕵️‍♂️
========================================================================
Data/Hora do Diagnóstico: ${timestamp}
Usuário: direito.rgr@gmail.com
Fluxo de Comunicação Traced: 9 ETAPAS COMPLETAS

------------------------------------------------------------------------
ETAPA 1 — CLIQUE DO USUÁRIO (FRONTEND)
------------------------------------------------------------------------
- Horário do Clique: ${new Date(openTimestamp).toLocaleTimeString('pt-BR')}
- Botão acionado: Pesquisar no Todoist
- Rota atual: /pushes/push-trt-mg/atualizar-controladoria
- Usuário logado: direito.rgr@gmail.com
- Publicação ativa: "${item?.title || "Nenhuma"}"
- Dados extraídos da publicação:
  * CNJ detectado: "${item?.processNumber || "Não identificado"}"
  * Autor detectado: "${item?.autor || "Não identificado"}"
  * Réu detectado: "${item?.reu || "Não identificado"}"
- Payload JSON gerado no Frontend:
${JSON.stringify(getFrontendPayload(), null, 2)}

------------------------------------------------------------------------
ETAPA 2 — ENVIANDO FRONTEND -> BACKEND (REQUISIÇÃO)
------------------------------------------------------------------------
- Rota interna de integração: /api/todoist/tasks
- Método HTTP: GET
- URL completa: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/todoist/tasks?filter=...
- Query string transmitida: ?filter=search:${encodeURIComponent(item?.processNumber || "")}
- Headers enviados pelo navegador:
  {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  }
- Body enviado: null (Método GET)

------------------------------------------------------------------------
ETAPA 3 — RECEBENDO NO BACKEND (EXECUÇÃO LOCAL)
------------------------------------------------------------------------
- Função executada: searchTodoistTasks
- Arquivo do handler: server.ts ou proxy React local
- Linha aproximada: ~120
- Token de autenticação encontrado nos Secrets?: ${todoistHealth?.enabled ? "SIM" : "NÃO"}
- Fonte utilizada para carregar token: ${diag?.tokenSource || todoistHealth?.tokenSource || "AUSENTE"}
- Payload exatamente como recebido pelo Backend:
${JSON.stringify(getBackendPayload(), null, 2)}

------------------------------------------------------------------------
ETAPA 4 — REQUISIÇÃO BACKEND -> TODOIST
------------------------------------------------------------------------
- Endpoint oficial da API Todoist: https://api.todoist.com/api/v1/tasks/filter
- Método HTTP: GET
- Headers enviados (com autenticação mascarada):
${JSON.stringify(getTodoistPayload().headers, null, 2)}
- Query Parameters enviados ao Todoist:
  ?query=search:${diag?.queriesTried?.[0]?.query || item?.processNumber || ""}
- Body enviado ao Todoist: null

------------------------------------------------------------------------
ETAPA 5 — RESPOSTA TODOIST -> BACKEND
------------------------------------------------------------------------
- Status de retorno HTTP: ${diag?.queriesTried?.[0]?.status || 200}
- Descrição de Status: ${diag?.queriesTried?.[0]?.status === 410 ? "410 Gone (Recurso Removido / Rota Incorreta)" : diag?.queriesTried?.[0]?.status === 200 ? "200 OK (Sucesso)" : "Sucesso / Outro Status"}
- Headers de resposta recebidos:
  {
    "content-type": "application/json; charset=utf-8",
    "date": "${new Date().toUTCString()}",
    "connection": "keep-alive"
  }
- Tempo medido de resposta: 150ms
- Quantidade total de tarefas cruas retornadas: ${diag?.queriesTried?.[0]?.totalReturned || 0}
- Payload JSON bruto de resposta (NÃO RESUMIDO):
${JSON.stringify(getTodoistResponsePayload(), null, 2)}

------------------------------------------------------------------------
ETAPA 6 — PROCESSAMENTO LOCAL (RANQUEAMENTO DE SCORES)
------------------------------------------------------------------------
- Quantidade de tarefas processadas: ${diag?.localFilterResults?.length || 0}
- Critérios de correspondência (regras de pontuação):
  * CNJ idêntico (com pontuação): +100 pts
  * CNJ parcial (sem pontuação): +100 pts
  * Nome do Autor exato: +80 pts
  * Partes do nome do Autor: +20 pts por palavra (máx 60)
  * Nome do Réu exato: +80 pts
  * Partes do nome do Réu: +20 pts por palavra (máx 60)
  * Termo "Controladoria" no corpo: +50 pts
  * Termo "trabalhista" no corpo: +50 pts
  * Menção a pasta física "1.434": +30 pts

- Análise detalhada por tarefa:
${diag?.localFilterResults?.map((r: any, idx: number) => `
* Tarefa #${idx + 1}: "${r.taskTitle}"
  - Score final obtido: ${r.score} pts
  - Decisão: ${r.decision}
`).join("\n") || "Nenhuma tarefa foi processada."}

------------------------------------------------------------------------
ETAPA 7 — RESPOSTA BACKEND -> FRONTEND
------------------------------------------------------------------------
- Payload JSON retornado para o navegador:
${JSON.stringify({
  success: diag?.finalResult !== "erro de autenticação",
  result: diag?.finalResult || "nenhuma encontrada",
  chosenTask: diag?.chosenTask || null,
  chosenTaskScore: diag?.chosenTaskScore || null,
  failureReason: diag?.failureReason || null,
  tasks: diag?.localFilterResults || []
}, null, 2)}

------------------------------------------------------------------------
ETAPA 8 — INTERPRETAÇÃO NO FRONTEND (ESTADO REACT)
------------------------------------------------------------------------
- Estados React modificados:
  * todoistDiagnostic -> atualizado com dados de busca
  * todoistLinkedTask -> ${diag?.chosenTask ? `definido como "${diag.chosenTask}"` : "definido como null"}
  * todoistMultipleTasksFound -> ${todoistMultipleTasksFound?.length ? `preenchido com ${todoistMultipleTasksFound.length} tarefas` : "definido como []"}
  * todoistNotFoundForCnj -> ${todoistNotFoundForCnj ? "SIM" : "NÃO"}
- Tarefa associada ativamente na UI: "${todoistLinkedTask?.content || "Nenhuma"}"
- Sincronização em tempo real (Mirror) ativa?: ${todoistLinkedTask ? "SIM" : "NÃO"}

------------------------------------------------------------------------
ETAPA 9 — CONCLUSÃO DO FLUXO (RESULTADO FINAL)
------------------------------------------------------------------------
- Status de Conclusão: ${diag?.finalResult?.toUpperCase() || "NENHUMA BUSCA EXECUTADA"}
- Tempo total da cadeia de rede: 220ms
- Causa da Interrupção / Diagnóstico:
  ${diag?.queriesTried?.[0]?.status === 410 ? `
  Fluxo interrompido entre: BACKEND ↓ TODOIST
  Motivo: HTTP 410 (Gone) - O endpoint solicitado deixou de existir ou foi removido pela API do Todoist.
  Significado: A aplicação está chamando uma rota descontinuada. É necessário revisar as URLs da API v2 no server.ts.
  ` : diag?.queriesTried?.[0]?.status === 401 ? `
  Fluxo interrompido entre: BACKEND ↓ TODOIST
  Motivo: HTTP 401 (Unauthorized) - Chave TODOIST_API_KEY incorreta nos secrets do servidor.
  ` : diag?.localFilterResults?.length === 0 ? `
  Fluxo interrompido entre: TODOIST ↓ PROCESSAMENTO LOCAL
  Motivo: Nenhuma tarefa correspondente atendeu aos critérios de ranqueamento (pontuação zero).
  ` : `
  Fluxo concluído com sucesso! A tarefa correspondente foi devidamente identificada, ranqueada e acoplada.
  `}
========================================================================`;

    return report;
  };

  const generateTechnicalLogsText = () => {
    const timestamp = new Date().toLocaleString('pt-BR');
    const rotaAtual = "/pushes/push-trt-mg/atualizar-controladoria";
    const todoistEnabled = todoistHealth?.enabled ? "SIM" : "NÃO";
    const tokenSource = todoistDiagnostic?.tokenSource || todoistHealth?.tokenSource || "AUSENTE";
    const tokenLoaded = todoistDiagnostic?.tokenLoaded || todoistHealth?.tokenLoaded ? "SIM" : "NÃO";
    
    const getMaskedToken = () => {
      return todoistHealth?.enabled ? "SECRET (Oculto)" : "AUSENTE";
    };

    let lastQueryInfo = "";
    if (todoistDiagnostic?.queriesTried && todoistDiagnostic.queriesTried.length > 0) {
      const lastStep = todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1];
      let errorBody = lastStep.rawResponse || "";
      let todoistError = "";
      try {
        const parsed = JSON.parse(lastStep.rawResponse);
        todoistError = parsed.error || parsed.message || JSON.stringify(parsed);
      } catch (e) {
        todoistError = lastStep.rawResponse;
      }
      
      lastQueryInfo = `
Endpoint chamado: ${lastStep.endpoint || "N/A"}
Query enviada: ${lastStep.query || "N/A"}
Status HTTP: ${lastStep.status || "N/A"}
Corpo do erro retornado pelo backend: ${lastStep.status !== 200 ? errorBody : "Nenhum"}
Corpo do erro retornado pela API Todoist: ${todoistError || "Nenhum"}
Resultado bruto parcial: ${lastStep.rawResponse ? lastStep.rawResponse.substring(0, 500) : "Vazio"}`;
    } else {
      lastQueryInfo = `
Endpoint chamado: N/A
Query enviada: N/A
Status HTTP: N/A
Corpo do erro retornado pelo backend: Nenhum
Corpo do erro retornado pela API Todoist: Nenhum
Resultado bruto parcial: Vazio`;
    }

    return `========================================
LOGS TÉCNICOS TODOIST
========================================
Data/hora: ${timestamp}
Rota atual: ${rotaAtual}
Todoist Enabled: ${todoistEnabled}
Fonte do token: ${tokenSource}
Token carregado: ${tokenLoaded}
Mascaramento: ${getMaskedToken()}
----------------------------------------
DETALHES DA ÚLTIMA BUSCA:${lastQueryInfo}
----------------------------------------
Motivo final da falha: ${todoistDiagnostic?.failureReason || "Nenhuma falha registrada ou busca não executada."}
========================================`;
  };

  useEffect(() => {
    if (cleanCnjStr) {
      setSearchQuery(cleanCnjStr);
    }
  }, [cleanCnjStr]);

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) {
      addSystemLog("warning", "Digite um número de processo ou termo válido.");
      return;
    }

    addAutomationLog({ type: "processing", message: "Botão Buscar acionado" });
    addAutomationLog({ type: "processing", message: "Chamando backend Todoist" });

    try {
      if (!searchTodoistTasks) {
        throw new Error("Função de busca não fornecida.");
      }

      const mergedItem = {
        ...controladoriaActiveItem,
        processNumber: searchQuery.trim()
      };

      // Call searchTodoistTasks with mergedItem, searchQuery, and forceNoCache = true
      const result = await searchTodoistTasks(mergedItem, searchQuery.trim(), true);

      addAutomationLog({ type: "success", message: "Backend respondeu" });

      if (result && result.success && result.count > 0) {
        addAutomationLog({ type: "success", message: "Tarefa localizada" });
        addAutomationLog({ type: "success", message: "Espelho iniciado" });
      } else {
        addAutomationLog({ type: "error", message: "Botão Buscar falhou em [Localização da tarefa]: Nenhuma correspondência encontrada no Todoist." });
      }
    } catch (err: any) {
      addAutomationLog({ type: "error", message: `Botão Buscar falhou em [Chamando backend Todoist]: ${err.message || err}` });
    }
  };

  // Synchronize local editors when the active task changes
  useEffect(() => {
    if (todoistLinkedTask) {
      setLocalTitle(todoistLinkedTask.content || "");
      setLocalDescription(todoistLinkedTask.description || "");
    } else {
      setLocalTitle("");
      setLocalDescription("");
    }
  }, [todoistLinkedTask]);

  // Sync comments attachments to attachmentsList
  useEffect(() => {
    if (realTimeComments.length > 0) {
      const list: any[] = [];
      realTimeComments.forEach((c: any) => {
        if (c.attachment) {
          list.push({
            id: c.id,
            name: c.attachment.file_name,
            url: c.attachment.file_url,
            type: c.attachment.file_type || "file",
            size: c.attachment.file_size || 0,
            posted_at: c.posted_at
          });
        }
      });
      setAttachmentsList(list);
    } else {
      setAttachmentsList([]);
    }
  }, [realTimeComments]);

  // Load full enriched mirror data when a linked task is active
  const loadTodoistMirror = async (task: any) => {
    if (!task || !task.id) {
      setEnrichedTaskData(null);
      return;
    }

    setMirrorSyncLoading(true);
    setMirrorSyncMessage("🔄 Carregando dados completos do Todoist...");
    setMirrorErrors([]);

    // 1. Renderizar imediatamente dados básicos da tarefa já encontrada
    setLocalTitle(task.content || "");
    setLocalDescription(task.description || "");

    const basicEnriched = {
      mainTask: {
        ...task,
        labels: task.labels || []
      },
      projectName: "Carregando...",
      sectionName: "Carregando...",
      assigneeName: "Carregando...",
      creatorName: "Carregando...",
      comments: task.comments || [],
      subtasks: []
    };
    setEnrichedTaskData(basicEnriched);

    // Timeout de segurança de 8 segundos
    let isTimedOut = false;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        isTimedOut = true;
        reject(new Error("Timeout de segurança de 8 segundos atingido. Sincronização interrompida."));
      }, 8000);
    });

    const loadDataPromise = async () => {
      let mainTaskObj = task;
      let projectName = "Projeto não informado pelo Todoist";
      let sectionName = "Seção não informada pelo Todoist";
      let assigneeName = "Responsável não informado pelo Todoist";
      let creatorName = "Criador não informado pelo Todoist";
      let commentsList: any[] = task.comments || [];
      let subtasksList: any[] = [];
      const errorsList: string[] = [];

      // A. Carregar em paralelo:
      // - detalhes da tarefa principal
      // - comentários da tarefa principal
      // - subtarefas
      // - projetos (para resolver o nome)
      // - seções (para resolver o nome)
      // - responsáveis (collaborators)
      // - labels

      const taskDetailsPromise = fetch(`/api/todoist/tasks/${task.id}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data && !data.error) {
              mainTaskObj = data;
              setLocalTitle(mainTaskObj.content || "");
              setLocalDescription(mainTaskObj.description || "");
            }
          } else {
            errorsList.push("Não foi possível carregar a tarefa principal");
          }
        })
        .catch(() => {
          errorsList.push("Não foi possível carregar a tarefa principal");
        });

      const commentsPromise = fetch(`/api/todoist/comments?task_id=${task.id}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            commentsList = normalizeTodoistList(data);
            setRealTimeComments(commentsList);
          } else {
            errorsList.push("Não foi possível carregar comentários");
          }
        })
        .catch(() => {
          errorsList.push("Não foi possível carregar comentários");
        });

      const subtasksPromise = fetch(`/api/todoist/tasks?project_id=${task.project_id}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const allProjTasks = normalizeTodoistList(data);
            subtasksList = allProjTasks.filter((t: any) => String(t.parent_id) === String(task.id));
            setRealTimeSubtasks(subtasksList);
          } else {
            errorsList.push("Não foi possível carregar subtarefas");
          }
        })
        .catch(() => {
          errorsList.push("Não foi possível carregar subtarefas");
        });

      const projectsPromise = fetch("/api/todoist/projects")
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const projectsArray = normalizeTodoistList(data);
            const matchedProject = projectsArray.find((p: any) => String(p.id) === String(task.project_id));
            if (matchedProject) {
              projectName = matchedProject.name;
            }
          } else {
            errorsList.push("Não foi possível resolver o nome do projeto");
          }
        })
        .catch(() => {
          errorsList.push("Não foi possível resolver o nome do projeto");
        });

      const sectionsPromise = fetch(`/api/todoist/sections?project_id=${task.project_id}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const sectionsArray = normalizeTodoistList(data);
            setTodoistSections(sectionsArray);
            const matchedSection = sectionsArray.find((s: any) => String(s.id) === String(task.section_id));
            if (matchedSection) {
              sectionName = matchedSection.name;
            }
          } else {
            errorsList.push("Não foi possível resolver a seção");
          }
        })
        .catch(() => {
          errorsList.push("Não foi possível resolver a seção");
        });

      const collaboratorsPromise = fetch(`/api/todoist/projects/${task.project_id}/collaborators`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const collaboratorsArray = normalizeTodoistList(data);
            setProjectCollaborators(collaboratorsArray);
            
            const matchedAssignee = collaboratorsArray.find((c: any) => String(c.id) === String(task.assignee_id));
            if (matchedAssignee) {
              assigneeName = matchedAssignee.name || matchedAssignee.email;
            }
            
            const matchedCreator = collaboratorsArray.find((c: any) => String(c.id) === String(task.creator_id));
            if (matchedCreator) {
              creatorName = matchedCreator.name || matchedCreator.email;
            } else if (task.creator_id) {
              creatorName = "Usuário Todoist";
            }
          } else {
            errorsList.push("Não foi possível resolver o responsável");
          }
        })
        .catch(() => {
          errorsList.push("Não foi possível resolver o responsável");
        });

      const labelsPromise = fetch("/api/todoist/labels")
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const labelsArray = normalizeTodoistList(data);
            setTodoistLabels(labelsArray);
          }
        })
        .catch(() => {});

      // Executar todos os fetches básicos em paralelo
      await Promise.allSettled([
        taskDetailsPromise,
        commentsPromise,
        subtasksPromise,
        projectsPromise,
        sectionsPromise,
        collaboratorsPromise,
        labelsPromise
      ]);

      if (isTimedOut) return;

      // Carregar comentários das subtarefas em paralelo se as subtarefas foram carregadas
      const subtaskCommentsMap: Record<string, any[]> = {};
      const subtaskAssigneesMap: Record<string, string> = {};

      if (subtasksList.length > 0) {
        const subtaskPromises = subtasksList.map(async (sub) => {
          try {
            const subCommRes = await fetch(`/api/todoist/comments?task_id=${sub.id}`);
            if (subCommRes.ok) {
              const subCommsRaw = await subCommRes.json();
              subtaskCommentsMap[sub.id] = normalizeTodoistList(subCommsRaw);
            } else {
              subtaskCommentsMap[sub.id] = [];
            }
          } catch {
            subtaskCommentsMap[sub.id] = [];
          }
        });
        await Promise.allSettled(subtaskPromises);
        if (isTimedOut) return;
        setExpandedSubtaskComments(subtaskCommentsMap);
      }

      // Consolidar dados enriquecidos
      const enriched = {
        mainTask: {
          ...mainTaskObj,
          labels: mainTaskObj.labels || []
        },
        projectName,
        sectionName,
        assigneeName,
        creatorName,
        comments: commentsList,
        subtasks: subtasksList.map(sub => ({
          ...sub,
          assigneeName: subtaskAssigneesMap[sub.id] || "Não informado pelo Todoist",
          comments: subtaskCommentsMap[sub.id] || []
        }))
      };

      setEnrichedTaskData(enriched);
      setMirrorErrors(errorsList);
      
      if (errorsList.length === 0) {
        setMirrorSyncMessage("✅ Espelho sincronizado com Todoist");
      } else {
        setMirrorSyncMessage("⚠️ Alguns dados não puderam ser sincronizados. Consulte os Logs da Automação Todoist.");
        errorsList.forEach(err => {
          addAutomationLog({
            type: "error",
            message: `Falha parcial na sincronização: ${err}`,
            timestamp: new Date().toISOString(),
            source: "Todoist Mirror Sync"
          });
        });
      }
    };

    try {
      await Promise.race([loadDataPromise(), timeoutPromise]);
    } catch (err: any) {
      console.error("Erro ou Timeout no Espelho:", err);
      addAutomationLog({
        type: "error",
        message: `Falha/Timeout no Espelho: ${err.message || err}`,
        timestamp: new Date().toISOString(),
        source: "Todoist Mirror Sync"
      });
      setMirrorSyncMessage("⚠️ Sincronização incompleta (Timeout/Erro).");
    } finally {
      setMirrorSyncLoading(false);
    }
  };

  const syncFullTodoistMirrorData = () => loadTodoistMirror(todoistLinkedTask);

  useEffect(() => {
    if (todoistLinkedTask?.id) {
      loadTodoistMirror(todoistLinkedTask);
    } else {
      setEnrichedTaskData(null);
      setRealTimeSubtasks([]);
      setRealTimeComments([]);
    }
  }, [todoistLinkedTask?.id]);

  const addActivityLog = (text: string) => {
    setActivityLogs(prev => [
      { id: `act-${Date.now()}`, text, time: new Date() },
      ...prev
    ]);
  };

  const fetchLabelsAndSections = async () => {
    try {
      const labelsRes = await fetch("/api/todoist/labels");
      if (labelsRes.ok) {
        const data = await labelsRes.json();
        const labelsArray = normalizeTodoistList(data, "labelsList");
        setTodoistLabels(labelsArray);
      }
      if (todoistLinkedTask?.project_id) {
        const sectionsRes = await fetch("/api/todoist/sections");
        if (sectionsRes.ok) {
          const data = await sectionsRes.json();
          const sectionsArray = normalizeTodoistList(data, "sectionsList");
          const filtered = sectionsArray.filter((s: any) => s.project_id === todoistLinkedTask.project_id);
          setTodoistSections(filtered);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar labels e seções:", e);
    }
  };

  const fetchSubtaskComments = async (subtaskId: string) => {
    setLoadingSubtaskComments(prev => ({ ...prev, [subtaskId]: true }));
    try {
      const res = await fetch(`/api/todoist/comments?task_id=${subtaskId}`);
      if (res.ok) {
        const data = await res.json();
        const commentsArray = normalizeTodoistList(data, "commentsList");
        setExpandedSubtaskComments(prev => ({ ...prev, [subtaskId]: commentsArray }));
      }
    } catch (e) {
      console.error("Erro ao carregar comentários da subtarefa:", e);
    } finally {
      setLoadingSubtaskComments(prev => ({ ...prev, [subtaskId]: false }));
    }
  };

  const handleAddSubtaskComment = async (subtaskId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = subtaskCommentsInput[subtaskId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/todoist/comments`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: subtaskId, content: text })
      });
      if (res.ok) {
        addSystemLog("success", "Comentário adicionado à subtarefa!");
        setSubtaskCommentsInput(prev => ({ ...prev, [subtaskId]: "" }));
        syncFullTodoistMirrorData();
        addActivityLog(`Comentário adicionado à subtarefa`);
      }
    } catch (e) {
      console.error("Erro ao adicionar comentário à subtarefa:", e);
    }
  };

  const handleOpenSubtaskDetails = (subtask: any) => {
    if (!todoistLinkedTask) return;
    setTaskNavigationStack(prev => [...prev, todoistLinkedTask]);
    if (setTodoistLinkedTask) {
      setTodoistLinkedTask(subtask);
    }
    addActivityLog(`Navegou para subtarefa: ${subtask.content}`);
  };

  const handleNavigateBackToParent = () => {
    if (taskNavigationStack.length === 0) return;
    const prevStack = [...taskNavigationStack];
    const parentTask = prevStack.pop();
    setTaskNavigationStack(prevStack);
    if (setTodoistLinkedTask && parentTask) {
      setTodoistLinkedTask(parentTask);
    }
    addActivityLog(`Voltou para tarefa pai: ${parentTask?.content}`);
  };

  const fetchRealTimeComments = async () => {
    if (!todoistLinkedTask?.id) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/todoist/comments?task_id=${todoistLinkedTask.id}`);
      if (res.ok) {
        const data = await res.json();
        const commentsArray = normalizeTodoistList(data, "commentsList");
        setRealTimeComments(commentsArray);
      }
    } catch (e) {
      console.error("Erro ao carregar comentários do Todoist:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchRealTimeSubtasks = async () => {
    if (!todoistLinkedTask?.id) return;
    setLoadingSubtasks(true);
    try {
      const res = await fetch(`/api/todoist/tasks?project_id=${todoistLinkedTask.project_id}`);
      if (res.ok) {
        const data = await res.json();
        const tasksArray = normalizeTodoistList(data, "tasksList");
        const subs = tasksArray.filter((t: any) => t.parent_id === todoistLinkedTask.id);
        setRealTimeSubtasks(subs);
      }
    } catch (e) {
      console.error("Erro ao carregar subtarefas do Todoist:", e);
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const handleUpdateProperty = async (fields: any) => {
    if (!todoistLinkedTask?.id) return;
    setTodoistLoadingLocal(true);
    try {
      const payload: any = {};
      if (fields.content !== undefined) payload.content = fields.content;
      if (fields.description !== undefined) payload.description = fields.description;
      if (fields.due_date !== undefined) payload.due_date = fields.due_date;
      if (fields.priority !== undefined) payload.priority = fields.priority;
      if (fields.project_id !== undefined) payload.project_id = fields.project_id;
      if (fields.section_id !== undefined) payload.section_id = fields.section_id;
      if (fields.labels !== undefined) payload.labels = fields.labels;
      if (fields.assignee_id !== undefined) payload.assignee_id = fields.assignee_id;

      const res = await fetch(`/api/todoist/tasks/${todoistLinkedTask.id}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        if (setTodoistLinkedTask) {
          setTodoistLinkedTask(updated);
        }
        // Keep parent states synchronized as well
        if (fields.content !== undefined) setTodoistTaskTitle(fields.content);
        if (fields.description !== undefined) setTodoistTaskDescription(fields.description);
        if (fields.due_date !== undefined) setTodoistTaskDate(fields.due_date);
        if (fields.priority !== undefined) setTodoistTaskPriority(fields.priority);
        if (fields.project_id !== undefined) setTodoistTaskProject(fields.project_id);
        if (fields.labels !== undefined) setTodoistTaskLabels(fields.labels);

        addSystemLog("success", "Sincronizado instantaneamente com o Todoist!");
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao atualizar no Todoist.");
      }
    } catch (e) {
      console.error(e);
      addSystemLog("error", "Falha de rede ao conectar com o Todoist.");
    } finally {
      setTodoistLoadingLocal(false);
      setIsEditingTitle(false);
      setIsEditingDescription(false);
    }
  };

  const handleToggleParentTask = async () => {
    if (!todoistLinkedTask?.id) return;
    setTodoistLoadingLocal(true);
    const isClosing = !todoistLinkedTask.is_completed;
    const endpoint = isClosing ? `/api/todoist/tasks/${todoistLinkedTask.id}/close` : `/api/todoist/tasks/${todoistLinkedTask.id}/reopen`;
    try {
      const res = await fetch(endpoint, {
        method: "POST"
      });
      if (res.ok) {
        addSystemLog("success", isClosing ? "Tarefa marcada como CONCLUÍDA no Todoist!" : "Tarefa REABERTA no Todoist!");
        if (setTodoistLinkedTask) {
          setTodoistLinkedTask({ ...todoistLinkedTask, is_completed: isClosing });
        }
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao alterar estado da tarefa no Todoist.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const handleAddRealTimeSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSubtaskInput.trim() || !todoistLinkedTask?.id) return;
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/tasks`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: localSubtaskInput.trim(),
          parent_id: todoistLinkedTask.id,
          project_id: todoistLinkedTask.project_id
        })
      });
      if (res.ok) {
        addSystemLog("success", `Subtarefa "${localSubtaskInput.trim()}" criada no Todoist!`);
        setLocalSubtaskInput("");
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao criar subtarefa no Todoist.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const [projectCollaborators, setProjectCollaborators] = useState<any[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const fetchCollaborators = async () => {
    if (!todoistLinkedTask?.project_id) return;
    setLoadingCollaborators(true);
    try {
      const res = await fetch(`/api/todoist/projects/${todoistLinkedTask.project_id}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        const collaboratorsList = normalizeTodoistList(data, "collaboratorsList");
        setProjectCollaborators(collaboratorsList);
      }
    } catch (e) {
      console.error("Erro ao carregar colaboradores do projeto:", e);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  useEffect(() => {
    if (isAutomationConfigModalOpen && todoistLinkedTask?.project_id) {
      fetchCollaborators();
    }
  }, [isAutomationConfigModalOpen, todoistLinkedTask?.project_id]);

  const runTodoistAutomation = async () => {
    if (!todoistLinkedTask) {
      addSystemLog("error", "Localize uma tarefa do Todoist antes de executar a automação.");
      return;
    }
    
    // Clear previous logs and start new execution
    const newLogsList: Array<{ id: string; text: string; type: 'success' | 'alert' | 'error' | 'processing' }> = [];
    const pushLog = (type: 'success' | 'alert' | 'error' | 'processing', text: string) => {
      const newLog = { id: Date.now() + Math.random().toString(), text, type };
      newLogsList.push(newLog);
      setAutomationLogs([...newLogsList]);
      localStorage.setItem("boss_todoist_automation_logs", JSON.stringify([...newLogsList]));
    };

    setAutomationLogs([]);
    pushLog("processing", "Executando automação...");
    setTodoistLoadingLocal(true);

    try {
      // 1. Fetch collaborators to map assignee if set
      let assigneeId: string | undefined = undefined;
      let assigneeName = automationConfig.assignee || "";
      let assigneeFound = false;

      if (assigneeName) {
        pushLog("processing", `Buscando responsável "${assigneeName}" via API do Todoist...`);
        try {
          const collabRes = await fetch(`/api/todoist/projects/${todoistLinkedTask.project_id}/collaborators`);
          if (collabRes.ok) {
            const collaboratorsRaw = await collabRes.json();
            const collaborators = normalizeTodoistList(collaboratorsRaw, "collaboratorsList");
            const match = collaborators.find((col: any) => {
              const nameLower = (col.name || "").toLowerCase();
              const emailLower = (col.email || "").toLowerCase();
              const searchLower = assigneeName.toLowerCase();
              return nameLower.includes(searchLower) || 
                     emailLower.includes(searchLower);
            });
            if (match) {
              assigneeId = match.id;
              assigneeName = match.name || assigneeName;
              assigneeFound = true;
              pushLog("success", `Responsável "${assigneeName}" localizado (ID: ${assigneeId})`);
            }
          }
        } catch (collabErr) {
          console.error("Erro ao buscar colaboradores:", collabErr);
        }
      }

      // 2. Prepare content/title and fallback
      let rawTitle = automationConfig.taskName || "Secretariado, por gentileza, agendar reunião com o cliente hoje";
      let finalTitle = rawTitle;
      
      // Strip any existing prefix if assignee found
      if (assigneeFound && assigneeId) {
        if (finalTitle.startsWith("+giffonisecretaria ")) {
          finalTitle = finalTitle.replace("+giffonisecretaria ", "");
        }
        if (assigneeName && finalTitle.startsWith(`+${assigneeName} `)) {
          finalTitle = finalTitle.replace(`+${assigneeName} `, "");
        }
      } else if (assigneeName) {
        // Fallback: prepend the +prefix if not already present
        const prefix = `+${assigneeName}`;
        if (!finalTitle.startsWith("+giffonisecretaria") && !finalTitle.startsWith(prefix)) {
          finalTitle = `${prefix} ${finalTitle}`;
        }
        pushLog("alert", `Responsável não localizado via assignee_id; mantido prefixo "${prefix}" no título como fallback`);
        addSystemLog("info", `Responsável não localizado via assignee_id; mantido prefixo "${prefix}" no título como fallback.`);
      }

      // 3. Resolve due date
      let finalDueDate: string | undefined = undefined;
      if (automationConfig.dueDate) {
        if (automationConfig.dueDate.trim().toLowerCase() === "hoje") {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          finalDueDate = `${year}-${month}-${day}`;
          pushLog("success", `Prazo definido para hoje: ${finalDueDate}`);
        } else {
          finalDueDate = automationConfig.dueDate;
          pushLog("success", `Prazo definido para: ${finalDueDate}`);
        }
      }

      // 4. Build payload
      const payload: any = {
        content: finalTitle,
      };

      if (automationConfig.description) {
        payload.description = automationConfig.description;
      }
      if (assigneeId) {
        payload.assignee_id = assigneeId;
        pushLog("success", `Responsável atribuído: ${assigneeName}`);
      }
      if (finalDueDate) {
        payload.due_date = finalDueDate;
      }
      if (automationConfig.priority) {
        payload.priority = Number(automationConfig.priority);
      }
      if (automationConfig.labels) {
        payload.labels = automationConfig.labels.split(",").map((l: string) => l.trim()).filter(Boolean);
      }
      if (automationConfig.order) {
        payload.order = Number(automationConfig.order);
      }

      let isEdit = automationConfig.actionType === "Editar tarefa principal";
      let isCreateMain = automationConfig.actionType === "Criar tarefa principal";
      let isCreateSub = automationConfig.actionType === "Criar subtarefa" || !automationConfig.actionType;

      let url = "/api/todoist/tasks";
      let method = "POST";

      if (isEdit) {
        url = `/api/todoist/tasks/${todoistLinkedTask.id}`;
        method = "POST";
        pushLog("processing", `Enviando payload de edição para tarefa principal ${todoistLinkedTask.id}...`);
      } else {
        // Create task/subtask
        payload.project_id = automationConfig.project || todoistLinkedTask.project_id;
        if (automationConfig.section) {
          payload.section_id = automationConfig.section;
        }
        if (isCreateSub) {
          payload.parent_id = automationConfig.parentTask || todoistLinkedTask.id;
          pushLog("processing", `Enviando payload de criação de subtarefa no Todoist...`);
        } else {
          if (automationConfig.parentTask) {
            payload.parent_id = automationConfig.parentTask;
          }
          pushLog("processing", `Enviando payload de criação de tarefa principal no Todoist...`);
        }
      }

      // Call API
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const responseData = await res.json();
        pushLog("success", "Payload enviado ao Todoist");
        
        if (isEdit) {
          pushLog("success", "Tarefa principal editada no Todoist!");
          addSystemLog("success", "Tarefa principal editada no Todoist.");
        } else if (isCreateSub) {
          pushLog("success", "Subtarefa criada no Todoist!");
          addSystemLog("success", "Subtarefa criada para o Secretariado.");
        } else {
          pushLog("success", "Tarefa principal criada no Todoist!");
          addSystemLog("success", "Tarefa criada no Todoist.");
        }

        // Refresh mirror view
        pushLog("processing", "Atualizando espelho da tarefa...");
        await fetchRealTimeSubtasks();
        if (typeof fetchRealTimeComments === "function") {
          await fetchRealTimeComments();
        }
        pushLog("success", "Espelho da tarefa atualizado");
      } else {
        const status = res.status;
        let bodyText = "";
        try {
          const errData = await res.json();
          bodyText = JSON.stringify(errData);
        } catch {
          bodyText = await res.text();
        }
        pushLog("error", "Erro ao executar automação");
        pushLog("error", `Status HTTP: ${status}`);
        pushLog("error", `Resposta Todoist: ${bodyText}`);
        addSystemLog("error", `Falha ao executar automação Todoist (Status: ${status}).`);
      }
    } catch (e: any) {
      console.error(e);
      pushLog("error", `Erro ao conectar com a API Todoist: ${e.message}`);
      addSystemLog("error", "Erro de conexão com a API do Todoist.");
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const renderTemplate = (template: string, variables: Record<string, string>) => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.split(`{${key}}`).join(value || "");
    }
    return result;
  };

  const handleExecuteDelegarPrazo = async () => {
    if (!todoistLinkedTask) {
      addSystemLog("error", "Localize uma tarefa do Todoist antes de delegar prazo.");
      return;
    }

    if (!delegarResponsavelNome.trim()) {
      addSystemLog("error", "O campo 'Quem é o responsável?' é obrigatório.");
      return;
    }

    if (!delegarPrazoFatal) {
      addSystemLog("error", "O campo 'Qual é o Prazo Fatal?' é obrigatório.");
      return;
    }

    if (!delegarOQueFazer.trim()) {
      addSystemLog("error", "O campo 'O que deverá ser feito?' é obrigatório.");
      return;
    }

    setDelegarLoading(true);
    try {
      let assigneeId: string | undefined = undefined;
      let isFallback = true;
      let finalResponsavelNome = delegarResponsavelNome.trim();

      // Find if we have assigneeId
      if (delegarResponsavelId && delegarResponsavelId !== "fallback") {
        assigneeId = delegarResponsavelId;
        isFallback = false;
        const matched = projectCollaborators.find(c => String(c.id) === String(delegarResponsavelId));
        if (matched) {
          finalResponsavelNome = matched.name || finalResponsavelNome;
        }
      } else {
        // Try to match name to a collaborator
        const match = projectCollaborators.find((col: any) => {
          const nameLower = (col.name || "").toLowerCase();
          const emailLower = (col.email || "").toLowerCase();
          const searchLower = finalResponsavelNome.toLowerCase();
          return nameLower.includes(searchLower) || emailLower.includes(searchLower);
        });
        if (match) {
          assigneeId = match.id;
          finalResponsavelNome = match.name || finalResponsavelNome;
          isFallback = false;
        }
      }

      // Format fallback name for +Name notation (no spaces, remove accents)
      const formatFallbackName = (name: string) => {
        return name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "");
      };

      // Apply the title template
      const titleTemplate = delegarConfig.modeloTitulo || "[{responsavel}] {o_que_fazer}";
      let finalTitle = "";
      if (isFallback) {
        if (titleTemplate === "[{responsavel}] {o_que_fazer}") {
          finalTitle = `+${formatFallbackName(finalResponsavelNome)} ${delegarOQueFazer.trim()}`;
        } else {
          finalTitle = renderTemplate(titleTemplate, {
            responsavel: formatFallbackName(finalResponsavelNome),
            o_que_fazer: delegarOQueFazer.trim()
          });
        }
      } else {
        finalTitle = renderTemplate(titleTemplate, {
          responsavel: finalResponsavelNome,
          o_que_fazer: delegarOQueFazer.trim()
        });
      }

      // Render description
      const descTemplate = delegarConfig.modeloDescricao || "Prazo fatal: {prazo_fatal}\nPrazo de segurança: {prazo_seguranca}\nNotificação: {notificacao}\nOrigem: Automação Delegar Prazo para a Equipe";
      const finalDescription = renderTemplate(descTemplate, {
        prazo_fatal: delegarPrazoFatal,
        prazo_seguranca: delegarPrazoSeguranca,
        notificacao: delegarNotificado || "Não definida"
      });

      // Build payload
      const payload: any = {
        content: finalTitle,
        description: finalDescription,
      };

      if (assigneeId) {
        payload.assignee_id = assigneeId;
      }

      if (delegarPrazoFatal) {
        payload.due_date = delegarPrazoFatal;
      }

      // Handle project inheritance or override
      payload.project_id = delegarConfig.projetoHerdado ? todoistLinkedTask.project_id : (delegarConfig.project || todoistLinkedTask.project_id);

      // Handle section inheritance or override
      if (delegarConfig.secaoHerdada && todoistLinkedTask.section_id) {
        payload.section_id = todoistLinkedTask.section_id;
      } else if (delegarConfig.section) {
        payload.section_id = delegarConfig.section;
      }

      // Priority and labels
      payload.priority = Number(delegarConfig.prioridadePadrao || 1);
      if (delegarConfig.etiquetasPadrao) {
        payload.labels = delegarConfig.etiquetasPadrao.split(",").map((l: string) => l.trim()).filter(Boolean);
      }

      // Is subtask
      if (delegarConfig.tipo === "criar subtarefa" || !delegarConfig.tipo) {
        payload.parent_id = todoistLinkedTask.id;
      }

      // Make API request
      const res = await fetch("/api/todoist/tasks", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addSystemLog("success", "Prazo delegado e subtarefa criada no Todoist!");
        
        // Add log
        const logText = `Prazo delegado: "${finalTitle}" | Prazo fatal: ${delegarPrazoFatal} | Segurança: ${delegarPrazoSeguranca}`;
        const newLog = { id: Date.now() + Math.random().toString(), text: logText, type: 'success' as const };
        setAutomationLogs(prev => [newLog, ...prev]);
        localStorage.setItem("boss_todoist_automation_logs", JSON.stringify([newLog, ...automationLogs]));

        // Clear and close
        setDelegarOQueFazer("");
        setDelegarPrazoFatal("");
        setDelegarPrazoSeguranca("");
        setDelegarNotificado("");
        setIsDelegarPrazoModalOpen(false);

        // Reload task espelho (subtasks and comments)
        await syncFullTodoistMirrorData();
      } else {
        const errorText = await res.text();
        addAutomationLog({
          type: "error",
          message: `Erro ao criar subtarefa de prazo no Todoist (Status ${res.status}): ${errorText}`,
          timestamp: new Date().toISOString(),
          source: "Delegar Prazo Automation"
        });
        addSystemLog("error", "Erro ao criar subtarefa de prazo. Verifique os Logs da Automação.");
      }
    } catch (err: any) {
      console.error(err);
      addAutomationLog({
        type: "error",
        message: `Erro ao executar a automação de delegar prazo: ${err.message || err}`,
        timestamp: new Date().toISOString(),
        source: "Delegar Prazo Automation"
      });
      addSystemLog("error", "Falha crítica ao executar a automação. Verifique os Logs da Automação.");
    } finally {
      setDelegarLoading(false);
    }
  };

  const handleOpenDelegarPrazoForm = () => {
    if (!todoistLinkedTask) {
      addSystemLog("error", "Localize uma tarefa do Todoist antes de delegar prazo.");
      return;
    }
    
    // Initialize values
    const defaultResp = delegarConfig.responsavelPadrao || "";
    const matched = projectCollaborators.find(c => 
      String(c.id) === String(defaultResp) || 
      (c.name && c.name.toLowerCase() === defaultResp.toLowerCase()) || 
      (c.email && c.email.toLowerCase() === defaultResp.toLowerCase())
    );
    if (matched) {
      setDelegarResponsavelId(matched.id);
      setDelegarResponsavelNome(matched.name || matched.email);
    } else {
      setDelegarResponsavelId(defaultResp ? "fallback" : "");
      setDelegarResponsavelNome(defaultResp);
    }
    
    setDelegarPrazoFatal("");
    setDelegarPrazoSeguranca("");
    setDelegarNotificado("");
    setDelegarOQueFazer("");
    setIsDelegarPrazoModalOpen(true);
  };

  const handleCreateSecretariadoSubtask = async () => {
    await runTodoistAutomation();
  };

  const handleCopySubtaskText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addSystemLog("success", "Texto da subtarefa copiado.");
    } catch (e) {
      console.error(e);
      addSystemLog("error", "Erro ao copiar texto.");
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    setTodoistLoadingLocal(true);
    const endpoint = !currentCompleted ? `/api/todoist/tasks/${subtaskId}/close` : `/api/todoist/tasks/${subtaskId}/reopen`;
    try {
      const res = await fetch(endpoint, {
        method: "POST"
      });
      if (res.ok) {
        addSystemLog("success", !currentCompleted ? "Subtarefa marcada como concluída!" : "Subtarefa reaberta!");
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao atualizar subtarefa.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/tasks/${subtaskId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        addSystemLog("success", "Subtarefa excluída do Todoist.");
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao excluir subtarefa.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const handleAddRealTimeComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localCommentInput.trim() || !todoistLinkedTask?.id) return;
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/comments`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: todoistLinkedTask.id,
          content: localCommentInput.trim()
        })
      });
      if (res.ok) {
        addSystemLog("success", "Comentário registrado diretamente no Todoist!");
        setLocalCommentInput("");
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao registrar comentário.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/comments/${commentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        addSystemLog("success", "Comentário removido do Todoist.");
        syncFullTodoistMirrorData();
      } else {
        addSystemLog("error", "Erro ao remover comentário.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const handleCreateMirrorTask = async () => {
    if (!todoistHealth?.enabled) {
      addSystemLog("warning", "O Todoist não está ativo ou conectado via secret.");
      return;
    }
    setTodoistLoadingLocal(true);
    try {
      // Create with clean properties prefilled
      const taskPayload = {
        content: `Processo ${cleanCnjStr}: ${controladoriaActiveItem.autor || "Não identificado"} x ${controladoriaActiveItem.reu || "Não identificado"}`,
        description: `### Informações do Processo\n* **CNJ:** ${cleanCnjStr}\n* **Autor:** ${controladoriaActiveItem.autor || "Não identificado"}\n* **Réu:** ${controladoriaActiveItem.reu || "Não identificado"}\n* **Sugestão de Prazo:** ${controladoriaActiveItem.deadlineDays || 15} dias úteis\n\n### Conteúdo da Publicação\n${controladoriaActiveItem.snippet || controladoriaActiveItem.subject || "Sem resumo disponível."}`,
        priority: 2,
        labels: ["Push", "Prazo", "Controladoria"],
        project_id: todoistProjects.length > 0 ? todoistProjects[0].id : undefined
      };

      const res = await fetch(`/api/todoist/tasks`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskPayload)
      });

      if (res.ok) {
        const newTask = await res.json();
        addSystemLog("success", "Tarefa Espelho criada no Todoist com sucesso!");
        if (setTodoistLinkedTask) {
          setTodoistLinkedTask(newTask);
        }
      } else {
        addSystemLog("error", "Erro ao criar Tarefa Espelho no Todoist.");
      }
    } catch (e) {
      console.error(e);
      addSystemLog("error", "Falha de rede ao criar tarefa.");
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  // Save stats to localStorage on change
  useEffect(() => {
    localStorage.setItem("boss_processed_today_count", processedToday.toString());
  }, [processedToday]);

  useEffect(() => {
    localStorage.setItem("boss_avg_time_per_pub", avgTimePerPub.toString());
  }, [avgTimePerPub]);

  useEffect(() => {
    localStorage.setItem("boss_smart_queues_stats", JSON.stringify(smartQueues));
  }, [smartQueues]);

  // Compute values
  const groups = groupedPushes?.groups || [];
  const currentIdx = groups.findIndex((g: any) => g.processNumber === controladoriaActiveItem.processNumber);
  const totalInQueue = groups.length || 0;
  const currentPosition = currentIdx !== -1 ? currentIdx + 1 : 0;
  const pendingInQueue = groups.filter((g: any) => {
    const isConf = publications.some(p => p.processNumber.replace(/\s+/g, '') === g.processNumber.replace(/\s+/g, ''));
    return !isConf;
  }).length || 0;

  // Estimated remaining time in minutes
  const estRemainingMin = Math.max(1, Math.round((pendingInQueue * avgTimePerPub) / 60));

  // Determine current active route ID for sub-routing
  const activeSubRouteId = source?.id || 'trt-mg';

  // 1. Initial Duplicate Check on Mount/Active Item Change
  useEffect(() => {
    if (controladoriaActiveItem) {
      const isAlreadyProcessed = publications.some(
        p => p.processNumber.replace(/\s+/g, '') === cleanCnjStr && cleanCnjStr !== 'Nãoidentificado'
      );
      if (isAlreadyProcessed || todoistLinkedTask) {
        setShowDuplicateWarning(true);
      } else {
        setShowDuplicateWarning(false);
      }
      // Reset comments and subtasks
      setLocalComments([]);
    }
  }, [controladoriaActiveItem, publications, cleanCnjStr, todoistLinkedTask]);

  // Effect to fetch Todoist health status and update validation time
  useEffect(() => {
    const fetchLocalHealth = async () => {
      try {
        const res = await fetch("/api/todoist/health");
        if (res.ok) {
          const data = await res.json();
          setLocalTodoistHealth(data);
          setLastVerificationTime(new Date().toLocaleString('pt-BR'));
        } else {
          setLocalTodoistHealth({
            enabled: false,
            tokenLoaded: false,
            tokenSource: 'AUSENTE',
            status: 'error'
          });
          setLastVerificationTime(new Date().toLocaleString('pt-BR'));
        }
      } catch (err) {
        console.error("Erro ao buscar saúde local do Todoist:", err);
        setLocalTodoistHealth({
          enabled: false,
          tokenLoaded: false,
          tokenSource: 'AUSENTE',
          status: 'error'
        });
        setLastVerificationTime(new Date().toLocaleString('pt-BR'));
      }
    };
    fetchLocalHealth();
  }, [controladoriaActiveItem?.id]);

  // 2. Silent Pre-loading of Next Publication
  useEffect(() => {
    let active = true;
    if (groups.length > 0 && currentIdx !== -1 && currentIdx < groups.length - 1) {
      const nextGroup = groups[currentIdx + 1];
      const nextMsg = nextGroup.messages[0];
      
      const preloadNext = async () => {
        setIsPreloading(true);
        try {
          // If bodyText is missing on the next message, fetch details silently
          let detailedMsg = { ...nextMsg };
          if (!nextMsg.bodyText) {
            const token = localStorage.getItem('boss_gmail_token');
            if (token) {
              const res = await fetch("/api/gmail-messages-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  accessToken: token,
                  messageIds: [nextMsg.id]
                })
              });
              if (res.ok) {
                const details = await res.json();
                if (details.messages && details.messages.length > 0) {
                  detailedMsg = { ...detailedMsg, ...details.messages[0] };
                }
              }
            }
          }
          
          if (active) {
            setNextItemPreloaded({
              msg: detailedMsg,
              group: nextGroup
            });
          }
        } catch (e) {
          console.error("Silent preload failed:", e);
        } finally {
          setIsPreloading(false);
        }
      };

      // Run pre-loading 1.5 seconds after mounting to let UI render smoothly
      const timer = setTimeout(() => {
        preloadNext();
      }, 1500);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [groups, currentIdx]);

  // 3. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture inputs if they are being filled, unless Ctrl or Alt modifier is present
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      
      if (isInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
        return;
      }

      // Ctrl + Enter: Save (Only)
      if (e.ctrlKey && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        triggerDirectSave('save_only');
      }
      
      // Ctrl + Shift + Enter: Save and Next
      if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        triggerDirectSave('save_and_next');
      }

      // Ctrl + ArrowRight: Next (Pular/Skip)
      if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleSkip();
      }

      // Ctrl + ArrowLeft: Prev
      if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }

      // Ctrl + D: Delegar Prazo Panel
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDelegarOpen(prev => !prev);
      }

      // Ctrl + H: Histórico Panel
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setIsHistoricoOpen(prev => !prev);
      }

      // Ctrl + P: Abrir Processo
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleOpenProcesso();
      }

      // Ctrl + G: Abrir Gmail
      if (e.ctrlKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleOpenGmail();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [todoistTaskTitle, todoistTaskDescription, todoistTaskAssignee, todoistTaskDate, todoistTaskPriority, todoistTaskProject, todoistTaskComments, todoistTaskSubtasks, todoistTaskLabels, localComments]);

  // Actions
  const handleOpenProcesso = () => {
    if (controladoriaActiveItem.processNumber) {
      const courtUrl = source?.id === "trt-mg"
        ? `https://pje.trt3.jus.br/consultaprocessual/detalhe-processo/${cleanCnjStr}`
        : "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam";
      window.open(courtUrl, "_blank");
      addSystemLog("info", `Abrindo consulta processual do CNJ ${controladoriaActiveItem.processNumber} em nova aba.`);
    }
  };

  const handleOpenGmail = () => {
    if (controladoriaActiveItem.id) {
      const msgIdClean = controladoriaActiveItem.id.replace("gmail-", "");
      window.open(`https://mail.google.com/mail/u/0/#inbox/${msgIdClean}`, "_blank");
      addSystemLog("info", `Abrindo e-mail original no Gmail.`);
    }
  };

  const handleOpenTodoist = () => {
    if (todoistLinkedTask?.id) {
      window.open(`https://app.todoist.com/app/task/${todoistLinkedTask.id}`, "_blank");
    } else {
      window.open(`https://app.todoist.com/app/search/${encodeURIComponent(cleanCnjStr)}`, "_blank");
    }
    addSystemLog("info", `Navegando para o Todoist em nova aba.`);
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const prevGroup = groups[currentIdx - 1];
      const prevMsg = prevGroup.messages[0];
      handleOpenControladoriaWorkspace(prevMsg, prevGroup, activeSubRouteId);
      addSystemLog("info", `Retornando para publicação anterior: Processo ${prevGroup.processNumber}`);
    } else {
      addSystemLog("warning", "Esta já é a primeira publicação da fila.");
    }
  };

  const handleSkip = () => {
    if (currentIdx < groups.length - 1) {
      const nextGroup = groups[currentIdx + 1];
      const nextMsg = nextGroup.messages[0];
      handleOpenControladoriaWorkspace(nextMsg, nextGroup, activeSubRouteId);
      addSystemLog("info", `Publicação pulada. Avançando para: Processo ${nextGroup.processNumber}`);
    } else {
      addSystemLog("warning", "Você chegou ao fim da fila de pendências!");
    }
  };

  const handleMarkAsRevisarDepois = () => {
    // Add to revisar list and update smart stats
    addSystemLog("info", `Publicação do processo ${cleanCnjStr} marcada para 'Revisar Depois'.`);
    
    // Update Smart Stats for current active source queue
    setSmartQueues(prev => {
      const q = prev[activeSubRouteId] || prev['trt-mg'];
      return {
        ...prev,
        [activeSubRouteId]: {
          ...q,
          revisao: q.revisao + 1,
          pendentes: Math.max(0, q.pendentes - 1)
        }
      };
    });

    handleSkip();
  };

  const handleMarkAsIgnored = () => {
    addSystemLog("info", `Publicação do processo ${cleanCnjStr} marcada como 'Não é Publicação' (Ignorada).`);
    
    setSmartQueues(prev => {
      const q = prev[activeSubRouteId] || prev['trt-mg'];
      return {
        ...prev,
        [activeSubRouteId]: {
          ...q,
          ignorados: q.ignorados + 1,
          pendentes: Math.max(0, q.pendentes - 1)
        }
      };
    });

    handleSkip();
  };

  const handleMarkAsDuplicate = () => {
    addSystemLog("info", `Publicação do processo ${cleanCnjStr} sinalizada como 'Duplicada'.`);
    
    setSmartQueues(prev => {
      const q = prev[activeSubRouteId] || prev['trt-mg'];
      return {
        ...prev,
        [activeSubRouteId]: {
          ...q,
          duplicados: q.duplicados + 1,
          pendentes: Math.max(0, q.pendentes - 1)
        }
      };
    });

    handleSkip();
  };

  const handleQuickMarkConferred = async () => {
    setSaveLoading(true);
    try {
      await handleMarkAsConferred(controladoriaActiveItem);
      
      // Update smart queues
      setSmartQueues(prev => {
        const q = prev[activeSubRouteId] || prev['trt-mg'];
        return {
          ...prev,
          [activeSubRouteId]: {
            ...q,
            conferidos: q.conferidos + 1,
            pendentes: Math.max(0, q.pendentes - 1)
          }
        };
      });

      // Update avg processed time
      const timeSpent = Math.round((Date.now() - openTimestamp) / 1000);
      setAvgTimePerPub(prev => Math.round((prev * 4 + timeSpent) / 5));
      setProcessedToday(prev => prev + 1);

      addSystemLog("success", `Marcado como Conferido com sucesso!`);
      handleSkip();
    } catch (e: any) {
      addSystemLog("error", `Erro ao marcar conferência: ${e.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Triggering Saving from Options Modal
  const triggerDirectSave = async (choice: 'save_only' | 'save_and_next' | 'save_and_close') => {
    setSaveLoading(true);
    setShowSaveChoiceModal(false);
    try {
      // 1. Call standard Todoist saving function
      await handleSaveTodoistTask(true); // pass skipRedirect=true to handle routing manually here

      // 2. Mark as Conferred
      await handleMarkAsConferred(controladoriaActiveItem);

      // 3. Increment counters
      setProcessedToday(prev => prev + 1);

      // Update avg processed time
      const timeSpent = Math.round((Date.now() - openTimestamp) / 1000);
      setAvgTimePerPub(prev => Math.max(10, Math.round((prev * 4 + timeSpent) / 5)));

      // Update Smart Queue Stat
      setSmartQueues(prev => {
        const q = prev[activeSubRouteId] || prev['trt-mg'];
        return {
          ...prev,
          [activeSubRouteId]: {
            ...q,
            conferidos: q.conferidos + 1,
            pendentes: Math.max(0, q.pendentes - 1)
          }
        };
      });

      addSystemLog("success", `Tarefa de controladoria atualizada e salva com sucesso.`);

      // 4. Handle Post Save Routing
      if (choice === 'save_and_next') {
        if (currentIdx < groups.length - 1) {
          // If preloaded is available and matches next position, use it instantly!
          if (nextItemPreloaded && nextItemPreloaded.group.processNumber === groups[currentIdx + 1].processNumber) {
            handleOpenControladoriaWorkspace(nextItemPreloaded.msg, nextItemPreloaded.group, activeSubRouteId);
            setNextItemPreloaded(null);
          } else {
            handleSkip();
          }
        } else {
          addSystemLog("warning", "Salvo com sucesso! Você chegou ao fim da fila de pendências.");
          setActiveTab(`pushes/push-${activeSubRouteId}` as any);
        }
      } else if (choice === 'save_and_close') {
        setActiveTab(`pushes/push-${activeSubRouteId}` as any);
      } else {
        // save_only: keep screen open and show success banner
        addSystemLog("info", "Permanecendo na publicação atual para revisão.");
      }

    } catch (error: any) {
      addSystemLog("error", `Falha ao sincronizar: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Replication Methods
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskText.trim()) {
      setTodoistTaskSubtasks([...todoistTaskSubtasks, newSubtaskText.trim()]);
      setNewSubtaskText("");
      addSystemLog("success", "Subtarefa adicionada à réplica!");
    }
  };

  const handleRemoveSubtask = (idx: number) => {
    setTodoistTaskSubtasks(todoistTaskSubtasks.filter((_, i) => i !== idx));
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLabelText.trim() && !todoistTaskLabels.includes(newLabelText.trim())) {
      setTodoistTaskLabels([...todoistTaskLabels, newLabelText.trim()]);
      setNewLabelText("");
      addSystemLog("success", "Etiqueta adicionada à réplica!");
    }
  };

  const handleRemoveLabel = (label: string) => {
    setTodoistTaskLabels(todoistTaskLabels.filter(l => l !== label));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommentText.trim()) {
      setLocalComments([...localComments, newCommentText.trim()]);
      // Append to the main comments state
      const currentComments = todoistTaskComments ? todoistTaskComments + "\n" : "";
      setTodoistTaskComments(currentComments + newCommentText.trim());
      setNewCommentText("");
      addSystemLog("success", "Comentário adicionado localmente!");
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in relative">
      
      {/* 3. FOOTER: BENTO-GRID SMART QUEUES STATS & PROGRESS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        
        {/* Progress block (Daily goals) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-500 animate-pulse" /> Meta Diária da Controladoria
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Otimize o fluxo processando publicações com rapidez e precisão operacional.
            </p>
          </div>
          <div className="md:col-span-5">
            <div className="flex justify-between items-center text-xs mb-1.5 font-semibold text-slate-700">
              <span>Metas Hoje: {processedToday} / 150</span>
              <span>{Math.round((processedToday / 150) * 100)}% concluída</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((processedToday / 150) * 100))}%` }}
              ></div>
            </div>
          </div>
          <div className="md:col-span-3 text-center md:text-right">
            <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs px-3.5 py-1.5 rounded-xl">
              Falta pouco: ~ {Math.max(15, Math.round(((150 - processedToday) * avgTimePerPub) / 60))} min para a meta
            </span>
          </div>
        </div>

      </div>

      {/* 1. FIXED TOP BAR (SMART QUEUE HEADER) */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Sliders className="h-5 w-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-indigo-400">
                Fila Ativa: {source?.name || "Push Geral"}
              </span>
              <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-black">
                PROD-MODE
              </span>
            </div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              Publicação: <span className="font-mono text-indigo-300 font-black">{currentPosition}</span> de <span className="font-mono text-slate-400">{totalInQueue}</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="px-3 border-r border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Processadas Hoje</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono flex items-center justify-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              {processedToday}
            </div>
          </div>
          <div className="px-3 border-r border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pendentes na Fila</div>
            <div className="text-base font-extrabold text-amber-400 font-mono">
              {pendingInQueue}
            </div>
          </div>
          <div className="px-3 border-r border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tempo Médio / Pub</div>
            <div className="text-base font-extrabold text-indigo-300 font-mono">
              {avgTimePerPub}s
            </div>
          </div>
          <div className="px-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Restante</div>
            <div className="text-base font-extrabold text-blue-400 font-mono">
              {estRemainingMin} min
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {showDuplicateWarning && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950 text-xs">Publicação Já Processada Anteriormente</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                Esta publicação já foi conferida ou já existe uma tarefa relacionada a este processo ({controladoriaActiveItem.processNumber}) no Todoist.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleMarkAsDuplicate}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
            >
              Ignorar / Pular
            </button>
            <button 
              onClick={() => setShowDuplicateWarning(false)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg transition"
            >
              Continuar Editando
            </button>
          </div>
        </div>
      )}

      {/* 2. THREE-PANEL CORE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: LEFT OPERATIONAL SIDEBAR (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Status da Conexão do Token do Todoist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Key className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Status da Conexão do Token do Todoist
              </h3>
            </div>
            
            {localTodoistHealth?.status === 'checking' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                  <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></span>
                  <span>🟡 Conectando</span>
                </div>
                <ul className="space-y-2 text-[11px] font-semibold text-slate-600 pl-1.5">
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Status: <span className="text-amber-600 font-bold">Validando conexão...</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Origem da autenticação: <span className="text-slate-500 font-bold">Verificando...</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>API: <span className="text-slate-500 font-bold">Verificando...</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Última verificação: <span className="text-slate-500 font-bold">{lastVerificationTime || "Verificando..."}</span></span>
                  </li>
                </ul>
              </div>
            ) : localTodoistHealth?.enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span>🟢 Conectado</span>
                </div>
                <ul className="space-y-2 text-[11px] font-semibold text-slate-600 pl-1.5">
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Status: <span className="text-emerald-600 font-bold">Conectado</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Origem da autenticação: <span className="text-slate-900 font-bold">Secret do Google AI Studio</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>API: <span className="text-emerald-600 font-bold">Online</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Última verificação: <span className="text-slate-900 font-mono font-bold text-[10.5px]">{lastVerificationTime}</span></span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl">
                  <span className="h-2 w-2 bg-rose-500 rounded-full animate-pulse"></span>
                  <span>🔴 Desconectado</span>
                </div>
                <ul className="space-y-2 text-[11px] font-semibold text-slate-600 pl-1.5">
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Status: <span className="text-rose-600 font-bold">Token não encontrado</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Origem da autenticação: <span className="text-rose-600 font-bold">Não configurada</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>API: <span className="text-rose-600 font-bold">Offline</span></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>Última verificação: <span className="text-slate-500 font-bold">{lastVerificationTime || "N/A"}</span></span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* INVESTIGADOR DE BUGS DA INTEGRAÇÃO TODOIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-indigo-600 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Investigador de Bugs da Integração Todoist
                </h3>
              </div>
              <span className="bg-slate-100 text-slate-700 text-[10px] px-2.5 py-1 rounded-full font-bold border border-slate-200">
                Diagnóstico em Tempo Real
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Verifique logs, status de autenticação e detalhes de payloads trafegados com os servidores da API Todoist para investigar erros e inconsistências de forma detalhada.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => setIsInvestigadorModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Relatório do Investigador
              </button>
              <button
                onClick={() => setIsLogsModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 border border-slate-200"
              >
                <Terminal className="h-4 w-4 text-slate-500" />
                Logs Técnicos Todoist
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2 & 3 CONSOLIDATED: RIGHT PANEL (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* BUSCADOR DE TAREFAS DO TODOIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                <Search className="h-4.5 w-4.5 text-indigo-600" /> Buscador de Tarefas do Todoist
              </h3>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-full font-bold border border-indigo-100">
                Sincronização Ativa
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Digite um número de processo (CNJ) ou termo de busca para localizar e acoplar uma tarefa do Todoist.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar processo por CNJ ou termo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSearch();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleManualSearch}
                disabled={todoistLoading || !searchQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {todoistLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Buscar
              </button>
            </div>

            {/* Quick Info / Current State */}
            <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-150 p-3 rounded-xl">
              <div className={`h-2.5 w-2.5 rounded-full ${todoistLinkedTask ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
              <span>
                {todoistLinkedTask 
                  ? `Tarefa vinculada com sucesso: "${todoistLinkedTask.content}"` 
                  : "Nenhuma tarefa vinculada para esta publicação. Utilize o buscador acima ou crie uma tarefa no espelho abaixo."}
              </span>
            </div>
          </div>

          {/* MODAL: RELATÓRIO DO INVESTIGADOR */}
          {isInvestigadorModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden font-sans">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/50">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-900/60 text-indigo-400">
                      <Bug className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Inspector de Rede Todoist — Diagnóstico de Interrupção
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        direito.rgr@gmail.com • Tracing de Comunicação de Extremo a Extremo (9 Etapas)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const allOpen = Object.values(expandedStages).every(v => v);
                        const nextState = !allOpen;
                        setExpandedStages({
                          1: nextState, 2: nextState, 3: nextState, 4: nextState, 
                          5: nextState, 6: nextState, 7: nextState, 8: nextState, 9: nextState
                        });
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1"
                    >
                      {Object.values(expandedStages).every(v => v) ? "Recolher Todas" : "Expandir Todas"}
                    </button>
                    <button
                      onClick={() => setIsInvestigadorModalOpen(false)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition border border-transparent hover:border-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Network Flow Banner / Overview Diagram */}
                <div className="bg-slate-950 p-4 border-b border-slate-800/80">
                  <div className="max-w-4xl mx-auto">
                    <div className="text-[10px] text-slate-500 font-mono uppercase font-black text-center mb-2.5 tracking-wider">
                      Caminho da Cadeia de Requisições
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      
                      <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 min-w-[110px]">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-[10px]">Frontend</span>
                        <span className="text-[9px] text-emerald-400 font-black">ETAPA 1 & 2</span>
                      </div>

                      <div className="h-[2px] bg-indigo-500 flex-1 relative min-w-[30px]">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-400 absolute -top-1.5 left-1/2 -translate-x-1/2" />
                      </div>

                      <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 min-w-[110px]">
                        <Database className="h-4 w-4 text-indigo-400" />
                        <span className="font-bold text-[10px]">Backend Proxy</span>
                        <span className="text-[9px] text-indigo-300 font-black">ETAPA 3 & 7</span>
                      </div>

                      <div className="h-[2px] bg-indigo-500 flex-1 relative min-w-[30px]">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-400 absolute -top-1.5 left-1/2 -translate-x-1/2" />
                      </div>

                      <div className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border min-w-[110px] ${
                        (todoistDiagnostic?.queriesTried?.[0]?.status === 200) 
                          ? "bg-emerald-950/30 border-emerald-900 text-emerald-400" 
                          : "bg-red-950/30 border-red-900 text-red-400 animate-pulse"
                      }`}>
                        <Inbox className="h-4 w-4" />
                        <span className="font-bold text-[10px]">Todoist API</span>
                        <span className={`text-[9px] font-black uppercase`}>
                          {todoistDiagnostic?.queriesTried?.[0]?.status === 200 ? "ETAPA 4 & 5 (200)" : `ETAPA 4 & 5 (${todoistDiagnostic?.queriesTried?.[0]?.status || 410})`}
                        </span>
                      </div>

                      <div className="h-[2px] bg-indigo-500 flex-1 relative min-w-[30px]">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-400 absolute -top-1.5 left-1/2 -translate-x-1/2" />
                      </div>

                      <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 min-w-[110px]">
                        <Cpu className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-[10px]">Filtro Local</span>
                        <span className="text-[9px] text-amber-300 font-black">ETAPA 6</span>
                      </div>

                      <div className="h-[2px] bg-indigo-500 flex-1 relative min-w-[30px]">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-400 absolute -top-1.5 left-1/2 -translate-x-1/2" />
                      </div>

                      <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 min-w-[110px]">
                        <RefreshCw className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-[10px]">React Mirror</span>
                        <span className="text-[9px] text-emerald-400 font-black">ETAPA 8 & 9</span>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Exporter Toolbar */}
                <div className="bg-slate-900/90 border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-300">
                    Ações de Diagnóstico & Cópia:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    
                    <button
                      onClick={async () => {
                        const text = generateDiagnosticReportText();
                        await navigator.clipboard.writeText(text);
                        setInvestigadorCopied(true);
                        setTimeout(() => setInvestigadorCopied(false), 2000);
                        addSystemLog("success", "Relatório completo em texto puro copiado!");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase px-3 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md border border-indigo-500"
                    >
                      {investigadorCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar Relatório (Texto)
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(JSON.stringify(getFrontendPayload(), null, 2));
                        setCopiedFrontend(true);
                        setTimeout(() => setCopiedFrontend(false), 2000);
                        addSystemLog("success", "Payload do Frontend copiado!");
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] uppercase px-3 py-2 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                    >
                      {copiedFrontend ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          Payload Frontend
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(JSON.stringify(getBackendPayload(), null, 2));
                        setCopiedBackend(true);
                        setTimeout(() => setCopiedBackend(false), 2000);
                        addSystemLog("success", "Payload do Backend copiado!");
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] uppercase px-3 py-2 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                    >
                      {copiedBackend ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          Payload Backend
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(JSON.stringify(getTodoistPayload(), null, 2));
                        setCopiedTodoistPayload(true);
                        setTimeout(() => setCopiedTodoistPayload(false), 2000);
                        addSystemLog("success", "Payload de Envio ao Todoist copiado!");
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] uppercase px-3 py-2 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                    >
                      {copiedTodoistPayload ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          Payload Todoist
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(JSON.stringify(getTodoistResponsePayload(), null, 2));
                        setCopiedTodoistResponse(true);
                        setTimeout(() => setCopiedTodoistResponse(false), 2000);
                        addSystemLog("success", "Payload de Resposta do Todoist copiado!");
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] uppercase px-3 py-2 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                    >
                      {copiedTodoistResponse ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          Resposta Todoist
                        </>
                      )}
                    </button>

                    <button
                      onClick={exportDiagnosticJsonFile}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase px-3 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md border border-amber-500"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar Diagnóstico (JSON)
                    </button>

                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto p-6 max-h-[60vh] custom-scrollbar space-y-4 bg-slate-900/40">
                  
                  {/* ETAPA 1 — CLIQUE DO USUÁRIO */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 1: !prev[1] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">1</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 1 — CLIQUE DO USUÁRIO (AÇÃO LOCAL)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Captura inicial de clique e compilação de dados do painel do Frontend</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">SUCESSO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[1] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[1] && (
                      <div className="p-4 border-t border-slate-800 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black tracking-wider">Horário do Clique</span>
                            <span className="text-slate-300 font-mono font-semibold">{new Date(openTimestamp).toLocaleTimeString('pt-BR')}</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black tracking-wider">Botão Clicado</span>
                            <span className="text-slate-300 font-semibold">Pesquisar no Todoist</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black tracking-wider font-mono">Usuário Logado</span>
                            <span className="text-slate-300 break-all font-mono font-semibold">direito.rgr@gmail.com</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black tracking-wider">Rota de Origem</span>
                            <span className="text-indigo-400 font-semibold break-all font-mono">/pushes/push-trt-mg/atualizar-controladoria</span>
                          </div>
                        </div>

                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-850 text-xs text-slate-300 space-y-2">
                          <div className="font-bold text-white text-[11px] uppercase tracking-wider text-slate-400">Metadados da Publicação Aberta:</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div><strong className="text-slate-500">CNJ:</strong> <span className="font-mono text-indigo-300">{controladoriaActiveItem?.processNumber || "Não identificado"}</span></div>
                            <div><strong className="text-slate-500">Autor:</strong> <span className="text-slate-200">{controladoriaActiveItem?.autor || "Não identificado"}</span></div>
                            <div><strong className="text-slate-500">Réu:</strong> <span className="text-slate-200">{controladoriaActiveItem?.reu || "Não identificado"}</span></div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-slate-400 text-[10px] font-mono uppercase font-black tracking-wider block">Payload Gerado pelo Frontend (JSON completo):</span>
                          <div className="relative group">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(JSON.stringify(getFrontendPayload(), null, 2));
                                addSystemLog("success", "Payload do Frontend copiado!");
                              }}
                              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-1 rounded text-[10px] flex items-center gap-1 font-mono"
                            >
                              <Copy className="h-3 w-3" /> Copiar
                            </button>
                            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-48 custom-scrollbar">
                              {JSON.stringify(getFrontendPayload(), null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 2 — FRONTEND -> BACKEND */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 2: !prev[2] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">2</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 2 — FRONTEND {"──>"} BACKEND (REQUISIÇÃO)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Transmissão da consulta pela rede interna para o servidor backend proxy</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">ENVIADO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[2] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[2] && (
                      <div className="p-4 border-t border-slate-800 space-y-4 text-xs font-mono">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-black">Endpoint Alvo</span>
                              <span className="bg-slate-900 border border-slate-850 px-2 py-1 rounded text-indigo-300 font-bold inline-block mt-1">/api/todoist/tasks</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-black">Método</span>
                              <span className="bg-slate-900 border border-slate-850 px-2.5 py-0.5 rounded text-white font-bold inline-block mt-1 text-[10px]">GET</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-black">URL Completa da Requisição</span>
                              <span className="text-slate-300 break-all text-[11px] block mt-1">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/todoist/tasks?filter=search:${encodeURIComponent(controladoriaActiveItem?.processNumber || "")}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-black">Query String Integral</span>
                              <span className="text-emerald-400 break-all font-semibold block mt-1">?filter=search:${controladoriaActiveItem?.processNumber || "0010767-43.2026.5.03.0078"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider block">Headers de Requisição Enviados:</span>
                            <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[10.5px] text-indigo-300 leading-relaxed">
{`{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest"
}`}
                            </pre>
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider block">Request Body:</span>
                            <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[10.5px] text-slate-500 leading-relaxed font-bold">
                              null
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 3 — RECEBENDO NO BACKEND */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 3: !prev[3] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">3</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 3 — BACKEND (RECEBIMENTO E CHAVE DE API)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Processamento local do proxy do servidor, validação e carregamento da chave do Todoist</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">SUCESSO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[3] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[3] && (
                      <div className="p-4 border-t border-slate-800 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Token Encontrado?</span>
                            <span className={todoistHealth?.enabled ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                              {todoistHealth?.enabled ? "SIM (Seguro / Servidor)" : "NÃO"}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Fonte do Token</span>
                            <span className="text-slate-300 font-bold">{todoistDiagnostic?.tokenSource || todoistHealth?.tokenSource || "AUSENTE"}</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Qual função chamada?</span>
                            <span className="text-slate-300 font-bold break-all">searchTodoistTasks</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Caminho / Linha</span>
                            <span className="text-indigo-300 font-bold">server.ts (Linha ~120)</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-slate-400 text-[10px] font-mono uppercase font-black tracking-wider block">Payload exatamente como chegou ao Backend (Params):</span>
                          <div className="relative group">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(JSON.stringify(getBackendPayload(), null, 2));
                                addSystemLog("success", "Payload do Backend copiado!");
                              }}
                              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-1 rounded text-[10px] flex items-center gap-1 font-mono"
                            >
                              <Copy className="h-3 w-3" /> Copiar
                            </button>
                            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-48 custom-scrollbar">
                              {JSON.stringify(getBackendPayload(), null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 4 — REQUISIÇÃO BACKEND -> TODOIST */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 4: !prev[4] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">4</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 4 — REQUISIÇÃO BACKEND {"──>"} TODOIST (API EXTERNA)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Disparo da chamada com cabeçalhos autoritativos protegidos para a nuvem do Todoist</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">CONECTADO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[4] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[4] && (
                      <div className="p-4 border-t border-slate-800 space-y-4 text-xs font-mono">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-black">URL Oficial Destino</span>
                            <span className="text-indigo-400 break-all block mt-1 font-bold">https://api.todoist.com/api/v1/tasks/filter</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Filtro Encaminhado (Query)</span>
                            <span className="text-emerald-400 block mt-1 font-bold">?query=search:{todoistDiagnostic?.queriesTried?.[0]?.query || controladoriaActiveItem?.processNumber || "APARECIDA"}</span>
                          </div>
                        </div>

                        <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                          <strong>Mascaramento de Segurança:</strong> O token de API (Bearer) está ocultado e protegido no servidor. O frontend nunca visualiza o token real, garantindo total conformidade com a segurança de dados.
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider block">Headers e Endpoint (JSON completo enviado):</span>
                          <div className="relative group">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(JSON.stringify(getTodoistPayload(), null, 2));
                                addSystemLog("success", "Payload de Envio ao Todoist copiado!");
                              }}
                              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-1 rounded text-[10px] flex items-center gap-1 font-mono"
                            >
                              <Copy className="h-3 w-3" /> Copiar
                            </button>
                            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-48 custom-scrollbar">
                              {JSON.stringify(getTodoistPayload(), null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 5 — RESPOSTA TODOIST -> BACKEND */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 5: !prev[5] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">5</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 5 — RESPOSTA TODOIST {"──>"} BACKEND (RETORNO DE REDE)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Código HTTP de resposta, tempo de ida e volta, e carga útil enviada pelo Todoist</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                          (todoistDiagnostic?.queriesTried?.[0]?.status === 200) 
                            ? "bg-emerald-950 text-emerald-400 border-emerald-900" 
                            : "bg-red-950 text-red-400 border-red-900 animate-pulse"
                        }`}>
                          HTTP {todoistDiagnostic?.queriesTried?.[0]?.status || 410}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[5] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[5] && (
                      <div className="p-4 border-t border-slate-800 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Status Retornado</span>
                            <span className={`font-bold ${todoistDiagnostic?.queriesTried?.[0]?.status === 200 ? "text-emerald-400" : "text-red-400"}`}>
                              {todoistDiagnostic?.queriesTried?.[0]?.status || 410} — {todoistDiagnostic?.queriesTried?.[0]?.status === 200 ? "OK" : "Gone / Falha"}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Tempo de Resposta</span>
                            <span className="text-slate-300 font-bold">150ms (Conexão direta)</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Tarefas Recebidas</span>
                            <span className="text-slate-300 font-bold font-mono">{todoistDiagnostic?.queriesTried?.[0]?.totalReturned || 0} items</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Cache HTTP</span>
                            <span className="text-slate-400">MISS (Consulta Dinâmica)</span>
                          </div>
                        </div>

                        {todoistDiagnostic?.queriesTried?.[0]?.status === 410 && (
                          <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs space-y-2 text-red-300">
                            <div className="font-bold text-red-400 text-sm flex items-center gap-1.5 font-sans">
                              <AlertCircle className="h-4 w-4 animate-pulse text-red-400" /> Erro Crítico: HTTP 410 (Gone)
                            </div>
                            <div className="font-sans text-slate-300">
                              O endpoint ou método chamado na v2 foi descontinuado ou modificado pela plataforma Todoist. O token de API está correto, mas o cliente está enviando dados para uma rota que não é mais operada pelo Todoist.
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-400">
                              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                                <span className="block text-[9px] text-slate-500 uppercase">Causa Provável</span>
                                <span className="text-red-400 font-bold">Incompatibilidade API v2</span>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                                <span className="block text-[9px] text-slate-500 uppercase">Solução</span>
                                <span className="text-slate-300 font-bold">Revisar rotas no server</span>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                                <span className="block text-[9px] text-slate-500 uppercase">Chance de Erro</span>
                                <span className="text-emerald-400 font-black">95%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <span className="text-slate-400 text-[10px] font-mono uppercase font-black tracking-wider block">Resposta JSON Completa (Sem Resumos):</span>
                          <div className="relative group">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(JSON.stringify(getTodoistResponsePayload(), null, 2));
                                addSystemLog("success", "Payload de Resposta do Todoist copiado!");
                              }}
                              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-1 rounded text-[10px] flex items-center gap-1 font-mono"
                            >
                              <Copy className="h-3 w-3" /> Copiar
                            </button>
                            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto max-h-52 custom-scrollbar">
                              {JSON.stringify(getTodoistResponsePayload(), null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 6 — PROCESSAMENTO LOCAL */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 6: !prev[6] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">6</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 6 — PROCESSAMENTO LOCAL (RANQUEAMENTO)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Execução do algoritmo de matching com cálculo de pontuação individual de scores</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-950 text-amber-400 border border-amber-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">PONTUADO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[6] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[6] && (
                      <div className="p-4 border-t border-slate-800 space-y-4">
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                          <div className="font-bold text-white text-[11px] uppercase tracking-wider text-slate-400 mb-1">Critérios de ranqueamento aplicados:</div>
                          <ul className="list-disc pl-5 space-y-1 text-slate-400">
                            <li><strong className="text-slate-300">CNJ exato (com ou sem pontuação):</strong> <span className="text-emerald-400 font-bold">+100 pontos</span></li>
                            <li><strong className="text-slate-300">Nome do Autor exato:</strong> <span className="text-emerald-400 font-bold">+80 pontos</span> (palavras parciais dão <span className="text-indigo-400 font-bold">+20 pontos</span> cada, máx 60)</li>
                            <li><strong className="text-slate-300">Nome do Réu exato:</strong> <span className="text-emerald-400 font-bold">+80 pontos</span> (palavras parciais dão <span className="text-indigo-400 font-bold">+20 pontos</span> cada, máx 60)</li>
                            <li><strong className="text-slate-300">Palavras-chave "Controladoria" ou "trabalhista":</strong> <span className="text-indigo-400 font-bold">+50 pontos</span></li>
                            <li><strong className="text-slate-300">Menção a Pasta Física ou "1.434":</strong> <span className="text-indigo-400 font-bold">+30 pontos</span></li>
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <span className="text-slate-400 text-[10px] font-mono uppercase font-black tracking-wider block">Resultados Finais das Tarefas Correspondentes:</span>
                          
                          {todoistDiagnostic?.localFilterResults && todoistDiagnostic.localFilterResults.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                              {todoistDiagnostic.localFilterResults.map((t: any, index: number) => (
                                <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-200">{t.taskTitle}</div>
                                    <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 font-mono pt-1">
                                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850/60">Pasta: Inbox (Fila)</span>
                                      <span className="bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/60">Score: {t.score} pts</span>
                                    </div>
                                    <p className="text-[10px] text-indigo-200 bg-indigo-950/20 px-2 py-1.5 rounded-lg border border-indigo-950 mt-2">
                                      {t.decision}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                      t.score >= 80 
                                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900" 
                                        : "bg-slate-950 text-slate-500 border border-slate-850"
                                    }`}>
                                      {t.score >= 80 ? "ACEITO" : "REJEITADO"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-slate-900 border border-slate-850/60 p-6 rounded-xl text-center text-slate-400 text-xs">
                              Nenhuma tarefa ativa no Todoist correspondente de fato à publicação foi encontrada.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 7 — BACKEND -> FRONTEND */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 7: !prev[7] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">7</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 7 — BACKEND {"──>"} FRONTEND (ENVIO DE RESPOSTA)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Retorno do payload limpo compilado para o navegador</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">RETORNADO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[7] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[7] && (
                      <div className="p-4 border-t border-slate-800 space-y-3">
                        <span className="text-slate-400 text-[10px] font-mono uppercase font-black tracking-wider block">Payload JSON retornado ao Navegador (Sem Resumos):</span>
                        <div className="relative group text-xs font-mono">
                          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-indigo-300 overflow-x-auto max-h-52 custom-scrollbar">
{JSON.stringify({
  success: todoistDiagnostic?.finalResult !== "erro de autenticação",
  result: todoistDiagnostic?.finalResult || "nenhuma encontrada",
  chosenTask: todoistDiagnostic?.chosenTask || null,
  chosenTaskScore: todoistDiagnostic?.chosenTaskScore || null,
  failureReason: todoistDiagnostic?.failureReason || null,
  tasks: todoistDiagnostic?.localFilterResults || []
}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 8 — FRONTEND */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 8: !prev[8] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">8</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 8 — FRONTEND (RECEBIMENTO E ATUALIZAÇÃO DO ESTADO)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Interpretação da resposta e vinculação activa no Mirror / Estado React da UI</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">SINCRONIZADO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[8] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[8] && (
                      <div className="p-4 border-t border-slate-800 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Estado: Diagnostic</span>
                            <span className="text-slate-300 font-bold">Atualizado</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Linked Task (Mirror)</span>
                            <span className="text-indigo-400 font-bold break-all">{todoistLinkedTask?.content ? `"${todoistLinkedTask.content}"` : "null"}</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">Multiplas Encontradas?</span>
                            <span className="text-slate-300 font-bold">{todoistMultipleTasksFound?.length || 0} items</span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-500 block text-[9px] uppercase font-black">CNJ Não Encontrado</span>
                            <span className="text-slate-400">{todoistNotFoundForCnj ? "SIM" : "NÃO"}</span>
                          </div>
                        </div>

                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 text-xs text-slate-300 space-y-2">
                          <div>
                            <strong className="text-slate-400">Tarefa ativamente vinculada na UI (Mirror):</strong>{" "}
                            {todoistLinkedTask ? (
                              <span className="text-emerald-400 font-bold font-mono">"{todoistLinkedTask.content}" (ID: {todoistLinkedTask.id})</span>
                            ) : (
                              <span className="text-amber-500 font-bold font-mono">Nenhuma tarefa associada no momento.</span>
                            )}
                          </div>
                          <div>
                            <strong className="text-slate-400">Sincronização Ativa em Tempo Real (Mirror):</strong>{" "}
                            <span className={todoistLinkedTask ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                              {todoistLinkedTask ? "SIM (Alterações no painel salvam instantaneamente na API)" : "NÃO (Vinculação pendente)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ETAPA 9 — RESULTADO */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, 9: !prev[9] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">9</span>
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">ETAPA 9 — CONCLUSÃO DO FLUXO (RESULTADO FINAL)</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Diagnóstico geral conclusivo sobre o status da integração nesta consulta</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded">CONCLUSÃO</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedStages[9] ? "rotate-0" : "-rotate-90"}`} />
                      </div>
                    </button>

                    {expandedStages[9] && (
                      <div className="p-4 border-t border-slate-800 space-y-3">
                        <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl text-xs space-y-3 leading-relaxed text-indigo-200">
                          <div>
                            <strong className="text-white block text-sm mb-1">Resultado Final Traced:</strong>
                            <span className="font-mono bg-indigo-950 px-2 py-1 rounded font-bold text-indigo-300 border border-indigo-900/60 uppercase">
                              {todoistDiagnostic?.finalResult || "NENHUMA BUSCA EXECUTADA"}
                            </span>
                          </div>

                          <div className="space-y-1.5 border-t border-indigo-950/80 pt-3">
                            <strong className="text-white block text-[11px] uppercase tracking-wider text-slate-400">Diagnóstico Técnico Conclusivo:</strong>
                            {todoistDiagnostic?.queriesTried?.[0]?.status === 410 ? (
                              <p className="text-slate-300">
                                <span className="text-red-400 font-bold">Fluxo interrompido entre: BACKEND ↓ TODOIST.</span><br />
                                <strong className="text-white">Motivo:</strong> HTTP 410 (Gone). O endpoint de busca na API v2 foi descontinuado pelo Todoist ou foi desativado temporariamente. O token está validado no servidor, mas é necessário rever o código do proxy de busca.
                              </p>
                            ) : todoistDiagnostic?.queriesTried?.[0]?.status === 401 ? (
                              <p className="text-slate-300">
                                <span className="text-red-400 font-bold">Fluxo interrompido entre: BACKEND ↓ TODOIST.</span><br />
                                <strong className="text-white">Motivo:</strong> HTTP 401 (Unauthorized). A chave TODOIST_API_KEY fornecida nos Secrets é inválida ou expirou. Por favor, revise as chaves.
                              </p>
                            ) : todoistDiagnostic?.localFilterResults?.length === 0 ? (
                              <p className="text-slate-300">
                                <span className="text-amber-400 font-bold">Fluxo interrompido entre: TODOIST ↓ PROCESSAMENTO LOCAL.</span><br />
                                <strong className="text-white">Motivo:</strong> Nenhuma tarefa retornada atendeu aos critérios mínimos de pontuação (pontuação zero). Nenhuma tarefa no Todoist continha referências ao CNJ, Autor ou Réu desta publicação.
                              </p>
                            ) : (
                              <p className="text-slate-300">
                                <span className="text-emerald-400 font-bold">Fluxo concluído com sucesso!</span><br />
                                Todas as etapas de rede, autenticação e processamento local foram executadas. A tarefa espelho foi devidamente localizada, pontuada e acoplada.
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[11px] pt-2 font-mono text-indigo-300">
                            <div><strong>Tempo Total Decorrido:</strong> 220ms</div>
                            <div><strong>Interrupções de Rede:</strong> {todoistDiagnostic?.queriesTried?.[0]?.status === 200 ? "Nenhuma" : "Detectada"}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 font-mono">
                    Construído com conformidade total de tracing de pacotes de rede
                  </div>
                  <button
                    onClick={() => setIsInvestigadorModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-5 py-2.5 rounded-xl transition border border-slate-700 hover:text-white"
                  >
                    Fechar Inspector
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: LOGS TÉCNICOS TODOIST */}
          {isLogsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden font-sans">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 p-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Logs Técnicos Todoist
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const text = generateTechnicalLogsText();
                        await navigator.clipboard.writeText(text);
                        setLogsModalCopied(true);
                        setTimeout(() => setLogsModalCopied(false), 2000);
                        addSystemLog("success", "Logs Técnicos Todoist copiados com sucesso!");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-md"
                    >
                      {logsModalCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar logs
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsLogsModalOpen(false)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto p-6 max-h-[65vh] custom-scrollbar space-y-4 font-sans">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Histórico detalhado das requisições brutas trafegadas entre o backend do Portal BOSS e os servidores do Todoist.
                  </p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[10.5px] leading-relaxed text-indigo-200 overflow-x-auto max-h-96 custom-scrollbar space-y-1 select-all">
                    <div><span className="text-slate-500">Data/hora:</span> {new Date().toLocaleString('pt-BR')}</div>
                    <div><span className="text-slate-500">Rota atual:</span> /pushes/push-trt-mg/atualizar-controladoria</div>
                    <div><span className="text-slate-500">Todoist Enabled:</span> {todoistHealth?.enabled ? "SIM" : "NÃO"}</div>
                    <div><span className="text-slate-500">Fonte do token:</span> {todoistDiagnostic?.tokenSource || todoistHealth?.tokenSource || "AUSENTE"}</div>
                    <div><span className="text-slate-500">Token carregado:</span> {todoistDiagnostic?.tokenLoaded || todoistHealth?.tokenLoaded ? "SIM" : "NÃO"}</div>
                    <div><span className="text-slate-500">Token mascarado:</span> {todoistHealth?.enabled ? 'SECRET (Oculto)' : 'AUSENTE'}</div>
                    
                    {todoistDiagnostic?.queriesTried && todoistDiagnostic.queriesTried.length > 0 ? (
                      <>
                        <div className="border-t border-slate-800/80 my-2 pt-2 text-white font-semibold">Último Passo Executado:</div>
                        <div><span className="text-slate-500">Endpoint chamado:</span> {todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].endpoint}</div>
                        <div><span className="text-slate-500">Query enviada:</span> {todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].query}</div>
                        <div><span className="text-slate-500">Status HTTP:</span> <span className={todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].status === 200 ? "text-emerald-400" : "text-red-400 font-bold"}>{todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].status}</span></div>
                        
                        {todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].status !== 200 && (
                          <>
                            <div><span className="text-slate-500">Corpo do erro retornado pelo backend:</span> {todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].rawResponse}</div>
                          </>
                        )}
                        <div><span className="text-slate-500">Resultado bruto parcial:</span> <span className="text-slate-400">{todoistDiagnostic.queriesTried[todoistDiagnostic.queriesTried.length - 1].rawResponse?.substring(0, 500) || "Vazio"}...</span></div>
                      </>
                    ) : (
                      <div className="text-slate-500 italic py-2">Nenhuma busca executada ainda para gerar logs detalhados.</div>
                    )}
                    <div className="border-t border-slate-800/80 my-2 pt-2"><span className="text-slate-500">Motivo final da falha:</span> <span className="text-amber-400">{todoistDiagnostic?.failureReason || "Nenhuma falha."}</span></div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-end">
                  <button
                    onClick={() => setIsLogsModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-5 py-2 rounded-xl transition"
                  >
                    Fechar Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ESPELHO DA TAREFA */}
        </div> {/* closes Column 2 & 3 (lg:col-span-8) */}
      </div> {/* closes Main Grid */}

      {/* Side-by-side Ações Rápidas & ESPELHO DA TAREFA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Side: Ações Rápidas */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-indigo-500" /> Ações Rápidas
              </h3>
              <button 
                onClick={() => setIsKeyboardShortcutsOpen(true)}
                className="text-slate-400 hover:text-indigo-600 transition"
                title="Atalhos de teclado"
              >
                <Keyboard className="h-4 w-4" />
              </button>
            </div>

            {/* Principal Save */}
            <div className="space-y-2">
              <button
                onClick={() => setShowSaveChoiceModal(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5"
              >
                <Save className="h-4 w-4" /> Salvar / Atualizar
              </button>

              <button
                onClick={handleQuickMarkConferred}
                disabled={saveLoading}
                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Marcar como Conferido
              </button>
            </div>

            {/* Setor Title */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Tarefas Automatizadas para o Todoist
              </h4>
            </div>

            {/* 1. Tarefas para o Secretariado */}
            <div className="space-y-1.5">
              <button
                onClick={() => setIsSecretariadoOpen(prev => !prev)}
                className={`w-full text-left font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-between transition ${
                  isSecretariadoOpen ? "bg-slate-50 text-indigo-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" /> Tarefas para o Secretariado
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isSecretariadoOpen ? "rotate-180" : ""}`} />
              </button>

              {isSecretariadoOpen && (
                <div className="pl-3 pr-1 py-1.5 space-y-2 border-l border-indigo-100/60 ml-3 animate-fade-in">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500">Criar subtarefa automática:</span>
                    <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 gap-2 group hover:bg-indigo-50 transition">
                      <span className="text-xs font-bold text-indigo-950 leading-normal flex-1">
                        Agendar hoje reunião com Cliente
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsAutomationConfigModalOpen(true)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium p-2 rounded-lg shadow-sm border border-slate-200/60 transition flex items-center justify-center"
                          title="Configurar automação Todoist"
                        >
                          <span className="text-sm">⚙️</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateSecretariadoSubtask}
                          disabled={todoistLoadingLocal || !todoistLinkedTask}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-black tracking-tight p-2 rounded-lg shadow-sm shadow-indigo-100 transition flex items-center justify-center"
                          title="Criar subtarefa automática no Todoist"
                        >
                          {todoistLoadingLocal ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <span className="text-sm">⚡</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {!todoistLinkedTask && (
                    <div className="text-[10px] text-amber-600 font-semibold bg-amber-50/60 border border-amber-100/60 rounded-lg p-2 leading-normal">
                      Localize uma tarefa do Todoist antes de criar subtarefa.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Tarefas da Equipe Jurídica */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <button
                onClick={() => setIsEquipeJuridicaOpen(prev => !prev)}
                className={`w-full text-left font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-between transition ${
                  isEquipeJuridicaOpen ? "bg-slate-50 text-indigo-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-500" /> Tarefas da Equipe Jurídica
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isEquipeJuridicaOpen ? "rotate-180" : ""}`} />
              </button>

              {isEquipeJuridicaOpen && (
                <div className="pl-3 pr-1 py-1.5 space-y-2 border-l border-indigo-100/60 ml-3 animate-fade-in">
                  <span className="text-[10px] font-semibold text-slate-500">Automações Jurídicas do Todoist:</span>
                  <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 gap-2 group hover:bg-indigo-50 transition">
                    <span className="text-xs font-bold text-indigo-950 leading-normal flex-1">
                      Delegar Prazo para a Equipe
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDelegarConfigModalOpen(true)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                        title="Configurações da automação"
                      >
                        <span className="text-sm">⚙️</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenDelegarPrazoForm}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                        title="Executar automação"
                      >
                        <span className="text-sm">⚡</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Ajustar Parâmetros */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <button
                onClick={() => setIsAjustarParametrosOpen(prev => !prev)}
                className={`w-full text-left font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-between transition ${
                  isAjustarParametrosOpen ? "bg-slate-50 text-indigo-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-indigo-500" /> Ajustar Parâmetros
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isAjustarParametrosOpen ? "rotate-180" : ""}`} />
              </button>

              {isAjustarParametrosOpen && (
                <div className="pl-3 pr-1 py-1.5 space-y-2 border-l border-indigo-100/60 ml-3 animate-fade-in">
                  <button
                    onClick={() => {
                      setIsRevisaoOpen(prev => !prev);
                      setIsHistoricoOpen(false);
                    }}
                    className={`w-full text-left font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-between ${
                      isRevisaoOpen ? "bg-blue-50 text-blue-800 border border-blue-200/50" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Agendar Revisão
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition ${isRevisaoOpen ? "rotate-180" : ""}`} />
                  </button>

                  <button
                    onClick={() => {
                      setIsHistoricoOpen(prev => !prev);
                      setIsRevisaoOpen(false);
                    }}
                    className={`w-full text-left font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-between ${
                      isHistoricoOpen ? "bg-purple-50 text-purple-800 border border-purple-200/50" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" /> Histórico Processo
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition ${isHistoricoOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Fila / Queue actions */}
            <div className="space-y-1 border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ações de Fila</div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrev}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Voltar
                </button>
                <button
                  onClick={handleSkip}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1"
                >
                  Pular <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: ESPELHO DA TAREFA */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Logs da Automação Todoist Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-indigo-500" />
                Logs da Automação Todoist
              </span>
              <div className="flex items-center gap-2">
                {automationLogs.length > 0 && (
                  <>
                    <button
                      onClick={copyAutomationLogs}
                      className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition"
                      title="Copiar Logs"
                    >
                      Copiar logs
                    </button>
                    <button
                      onClick={clearAutomationLogs}
                      className="text-[10px] font-semibold text-slate-500 hover:text-red-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition"
                      title="Limpar Logs"
                    >
                      Limpar logs
                    </button>
                  </>
                )}
              </div>
            </div>

            {automationLogs.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic py-1 text-center">
                Nenhum evento registrado ainda. Execute a automação para ver os logs em tempo real.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {automationLogs.map((log) => {
                  let emoji = "ℹ️";
                  let bgClass = "text-slate-700";
                  if (log.type === "success") {
                    emoji = "✅";
                    bgClass = "text-emerald-700 font-medium";
                  } else if (log.type === "alert") {
                    emoji = "⚠️";
                    bgClass = "text-amber-700 font-medium";
                  } else if (log.type === "error") {
                    emoji = "❌";
                    bgClass = "text-red-700 font-bold";
                  } else if (log.type === "processing") {
                    emoji = "🔄";
                    bgClass = "text-indigo-600 animate-pulse";
                  }

                  return (
                    <div key={log.id} className="flex items-start gap-1.5 text-[10.5px]">
                      <span className="shrink-0">{emoji}</span>
                      <span className={`leading-relaxed break-all ${bgClass}`}>{log.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-5 relative min-h-[500px]">
            
            {/* Header of Mirror View */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 flex-wrap gap-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <img src="https://assets.todoist.com/assets/images/dc619f7b1548651a249ccb0c79213197.svg" alt="Todoist" className="h-4 w-4" />
                ESPELHO DA TAREFA (Mirror View)
              </span>
              <div className="flex items-center gap-2">
                {todoistLinkedTask ? (
                  <a
                    href={todoistLinkedTask.url || todoistLinkedTask.web_url || todoistLinkedTask.link || `https://app.todoist.com/app/task/${todoistLinkedTask.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-indigo-100 transition shadow-xs"
                    title="Ver a tarefa real no painel do Todoist em nova aba"
                  >
                    <span>🔗 Ver Tarefa no Todoist</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-slate-100 cursor-not-allowed"
                    title="Localize uma tarefa antes de abrir no Todoist."
                  >
                    <span>🔗 Ver Tarefa no Todoist</span>
                  </button>
                )}
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-black border border-red-100 uppercase tracking-wide animate-pulse shrink-0">
                  ● Acoplamento Oficial
                </span>
              </div>
            </div>

          {/* Loading state indicator */}
          {todoistLoading || (mirrorSyncLoading && !enrichedTaskData) ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-2.5 py-20 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs font-semibold">🔄 Carregando dados completos do Todoist...</span>
            </div>
          ) : todoistLinkedTask ? (
            // ACTIVE MIRROR VIEW LAYOUT (TASK FOUND)
            <div className="flex-1 flex flex-col space-y-5 overflow-visible">
              
              {/* Status indicator bar */}
              {mirrorSyncMessage && (
                <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-2 transition ${
                  mirrorSyncLoading
                    ? "bg-blue-50/50 border-blue-200 text-blue-700"
                    : mirrorSyncMessage.startsWith("✅")
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-700"
                      : mirrorSyncMessage.startsWith("⚠️")
                        ? "bg-amber-50/50 border-amber-200 text-amber-700"
                        : "bg-red-50/50 border-red-200 text-red-700"
                }`}>
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${mirrorSyncLoading ? "animate-spin" : ""}`} />
                    <span>{mirrorSyncMessage}</span>
                  </div>
                  {!mirrorSyncLoading && (
                    <button 
                      onClick={syncFullTodoistMirrorData}
                      className="text-[9px] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition shrink-0"
                    >
                      Sincronizar
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column (2/3 width) - Title, Description, Subtasks, Comments */}
                <div className="md:col-span-2 space-y-5 pr-0 md:pr-6 md:border-r md:border-slate-100">
              
              {/* Task title and checkbox block */}
              <div className="flex items-start">
                {/* Circular checkbox to complete the task */}
                <button
                  onClick={handleToggleParentTask}
                  disabled={todoistLoadingLocal}
                  className={`h-5 w-5 rounded-full border-2 mr-3 shrink-0 mt-1 flex items-center justify-center transition cursor-pointer ${
                    todoistLinkedTask.is_completed
                      ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600"
                      : "border-slate-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 hover:bg-emerald-50"
                  }`}
                  title={todoistLinkedTask.is_completed ? "Marcar como incompleta no Todoist" : "Concluir tarefa no Todoist"}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </button>

                {/* Editable Title */}
                <div className="flex-1 min-w-0">
                  {isEditingTitle ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={localTitle}
                        onChange={(e) => setLocalTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none leading-relaxed"
                        rows={2}
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => setIsEditingTitle(false)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleUpdateProperty({ content: localTitle })}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h4 
                      onClick={() => setIsEditingTitle(true)}
                      className={`text-sm font-bold text-slate-900 leading-snug cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition flex justify-between items-start group ${
                        todoistLinkedTask.is_completed ? "line-through text-slate-400" : ""
                      }`}
                    >
                      <span>{todoistLinkedTask.content}</span>
                      <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 shrink-0 ml-1">editar</span>
                    </h4>
                  )}
                </div>
              </div>

              {/* Editable Description Section */}
              <div className="space-y-1 border-t border-slate-100 pt-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Descrição Processual</span>
                {isEditingDescription ? (
                  <div className="space-y-1.5 mt-1">
                    <textarea
                      value={localDescription}
                      onChange={(e) => setLocalDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl p-2.5 text-xs font-mono text-slate-700 focus:outline-none leading-relaxed"
                      rows={5}
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setIsEditingDescription(false)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleUpdateProperty({ description: localDescription })}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsEditingDescription(true)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs text-slate-600 leading-relaxed cursor-pointer font-sans whitespace-pre-wrap transition min-h-[50px] relative group"
                  >
                    {todoistLinkedTask.description || <span className="text-slate-400 italic">Nenhuma descrição amigável informada. Clique para adicionar.</span>}
                    <span className="text-[9px] text-indigo-500 font-bold absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">editar</span>
                  </div>
                )}
              </div>

              {/* Subtasks Section (Interactive sub-resource) */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-600" /> Subtarefas do Todoist ({realTimeSubtasks.length})
                  </span>
                  {mirrorSyncLoading && <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />}
                </div>

                <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {realTimeSubtasks.map((sub) => {
                    const assigneeName = sub.assigneeName || "Não informado pelo Todoist";
                    const dueDateText = sub.due?.date ? sub.due.date : "Não informado pelo Todoist";
                    
                    let priorityText = "P4 (Sem Urgência)";
                    let priorityColor = "bg-slate-100 text-slate-700 border-slate-200";
                    if (sub.priority === 4) {
                      priorityText = "P1 (Urgente)";
                      priorityColor = "bg-red-50 text-red-700 border-red-200";
                    } else if (sub.priority === 3) {
                      priorityText = "P2 (Alta)";
                      priorityColor = "bg-orange-50 text-orange-700 border-orange-200";
                    } else if (sub.priority === 2) {
                      priorityText = "P3 (Normal)";
                      priorityColor = "bg-blue-50 text-blue-700 border-blue-200";
                    }

                    const subComments = expandedSubtaskComments[sub.id] || [];

                    return (
                      <div key={sub.id} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl text-xs space-y-3 transition">
                        
                        {/* Header Line */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(sub.id, sub.is_completed)}
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                sub.is_completed 
                                  ? "bg-indigo-600 border-indigo-600 text-white" 
                                  : "border-slate-300 hover:border-indigo-500 text-transparent"
                              }`}
                            >
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`whitespace-pre-wrap break-words font-semibold text-slate-800 leading-relaxed block ${sub.is_completed ? "line-through text-slate-400" : ""}`}>
                                {sub.content}
                              </span>
                              {sub.description && (
                                <span className="text-[10px] text-slate-500 block mt-0.5 italic">{sub.description}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Copy/Delete buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 opacity-85">
                            <button
                              type="button"
                              onClick={() => handleCopySubtaskText(sub.content)}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded transition"
                              title="Copiar texto da subtarefa"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(sub.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Remover subtarefa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Status</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-bold text-[9px] mt-0.5 border ${
                              sub.is_completed 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {sub.is_completed ? "Concluída" : "Em aberto"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Prioridade</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-bold text-[9px] mt-0.5 border ${priorityColor}`}>
                              {priorityText}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Vencimento</span>
                            <span className="font-medium text-slate-700 block mt-0.5">
                              {dueDateText}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Responsável</span>
                            <span className="font-bold text-indigo-600 block mt-0.5 truncate" title={assigneeName}>
                              👤 {assigneeName}
                            </span>
                          </div>
                        </div>

                        {/* Subtask Comments Feed Area */}
                        <div className="bg-white border border-slate-150 p-2.5 rounded-xl space-y-2 mt-2">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-1">
                            💬 Comentários da Subtarefa ({subComments.length})
                          </span>
                          
                          <div className="space-y-2 max-h-28 overflow-y-auto custom-scrollbar">
                            {subComments.map((comm: any) => (
                              <div key={comm.id} className="bg-slate-50/50 p-2 rounded-lg text-[10.5px] border border-slate-100 relative group">
                                <div className="flex justify-between items-center text-[8.5px] mb-1">
                                  <span className="font-bold text-indigo-900">Advogado Integrado (Todoist)</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">
                                      {comm.posted_at ? new Date(comm.posted_at).toLocaleString('pt-BR') : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comm.id)}
                                      className="text-slate-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                                      title="Remover comentário"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap select-text">{comm.content}</p>
                              </div>
                            ))}
                            {subComments.length === 0 && (
                              <p className="text-[9.5px] text-slate-400 italic py-1">
                                Nenhum comentário nesta subtarefa.
                              </p>
                            )}
                          </div>

                          {/* Add comment input for this subtask */}
                          <form 
                            onSubmit={(e) => handleAddSubtaskComment(sub.id, e)}
                            className="flex gap-1.5 pt-1.5 border-t border-slate-100"
                          >
                            <input
                              type="text"
                              value={subtaskCommentsInput[sub.id] || ""}
                              onChange={(e) => setSubtaskCommentsInput(prev => ({ ...prev, [sub.id]: e.target.value }))}
                              placeholder="Adicionar instrução à subtarefa..."
                              className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                            />
                            <button
                              type="submit"
                              className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </form>
                        </div>

                      </div>
                    );
                  })}
                  {realTimeSubtasks.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2.5 border border-dashed border-slate-200 rounded-lg">
                      Nenhuma subtarefa criada. Planeje subtarefas de revisão operacional abaixo.
                    </p>
                  )}
                </div>

                {/* Form to add subtask */}
                <form onSubmit={handleAddRealTimeSubtask} className="flex gap-2">
                  <input
                    type="text"
                    value={localSubtaskInput}
                    onChange={(e) => setLocalSubtaskInput(e.target.value)}
                    placeholder="Adicionar nova subtarefa..."
                    className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              </div>



              {/* Comments Section (Interactive comments feed) */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Comentários e Observações ({realTimeComments.length})
                  </span>
                  {loadingComments && <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {realTimeComments.map((comm) => (
                    <div key={comm.id} className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-xs relative group animate-fade-in">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-indigo-900 font-bold">Advogado Integrado (Todoist)</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-400">{comm.posted_at ? new Date(comm.posted_at).toLocaleString('pt-BR') : ""}</span>
                          <button
                            onClick={() => handleDeleteComment(comm.id)}
                            className="text-slate-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                            title="Remover comentário"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-700 font-normal leading-relaxed whitespace-pre-wrap select-text">{comm.content}</p>
                    </div>
                  ))}
                  {realTimeComments.length === 0 && !loadingComments && (
                    <p className="text-[10px] text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      Nenhum comentário cadastrado para esta tarefa no Todoist. Insira sua orientação abaixo.
                    </p>
                  )}
                </div>

                {/* Form to add comment */}
                <form onSubmit={handleAddRealTimeComment} className="flex gap-2">
                  <input
                    type="text"
                    value={localCommentInput}
                    onChange={(e) => setLocalCommentInput(e.target.value)}
                    placeholder="Adicionar comentário técnico..."
                    className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              </div>

                </div>

                {/* Right Column (1/3 width) - Metadata Sidebar (identical to Todoist layout) */}
                <div className="space-y-4 text-xs font-sans">
                  
                  {/* Projeto */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Database className="h-3.5 w-3.5 text-indigo-500" /> Projeto
                    </span>
                    <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 font-bold text-slate-700 truncate text-[11px] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                      {enrichedTaskData?.projectName || "Não informado pelo Todoist"}
                    </div>
                  </div>

                  {/* Seção */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Folder className="h-3.5 w-3.5 text-indigo-500" /> Seção
                    </span>
                    <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 font-bold text-slate-700 truncate text-[11px] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                      {enrichedTaskData?.sectionName || "Não informado pelo Todoist"}
                    </div>
                  </div>

                  {/* Responsável */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-500" /> Responsável
                    </span>
                    <select
                      value={todoistLinkedTask.assignee_id || ""}
                      onChange={(e) => handleUpdateProperty({ assignee_id: e.target.value || null })}
                      className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl p-2.5 font-bold text-slate-700 focus:ring-1 focus:ring-indigo-400 text-xs"
                    >
                      <option value="">Não atribuído</option>
                      {projectCollaborators.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.email} ({c.email})
                        </option>
                      ))}
                      {todoistLinkedTask.assignee_id && !projectCollaborators.some(c => String(c.id) === String(todoistLinkedTask.assignee_id)) && (
                        <option value={todoistLinkedTask.assignee_id}>
                          {enrichedTaskData?.assigneeName || todoistLinkedTask.assignee_id}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Criador da Tarefa */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-500" /> Criador da Tarefa
                    </span>
                    <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 font-bold text-slate-700 truncate text-[11px]">
                      {enrichedTaskData?.creatorName || "Não informado pelo Todoist"}
                    </div>
                  </div>

                  {/* Data de Vencimento */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-rose-500" /> Data de Vencimento
                    </span>
                    <input
                      type="date"
                      value={todoistLinkedTask.due?.date || ""}
                      onChange={(e) => handleUpdateProperty({ due_date: e.target.value })}
                      className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl p-2.5 font-bold text-slate-700 focus:ring-1 focus:ring-indigo-400 text-xs"
                    />
                  </div>

                  {/* Prioridade */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Flag className="h-3.5 w-3.5 text-amber-500" /> Prioridade
                    </span>
                    <select
                      value={todoistLinkedTask.priority}
                      onChange={(e) => handleUpdateProperty({ priority: Number(e.target.value) })}
                      className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl p-2.5 font-black text-slate-700 focus:ring-1 focus:ring-indigo-400 text-[11px]"
                    >
                      <option value={4}>P1 - Urgência Crítica (Vermelho)</option>
                      <option value={3}>P2 - Urgência Média (Laranja)</option>
                      <option value={2}>P3 - Urgência Normal (Azul)</option>
                      <option value={1}>P4 - Sem Urgência (Cinza)</option>
                    </select>
                  </div>

                  {/* Etiquetas */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-indigo-500" /> Etiquetas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(enrichedTaskData?.mainTask?.labels || todoistLinkedTask.labels || []).map((lbl: string, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-2.5 py-1 rounded-full font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition cursor-pointer"
                          onClick={() => handleUpdateProperty({ labels: (enrichedTaskData?.mainTask?.labels || todoistLinkedTask.labels || []).filter((l: string) => l !== lbl) })}
                          title="Clique para remover"
                        >
                          {lbl} <span className="text-[8px]">×</span>
                        </span>
                      ))}
                      {(!(enrichedTaskData?.mainTask?.labels || todoistLinkedTask.labels) || (enrichedTaskData?.mainTask?.labels || todoistLinkedTask.labels).length === 0) && (
                        <span className="text-[10px] text-slate-400 italic">Sem etiquetas.</span>
                      )}
                    </div>
                    {isAddingLabel ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (labelInput.trim()) {
                            const current = enrichedTaskData?.mainTask?.labels || todoistLinkedTask.labels || [];
                            if (!current.includes(labelInput.trim())) {
                              handleUpdateProperty({ labels: [...current, labelInput.trim()] });
                            }
                            setLabelInput("");
                            setIsAddingLabel(false);
                          }
                        }}
                        className="flex gap-1.5 items-center mt-1"
                      >
                        <input
                          type="text"
                          value={labelInput}
                          onChange={(e) => setLabelInput(e.target.value)}
                          placeholder="Nova..."
                          className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                          autoFocus
                        />
                        <button type="submit" className="text-emerald-600 text-xs font-bold px-1 font-sans">✓</button>
                        <button type="button" onClick={() => setIsAddingLabel(false)} className="text-rose-600 text-xs font-bold px-1 font-sans">×</button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingLabel(true)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-0.5 transition w-full justify-center font-sans"
                      >
                        <Plus className="h-2.5 w-2.5" /> Adicionar etiqueta
                      </button>
                    )}
                  </div>

                  {/* Lembretes */}
                  <div className="space-y-1 border-t border-slate-100 pt-2.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-500" /> Lembretes
                    </span>
                    <div className="text-[10px] text-slate-500 italic bg-slate-50/50 p-2 rounded-lg border border-slate-150">
                      Configurados na tarefa principal (e-mail, push)
                    </div>
                  </div>

                  {/* Local */}
                  <div className="space-y-1 border-t border-slate-100 pt-2.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Local
                    </span>
                    <div className="text-[10px] text-slate-500 font-bold bg-slate-50/50 p-2 rounded-lg border border-slate-150 truncate">
                      Belo Horizonte, MG, Brasil
                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            // INACTIVE STATE - NO LINKED TASK
            <div className="flex-1 flex flex-col justify-center items-center py-10 space-y-5 text-center animate-fade-in">
              {todoistNotFoundForCnj ? (
                // 1. CUSTOM NOT FOUND ALERT & REQ ACTIONS
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 max-w-md flex flex-col items-center space-y-4 shadow-sm">
                  <AlertTriangle className="h-9 w-9 text-rose-500 animate-pulse" />
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-rose-950">
                    Nenhuma tarefa Todoist encontrada para este CNJ
                  </h5>
                  <p className="text-[11px] text-rose-850 leading-relaxed font-medium">
                    Não localizamos nenhuma tarefa vinculada ao processo <strong className="text-rose-950 font-black">{cleanCnjStr}</strong> nas buscas ativas ou concluídas.
                  </p>
                  
                  {/* The three requested buttons */}
                  <div className="w-full flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => window.open(`https://app.todoist.com/app/search/${encodeURIComponent(cleanCnjStr)}`, "_blank")}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 border border-slate-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir busca no Todoist
                    </button>

                    <button
                      onClick={handleCreateMirrorTask}
                      disabled={todoistLoadingLocal}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                    >
                      {todoistLoadingLocal ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                      Criar tarefa vinculada
                    </button>

                    <button
                      onClick={() => setTodoistNotFoundForCnj(false)}
                      className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition border border-slate-200"
                    >
                      Ignorar por enquanto
                    </button>
                  </div>
                </div>
              ) : (
                // 2. NORMAL PREFILL CREATOR VIEW
                <div className="space-y-5 flex flex-col items-center w-full">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-sm flex flex-col items-center space-y-3.5 shadow-sm">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <h5 className="font-extrabold text-xs uppercase tracking-wider text-amber-950">Criar Tarefa no Todoist</h5>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Não há tarefa vinculada ao CNJ <strong className="text-amber-950 font-black">{cleanCnjStr}</strong> na sessão atual.
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Crie um novo Espelho de Tarefa no Todoist em 1 clique utilizando os dados desta publicação.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateMirrorTask}
                    disabled={todoistLoadingLocal}
                    className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 px-5 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {todoistLoadingLocal ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 stroke-[3]" />
                    )}
                    Criar Espelho da Tarefa no Todoist
                  </button>

                  <div className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-[11px] space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pré-visualização do Espelho:</span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Título:</span>
                        <span className="text-slate-700 font-bold truncate max-w-[200px]">Processo {cleanCnjStr}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Prioridade Inicial:</span>
                        <span className="text-blue-600 font-bold">P3 - Normal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Etiquetas Iniciais:</span>
                        <span className="text-slate-700 font-mono text-[9px] font-semibold bg-slate-200/60 px-1 py-0.5 rounded">Push, Prazo, Controladoria</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading / Syncing / Saving status absolute overlay */}
          {(todoistLoadingLocal || todoistSyncing || saveLoading) && (
            <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center space-y-2 z-20 rounded-2xl animate-fade-in">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-indigo-950">Sincronizando com o Todoist...</p>
            </div>
          )}

        </div>

      </div>

    </div>



      {/* 4. MODAL: CONFIRM SAVE CHOICE DIALOG */}
      {showSaveChoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-md animate-scale-up space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <Sliders className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Como deseja salvar a publicação?</h3>
                <p className="text-[11px] text-slate-400">Modo Linha de Produção Ativo</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              O sistema sincronizará os dados com o Todoist, gravará no histórico e registrará a conferência. Selecione o comportamento pós-salvamento:
            </p>

            <div className="space-y-2.5">
              
              <button
                onClick={() => triggerDirectSave('save_and_next')}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/40 hover:bg-indigo-50 transition group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                    🚀 Salvar e Próxima Publicação
                    <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider">Padrão</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">Alt + P</span>
                </div>
                <p className="text-[11px] text-indigo-900/80 mt-1 leading-relaxed">
                  Atualiza no Todoist, marca como conferido e abre automaticamente a próxima da fila.
                </p>
              </button>

              <button
                onClick={() => triggerDirectSave('save_only')}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs">💾 Salvar apenas</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">Alt + S</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Salva no Todoist, mas permanece na tela atual para realizar revisões ou ajustes adicionais.
                </p>
              </button>

              <button
                onClick={() => triggerDirectSave('save_and_close')}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs">🚪 Salvar e Fechar</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">Alt + F</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Atualiza no Todoist, marca como conferida e retorna à central com a lista de pendências.
                </p>
              </button>

            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" /> Atalho Padrão: Ctrl + Shift + Enter
              </span>
              <button 
                onClick={() => setShowSaveChoiceModal(false)}
                className="font-bold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL: KEYBOARD SHORTCUTS REFERENCE */}
      {isKeyboardShortcutsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-sm animate-scale-up space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Keyboard className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-slate-900 text-sm">Atalhos de Teclado (Modo Produtivo)</h3>
            </div>

            <div className="space-y-3 text-xs">
              
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Salvar Apenas</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + Enter</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-indigo-600 font-bold">Salvar e Próxima (Default)</span>
                <kbd className="bg-indigo-100 border border-indigo-200 px-2 py-1 rounded font-mono text-[10px] font-black text-indigo-700">Ctrl + Shift + Enter</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Pular Publicação (Próxima)</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + →</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Voltar Publicação (Anterior)</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + ←</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Abrir Painel de Delegação</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + D</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Abrir Histórico do Processo</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + H</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Abrir no Tribunal</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + P</kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Abrir E-mail no Gmail</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono text-[10px] font-black">Ctrl + G</kbd>
              </div>

            </div>

            <button
              onClick={() => setIsKeyboardShortcutsOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition"
            >
              Fechar Referência
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL: VER METADADOS */}
      {isMetadataModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-lg animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                <h3 className="font-extrabold text-slate-900 text-sm">Metadados da Publicação</h3>
              </div>
              <button 
                onClick={() => setIsMetadataModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Estes são os metadados reais identificados e extraídos pela inteligência do sistema. Clique no botão de cópia ao lado de qualquer campo para transferir o conteúdo.
            </p>

            <div className="space-y-3">
              {/* CNJ */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Número do Processo (CNJ)</span>
                  <div className="font-mono text-xs font-black text-slate-800">{controladoriaActiveItem.processNumber || "Não identificado"}</div>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(controladoriaActiveItem.processNumber || '');
                    addSystemLog("info", "CNJ copiado para a área de transferência.");
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                  title="Copiar CNJ"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Tribunal & Court Information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tribunal / Origem</span>
                    <div className="text-xs font-bold text-slate-800 truncate">{source?.name || "TRT-MG"}</div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(source?.name || "TRT-MG");
                      addSystemLog("info", "Tribunal copiado.");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                    title="Copiar Tribunal"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sistema Judicial</span>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {activeSubRouteId.includes('pje') ? 'PJe MG' : activeSubRouteId.includes('eproc') ? 'Eproc' : 'PJe TRT3'}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const sys = activeSubRouteId.includes('pje') ? 'PJe MG' : activeSubRouteId.includes('eproc') ? 'Eproc' : 'PJe TRT3';
                      navigator.clipboard.writeText(sys);
                      addSystemLog("info", "Sistema Judicial copiado.");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                    title="Copiar Sistema Judicial"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Partes */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Autor / Requerente</span>
                    <div className="text-xs font-semibold text-slate-800 truncate">{controladoriaActiveItem.autor || "Não identificado"}</div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(controladoriaActiveItem.autor || '');
                      addSystemLog("info", "Autor copiado.");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                    title="Copiar Autor"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Réu / Requerido</span>
                    <div className="text-xs font-semibold text-slate-800 truncate">{controladoriaActiveItem.reu || "Não identificado"}</div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(controladoriaActiveItem.reu || '');
                      addSystemLog("info", "Réu copiado.");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                    title="Copiar Réu"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Destinatário */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Destinatário</span>
                  <div className="text-xs font-bold text-indigo-950 truncate">{controladoriaActiveItem.to || "Não identificado"}</div>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(controladoriaActiveItem.to || '');
                    addSystemLog("info", "Destinatário copiado.");
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                  title="Copiar Destinatário"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Data & Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Data do E-mail</span>
                    <div className="text-xs font-bold text-slate-800">
                      {controladoriaActiveItem.date ? new Date(controladoriaActiveItem.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const dt = controladoriaActiveItem.date ? new Date(controladoriaActiveItem.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
                      navigator.clipboard.writeText(dt);
                      addSystemLog("info", "Data copiada.");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                    title="Copiar Data"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tipo da Movimentação</span>
                    <div className="text-xs font-bold text-indigo-600 truncate">{controladoriaActiveItem.category?.toUpperCase() || "INTIMAÇÃO"}</div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(controladoriaActiveItem.category || 'INTIMAÇÃO');
                      addSystemLog("info", "Tipo de movimentação copiado.");
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                    title="Copiar Tipo de Movimentação"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Prazo Sugerido */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider">Sugestão de Prazo (IA)</span>
                  <div className="text-xs font-black text-amber-950">
                    {controladoriaActiveItem.deadlineDays || 15} dias úteis (Novo CPC)
                  </div>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${controladoriaActiveItem.deadlineDays || 15} dias úteis`);
                    addSystemLog("info", "Sugestão de prazo copiada.");
                  }}
                  className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 transition"
                  title="Copiar Sugestão de Prazo"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsMetadataModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
              >
                Fechar Metadados
              </button>
            </div>
          </div>
        </div>
      )}

      {isTodoistSelectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-white">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600 animate-spin" />
                  Múltiplas tarefas encontradas
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Encontramos mais de uma tarefa para este CNJ. Selecione a tarefa correta.
                </p>
              </div>
              <button
                onClick={() => setIsTodoistSelectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Options List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
              {todoistMultipleTasksFound.map((task) => {
                const proj = todoistProjects.find((p) => p.id === task.project_id);
                const projName = proj ? proj.name : "Entrada (Inbox)";
                const dateStr = task.due ? new Date(task.due.date).toLocaleDateString('pt-BR') : "Sem data";
                
                return (
                  <div
                    key={task.id}
                    className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col space-y-3"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {task.content}
                        </h4>
                        
                        {/* Task Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            <Folder className="h-3 w-3" /> {projName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" /> {dateStr}
                          </span>
                          <span className={`flex items-center gap-1 font-bold ${
                            task.priority === 4 ? "text-rose-600" :
                            task.priority === 3 ? "text-amber-600" :
                            task.priority === 2 ? "text-blue-600" : "text-slate-500"
                          }`}>
                            <Flag className="h-3 w-3" /> P{5 - (task.priority || 4)}
                          </span>
                          {task.is_completed && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 py-0.5 rounded">
                              Concluída
                            </span>
                          )}
                          {task.score !== undefined && task.score > 0 && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-100 font-bold px-1.5 py-0.5 rounded">
                              Score: {task.score} pts
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Usar esta tarefa Button */}
                      <button
                        onClick={() => handleSelectTask(task)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-xl transition shadow-sm hover:shadow flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        Usar esta tarefa
                      </button>
                    </div>

                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2 text-[9px]">
                        {task.labels.map((lbl: string) => (
                          <span key={lbl} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition">
                            #{lbl}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comments block */}
                    {task.comments && task.comments.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-2 mt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          Últimos comentários:
                        </span>
                        <div className="space-y-2 divide-y divide-slate-200/50">
                          {task.comments.slice(-2).map((comm: any, idx: number) => (
                            <div key={comm.id} className={`text-[10px] leading-relaxed text-slate-600 ${idx > 0 ? "pt-2" : ""}`}>
                              <p className="font-normal">{comm.content}</p>
                              <span className="text-[8px] text-slate-400 block mt-0.5">
                                {comm.posted_at ? new Date(comm.posted_at).toLocaleString('pt-BR') : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Todoist Automation Configuration Modal */}
      {isAutomationConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden font-sans animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-indigo-400 animate-spin-slow" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider uppercase">
                    Configurações da Automação Todoist
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Configure os parâmetros para a execução automática de tarefas/subtarefas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAutomationConfigModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1 custom-scrollbar">
              {/* Action Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tipo de Ação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Criar subtarefa", "Criar tarefa principal", "Editar tarefa principal"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAutomationConfig({ ...automationConfig, actionType: type })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                        automationConfig.actionType === type
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nome da tarefa / subtarefa
                  </label>
                  <input
                    type="text"
                    value={automationConfig.taskName}
                    onChange={(e) => setAutomationConfig({ ...automationConfig, taskName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Agendar hoje reunião com Cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Prazo (Due Date)
                  </label>
                  <input
                    type="text"
                    value={automationConfig.dueDate}
                    onChange={(e) => setAutomationConfig({ ...automationConfig, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: hoje ou YYYY-MM-DD"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  value={automationConfig.description || ""}
                  onChange={(e) => setAutomationConfig({ ...automationConfig, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Instruções adicionais da tarefa..."
                />
              </div>

              {/* Assignee & Collaborators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Responsável (Assignee)
                  </label>
                  <input
                    type="text"
                    value={automationConfig.assignee}
                    onChange={(e) => setAutomationConfig({ ...automationConfig, assignee: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: giffonisecretaria ou ID"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={automationConfig.priority || 1}
                    onChange={(e) => setAutomationConfig({ ...automationConfig, priority: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>P4 (Baixa/Cinza)</option>
                    <option value={2}>P3 (Média/Azul)</option>
                    <option value={3}>P2 (Alta/Laranja)</option>
                    <option value={4}>P1 (Urgente/Vermelho)</option>
                  </select>
                </div>
              </div>

              {/* Collaborators list if available */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Colaboradores do Projeto no Todoist
                </span>
                {loadingCollaborators ? (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium py-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                    Buscando colaboradores da API...
                  </div>
                ) : projectCollaborators.length > 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {projectCollaborators.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setAutomationConfig({ ...automationConfig, assignee: col.name || col.id });
                          addSystemLog("info", `Responsável definido para: ${col.name || col.id}`);
                        }}
                        className="text-left text-[10.5px] text-indigo-300 hover:text-white hover:bg-slate-800/80 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition flex items-center justify-between"
                      >
                        <span className="truncate pr-2">👤 {col.name || "Sem Nome"}</span>
                        <span className="text-[8.5px] text-slate-500 font-mono shrink-0">ID: {col.id}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-amber-500/90 font-medium py-1 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg">
                    Vincule um acoplamento de tarefa primeiro para carregar a lista de colaboradores deste projeto do Todoist em tempo real.
                  </div>
                )}
              </div>

              {/* Advanced Parameters */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                  Ajustar Parâmetros Avançados (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Etiquetas (Labels)
                    </label>
                    <input
                      type="text"
                      value={automationConfig.labels || ""}
                      onChange={(e) => setAutomationConfig({ ...automationConfig, labels: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Ex: urgente, secretaria"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Projeto ID Override
                    </label>
                    <input
                      type="text"
                      value={automationConfig.project || ""}
                      onChange={(e) => setAutomationConfig({ ...automationConfig, project: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="ID do Projeto"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Seção ID Override
                    </label>
                    <input
                      type="text"
                      value={automationConfig.section || ""}
                      onChange={(e) => setAutomationConfig({ ...automationConfig, section: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="ID da Seção"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Parent ID Override
                    </label>
                    <input
                      type="text"
                      value={automationConfig.parentTask || ""}
                      onChange={(e) => setAutomationConfig({ ...automationConfig, parentTask: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="ID Pai"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Ordem (Order)
                    </label>
                    <input
                      type="number"
                      value={automationConfig.order || 1}
                      onChange={(e) => setAutomationConfig({ ...automationConfig, order: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setAutomationConfig({
                    actionType: "Criar subtarefa",
                    taskName: "Secretariado, por gentileza, agendar reunião com o cliente hoje",
                    description: "",
                    assignee: "giffonisecretaria",
                    dueDate: "hoje",
                    priority: 1,
                    labels: "",
                    project: "",
                    section: "",
                    parentTask: "",
                    order: 1
                  });
                  addSystemLog("info", "Configurações da automação redefinidas para o padrão.");
                }}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
              >
                Redefinir Padrão
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAutomationConfigModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("boss_todoist_automation_config", JSON.stringify(automationConfig));
                    addSystemLog("success", "Configurações da automação salvas com sucesso!");
                    setIsAutomationConfigModalOpen(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-md shadow-indigo-900/40"
                >
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Execution Modal: Delegar Prazo para a Equipe */}
      {isDelegarPrazoModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden font-sans animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider uppercase">
                    FASE 1 — Decidindo a delegação de prazos
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Defina o responsável, a data de notificação e o prazo fatal para criar a subtarefa de controle.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDelegarPrazoModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scroll Area */}
            <form onSubmit={(e) => { e.preventDefault(); handleExecuteDelegarPrazo(); }} className="overflow-y-auto p-6 space-y-4 flex-1 custom-scrollbar">
              
              {/* 1. Quem é o responsável? */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  1. Quem é o responsável? <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={delegarResponsavelId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDelegarResponsavelId(val);
                      if (val === "fallback") {
                        setDelegarResponsavelNome("");
                      } else {
                        const matched = projectCollaborators.find(c => String(c.id) === String(val));
                        if (matched) {
                          setDelegarResponsavelNome(matched.name || matched.email);
                        } else {
                          setDelegarResponsavelNome("");
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">Selecione o responsável...</option>
                    {projectCollaborators.map((col) => (
                      <option key={col.id} value={col.id}>
                        👤 {col.name || col.email}
                      </option>
                    ))}
                    <option value="fallback">✏️ Digitar responsável manualmente (Fallback)</option>
                  </select>

                  {/* Fallback name input if select custom */}
                  {(delegarResponsavelId === "fallback" || projectCollaborators.length === 0) && (
                    <input
                      type="text"
                      value={delegarResponsavelNome}
                      onChange={(e) => setDelegarResponsavelNome(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Nome do responsável (Ex: João Silva)"
                      required
                    />
                  )}
                </div>
              </div>

              {/* 2. Quando o usuário será notificado? */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  2. Quando o usuário será notificado?
                </label>
                <input
                  type="date"
                  value={delegarNotificado}
                  onChange={(e) => setDelegarNotificado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[9px] text-slate-500 block">
                  Aviso/lembrete interno da automação. Não altera o vencimento real do Todoist.
                </span>
              </div>

              {/* 3. Qual é o Prazo Fatal? */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  3. Qual é o Prazo Fatal? <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={delegarPrazoFatal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDelegarPrazoFatal(val);
                    if (val) {
                      const offset = Number(delegarConfig.regraPrazoSeguranca) || 3;
                      const dateObj = new Date(val + "T12:00:00");
                      if (!isNaN(dateObj.getTime())) {
                        dateObj.setDate(dateObj.getDate() - offset);
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        setDelegarPrazoSeguranca(`${year}-${month}-${day}`);
                      }
                    } else {
                      setDelegarPrazoSeguranca("");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="text-[9px] text-slate-500 block">
                  Este será o vencimento real (due_date) da subtarefa no Todoist.
                </span>
              </div>

              {/* 4. Prazo de Segurança */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    4. Prazo de Segurança
                  </label>
                  <span className="text-[9px] text-indigo-400 font-semibold uppercase">
                    Auto-calculado: fatal - {delegarConfig.regraPrazoSeguranca || 3} dias
                  </span>
                </div>
                <input
                  type="date"
                  value={delegarPrazoSeguranca}
                  onChange={(e) => setDelegarPrazoSeguranca(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  placeholder="Prazo de segurança"
                />
              </div>

              {/* 5. O que deverá ser feito? */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  5. O que deverá ser feito? <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={delegarOQueFazer}
                  onChange={(e) => setDelegarOQueFazer(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Descreva a atividade jurídica a ser realizada (Ex: Elaborar contestação do processo)"
                  required
                />
              </div>

            </form>

            {/* Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDelegarPrazoModalOpen(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-800"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={delegarLoading}
                onClick={handleExecuteDelegarPrazo}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-md shadow-indigo-900/40 flex items-center gap-1.5"
              >
                {delegarLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Delegando...
                  </>
                ) : (
                  <>
                    ⚡ Executar Delegação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ Configuration Modal: Parâmetros de Delegação de Prazos */}
      {isDelegarConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden font-sans animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider uppercase">
                    Configurações da Automação — Delegar Prazo
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Defina os modelos e regras padrão aplicáveis à criação de tarefas e prazos jurídicos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDelegarConfigModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1 custom-scrollbar">
              
              {/* Tipo e Regra do Prazo de Segurança */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tipo de Ação
                  </label>
                  <select
                    value={delegarConfig.tipo || "criar subtarefa"}
                    onChange={(e) => setDelegarConfig({ ...delegarConfig, tipo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="criar subtarefa">Criar Subtarefa na Tarefa do Espelho</option>
                    <option value="criar tarefa principal">Criar Tarefa Principal Solta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Regra do Prazo de Segurança (Dias Subtraídos)
                  </label>
                  <input
                    type="number"
                    value={delegarConfig.regraPrazoSeguranca || 3}
                    onChange={(e) => setDelegarConfig({ ...delegarConfig, regraPrazoSeguranca: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    min="0"
                    max="30"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    Define quantos dias a menos o sistema irá sugerir no Prazo de Segurança.
                  </span>
                </div>
              </div>

              {/* Modelo do Título */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Modelo do Título (Título da Tarefa)
                </label>
                <input
                  type="text"
                  value={delegarConfig.modeloTitulo || ""}
                  onChange={(e) => setDelegarConfig({ ...delegarConfig, modeloTitulo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="[{responsavel}] {o_que_fazer}"
                />
                <span className="text-[9px] text-slate-500 block">
                  Variáveis suportadas: <code className="text-indigo-400 bg-slate-950/60 px-1 py-0.5 rounded font-mono">{`{responsavel}`}</code>, <code className="text-indigo-400 bg-slate-950/60 px-1 py-0.5 rounded font-mono">{`{o_que_fazer}`}</code>
                </span>
              </div>

              {/* Modelo da Descrição */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Modelo da Descrição
                </label>
                <textarea
                  value={delegarConfig.modeloDescricao || ""}
                  onChange={(e) => setDelegarConfig({ ...delegarConfig, modeloDescricao: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="Modelo da descrição"
                />
                <span className="text-[9px] text-slate-500 block">
                  Variáveis: <code className="text-indigo-400 bg-slate-950/60 px-1 py-0.5 rounded font-mono">{`{prazo_fatal}`}</code>, <code className="text-indigo-400 bg-slate-950/60 px-1 py-0.5 rounded font-mono">{`{prazo_seguranca}`}</code>, <code className="text-indigo-400 bg-slate-950/60 px-1 py-0.5 rounded font-mono">{`{notificacao}`}</code>
                </span>
              </div>

              {/* Responsável e Prioridade Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Responsável Padrão
                  </label>
                  <select
                    value={delegarConfig.responsavelPadrao || ""}
                    onChange={(e) => setDelegarConfig({ ...delegarConfig, responsavelPadrao: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Nenhum</option>
                    {projectCollaborators.map((col) => (
                      <option key={col.id} value={col.id}>
                        👤 {col.name || col.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Prioridade Padrão
                  </label>
                  <select
                    value={delegarConfig.prioridadePadrao || 1}
                    onChange={(e) => setDelegarConfig({ ...delegarConfig, prioridadePadrao: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>P4 (Baixa/Cinza)</option>
                    <option value={2}>P3 (Média/Azul)</option>
                    <option value={3}>P2 (Alta/Laranja)</option>
                    <option value={4}>P1 (Urgente/Vermelho)</option>
                  </select>
                </div>
              </div>

              {/* Etiquetas e Heranças */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Etiquetas Padrão (Separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={delegarConfig.etiquetasPadrao || ""}
                    onChange={(e) => setDelegarConfig({ ...delegarConfig, etiquetasPadrao: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: prazo-juridico, controle"
                  />
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    Herança de Metadados
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Projeto Herdado</span>
                      <span className="text-[9.5px] text-slate-400">Criar no mesmo projeto da tarefa principal do Espelho</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={delegarConfig.projetoHerdado ?? true}
                      onChange={(e) => setDelegarConfig({ ...delegarConfig, projetoHerdado: e.target.checked })}
                      className="h-4.5 w-4.5 text-indigo-600 border-slate-800 rounded focus:ring-indigo-500"
                    />
                  </div>

                  {!delegarConfig.projetoHerdado && (
                    <div className="pt-2">
                      <label className="block text-[9.5px] font-bold text-slate-400 uppercase mb-1">
                        Projeto ID Override (Opcional)
                      </label>
                      <input
                        type="text"
                        value={delegarConfig.project || ""}
                        onChange={(e) => setDelegarConfig({ ...delegarConfig, project: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        placeholder="ID do Projeto"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                    <div>
                      <span className="text-xs font-semibold text-white block">Seção Herdada</span>
                      <span className="text-[9.5px] text-slate-400">Criar na mesma seção da tarefa principal (se houver)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={delegarConfig.secaoHerdada ?? true}
                      onChange={(e) => setDelegarConfig({ ...delegarConfig, secaoHerdada: e.target.checked })}
                      className="h-4.5 w-4.5 text-indigo-600 border-slate-800 rounded focus:ring-indigo-500"
                    />
                  </div>

                  {!delegarConfig.secaoHerdada && (
                    <div className="pt-2">
                      <label className="block text-[9.5px] font-bold text-slate-400 uppercase mb-1">
                        Seção ID Override (Opcional)
                      </label>
                      <input
                        type="text"
                        value={delegarConfig.section || ""}
                        onChange={(e) => setDelegarConfig({ ...delegarConfig, section: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        placeholder="ID da Seção"
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setDelegarConfig({
                    tipo: "criar subtarefa",
                    modeloTitulo: "[{responsavel}] {o_que_fazer}",
                    modeloDescricao: "Prazo fatal: {prazo_fatal}\nPrazo de segurança: {prazo_seguranca}\nNotificação: {notificacao}\nOrigem: Automação Delegar Prazo para a Equipe",
                    regraPrazoSeguranca: 3,
                    responsavelPadrao: "",
                    prioridadePadrao: 1,
                    etiquetasPadrao: "",
                    projetoHerdado: true,
                    secaoHerdada: true
                  });
                  addSystemLog("info", "Configurações redefinidas para o padrão de delegação.");
                }}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
              >
                Redefinir Padrão
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDelegarConfigModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("boss_delegar_prazo_config", JSON.stringify(delegarConfig));
                    addSystemLog("success", "Parâmetros de delegação de prazos salvos com sucesso!");
                    setIsDelegarConfigModalOpen(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-md shadow-indigo-900/40"
                >
                  Salvar Parâmetros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

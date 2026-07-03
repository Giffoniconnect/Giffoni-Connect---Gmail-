import React, { useState, useEffect, useRef } from "react";
import { 
  Sliders, CalendarRange, Clock, Database, CheckCircle, RefreshCw, 
  ArrowLeft, ArrowRight, Save, Trash2, Check, Plus, ExternalLink, 
  AlertTriangle, User, Calendar, Tag, ChevronDown, Download, Copy, 
  Inbox, Flame, Target, Sparkles, Keyboard, Key, MessageSquare, Search,
  Folder, Flag, X, FileText, CheckSquare
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
  todoistToken: string;
  setTodoistToken: (tk: string) => void;
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
  searchTodoistTasks?: (item: any, tokenToUse: string) => Promise<void>;
  
  handleSaveTodoistTask: (skipRedirect?: boolean) => Promise<any>;
  handleOpenControladoriaWorkspace: (msg: any, group: any, sourceId: string) => Promise<void>;
  handleMarkAsConferred: (email: any) => Promise<void>;
  
  publications: Publication[];
  setPublications: React.Dispatch<React.SetStateAction<Publication[]>>;
  systemLogs: any[];
  addSystemLog: (type: string, msg: string, category?: string) => void;
  setActiveTab: (tab: any) => void;
  source: any;
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
  searchTodoistTasks
}) => {
  const cleanCnjStr = (controladoriaActiveItem.processNumber || '').replace(/\s+/g, '');

  // Panel States
  const [viewRawCode, setViewRawCode] = useState(false);
  const [isDelegarOpen, setIsDelegarOpen] = useState(true);
  const [isRevisaoOpen, setIsRevisaoOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  
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

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (cleanCnjStr) {
      setSearchQuery(cleanCnjStr);
    }
  }, [cleanCnjStr]);

  const handleManualSearch = () => {
    if (searchTodoistTasks && searchQuery.trim()) {
      searchTodoistTasks({ processNumber: searchQuery.trim() }, todoistToken);
    } else {
      addSystemLog("warning", "Digite um número de processo ou termo válido.");
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

  // Load comments and subtasks when a linked task is active
  useEffect(() => {
    if (todoistLinkedTask?.id && todoistToken) {
      fetchRealTimeComments();
      fetchRealTimeSubtasks();
    } else {
      setRealTimeSubtasks([]);
      setRealTimeComments([]);
    }
  }, [todoistLinkedTask?.id, todoistToken]);

  const fetchRealTimeComments = async () => {
    if (!todoistLinkedTask?.id || !todoistToken) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/todoist/comments?task_id=${todoistLinkedTask.id}`, {
        headers: { 'x-todoist-token': todoistToken }
      });
      if (res.ok) {
        const data = await res.json();
        setRealTimeComments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao carregar comentários do Todoist:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchRealTimeSubtasks = async () => {
    if (!todoistLinkedTask?.id || !todoistToken) return;
    setLoadingSubtasks(true);
    try {
      const res = await fetch(`/api/todoist/tasks?project_id=${todoistLinkedTask.project_id}`, {
        headers: { 'x-todoist-token': todoistToken }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const subs = data.filter((t: any) => t.parent_id === todoistLinkedTask.id);
          setRealTimeSubtasks(subs);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar subtarefas do Todoist:", e);
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const handleUpdateProperty = async (fields: any) => {
    if (!todoistLinkedTask?.id || !todoistToken) return;
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
          'x-todoist-token': todoistToken,
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
    if (!todoistLinkedTask?.id || !todoistToken) return;
    setTodoistLoadingLocal(true);
    const isClosing = !todoistLinkedTask.is_completed;
    const endpoint = isClosing ? `/api/todoist/tasks/${todoistLinkedTask.id}/close` : `/api/todoist/tasks/${todoistLinkedTask.id}/reopen`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { 'x-todoist-token': todoistToken }
      });
      if (res.ok) {
        addSystemLog("success", isClosing ? "Tarefa marcada como CONCLUÍDA no Todoist!" : "Tarefa REABERTA no Todoist!");
        if (setTodoistLinkedTask) {
          setTodoistLinkedTask({ ...todoistLinkedTask, is_completed: isClosing });
        }
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
    if (!localSubtaskInput.trim() || !todoistLinkedTask?.id || !todoistToken) return;
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/tasks`, {
        method: "POST",
        headers: {
          'x-todoist-token': todoistToken,
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
        fetchRealTimeSubtasks();
      } else {
        addSystemLog("error", "Erro ao criar subtarefa no Todoist.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTodoistLoadingLocal(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    if (!todoistToken) return;
    setTodoistLoadingLocal(true);
    const endpoint = !currentCompleted ? `/api/todoist/tasks/${subtaskId}/close` : `/api/todoist/tasks/${subtaskId}/reopen`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { 'x-todoist-token': todoistToken }
      });
      if (res.ok) {
        addSystemLog("success", !currentCompleted ? "Subtarefa marcada como concluída!" : "Subtarefa reaberta!");
        fetchRealTimeSubtasks();
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
    if (!todoistToken) return;
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/tasks/${subtaskId}`, {
        method: "DELETE",
        headers: { 'x-todoist-token': todoistToken }
      });
      if (res.ok) {
        addSystemLog("success", "Subtarefa excluída do Todoist.");
        fetchRealTimeSubtasks();
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
    if (!localCommentInput.trim() || !todoistLinkedTask?.id || !todoistToken) return;
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/comments`, {
        method: "POST",
        headers: {
          'x-todoist-token': todoistToken,
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
        fetchRealTimeComments();
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
    if (!todoistToken) return;
    setTodoistLoadingLocal(true);
    try {
      const res = await fetch(`/api/todoist/comments/${commentId}`, {
        method: "DELETE",
        headers: { 'x-todoist-token': todoistToken }
      });
      if (res.ok) {
        addSystemLog("success", "Comentário removido do Todoist.");
        fetchRealTimeComments();
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
    if (!todoistToken) {
      addSystemLog("warning", "Token do Todoist ausente.");
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
          'x-todoist-token': todoistToken,
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

            {/* Interactive slide controls */}
            <div className="space-y-1 pt-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ajustar Parâmetros</div>
              
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

            {/* Collapsible Panel: AGENDAR REVISÃO */}
            {isRevisaoOpen && (
              <div className="bg-gradient-to-br from-blue-50/70 to-white border border-blue-200 rounded-xl p-3.5 space-y-3.5 shadow-sm mt-3 animate-fade-in">
                <div className="flex justify-between items-center border-b border-blue-100 pb-1.5">
                  <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> Programar Revisão Processual
                  </span>
                  <button onClick={() => setIsRevisaoOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Adicione gatilhos de conferência ou revisão futura como subtarefas do Todoist:
                </p>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <button 
                    onClick={async () => {
                      const subText = `Revisar publicação em 15 dias: Processo ${cleanCnjStr}`;
                      if (todoistLinkedTask?.id) {
                        setTodoistLoadingLocal(true);
                        try {
                          const res = await fetch(`/api/todoist/tasks`, {
                            method: "POST",
                            headers: {
                              'x-todoist-token': todoistToken,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              content: subText,
                              parent_id: todoistLinkedTask.id,
                              project_id: todoistLinkedTask.project_id
                            })
                          });
                          if (res.ok) {
                            addSystemLog('success', 'Gatilho de revisão em 15 dias adicionado ao Todoist!');
                            fetchRealTimeSubtasks();
                          }
                        } catch (e) { console.error(e); }
                        finally { setTodoistLoadingLocal(false); }
                      } else {
                        setTodoistTaskSubtasks([...todoistTaskSubtasks, subText]);
                        addSystemLog('success', 'Gatilho de revisão em 15 dias planejado!');
                      }
                      setIsRevisaoOpen(false);
                    }}
                    className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-semibold text-slate-700 hover:text-blue-700 transition text-[11px]"
                  >
                    Revisar em 15 dias
                  </button>
                  <button 
                    onClick={async () => {
                      const subText = `Revisar publicação em 30 dias: Processo ${cleanCnjStr}`;
                      if (todoistLinkedTask?.id) {
                        setTodoistLoadingLocal(true);
                        try {
                          const res = await fetch(`/api/todoist/tasks`, {
                            method: "POST",
                            headers: {
                              'x-todoist-token': todoistToken,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              content: subText,
                              parent_id: todoistLinkedTask.id,
                              project_id: todoistLinkedTask.project_id
                            })
                          });
                          if (res.ok) {
                            addSystemLog('success', 'Gatilho de revisão em 30 dias adicionado ao Todoist!');
                            fetchRealTimeSubtasks();
                          }
                        } catch (e) { console.error(e); }
                        finally { setTodoistLoadingLocal(false); }
                      } else {
                        setTodoistTaskSubtasks([...todoistTaskSubtasks, subText]);
                        addSystemLog('success', 'Gatilho de revisão em 30 dias planejado!');
                      }
                      setIsRevisaoOpen(false);
                    }}
                    className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-semibold text-slate-700 hover:text-blue-700 transition text-[11px]"
                  >
                    Revisar em 30 dias
                  </button>
                  <button 
                    onClick={async () => {
                      const subText = `Revisar após julgamento de embargos: Processo ${cleanCnjStr}`;
                      if (todoistLinkedTask?.id) {
                        setTodoistLoadingLocal(true);
                        try {
                          const res = await fetch(`/api/todoist/tasks`, {
                            method: "POST",
                            headers: {
                              'x-todoist-token': todoistToken,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              content: subText,
                              parent_id: todoistLinkedTask.id,
                              project_id: todoistLinkedTask.project_id
                            })
                          });
                          if (res.ok) {
                            addSystemLog('success', 'Gatilho pós-julgamento de embargos adicionado ao Todoist!');
                            fetchRealTimeSubtasks();
                          }
                        } catch (e) { console.error(e); }
                        finally { setTodoistLoadingLocal(false); }
                      } else {
                        setTodoistTaskSubtasks([...todoistTaskSubtasks, subText]);
                        addSystemLog('success', 'Gatilho pós-julgamento planejado!');
                      }
                      setIsRevisaoOpen(false);
                    }}
                    className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-semibold text-slate-700 hover:text-blue-700 transition text-[11px]"
                  >
                    Pós Julgamento
                  </button>
                  <button 
                    onClick={async () => {
                      const subText = `Conferir decurso e trânsito em julgado: Processo ${cleanCnjStr}`;
                      if (todoistLinkedTask?.id) {
                        setTodoistLoadingLocal(true);
                        try {
                          const res = await fetch(`/api/todoist/tasks`, {
                            method: "POST",
                            headers: {
                              'x-todoist-token': todoistToken,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              content: subText,
                              parent_id: todoistLinkedTask.id,
                              project_id: todoistLinkedTask.project_id
                            })
                          });
                          if (res.ok) {
                            addSystemLog('success', 'Gatilho de decurso e trânsito adicionado ao Todoist!');
                            fetchRealTimeSubtasks();
                          }
                        } catch (e) { console.error(e); }
                        finally { setTodoistLoadingLocal(false); }
                      } else {
                        setTodoistTaskSubtasks([...todoistTaskSubtasks, subText]);
                        addSystemLog('success', 'Gatilho pós prazo fatal planejado!');
                      }
                      setIsRevisaoOpen(false);
                    }}
                    className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-semibold text-slate-700 hover:text-blue-700 transition text-[11px]"
                  >
                    Pós Prazo Fatal
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Panel: HISTÓRICO */}
            {isHistoricoOpen && (
              <div className="bg-gradient-to-br from-purple-50/70 to-white border border-purple-200 rounded-xl p-3.5 space-y-3.5 shadow-sm mt-3 max-h-80 overflow-y-auto animate-fade-in">
                <div className="flex justify-between items-center border-b border-purple-100 pb-1.5">
                  <span className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <Database className="h-4 w-4" /> Histórico Operacional
                  </span>
                  <button onClick={() => setIsHistoricoOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                </div>
                <div className="space-y-2">
                  {systemLogs
                    .filter(log => log.message.includes(cleanCnjStr))
                    .map(log => (
                      <div key={log.id} className="text-[11px] border-l-2 border-purple-400 pl-2 space-y-0.5">
                        <div className="text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</div>
                        <p className="text-slate-600 leading-relaxed">{log.message}</p>
                      </div>
                    ))}
                  {systemLogs.filter(log => log.message.includes(cleanCnjStr)).length === 0 && (
                    <div className="text-center py-4 text-[10px] text-slate-400">
                      Nenhum histórico anterior para este processo.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subtarefas Automáticas (Migrated here) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-3 w-3 text-indigo-500" /> Subtarefas Automáticas ({todoistTaskSubtasks.length})
              </label>
              
              <div className="space-y-1.5">
                {todoistTaskSubtasks.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-xs">
                    <span className="font-semibold text-slate-700 leading-relaxed pr-2">{sub}</span>
                    <button 
                      onClick={() => handleRemoveSubtask(i)}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Excluir subtarefa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {todoistTaskSubtasks.length === 0 && (
                  <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] italic">
                    Nenhuma subtarefa agendada.
                  </div>
                )}
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSubtaskText.trim()) return;
                  setTodoistTaskSubtasks([...todoistTaskSubtasks, newSubtaskText.trim()]);
                  setNewSubtaskText("");
                  addSystemLog('success', 'Subtarefa manual adicionada com sucesso.');
                }} 
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  placeholder="Nova subtarefa manual..."
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400"
                />
                <button type="submit" className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition border border-indigo-200">
                  <Plus className="h-4 w-4" />
                </button>
              </form>
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

              <button
                onClick={handleMarkAsRevisarDepois}
                className="w-full text-left font-semibold text-xs py-1.5 px-3 rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition flex items-center gap-2"
              >
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Revisar Depois
              </button>

              <button
                onClick={handleMarkAsIgnored}
                className="w-full text-left font-semibold text-xs py-1.5 px-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-800 transition flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" /> Não é Publicação
              </button>

              <button
                onClick={handleMarkAsDuplicate}
                className="w-full text-left font-semibold text-xs py-1.5 px-3 rounded-lg text-slate-600 hover:bg-orange-50 hover:text-orange-800 transition flex items-center gap-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400" /> Marcar Duplicidade
              </button>
            </div>

            {/* Links Externos */}
            <div className="space-y-1 border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sistemas de Apoio</div>
              
              <button
                onClick={() => setIsMetadataModalOpen(true)}
                className="w-full text-left text-slate-600 hover:text-indigo-600 font-semibold text-xs py-1.5 px-3 rounded-lg hover:bg-slate-50 transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" /> Ver metadados
                </span>
              </button>

              <button
                onClick={handleOpenProcesso}
                className="w-full text-left text-slate-600 hover:text-indigo-600 font-semibold text-xs py-1.5 px-3 rounded-lg hover:bg-slate-50 transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Abrir no Tribunal
                </span>
              </button>

              <button
                onClick={handleOpenGmail}
                className="w-full text-left text-slate-600 hover:text-indigo-600 font-semibold text-xs py-1.5 px-3 rounded-lg hover:bg-slate-50 transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Abrir Gmail Original
                </span>
              </button>

              <button
                onClick={handleOpenTodoist}
                className="w-full text-left text-slate-600 hover:text-indigo-600 font-semibold text-xs py-1.5 px-3 rounded-lg hover:bg-slate-50 transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Abrir Todoist
                </span>
              </button>
            </div>
          </div>

          {/* Quick Connection Settings */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3 shadow-inner">
            <h4 className="font-bold text-slate-800 flex items-center gap-1">
              <Key className="h-3.5 w-3.5 text-indigo-500" /> Conector Todoist
            </h4>
            <input 
              type="password"
              placeholder="Configurar Token..."
              value={todoistToken}
              onChange={(e) => {
                const tk = e.target.value.trim();
                localStorage.setItem('boss_todoist_api_token', tk);
                setTodoistToken(tk);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono focus:ring-1 focus:ring-indigo-500"
            />
            <div className="text-[9px] text-slate-400">Token salvo de forma segura localmente no navegador.</div>
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

          {/* ESPELHO DA TAREFA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-5 relative min-h-[500px]">
            
            {/* Header of Mirror View */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <img src="https://assets.todoist.com/assets/images/dc619f7b1548651a249ccb0c79213197.svg" alt="Todoist" className="h-4 w-4" />
                ESPELHO DA TAREFA (Mirror View)
              </span>
              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-black border border-red-100 uppercase tracking-wide animate-pulse">
                ● Acoplamento Oficial
              </span>
            </div>

          {/* Loading state indicator */}
          {todoistLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-2.5 py-20 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
              <span className="text-xs font-medium">Buscando tarefa correspondente no Todoist...</span>
            </div>
          ) : todoistLinkedTask ? (
            // ACTIVE MIRROR VIEW LAYOUT (TASK FOUND)
            <div className="flex-1 flex flex-col space-y-5 overflow-visible">
              
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

              {/* Task Properties Grid (Synced to Todoist REST API v2 on change) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-3.5 text-[11px]">
                
                {/* Due Date property */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-rose-500" /> Vencimento</span>
                  <input
                    type="date"
                    value={todoistLinkedTask.due?.date || ""}
                    onChange={(e) => handleUpdateProperty({ due_date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 text-xs"
                  />
                </div>

                {/* Priority property */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-amber-500" /> Prioridade</span>
                  <select
                    value={todoistLinkedTask.priority}
                    onChange={(e) => handleUpdateProperty({ priority: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800 focus:ring-1 focus:ring-indigo-400 text-xs"
                  >
                    <option value={4}>P1 - Urgência Crítica (Vermelho)</option>
                    <option value={3}>P2 - Urgência Média (Laranja)</option>
                    <option value={2}>P3 - Urgência Normal (Azul)</option>
                    <option value={1}>P4 - Sem Urgência (Cinza)</option>
                  </select>
                </div>

                {/* Assignee property */}
                <div className="space-y-1 col-span-2 border-t border-slate-200/60 pt-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><User className="h-3.5 w-3.5 text-indigo-500" /> Advogado Responsável</span>
                  <select
                    value={todoistLinkedTask.assignee_id || ""}
                    onChange={(e) => handleUpdateProperty({ assignee_id: e.target.value || null })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 text-xs"
                  >
                    <option value="">Não atribuído</option>
                    <option value="direito.rgr@gmail.com">Você (direito.rgr@gmail.com)</option>
                    <option value="controladoria@giffoni.adv.br">controladoria@giffoni.adv.br</option>
                    <option value="prazos@giffoni.adv.br">prazos@giffoni.adv.br</option>
                  </select>
                </div>
              </div>

              {/* Subtasks Section (Interactive sub-resource) */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-600" /> Subtarefas do Todoist ({realTimeSubtasks.length})
                  </span>
                  {loadingSubtasks && <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />}
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {realTimeSubtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-slate-50/70 border border-slate-100 p-2 rounded-lg text-xs group">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => handleToggleSubtask(sub.id, sub.is_completed)}
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                            sub.is_completed 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "border-slate-300 hover:border-indigo-500 text-transparent"
                          }`}
                        >
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </button>
                        <span className={`truncate font-medium text-slate-700 ${sub.is_completed ? "line-through text-slate-400" : ""}`}>
                          {sub.content}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition opacity-0 group-hover:opacity-100"
                        title="Remover subtarefa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {realTimeSubtasks.length === 0 && !loadingSubtasks && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2 border border-dashed border-slate-200 rounded-lg">
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

              {/* Labels Row */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" /> Etiquetas do Todoist
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {todoistLinkedTask.labels?.map((lbl: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-2.5 py-1 rounded-full font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition cursor-pointer"
                      onClick={() => handleUpdateProperty({ labels: todoistLinkedTask.labels.filter((l: string) => l !== lbl) })}
                      title="Clique para remover"
                    >
                      {lbl} <span className="text-[8px]">×</span>
                    </span>
                  ))}
                  {(!todoistLinkedTask.labels || todoistLinkedTask.labels.length === 0) && (
                    <span className="text-[10px] text-slate-400 italic">Sem etiquetas.</span>
                  )}
                  {isAddingLabel ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (labelInput.trim()) {
                          const current = todoistLinkedTask.labels || [];
                          if (!current.includes(labelInput.trim())) {
                            handleUpdateProperty({ labels: [...current, labelInput.trim()] });
                          }
                          setLabelInput("");
                          setIsAddingLabel(false);
                        }
                      }}
                      className="flex gap-1.5 items-center"
                    >
                      <input
                        type="text"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        placeholder="Nova..."
                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-400 w-16"
                        autoFocus
                      />
                      <button type="submit" className="text-emerald-600 text-xs font-bold">✓</button>
                      <button type="button" onClick={() => setIsAddingLabel(false)} className="text-rose-600 text-xs font-bold">×</button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsAddingLabel(true)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 transition"
                    >
                      <Plus className="h-2.5 w-2.5" /> Adicionar
                    </button>
                  )}
                </div>
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

    </div>
  );
};

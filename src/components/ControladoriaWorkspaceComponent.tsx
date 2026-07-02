import React, { useState, useEffect, useRef } from "react";
import { 
  Sliders, CalendarRange, Clock, Database, CheckCircle, RefreshCw, 
  ArrowLeft, ArrowRight, Save, Trash2, Check, Plus, ExternalLink, 
  AlertTriangle, User, Calendar, Tag, ChevronDown, Download, Copy, 
  Inbox, Flame, Target, Sparkles, Keyboard, Key
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
  todoistLoading: boolean;
  todoistSyncing: boolean;
  
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
  todoistLoading,
  todoistSyncing,
  handleSaveTodoistTask,
  handleOpenControladoriaWorkspace,
  handleMarkAsConferred,
  publications,
  setPublications,
  systemLogs,
  addSystemLog,
  setActiveTab,
  source
}) => {
  // Panel States
  const [isDelegarOpen, setIsDelegarOpen] = useState(false);
  const [isRevisaoOpen, setIsRevisaoOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  
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
  const cleanCnjStr = (controladoriaActiveItem.processNumber || '').replace(/\s+/g, '');
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
      
      {/* 1. FIXED TOP BAR (SMART QUEUE HEADER) */}
      <div className="sticky top-[73px] z-30 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        
        {/* COLUMN 1: LEFT OPERATIONAL SIDEBAR (3 Cols) */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-[160px] z-20">
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
                  setIsDelegarOpen(prev => !prev);
                  setIsRevisaoOpen(false);
                  setIsHistoricoOpen(false);
                }}
                className={`w-full text-left font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-between ${
                  isDelegarOpen ? "bg-amber-50 text-amber-800 border border-amber-200/50" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" /> Delegar Prazo
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition ${isDelegarOpen ? "rotate-180" : ""}`} />
              </button>

              <button
                onClick={() => {
                  setIsRevisaoOpen(prev => !prev);
                  setIsDelegarOpen(false);
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
                  setIsDelegarOpen(false);
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

        {/* COLUMN 2: CENTER PANEL (TODOIST TASK REPLICA) (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-5 relative">
          
          {/* Panel: DELEGAR PRAZO */}
          {isDelegarOpen && (
            <div className="bg-gradient-to-br from-amber-50/70 to-white border border-amber-200 rounded-xl p-4 space-y-3 animate-slide-down relative z-10 shadow-sm">
              <div className="flex justify-between items-center border-b border-amber-100 pb-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <CalendarRange className="h-4 w-4" /> Delegar Prazo
                </span>
                <button onClick={() => setIsDelegarOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">Fechar</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Responsável</label>
                  <select 
                    value={todoistTaskAssignee} 
                    onChange={(e) => setTodoistTaskAssignee(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-amber-400 font-semibold"
                  >
                    <option value="direito.rgr@gmail.com">direito.rgr@gmail.com (Você)</option>
                    <option value="controladoria@giffoni.adv.br">controladoria@giffoni.adv.br</option>
                    <option value="prazos@giffoni.adv.br">prazos@giffoni.adv.br</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Prazo Final</label>
                  <input 
                    type="date" 
                    value={todoistTaskDate} 
                    onChange={(e) => setTodoistTaskDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Prioridade</label>
                  <select 
                    value={todoistTaskPriority} 
                    onChange={(e) => setTodoistTaskPriority(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-amber-400"
                  >
                    <option value={4}>P1 - Alta/Urgente (Vermelho)</option>
                    <option value={3}>P2 - Média-Alta (Laranja)</option>
                    <option value={2}>P3 - Normal (Azul)</option>
                    <option value={1}>P4 - Baixa (Cinza)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Projeto Destino</label>
                  <select 
                    value={todoistTaskProject} 
                    onChange={(e) => setTodoistTaskProject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-amber-400"
                  >
                    {todoistProjects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {todoistProjects.length === 0 && <option value="">Inbox (Todoist)</option>}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Instrução Adicional</label>
                <textarea 
                  value={todoistTaskComments}
                  onChange={(e) => setTodoistTaskComments(e.target.value)}
                  placeholder="Orientações de prazo para o advogado..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-amber-400"
                />
              </div>
              <button 
                onClick={() => {
                  setIsDelegarOpen(false);
                  addSystemLog('info', 'Delegação e parâmetros de prazo ajustados.');
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg transition"
              >
                Confirmar Ajustes
              </button>
            </div>
          )}

          {/* Panel: AGENDAR REVISÃO */}
          {isRevisaoOpen && (
            <div className="bg-gradient-to-br from-blue-50/70 to-white border border-blue-200 rounded-xl p-4 space-y-3 animate-slide-down relative z-10 shadow-sm">
              <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Programar Revisão Processual
                </span>
                <button onClick={() => setIsRevisaoOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">Fechar</button>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Adicione gatilhos de conferência ou revisão futura como subtarefas automatizadas:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => {
                    const sub = `Revisar publicação em 15 dias: Processo ${cleanCnjStr}`;
                    setTodoistTaskSubtasks([...todoistTaskSubtasks, sub]);
                    setIsRevisaoOpen(false);
                    addSystemLog('success', 'Gatilho de revisão em 15 dias adicionado!');
                  }}
                  className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-medium text-slate-700 hover:text-blue-700 transition text-[11px]"
                >
                  Revisar em 15 dias
                </button>
                <button 
                  onClick={() => {
                    const sub = `Revisar publicação em 30 dias: Processo ${cleanCnjStr}`;
                    setTodoistTaskSubtasks([...todoistTaskSubtasks, sub]);
                    setIsRevisaoOpen(false);
                    addSystemLog('success', 'Gatilho de revisão em 30 dias adicionado!');
                  }}
                  className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-medium text-slate-700 hover:text-blue-700 transition text-[11px]"
                >
                  Revisar em 30 dias
                </button>
                <button 
                  onClick={() => {
                    const sub = `Revisar após julgamento de embargos: Processo ${cleanCnjStr}`;
                    setTodoistTaskSubtasks([...todoistTaskSubtasks, sub]);
                    setIsRevisaoOpen(false);
                    addSystemLog('success', 'Gatilho de revisão pós-julgamento adicionado!');
                  }}
                  className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-medium text-slate-700 hover:text-blue-700 transition text-[11px]"
                >
                  Pós Julgamento
                </button>
                <button 
                  onClick={() => {
                    const sub = `Conferir decurso e trânsito em julgado: Processo ${cleanCnjStr}`;
                    setTodoistTaskSubtasks([...todoistTaskSubtasks, sub]);
                    setIsRevisaoOpen(false);
                    addSystemLog('success', 'Gatilho pós prazo fatal adicionado!');
                  }}
                  className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-left font-medium text-slate-700 hover:text-blue-700 transition text-[11px]"
                >
                  Pós Prazo Fatal
                </button>
              </div>
            </div>
          )}

          {/* Panel: HISTÓRICO */}
          {isHistoricoOpen && (
            <div className="bg-gradient-to-br from-purple-50/70 to-white border border-purple-200 rounded-xl p-4 space-y-3 animate-slide-down relative z-10 shadow-sm max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                  <Database className="h-4 w-4" /> Histórico Operacional
                </span>
                <button onClick={() => setIsHistoricoOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">Fechar</button>
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

          {/* Todoist Linked Task Alert Badge */}
          {todoistLinkedTask && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 animate-fade-in shadow-sm">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <h5 className="font-bold text-emerald-950">Vinculado a uma Tarefa Existente!</h5>
                <p className="text-slate-600 mt-0.5">
                  Identificamos a tarefa: <strong className="text-slate-900">"{todoistLinkedTask.content}"</strong>. Ao salvar, atualizaremos esta mesma tarefa, sem criar duplicidades no seu painel.
                </p>
              </div>
            </div>
          )}

          {/* Core Replica Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Réplica do Todoist
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              Sincronização em Duas Vias Ativa
            </span>
          </div>

          {/* Interactive Replica Form fields */}
          <div className="space-y-4">
            
            {/* Title field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título da Tarefa</label>
              <textarea 
                value={todoistTaskTitle}
                onChange={(e) => setTodoistTaskTitle(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 hover:bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none transition leading-relaxed shadow-inner"
                placeholder="Insira o título amigável da tarefa..."
              />
            </div>

            {/* Description field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição (Markdown)</label>
              <textarea 
                value={todoistTaskDescription}
                onChange={(e) => setTodoistTaskDescription(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 hover:bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl p-3 text-xs font-mono text-slate-600 focus:outline-none transition leading-relaxed shadow-inner"
                placeholder="Insira a descrição processual..."
              />
            </div>

            {/* Params block */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</label>
                <div className="relative">
                  <select
                    value={todoistTaskAssignee}
                    onChange={(e) => setTodoistTaskAssignee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 appearance-none"
                  >
                    <option value="direito.rgr@gmail.com">Você (direito.rgr@gmail.com)</option>
                    <option value="controladoria@giffoni.adv.br">controladoria@giffoni.adv.br</option>
                    <option value="prazos@giffoni.adv.br">prazos@giffoni.adv.br</option>
                  </select>
                  <User className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo de Resolução</label>
                <div className="relative">
                  <input
                    type="date"
                    value={todoistTaskDate}
                    onChange={(e) => setTodoistTaskDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-400"
                  />
                  <Calendar className="absolute right-3 top-3 h-3 w-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridade (Todoist)</label>
                <select
                  value={todoistTaskPriority}
                  onChange={(e) => setTodoistTaskPriority(Number(e.target.value))}
                  className={`w-full border rounded-xl p-2.5 font-bold focus:ring-1 focus:ring-indigo-400 ${
                    todoistTaskPriority === 4 ? "bg-red-50 border-red-200 text-red-700" :
                    todoistTaskPriority === 3 ? "bg-orange-50 border-orange-200 text-orange-700" :
                    todoistTaskPriority === 2 ? "bg-blue-50 border-blue-200 text-blue-700" :
                    "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <option value={4}>🔴 P1 - Alta/Urgente</option>
                  <option value={3}>🟠 P2 - Média-Alta</option>
                  <option value={2}>🔵 P3 - Normal</option>
                  <option value={1}>⚪ P4 - Baixa</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projeto Destino</label>
                <select
                  value={todoistTaskProject}
                  onChange={(e) => setTodoistTaskProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400"
                >
                  {todoistProjects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {todoistProjects.length === 0 && <option value="">Inbox (Todoist)</option>}
                </select>
              </div>

            </div>

            {/* Labels section */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etiquetas Relacionadas</label>
              <div className="flex flex-wrap gap-1.5">
                {todoistTaskLabels.map((l, i) => (
                  <span 
                    key={i}
                    className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition cursor-pointer"
                    onClick={() => handleRemoveLabel(l)}
                    title="Clique para excluir"
                  >
                    <Tag className="h-3 w-3" />
                    {l}
                    <span className="text-[8px] font-black">×</span>
                  </span>
                ))}
                {todoistTaskLabels.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">Nenhuma etiqueta associada.</span>
                )}
              </div>
              
              <form onSubmit={handleAddLabel} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nova etiqueta..."
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400"
                />
                <button type="submit" className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition border border-indigo-200">
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Subtasks checklist */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtarefas Automáticas ({todoistTaskSubtasks.length})</label>
              
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

              <form onSubmit={handleAddSubtask} className="flex gap-2">
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

            {/* Internal comments */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comentários Adicionados</label>
              
              <div className="space-y-1.5">
                {localComments.map((c, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-xs relative">
                    <div className="text-[9px] text-slate-400 font-bold mb-0.5">Controladoria BOSS • Agora mesmo</div>
                    <p className="text-slate-600 leading-relaxed">{c}</p>
                  </div>
                ))}
                {todoistTaskComments && localComments.length === 0 && (
                  <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-xs relative">
                    <div className="text-[9px] text-slate-400 font-bold mb-0.5">Geral da Publicação</div>
                    <p className="text-slate-600 leading-relaxed font-mono text-[10px] whitespace-pre-wrap">{todoistTaskComments}</p>
                  </div>
                )}
                {!todoistTaskComments && localComments.length === 0 && (
                  <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] italic">
                    Nenhum comentário adicional registrado.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Escrever orientação..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400"
                />
                <button type="submit" className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition border border-indigo-200">
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>

          </div>

          {/* Loading Overlay */}
          {(todoistLoading || todoistSyncing || saveLoading) && (
            <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center space-y-2 z-20 rounded-2xl animate-fade-in">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-bold text-slate-700">Sincronizando com o Todoist...</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: RIGHT PANEL (INTELLIGENT EXTRACTION PANEL) (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 lg:sticky lg:top-[160px] max-h-[800px] overflow-y-auto">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" /> Extração de Metadados
            </h3>
            <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded-full font-black border border-purple-200 uppercase tracking-wide">
              IA Identificada
            </span>
          </div>

          {/* List of auto-extracted metadata fields */}
          <div className="space-y-3.5">
            
            {/* CNJ Process Number */}
            <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-1 w-full bg-indigo-500"></div>
              <div className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Número do Processo (CNJ)</div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-mono text-xs font-black text-slate-800 select-all">{controladoriaActiveItem.processNumber || "Não identificado"}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(controladoriaActiveItem.processNumber || '');
                    addSystemLog("info", "CNJ copiado para a área de transferência.");
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Tribunal & Court Information */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Tribunal / Origem</div>
                <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                  {source?.name || "TRT-MG"}
                </div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Sistema Judicial</div>
                <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                  {activeSubRouteId.includes('pje') ? 'PJe MG' : activeSubRouteId.includes('eproc') ? 'Eproc' : 'PJe TRT3'}
                </div>
              </div>
            </div>

            {/* Classe & Vara */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm space-y-1">
              <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Classe Judicial</div>
              <div className="text-xs font-bold text-slate-800">
                {controladoriaActiveItem.classe || "Não identificada"}
              </div>
            </div>

            {/* Partes (Autor & Réu) */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm space-y-2">
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Autor / Requerente</div>
                <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                  {controladoriaActiveItem.autor || "Não identificado"}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Réu / Requerido</div>
                <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                  {controladoriaActiveItem.reu || "Não identificado"}
                </div>
              </div>
            </div>

            {/* Advogado */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
              <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Destinatário</div>
              <div className="text-xs font-bold text-indigo-950 mt-1 truncate">
                {controladoriaActiveItem.to || "Não identificado"}
              </div>
            </div>

            {/* Data da Publicação & Tipo Movimento */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Data do E-mail</div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {controladoriaActiveItem.date ? new Date(controladoriaActiveItem.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Tipo da Movimentação</div>
                <div className="text-xs font-bold text-indigo-600 mt-1 truncate">
                  {controladoriaActiveItem.category?.toUpperCase() || "INTIMAÇÃO"}
                </div>
              </div>
            </div>

            {/* Prazo Sugerido */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
              <div className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Sugestão de Prazo (IA)</div>
              <div className="text-xs font-black text-amber-950 mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {controladoriaActiveItem.deadlineDays || 15} dias úteis (Novo CPC)
              </div>
            </div>

            {/* Attachments */}
            {controladoriaActiveItem.hasAttachments && controladoriaActiveItem.attachments && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm space-y-2">
                <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Documentos Anexos</div>
                <div className="space-y-1.5">
                  {controladoriaActiveItem.attachments.map((at: any) => (
                    <div key={at.id} className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded-lg p-2 text-xs">
                      <span className="font-semibold text-slate-700 truncate flex-1 pr-2">{at.filename}</span>
                      <button className="text-slate-500 hover:text-indigo-600 transition shrink-0 cursor-pointer">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Full Body */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Texto Integral do E-mail</div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto shadow-inner select-text">
                {controladoriaActiveItem.bodyText || controladoriaActiveItem.snippet || 'Aguardando carregamento silencioso do corpo...'}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. FOOTER: BENTO-GRID SMART QUEUES STATS & PROGRESS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
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

        {/* Smart Queues Stats Manager */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Inbox className="h-4 w-4 text-indigo-500" /> Gerenciador de Filas Inteligentes
            </h3>
            <div className="flex flex-wrap gap-1">
              {Object.keys(smartQueues).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedQueueTab(key)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    selectedQueueTab === key 
                      ? "bg-slate-900 text-white" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {smartQueues[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Bento-grid of stats for selected queue */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center shadow-inner">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
              <div className="text-xl font-extrabold font-mono text-slate-800 mt-1">
                {smartQueues[selectedQueueTab]?.total || 0}
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Conferidos</div>
              <div className="text-xl font-extrabold font-mono text-emerald-700 mt-1">
                {smartQueues[selectedQueueTab]?.conferidos || 0}
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-150 p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendentes</div>
              <div className="text-xl font-extrabold font-mono text-amber-700 mt-1">
                {smartQueues[selectedQueueTab]?.pendentes || 0}
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-150 p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Revisão</div>
              <div className="text-xl font-extrabold font-mono text-blue-700 mt-1">
                {smartQueues[selectedQueueTab]?.revisao || 0}
              </div>
            </div>

            <div className="bg-orange-50/50 border border-orange-150 p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Duplicados</div>
              <div className="text-xl font-extrabold font-mono text-orange-700 mt-1">
                {smartQueues[selectedQueueTab]?.duplicados || 0}
              </div>
            </div>

            <div className="bg-red-50/50 border border-red-150 p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Ignorados</div>
              <div className="text-xl font-extrabold font-mono text-red-700 mt-1">
                {smartQueues[selectedQueueTab]?.ignorados || 0}
              </div>
            </div>

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

    </div>
  );
};

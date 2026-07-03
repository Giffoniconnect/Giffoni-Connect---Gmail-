import { useState, useEffect, useRef } from 'react';
import { 
  Scale, Search, Calendar, Filter, CheckCircle, AlertCircle, 
  Trash2, Play, Check, ExternalLink, Clock, ArrowLeft, 
  AlertTriangle, Info, ChevronRight, Download, Layers, 
  Plus, X, Send, ListPlus, Tag, Activity, Copy, UserCheck, CheckSquare, RefreshCw
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface DjenPublication {
  id: string;
  fonte: 'djen';
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
  status: 'pendente' | 'em_conferencia' | 'conferida' | 'delegada' | 'ignorada' | 'duplicada' | 'revisar_depois';
  apparentDeadlineDays: number;
  informativeOnly: boolean;
  isDuplicate?: boolean;
  primaryPubId?: string | null;
  observacao?: string;
  userId: string;
  createdAt: string;
  todoistTaskId?: string | null;
  todoistTaskUrl?: string | null;
}

interface PainelDjenNacionalViewProps {
  user: any;
}

export function PainelDjenNacionalView({ user }: PainelDjenNacionalViewProps) {
  // Core DJEN States
  const [publications, setPublications] = useState<DjenPublication[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filtering & Selection
  const [activeFilter, setActiveFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPub, setSelectedPub] = useState<DjenPublication | null>(null);
  const [observations, setObservations] = useState<string>('');

  // Date ranges
  const [selectedPeriod, setSelectedPeriod] = useState<string>('5');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Manual import state (for pasting real texts when crawler is blocked)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualProcess, setManualProcess] = useState('');
  const [manualTribunal, setManualTribunal] = useState('Tribunal de Justiça de Minas Gerais');
  const [manualOrgao, setManualOrgao] = useState('Juízo de Direito');
  const [manualClasse, setManualClasse] = useState('Procedimento Comum');
  const [manualPartes, setManualPartes] = useState('A. C. S. X B. D. M.');

  // Todoist States
  const [todoistToken, setTodoistToken] = useState(() => localStorage.getItem('boss_todoist_api_token') || '');
  const [isTokenEditing, setIsTokenEditing] = useState(false);
  const [todoistProjects, setTodoistProjects] = useState<any[]>([]);
  const [todoistTasks, setTodoistTasks] = useState<any[]>([]);
  const [isSearchingTodoist, setIsSearchingTodoist] = useState(false);
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);
  
  // Delegation Form States
  const [delegatedResponsible, setDelegatedResponsible] = useState('direito.rgr@gmail.com');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [fatalDate, setFatalDate] = useState('');
  const [safetyDate, setSafetyDate] = useState('');
  const [priority, setPriority] = useState<number>(2); // 1: low, 2: normal, 3: high, 4: very high (Todoist: 1-4)
  const [tags, setTags] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([
    'Elaborar minuta',
    'Revisar peça processual',
    'Protocolar manifestação nos autos'
  ]);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Report Modal state
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Load local state and publications from Firestore on mount
  useEffect(() => {
    if (user) {
      loadPublicationsFromDb();
    }
  }, [user]);

  // Fetch Todoist projects on token load
  useEffect(() => {
    if (todoistToken) {
      fetchTodoistProjects();
    }
  }, [todoistToken]);

  // Search Todoist tasks by CNJ when selected publication changes
  useEffect(() => {
    if (selectedPub) {
      searchTodoistTasksForPub(selectedPub);
      setObservations(selectedPub.observacao || '');
      setIsDelegationOpen(false);
      // Auto-prefill safety and fatal dates based on apparent deadline
      if (selectedPub.apparentDeadlineDays > 0) {
        const today = new Date();
        const fatal = new Date();
        fatal.setDate(today.getDate() + selectedPub.apparentDeadlineDays);
        setFatalDate(fatal.toISOString().split('T')[0]);
        
        // Safety date: 2 business days before fatal or 2 calendar days before
        const safety = new Date(fatal);
        safety.setDate(fatal.getDate() - 2);
        setSafetyDate(safety.toISOString().split('T')[0]);
      } else {
        setFatalDate('');
        setSafetyDate('');
      }
    }
  }, [selectedPub]);

  const loadPublicationsFromDb = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "djen_publications"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const list: DjenPublication[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as DjenPublication);
      });
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPublications(list);
    } catch (err: any) {
      console.error("Erro ao carregar publicações DJEN:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodoistProjects = async () => {
    if (!todoistToken) return;
    try {
      const res = await fetch('/api/todoist/projects', {
        headers: { 'Authorization': `Bearer ${todoistToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodoistProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar projetos Todoist:", err);
    }
  };

  const searchTodoistTasksForPub = async (pub: DjenPublication) => {
    if (!todoistToken || !pub.processo || pub.processo === 'Sem número') return;
    setIsSearchingTodoist(true);
    try {
      const cnjToSearch = pub.processo.replace(/[^\d]/g, ''); // numeric-only for broad matching
      const res = await fetch(`/api/todoist/tasks?filter=search:${pub.processo}`, {
        headers: { 'Authorization': `Bearer ${todoistToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodoistTasks(data);
      }
    } catch (err) {
      console.error("Erro ao buscar tarefas por CNJ:", err);
    } finally {
      setIsSearchingTodoist(false);
    }
  };

  // Execute actual consultation on endpoint POST /api/djen/search
  const handleDjenConsultation = async () => {
    setLoading(true);
    setSyncError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/djen/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: "RODRIGO GIFFONI RODRIGUES",
          oab: "157320",
          uf: "MG",
          periodo: selectedPeriod,
          dataInicio: customStartDate,
          dataFim: customEndDate
        })
      });

      if (!res.ok) {
        let errMsg = "Não foi possível conectar à fonte oficial.";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (jsonErr) {
          try {
            const errText = await res.text();
            if (errText.includes("cloudflare") || errText.includes("captcha") || errText.includes("challenge") || errText.includes("blocked")) {
              errMsg = "O servidor do DJEN (CNJ) está bloqueando requisições automatizadas temporariamente (Proteção Cloudflare/CAPTCHA). Por favor, utilize a 'Importação Manual de Texto' abaixo.";
            } else {
              errMsg = `Erro ${res.status}: Servidor do DJEN indisponível ou em manutenção. Por favor, utilize a 'Importação Manual de Texto' abaixo.`;
            }
          } catch (textErr) {
            errMsg = `Erro de rede/HTTP ${res.status}. Por favor, utilize a 'Importação Manual de Texto' abaixo.`;
          }
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("A resposta recebida do servidor é inválida. Por favor, utilize a 'Importação Manual de Texto' abaixo.");
      }
      const fetchedPubs: DjenPublication[] = data.publications || [];

      if (fetchedPubs.length === 0) {
        setSuccessMessage("Consulta concluída. Nenhuma publicação nova encontrada no DJEN.");
        return;
      }

      // Sync fetched publications to Firestore
      const batch = writeBatch(db);
      const savedList: DjenPublication[] = [];

      for (const pub of fetchedPubs) {
        const newPubData = {
          ...pub,
          userId: user.uid,
          createdAt: new Date().toISOString()
        };
        const docRef = doc(collection(db, "djen_publications"));
        batch.set(docRef, newPubData);
        savedList.push({ id: docRef.id, ...newPubData } as DjenPublication);
      }

      await batch.commit();
      
      // Update local state
      setPublications(prev => {
        const combined = [...savedList, ...prev];
        // Deduplicate local state
        const seenHashes = new Set();
        return combined.filter(p => {
          if (seenHashes.has(p.hashDuplicidade)) return false;
          seenHashes.add(p.hashDuplicidade);
          return true;
        });
      });

      setSuccessMessage(`Sucesso! ${fetchedPubs.length} publicações consultadas e importadas do DJEN.`);
    } catch (err: any) {
      console.error("Erro na consulta real do DJEN:", err);
      setSyncError(err.message || "Não foi possível consultar o DJEN automaticamente. Verifique a integração/fonte oficial.");
    } finally {
      setLoading(false);
    }
  };

  // Manual import to simulate receiving real publications in the conveyor belt (UX fallback if API is blocked)
  const handleManualImport = async () => {
    if (!manualText || !manualProcess) {
      alert("Texto e Processo são obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const availDateObj = new Date();
      const dataPublicacao = new Date(availDateObj);
      dataPublicacao.setDate(dataPublicacao.getDate() + 1);
      const dataPublicacaoStr = dataPublicacao.toISOString().split('T')[0];

      const cleanConteudo = manualText
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const deadlineRegex = /prazo\s+de\s+(\d+)\s+dia/gi;
      let apparentDeadlineDays = 0;
      const match = deadlineRegex.exec(cleanConteudo);
      if (match) {
        apparentDeadlineDays = parseInt(match[1]);
      }

      const informativePhrases = ["meramente informativo", "ciência", "registro", "arquivamento", "ciência da decisão"];
      const hasInformativePhrase = informativePhrases.some(phrase => cleanConteudo.toLowerCase().includes(phrase));
      const informativeOnly = apparentDeadlineDays === 0 || hasInformativePhrase;

      const contentExcerpt = cleanConteudo.substring(0, 100).toLowerCase().replace(/[^a-z0-9]/g, "");
      const hashInput = `${manualProcess}_${today}_${manualTribunal}_${manualOrgao}_${contentExcerpt}`;
      const hashDuplicidade = btoa(unescape(encodeURIComponent(hashInput)));

      // Check if it already exists locally
      const isDuplicatedLocal = publications.some(p => p.hashDuplicidade === hashDuplicidade);

      const newPub: Omit<DjenPublication, 'id'> = {
        fonte: 'djen',
        dataDisponibilizacao: today,
        dataPublicacao: dataPublicacaoStr,
        tribunal: manualTribunal,
        orgao: manualOrgao,
        processo: manualProcess,
        classe: manualClasse,
        partes: manualPartes,
        advogadoEncontrado: "RODRIGO GIFFONI RODRIGUES",
        oabEncontrada: "157320",
        conteudo: manualText,
        conteudoLimpo: cleanConteudo,
        linkOriginal: `https://djen.cnj.jus.br/diario/manual-${Date.now()}`,
        hashDuplicidade,
        status: isDuplicatedLocal ? 'duplicada' : 'pendente',
        apparentDeadlineDays,
        informativeOnly,
        isDuplicate: isDuplicatedLocal,
        primaryPubId: isDuplicatedLocal ? (publications.find(p => p.hashDuplicidade === hashDuplicidade)?.id || null) : null,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "djen_publications"), newPub);
      const savedPub = { id: docRef.id, ...newPub } as DjenPublication;

      setPublications(prev => [savedPub, ...prev]);
      setIsManualModalOpen(false);
      setManualText('');
      setManualProcess('');
      setSelectedPub(savedPub);
    } catch (err: any) {
      alert("Erro ao importar publicação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update status and details of selected publication in DB
  const updatePubInDb = async (pubId: string, updates: Partial<DjenPublication>) => {
    try {
      const docRef = doc(db, "djen_publications", pubId);
      await updateDoc(docRef, updates);
      setPublications(prev => prev.map(p => p.id === pubId ? { ...p, ...updates } : p));
      if (selectedPub && selectedPub.id === pubId) {
        setSelectedPub(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      console.error("Erro ao atualizar publicação em lote:", err);
    }
  };

  // Conference Operations
  const handleMarkAsChecked = async () => {
    if (!selectedPub) return;
    await updatePubInDb(selectedPub.id, { 
      status: 'conferida', 
      observacao: observations 
    });
    setSuccessMessage("Publicação marcada como CONFERIDA.");
    setSelectedPub(null);
  };

  const handleReviewLater = async () => {
    if (!selectedPub) return;
    await updatePubInDb(selectedPub.id, { 
      status: 'revisar_depois', 
      observacao: observations 
    });
    setSuccessMessage("Publicação marcada para REVISAR DEPOIS.");
    setSelectedPub(null);
  };

  const handleMarkAsIgnored = async (pub: DjenPublication) => {
    await updatePubInDb(pub.id, { status: 'ignorada' });
    setSuccessMessage("Publicação IGNORADA.");
    if (selectedPub && selectedPub.id === pub.id) {
      setSelectedPub(null);
    }
  };

  const handleMarkAsDuplicate = async () => {
    if (!selectedPub) return;
    await updatePubInDb(selectedPub.id, { 
      status: 'duplicada', 
      isDuplicate: true,
      observacao: observations 
    });
    setSuccessMessage("Publicação marcada como DUPLICADA.");
    setSelectedPub(null);
  };

  // Todoist Actions: Link publication to an existing task
  const handleLinkExistingTask = async (taskId: string, taskUrl: string) => {
    if (!selectedPub) return;
    
    // Add comment with publication text on Todoist
    try {
      await fetch('/api/todoist/comments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${todoistToken}`
        },
        body: JSON.stringify({
          task_id: taskId,
          content: `**Conferência DJEN realizada**\nLink Original: ${selectedPub.linkOriginal}\n\n**Teor da Publicação:**\n${selectedPub.conteudoLimpo}`
        })
      });
    } catch (e) {
      console.error("Erro ao adicionar comentário no Todoist:", e);
    }

    await updatePubInDb(selectedPub.id, { 
      status: 'delegada',
      todoistTaskId: taskId,
      todoistTaskUrl: taskUrl,
      observacao: observations
    });

    setSuccessMessage("Publicação vinculada à tarefa existente com sucesso!");
    setSelectedPub(null);
  };

  // Todoist Actions: Create and delegate new task with optional subtasks
  const handleCreateAndDelegateTask = async () => {
    if (!selectedPub) return;
    if (!todoistToken) {
      alert("Insira sua API Key do Todoist para delegar tarefas.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create main task on Todoist
      const title = `Prazos DJEN: ${selectedPub.processo} - ${selectedPub.tribunal}`;
      const desc = `Responsável: ${delegatedResponsible}\nData de Segurança: ${safetyDate}\nData Fatal: ${fatalDate}\n\nInstruções:\n${instructions}\n\nTeor:\n${selectedPub.conteudoLimpo}`;
      
      const parsedLabels = tags.split(',').map(t => t.trim()).filter(Boolean);
      parsedLabels.push('djen_conferencia');

      const taskPayload = {
        content: title,
        description: desc,
        project_id: selectedProjectId || undefined,
        due_date: fatalDate || undefined,
        priority: priority,
        labels: parsedLabels
      };

      const res = await fetch('/api/todoist/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${todoistToken}`
        },
        body: JSON.stringify(taskPayload)
      });

      if (!res.ok) {
        throw new Error("Falha ao criar tarefa no Todoist via Proxy.");
      }

      const mainTask = await res.json();

      // 2. Add comment with publication content
      await fetch('/api/todoist/comments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${todoistToken}`
        },
        body: JSON.stringify({
          task_id: mainTask.id,
          content: `**Teor Completo do DJEN:**\n${selectedPub.conteudo}\n\n**Observação da Conferência:**\n${observations}`
        })
      });

      // 3. Create subtasks (as independent tasks under parent_id)
      for (const st of subtasks) {
        await fetch('/api/todoist/tasks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${todoistToken}`
          },
          body: JSON.stringify({
            content: st,
            parent_id: mainTask.id,
            project_id: selectedProjectId || undefined,
            due_date: safetyDate || fatalDate || undefined,
            priority: priority
          })
        });
      }

      // 4. Update local and DB publication status
      await updatePubInDb(selectedPub.id, {
        status: 'delegada',
        todoistTaskId: mainTask.id,
        todoistTaskUrl: mainTask.url || `https://todoist.com/app/task/${mainTask.id}`,
        observacao: `${observations}\n[Delegado para ${delegatedResponsible} - Fatal: ${fatalDate}]`
      });

      setSuccessMessage(`Prazo delegado com sucesso! Tarefa principal e ${subtasks.length} subtarefas criadas no Todoist.`);
      setIsDelegationOpen(false);
      setSelectedPub(null);
    } catch (err: any) {
      alert("Erro ao delegar prazo processual: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add custom subtask to delegation list
  const handleAddSubtask = () => {
    if (newSubtaskText.trim()) {
      setSubtasks(prev => [...prev, newSubtaskText.trim()]);
      setNewSubtaskText('');
    }
  };

  // Remove subtask from list
  const handleRemoveSubtask = (idx: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== idx));
  };

  // Clear results (for safety or environment resets)
  const handleClearAllPublications = async () => {
    if (!confirm("Tem certeza que deseja apagar permanentemente todas as publicações do Painel DJEN?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const pub of publications) {
        batch.delete(doc(db, "djen_publications", pub.id));
      }
      await batch.commit();
      setPublications([]);
      setSelectedPub(null);
      setSuccessMessage("Todas as publicações do DJEN foram limpas do painel.");
    } catch (err) {
      console.error("Erro ao apagar publicações:", err);
    } finally {
      setLoading(false);
    }
  };

  // Token helper
  const handleSaveTodoistToken = () => {
    localStorage.setItem('boss_todoist_api_token', todoistToken);
    setIsTokenEditing(false);
    fetchTodoistProjects();
    setSuccessMessage("API Key do Todoist salva localmente.");
  };

  // Copy helpers
  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Calculations for Stats (Upper Cards)
  const statsTotal = publications.length;
  const statsUnique = publications.filter(p => !p.isDuplicate).length;
  const statsDuplicates = publications.filter(p => p.isDuplicate).length;
  const statsChecked = publications.filter(p => p.status === 'conferida').length;
  const statsPending = publications.filter(p => p.status === 'pendente').length;
  const statsDelegated = publications.filter(p => p.status === 'delegada').length;
  const statsIgnored = publications.filter(p => p.status === 'ignorada').length;
  
  const lastSyncDate = publications.length > 0 
    ? new Date(Math.max(...publications.map(p => new Date(p.createdAt).getTime()))).toLocaleString('pt-BR')
    : "Nunca consultado";

  // Filter list
  const filteredPublications = publications.filter(p => {
    // Search filter
    const matchesSearch = searchTerm.trim() === '' || 
      p.processo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tribunal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.orgao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.conteudoLimpo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Status category filter
    if (activeFilter === 'todos') return true;
    return p.status === activeFilter;
  });

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in pb-16">
      
      {/* Title & Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600" />
            Painel DJEN Nacional
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Módulo de conferência automatizada de publicações do Diário de Justiça Eletrônico Nacional (OAB/MG 157.320).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Todoist token configuration widget */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
            <Tag className="h-3.5 w-3.5 text-slate-500 ml-1" />
            {isTokenEditing ? (
              <div className="flex items-center gap-1">
                <input 
                  type="password" 
                  placeholder="API Key do Todoist" 
                  value={todoistToken}
                  onChange={(e) => setTodoistToken(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px]"
                />
                <button 
                  onClick={handleSaveTodoistToken} 
                  className="bg-indigo-600 text-white rounded px-1.5 py-0.5 font-bold hover:bg-indigo-700"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">
                  Todoist API: {todoistToken ? "Conectado" : "Desconectado"}
                </span>
                <button 
                  onClick={() => setIsTokenEditing(true)} 
                  className="text-indigo-600 font-bold hover:underline"
                >
                  {todoistToken ? "Alterar" : "Configurar"}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-sm transition flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Importar Texto DJEN
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      {syncError && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-800">Erro na Integração DJEN</p>
            <p className="text-xs text-rose-700 mt-1">{syncError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-800">Sucesso</p>
            <p className="text-xs text-emerald-700 mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Upper Cards (Metrics Bento style) */}
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-9 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Encontrado</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{statsTotal}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Únicas</p>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{statsUnique}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Duplicadas</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{statsDuplicates}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Conferidas</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{statsChecked}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Pendentes</p>
          <p className="text-xl font-extrabold text-slate-600 mt-1">{statsPending}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Delegadas</p>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{statsDelegated}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Ignoradas</p>
          <p className="text-xl font-extrabold text-slate-400 mt-1">{statsIgnored}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Período Ativo</p>
          <p className="text-xs font-bold text-indigo-900 mt-2 truncate">
            {selectedPeriod === 'personalizado' ? 'Pers.' : `Últimos ${selectedPeriod} dias`}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Última Sincronização</p>
          <p className="text-[10px] font-medium text-slate-600 mt-2 line-clamp-1 truncate">{lastSyncDate}</p>
        </div>
      </div>

      {/* Action and Filter buttons */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        
        {/* Date Selector Buttons */}
        <div className="space-y-1.5 w-full xl:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Período de Consulta DJEN</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: '5', label: '5 dias' },
              { id: '7', label: '7 dias' },
              { id: '10', label: '10 dias' },
              { id: '15', label: '15 dias' },
              { id: '20', label: '20 dias' },
              { id: '30', label: '30 dias' },
              { id: 'personalizado', label: 'Período personalizado' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedPeriod(b.id)}
                className={`text-[11px] px-2.5 py-1.5 font-bold rounded-lg transition ${
                  selectedPeriod === b.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Period Input */}
        {selectedPeriod === 'personalizado' && (
          <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-slate-400">INÍCIO</span>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:ring-0 p-0"
              />
            </div>
            <span className="text-slate-400">/</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-slate-400">FIM</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:ring-0 p-0"
              />
            </div>
          </div>
        )}

        {/* Execution Commands */}
        <div className="flex gap-2 w-full xl:w-auto">
          <button
            onClick={handleDjenConsultation}
            disabled={loading}
            className="flex-1 xl:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Consultando...' : 'Consultar DJEN Real'}
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center gap-1"
          >
            <Download className="h-4 w-4" /> Relatório
          </button>

          <button
            onClick={handleClearAllPublications}
            className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" /> Limpar Painel
          </button>
        </div>
      </div>

      {/* Main conveyor layout: Sidebar filter tab + Card queue list */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Status queue filter list (left sidebar) */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Fila de Conferência</p>
          {[
            { id: 'todos', label: 'Todas as publicações', count: statsTotal },
            { id: 'pendente', label: 'Pendentes', count: statsPending, badgeColor: 'bg-slate-100 text-slate-700' },
            { id: 'em_conferencia', label: 'Em conferência', count: publications.filter(p => p.status === 'em_conferencia').length, badgeColor: 'bg-indigo-100 text-indigo-700' },
            { id: 'conferida', label: 'Conferidas', count: statsChecked, badgeColor: 'bg-emerald-100 text-emerald-700' },
            { id: 'delegada', label: 'Delegadas (Todoist)', count: statsDelegated, badgeColor: 'bg-blue-100 text-blue-700' },
            { id: 'ignorada', label: 'Ignoradas', count: statsIgnored, badgeColor: 'bg-slate-100 text-slate-500' },
            { id: 'duplicada', label: 'Duplicadas', count: statsDuplicates, badgeColor: 'bg-amber-100 text-amber-700' },
            { id: 'revisar_depois', label: 'Revisar depois', count: publications.filter(p => p.status === 'revisar_depois').length, badgeColor: 'bg-violet-100 text-violet-700' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition ${
                activeFilter === tab.id 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tab.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}

          {/* Search tool inside active queues */}
          <div className="pt-4 border-t border-slate-150">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar nesta fila..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card conveyor list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center px-1">
            <p className="text-xs text-slate-500">
              Mostrando <strong className="text-slate-800">{filteredPublications.length}</strong> de <strong className="text-slate-800">{publications.length}</strong> publicações encontradas.
            </p>
          </div>

          {filteredPublications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
              <Scale className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Fila vazia</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Nenhuma publicação corresponde ao filtro ativo ou termo de pesquisa. Experimente clicar em "Consultar DJEN Real" para atualizar os dados nacionais.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPublications.map(pub => (
                <div 
                  key={pub.id}
                  className={`bg-white border rounded-xl p-5 shadow-sm transition hover:shadow-md relative overflow-hidden flex flex-col justify-between min-h-[190px] ${
                    selectedPub?.id === pub.id 
                      ? 'border-indigo-500 ring-1 ring-indigo-500' 
                      : 'border-slate-200'
                  }`}
                >
                  {/* Banner indicator if it's a duplicate */}
                  {pub.isDuplicate && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
                      <Layers className="h-3 w-3" /> DUPLICADA
                    </div>
                  )}

                  <div>
                    {/* Card Header: CNJ Process number and Tribunal */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="font-mono text-sm font-extrabold text-indigo-900 tracking-tight block">
                          {pub.processo}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                          {pub.tribunal} • {pub.orgao}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>Disp: {pub.dataDisponibilizacao}</span>
                      </div>
                    </div>

                    {/* Excerpt of Publication content */}
                    <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                      {pub.conteudoLimpo}
                    </p>
                  </div>

                  {/* Actions & indicators row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-slate-100 pt-4 mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Deadline Indicators */}
                      {pub.apparentDeadlineDays > 0 ? (
                        <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          Prazo aparente: {pub.apparentDeadlineDays} dias
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                          <Info className="h-3 w-3 text-blue-600" />
                          Caráter Informativo
                        </span>
                      )}

                      {/* Status Badges */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pub.status === 'pendente' ? 'bg-slate-100 text-slate-700' :
                        pub.status === 'em_conferencia' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        pub.status === 'conferida' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        pub.status === 'delegada' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        pub.status === 'revisar_depois' ? 'bg-violet-50 text-violet-800 border border-violet-200' :
                        pub.status === 'ignorada' ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {pub.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        onClick={async () => {
                          await updatePubInDb(pub.id, { status: 'em_conferencia' });
                          setSelectedPub(pub);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm transition"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Conferir
                      </button>

                      <button
                        onClick={() => handleMarkAsIgnored(pub)}
                        className="bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition"
                      >
                        Ignorar
                      </button>

                      <a
                        href={pub.linkOriginal}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-100 hover:bg-slate-250 text-slate-600 text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition flex items-center gap-0.5"
                      >
                        Original <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Conference Full Screen Drawer (Three Columns) */}
      {selectedPub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-slate-200">
            
            {/* Header */}
            <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight">Estação de Conferência Individual DJEN</h2>
                  <p className="text-[10px] text-slate-300 mt-0.5">Dando tratamento para a publicação nacional: {selectedPub.processo}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPub(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Three columns grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
              
              {/* COLUMN 1: DJEN Publication (Left) */}
              <div className="lg:col-span-5 p-5 border-r border-slate-200 flex flex-col h-full overflow-hidden bg-white">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publicação DJEN</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => copyToClipboard(selectedPub.processo, "Número do processo copiado!")}
                      className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <Copy className="h-3 w-3" /> Copiar CNJ
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedPub.conteudo, "Texto da publicação copiado!")}
                      className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <Copy className="h-3 w-3" /> Copiar Íntegra
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
                  {/* Detailed metadata */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 block uppercase">Tribunal</span>
                      <span className="font-bold text-slate-700">{selectedPub.tribunal}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 block uppercase">Órgão Julgador</span>
                      <span className="font-bold text-slate-700">{selectedPub.orgao}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 block uppercase">Classe</span>
                      <span className="text-slate-600">{selectedPub.classe}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 block uppercase">Partes</span>
                      <span className="text-slate-600 line-clamp-2">{selectedPub.partes}</span>
                    </div>
                  </div>

                  {/* Complete rich content */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Teor Completo da Publicação</span>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto shadow-inner">
                      {selectedPub.conteudo}
                    </div>
                  </div>

                  {/* Original Link & Tribunal link */}
                  <div className="flex gap-2 pt-2">
                    <a
                      href={selectedPub.linkOriginal}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl border border-slate-200 text-center flex items-center justify-center gap-1"
                    >
                      Ver PDF Original <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`https://pje.jus.br/consultaprocessual/detalheProcesso.seam?numero=${selectedPub.processo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl border border-slate-200 text-center flex items-center justify-center gap-1"
                    >
                      Painel do Tribunal <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: Conference Actions (Middle) */}
              <div className="lg:col-span-3 p-5 border-r border-slate-200 flex flex-col h-full overflow-hidden bg-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2.5 shrink-0">Conferência & Tratamento</p>

                <div className="flex-1 overflow-y-auto pt-4 space-y-4">
                  {/* Status checklist selection */}
                  <div className="space-y-2">
                    <button
                      onClick={handleMarkAsChecked}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" /> Conferir Sem Prazo
                    </button>

                    <button
                      onClick={() => {
                        setIsDelegationOpen(true);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      <ListPlus className="h-4 w-4" /> Delegar Prazo Processual
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleReviewLater}
                        className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition"
                      >
                        Revisar Depois
                      </button>

                      <button
                        onClick={() => handleMarkAsIgnored(selectedPub)}
                        className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold text-xs py-2 px-3 rounded-xl transition"
                      >
                        Ignorar
                      </button>
                    </div>

                    <button
                      onClick={handleMarkAsDuplicate}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] py-2 px-3 rounded-xl border border-amber-200 transition"
                    >
                      Marcar como Duplicada
                    </button>
                  </div>

                  {/* Conference Observations text */}
                  <div className="pt-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Observações da Conferência</label>
                    <textarea
                      placeholder="Registre observações persistentes para este caso processual..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={6}
                      className="w-full text-xs p-3 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Todoist Integration & Delegation Form (Right) */}
              <div className="lg:col-span-4 p-5 flex flex-col h-full overflow-hidden bg-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2.5 shrink-0">Integração Todoist</p>

                <div className="flex-1 overflow-y-auto pt-4 pr-1">
                  {isDelegationOpen ? (
                    /* DELEGATION FORM PANEL */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center shrink-0">
                        <p className="text-xs font-bold text-indigo-700 uppercase">Delegar Novo Prazo</p>
                        <button 
                          onClick={() => setIsDelegationOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          Voltar
                        </button>
                      </div>

                      {/* Responsible */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Responsável pelo Prazo</label>
                        <input 
                          type="text" 
                          value={delegatedResponsible}
                          onChange={(e) => setDelegatedResponsible(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                          placeholder="E-mail do responsável"
                        />
                      </div>

                      {/* Todoist project selector */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Projeto do Todoist</label>
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                        >
                          {todoistProjects.length === 0 ? (
                            <option value="">Sem projetos carregados</option>
                          ) : (
                            todoistProjects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Fatal & Safety dates */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-rose-600 uppercase block mb-1">Data Fatal</label>
                          <input 
                            type="date" 
                            value={fatalDate}
                            onChange={(e) => setFatalDate(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-rose-500 focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-amber-600 uppercase block mb-1">Data de Segurança</label>
                          <input 
                            type="date" 
                            value={safetyDate}
                            onChange={(e) => setSafetyDate(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:ring-0"
                          />
                        </div>
                      </div>

                      {/* Priority Selector */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Prioridade</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { val: 1, label: 'Baixa', color: 'border-slate-300' },
                            { val: 2, label: 'Média', color: 'border-blue-400 bg-blue-50' },
                            { val: 3, label: 'Alta', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                            { val: 4, label: 'Urgente', color: 'border-rose-400 bg-rose-50 text-rose-900' }
                          ].map(p => (
                            <button
                              type="button"
                              key={p.val}
                              onClick={() => setPriority(p.val)}
                              className={`text-[10px] py-1.5 font-bold rounded-lg border text-center transition ${
                                priority === p.val 
                                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tags (separadas por vírgula)</label>
                        <input 
                          type="text" 
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="prazo, contestaçao, recurso"
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                        />
                      </div>

                      {/* Instructions */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Instruções de Resolução</label>
                        <textarea 
                          rows={2}
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="Preencha as recomendações operacionais..."
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        />
                      </div>

                      {/* Automatic Subtasks Checklist */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Subtarefas Automáticas Vinculadas</label>
                        <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded-lg">
                          {subtasks.map((st, i) => (
                            <div key={i} className="flex justify-between items-center text-xs text-slate-700 px-1">
                              <span className="truncate max-w-[200px] font-semibold">{st}</span>
                              <button 
                                onClick={() => handleRemoveSubtask(i)}
                                className="text-rose-500 font-bold hover:underline text-[10px]"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-1.5 pt-2 border-t border-slate-200 mt-2">
                            <input 
                              type="text" 
                              placeholder="Nova subtarefa..."
                              value={newSubtaskText}
                              onChange={(e) => setNewSubtaskText(e.target.value)}
                              className="w-full text-[10px] p-1 border border-slate-300 rounded"
                            />
                            <button 
                              onClick={handleAddSubtask}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2 font-bold text-[10px]"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Confirm and Delegate button */}
                      <button
                        onClick={handleCreateAndDelegateTask}
                        disabled={loading}
                        className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                      >
                        <CheckSquare className="h-4 w-4" />
                        {loading ? 'Sincronizando Todoist...' : 'Confirmar e Delegar Prazo'}
                      </button>
                    </div>
                  ) : (
                    /* TASK SEARCH & EXISTING VINCULATION LIST */
                    <div className="space-y-4">
                      {!todoistToken ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-amber-800">Conexão Pendente</p>
                          <p className="text-[10px] text-amber-700 mt-1">
                            Você precisa inserir sua API Token do Todoist nas configurações do painel para delegar ou sincronizar tarefas processuais.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Tarefas existentes para este CNJ</span>
                            <button
                              onClick={() => searchTodoistTasksForPub(selectedPub)}
                              disabled={isSearchingTodoist}
                              className="text-indigo-600 hover:underline text-[10px] font-bold"
                            >
                              Recarregar
                            </button>
                          </div>

                          {isSearchingTodoist ? (
                            <p className="text-xs text-slate-500 italic text-center py-4">Buscando na API do Todoist...</p>
                          ) : todoistTasks.length === 0 ? (
                            <div className="text-center py-6">
                              <p className="text-xs text-slate-500 italic">Nenhuma tarefa Todoist encontrada contendo o CNJ {selectedPub.processo}.</p>
                              <button
                                onClick={() => setIsDelegationOpen(true)}
                                className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm transition"
                              >
                                Criar Nova Tarefa Vinculada
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {todoistTasks.map(t => (
                                <div key={t.id} className="border border-slate-200 bg-slate-50 p-3 rounded-lg flex flex-col justify-between gap-2.5">
                                  <div>
                                    <span className="font-semibold text-xs text-slate-800 line-clamp-2">{t.content}</span>
                                    <span className="text-[9px] text-slate-500 block mt-1">Prazo original: {t.due?.date || 'Sem data'}</span>
                                  </div>
                                  <button
                                    onClick={() => handleLinkExistingTask(t.id, t.url || `https://todoist.com/app/task/${t.id}`)}
                                    className="w-full bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1 px-2 rounded-md transition border border-slate-300 text-center"
                                  >
                                    Vincular a esta Tarefa
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Manual Paste Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 border border-slate-200 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-5 w-5 text-indigo-600" />
                Importar Publicação Manual (DJEN)
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CNJ do Processo</label>
                <input 
                  type="text" 
                  placeholder="0000000-00.2026.8.13.0000"
                  value={manualProcess}
                  onChange={(e) => setManualProcess(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Texto Íntegro da Publicação</label>
                <textarea 
                  rows={6}
                  placeholder="Cole aqui o texto copiado de um diário oficial ou DJEN real..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tribunal</label>
                  <input 
                    type="text" 
                    value={manualTribunal}
                    onChange={(e) => setManualTribunal(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Órgão Julgador</label>
                  <input 
                    type="text" 
                    value={manualOrgao}
                    onChange={(e) => setManualOrgao(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleManualImport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow transition"
              >
                Importar na Fila
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <Download className="h-5 w-5 text-indigo-600" />
                Relatório de Conferência Consolidado (DJEN)
              </h3>
              <button onClick={() => setIsReportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Print Header */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex justify-between text-xs text-slate-600">
                <span><strong>Advogado:</strong> RODRIGO GIFFONI RODRIGUES (OAB/MG 157.320)</span>
                <span><strong>Data Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span><strong>Período Ativo:</strong> {selectedPeriod === 'personalizado' ? 'Customizado' : `Últimos ${selectedPeriod} dias`}</span>
                <span><strong>Total de Registros:</strong> {statsTotal}</span>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-4 gap-2.5 my-4">
              <div className="border border-slate-200 p-2.5 rounded-lg text-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Conferidas</span>
                <span className="block text-sm font-extrabold text-emerald-600">{statsChecked}</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg text-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Delegadas</span>
                <span className="block text-sm font-extrabold text-blue-600">{statsDelegated}</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg text-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Duplicadas</span>
                <span className="block text-sm font-extrabold text-amber-600">{statsDuplicates}</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg text-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Ignoradas</span>
                <span className="block text-sm font-extrabold text-slate-400">{statsIgnored}</span>
              </div>
            </div>

            {/* Sub-indicators: Deadlines vs Informative */}
            <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span>Publicações com Prazos Aparentes:</span>
                <strong className="text-indigo-950">{publications.filter(p => p.apparentDeadlineDays > 0).length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Publicações de Caráter Meramente Informativo:</span>
                <strong className="text-indigo-950">{publications.filter(p => p.informativeOnly).length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Itens Pendentes Restantes na Fila:</span>
                <strong className="text-indigo-950">{statsPending}</strong>
              </div>
            </div>

            {/* Detailed table list of publications */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Histórico de Conferência</p>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {publications.map(p => (
                  <div key={p.id} className="text-xs border border-slate-200 p-2.5 rounded-lg flex justify-between items-center bg-white">
                    <div className="truncate max-w-[400px]">
                      <span className="font-mono font-bold block text-indigo-950">{p.processo}</span>
                      <span className="text-[10px] text-slate-500 block">{p.tribunal} • {p.orgao}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'conferida' ? 'bg-emerald-100 text-emerald-800' :
                      p.status === 'delegada' ? 'bg-blue-100 text-blue-800' :
                      p.status === 'ignorada' ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 border-t border-slate-150 pt-3">
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-xl transition"
              >
                Imprimir Relatório
              </button>
              <button
                onClick={() => setIsReportOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

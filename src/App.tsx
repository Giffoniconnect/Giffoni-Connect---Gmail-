import { useState, useEffect, useRef } from 'react';
import { 
  Scale, Mail, Calendar, Database, Clock, Search, Filter, 
  PlusCircle, FileText, CheckCircle, AlertTriangle, RefreshCw, 
  LogOut, ExternalLink, Code, Copy, Check, Printer, Download, 
  Trash2, AlertCircle, Info, ChevronRight, Send, UserCheck, Play, HelpCircle, Inbox,
  Settings, Compass, Layers, ArrowLeft, ArrowRight, Sliders, CalendarRange, Zap, MousePointerClick
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { Publication, ApiToken, SystemLog, EmailRule } from './types';
import { initialPublications, calculateBusinessDaysDate } from './mockData';
import { ControladoriaWorkspaceComponent } from './components/ControladoriaWorkspaceComponent';
import { LegalOpsBIDashboard } from './components/LegalOpsBIDashboard';
import { defaultEmailRules } from './defaultEmailRules';
import { DashboardPrincipalView } from './components/DashboardPrincipalView';
import { CentralGlobalEmailsView } from './components/CentralGlobalEmailsView';
import { IntensivoGmailZeroView } from './components/IntensivoGmailZeroView';
import { PainelDjenNacionalView } from './components/PainelDjenNacionalView';


export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(() => {
    return localStorage.getItem('boss_gmail_token') || null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Core Data state
  const [publications, setPublications] = useState<Publication[]>([]);
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [systemEvents, setSystemEvents] = useState<any[]>([]);

  // App control states
  const [activeTab, setActiveTab] = useState<'login' | 'dashboard' | 'bi-dashboard' | 'publications' | 'deadlines' | 'gmail' | 'api' | 'new-pub' | 'pushes' | 'consulta.prius' | 'consulta.recorte-digital' | 'configuracoes.gmail' | 'dashboard-principal' | 'central-emails' | 'intensivo-gmail' | 'consulta.djen'>('login');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [selectedPub, setSelectedPub] = useState<Publication | null>(null);
  const lastActivePushSourceIdRef = useRef<string | null>(null);

  // Email Rules & Global Stats state
  const [emailRules, setEmailRules] = useState<EmailRule[]>([]);
  const [globalEmailStats, setGlobalEmailStats] = useState({
    emailAddress: "direito.rgr@gmail.com",
    messagesTotal: 15480,
    inboxCount: 847,
    unreadCount: 120,
    archivedToday: 0,
    deletedToday: 0
  });
  const [isEmailStatsLoading, setIsEmailStatsLoading] = useState(false);

  // Secure Auth & Auto-update states
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasAutoUpdated, setHasAutoUpdated] = useState<boolean>(false);
  const [isGeneralUpdating, setIsGeneralUpdating] = useState<boolean>(false);

  // Prius State
  const [priusState, setPriusState] = useState<{
    status: 'desconectado' | 'erro' | 'conectado';
    lastUpdated: string | null;
    totalImported: number;
    unreadCount?: number;
    newestSubject?: string;
    newestDate?: string | null;
    error: string | null;
    isLoading: boolean;
  }>({
    status: 'desconectado',
    lastUpdated: null,
    totalImported: 0,
    unreadCount: 0,
    newestSubject: "Não consultado",
    newestDate: null,
    error: null,
    isLoading: false
  });

  // Recorte Digital States
  const [recorteStates, setRecorteStates] = useState<Record<string, {
    status: 'desconectado' | 'erro' | 'conectado';
    lastUpdated: string | null;
    totalCount?: number;
    unreadCount?: number;
    newestSubject?: string;
    newestDate?: string | null;
    error: string | null;
    isLoading: boolean;
  }>>({
    'oab-mg': { status: 'desconectado', lastUpdated: null, totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, error: null, isLoading: false },
    'rj': { status: 'desconectado', lastUpdated: null, totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, error: null, isLoading: false },
    'ceara': { status: 'desconectado', lastUpdated: null, totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, error: null, isLoading: false },
    'sao-paulo': { status: 'desconectado', lastUpdated: null, totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, error: null, isLoading: false },
  });

  // --- Prius & Recorte Digital Conferidor Sessions ---
  const [priusSession, setPriusSession] = useState<{
    emailSubject: string;
    gmailMessageId: string;
    publications: any[];
    lastSync: string | null;
  } | null>(() => {
    const saved = localStorage.getItem('prius_conferidor_session_v2');
    return saved ? JSON.parse(saved) : null;
  });
  const [priusSelectedIdx, setPriusSelectedIdx] = useState<number | null>(null);
  const [priusSyncing, setPriusSyncing] = useState(false);

  const [recorteSessions, setRecorteSessions] = useState<Record<string, {
    emailSubject: string;
    gmailMessageId: string;
    publications: any[];
    lastSync: string | null;
  }>>(() => {
    const saved = localStorage.getItem('recorte_conferidor_sessions_v2');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeRecorteServiceId, setActiveRecorteServiceId] = useState<string>('oab-mg');
  const [recorteSelectedIdx, setRecorteSelectedIdx] = useState<number | null>(null);
  const [recorteSyncing, setRecorteSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (priusSession) {
      localStorage.setItem('prius_conferidor_session_v2', JSON.stringify(priusSession));
    } else {
      localStorage.removeItem('prius_conferidor_session_v2');
    }
  }, [priusSession]);

  useEffect(() => {
    localStorage.setItem('recorte_conferidor_sessions_v2', JSON.stringify(recorteSessions));
  }, [recorteSessions]);
  // --- End Prius & Recorte Digital Conferidor Sessions ---

  // Helper to determine if a publication was recently checked (same day or yesterday)
  const checkRecentlyConferred = (pub: Publication, allPubs: Publication[]) => {
    const completedPubs = allPubs.filter(p => p.status === 'concluido' && p.id !== pub.id && p.processNumber === pub.processNumber);
    
    if (completedPubs.length === 0) {
      return { isAlreadyChecked: false, hasNewMovement: false };
    }

    const now = new Date();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    
    for (const comp of completedPubs) {
      const compDate = comp.subpoenaDate ? new Date(comp.subpoenaDate) : new Date(comp.createdAt || Date.now());
      
      // Check if within same day or yesterday
      if (compDate >= startOfYesterday) {
        // Check if content and title are identical
        const isIdentical = comp.content.trim() === pub.content.trim() && comp.title.trim() === pub.title.trim();
        
        if (isIdentical) {
          return {
            isAlreadyChecked: true,
            hasNewMovement: false,
            conferredAt: compDate.toLocaleDateString('pt-BR') + ' ' + compDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            conferredBy: comp.userId === 'demo-user' ? 'direito.rgr@gmail.com' : (user?.email || 'Sistema BOSS'),
            source: comp.source === 'gmail' ? 'Gmail Pushes' : comp.source === 'pje' ? 'PJe MG' : 'Portal BOSS',
            matchingPub: comp
          };
        } else {
          return {
            isAlreadyChecked: false,
            hasNewMovement: true,
            conferredAt: compDate.toLocaleDateString('pt-BR') + ' ' + compDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            conferredBy: comp.userId === 'demo-user' ? 'direito.rgr@gmail.com' : (user?.email || 'Sistema BOSS'),
            source: comp.source === 'gmail' ? 'Gmail Pushes' : comp.source === 'pje' ? 'PJe MG' : 'Portal BOSS',
            matchingPub: comp
          };
        }
      }
    }

    return { isAlreadyChecked: false, hasNewMovement: false };
  };

  // Helper to check if a pending publication is actually pending or already recently checked
  const isActuallyPending = (pub: Publication, allPubs: Publication[]) => {
    if (pub.status !== 'pendente') return false;
    const check = checkRecentlyConferred(pub, allPubs);
    return !check.isAlreadyChecked;
  };

  // URL Path Router sync
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      const isAuthenticated = user && user.email === 'direito.rgr@gmail.com';

      if (!isAuthenticated) {
        setActiveTab('login');
        try {
          if (window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
          }
        } catch (e) {
          console.warn('History API block warning:', e);
        }
        return;
      }

      if (path === 'login' || path === '') {
        setActiveTab('dashboard-principal');
        try {
          window.history.replaceState(null, '', '/dashboard-principal');
        } catch (e) {
          console.warn('History API block warning:', e);
        }
      } else if (path === 'dashboard-principal') {
        setActiveTab('dashboard-principal');
      } else if (path === 'central-emails') {
        setActiveTab('central-emails');
      } else if (path === 'intensivo-gmail') {
        setActiveTab('intensivo-gmail');
      } else if (path === 'dashboard') {
        setActiveTab('dashboard');
      } else if (path === 'configuracoes.gmail') {
        setActiveTab('configuracoes.gmail');
      } else if (path === 'consulta.prius') {
        setActiveTab('consulta.prius');
      } else if (path === 'consulta.recorte-digital') {
        setActiveTab('consulta.recorte-digital');
      } else if (path === 'consulta.djen') {
        setActiveTab('consulta.djen');
      } else if (path === 'pushes') {
        setActiveTab('pushes');
      } else if (path.startsWith('pushes/push-')) {
        setActiveTab(path as any);
      } else if (path === 'publications') {
        setActiveTab('publications');
      } else if (path === 'deadlines') {
        setActiveTab('deadlines');
      } else if (path === 'gmail') {
        setActiveTab('gmail');
      } else if (path === 'api') {
        setActiveTab('api');
      } else if (path === 'new-pub') {
        setActiveTab('new-pub');
      } else {
        setActiveTab('dashboard-principal');
        try {
          window.history.replaceState(null, '', '/dashboard-principal');
        } catch (e) {
          console.warn('History API block warning:', e);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    if (!authLoading) {
      handlePopState(); // run initial sync only after authLoading is complete
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, authLoading]); // re-run if user or authLoading changes to bind user email

  const handleTabChange = (tab: string) => {
    const isAuthenticated = user && user.email === 'direito.rgr@gmail.com';
    if (!isAuthenticated && tab !== 'login') {
      setActiveTab('login');
      try {
        window.history.pushState(null, '', '/login');
      } catch (e) {
        console.warn('History API block warning:', e);
      }
      return;
    }
    setActiveTab(tab as any);
    try {
      window.history.pushState(null, '', '/' + tab);
    } catch (e) {
      console.warn('History API block warning:', e);
    }
  };

  // Pushes State
  interface PushStat {
    sender: string;
    totalCount: number;
    unreadCount: number;
    newestSubject: string;
    newestDate: string | null;
    success: boolean;
    error?: string;
  }

  const PUSH_SOURCES = [
    { id: "trt-mg", name: "Push TRT-MG", sender: "nao-responda@trt3.jus.br", search: "in:inbox from:(nao-responda@trt3.jus.br)" },
    { id: "pje-mg", name: "Push – PJe MG", sender: "pje@tjmg.jus.br", search: "in:inbox from:(pje@tjmg.jus.br)" },
    { id: "tjmg", name: "Push TJMG", sender: "push@tjmg.jus.br", search: "in:inbox from:(push@tjmg.jus.br)" },
    { id: "eproc-tjmg", name: "Push Eproc TJMG", sender: "noreply@tjmg.jus.br", search: "in:inbox from:(noreply@tjmg.jus.br)" },
    { id: "trf6", name: "Eproc – Push TRF6", sender: "eproc@trf6.jus.br", search: "in:inbox from:(eproc@trf6.jus.br)" }
  ];

  const [pushesData, setPushesData] = useState<Record<string, PushStat>>({
    "nao-responda@trt3.jus.br": { sender: "nao-responda@trt3.jus.br", totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, success: true },
    "pje@tjmg.jus.br": { sender: "pje@tjmg.jus.br", totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, success: true },
    "push@tjmg.jus.br": { sender: "push@tjmg.jus.br", totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, success: true },
    "noreply@tjmg.jus.br": { sender: "noreply@tjmg.jus.br", totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, success: true },
    "eproc@trf6.jus.br": { sender: "eproc@trf6.jus.br", totalCount: 0, unreadCount: 0, newestSubject: "Não consultado", newestDate: null, success: true }
  });

  const [pushesLoading, setPushesLoading] = useState<Record<string, boolean>>({});
  const [globalPushesLoading, setGlobalPushesLoading] = useState(false);
  const [pushesLastUpdated, setPushesLastUpdated] = useState<string | null>(null);
  const [pushesError, setPushesError] = useState<string | null>(null);

  // Grouped pushes (operational dashboard) states
  const [groupedPushes, setGroupedPushes] = useState<any>(null);
  const [groupedPushesLoading, setGroupedPushesLoading] = useState(false);
  const [groupedPushesSearch, setGroupedPushesSearch] = useState('');
  const [groupedPushesPage, setGroupedPushesPage] = useState(1);
  const [expandedGroupCNJ, setExpandedGroupCNJ] = useState<string | null>(null);
  const [clearingGroupCNJ, setClearingGroupCNJ] = useState<string | null>(null);

  const fetchGroupedPushes = async (sender: string, pageNum: number = 1, searchQuery: string = "") => {
    let token = cachedToken;
    if (!token) {
      token = localStorage.getItem('boss_gmail_token');
      if (token) {
        setCachedToken(token);
      }
    }
    if (!token) {
      addSystemLog('warning', 'Não foi possível carregar o painel operacional: necessita conectar conta Google.', 'gmail_sync');
      return;
    }

    setGroupedPushesLoading(true);
    try {
      const res = await fetch("/api/gmail-pushes/grouped-by-cnj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          sender,
          page: pageNum,
          limit: 10,
          search: searchQuery
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(data.message || data.error || "Erro ao buscar dados agrupados.");
      }
      setGroupedPushes(data);
      setGroupedPushesPage(pageNum);
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao carregar painel operacional por CNJ: ${err.message}`, 'gmail_sync');
    } finally {
      setGroupedPushesLoading(false);
    }
  };

  const clearGroupAsRead = async (sender: string, processNumber: string, messageIds: string[]) => {
    let token = cachedToken;
    if (!token) {
      token = localStorage.getItem('boss_gmail_token');
    }
    if (!token) return;

    setClearingGroupCNJ(processNumber);
    try {
      const res = await fetch("/api/gmail-pushes/mark-as-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          messageIds
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao limpar.");
      }
      addSystemLog('success', `Sucesso: ${messageIds.length} e-mails do Processo ${processNumber} foram marcados como lidos no seu Gmail!`, 'gmail_sync');
      await fetchGroupedPushes(sender, groupedPushesPage, groupedPushesSearch);
      fetchAllPushes();
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Erro ao marcar como lido: ${err.message}`, 'gmail_sync');
    } finally {
      setClearingGroupCNJ(null);
    }
  };

  // Gmail Explorer states
  const [isGmailExplorerOpen, setIsGmailExplorerOpen] = useState(false);
  const [explorerSource, setExplorerSource] = useState<{ name: string; sender: string } | null>(null);
  const [explorerFilter, setExplorerFilter] = useState<'all' | 'unread'>('all');
  const [explorerMessageIds, setExplorerMessageIds] = useState<string[]>([]);
  const [explorerMessages, setExplorerMessages] = useState<any[]>([]);
  const [explorerListLoading, setExplorerListLoading] = useState(false);
  const [explorerDetailsLoading, setExplorerDetailsLoading] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerQuickFilter, setExplorerQuickFilter] = useState<'all' | 'unread' | 'read' | 'hasAttachments' | '24h' | '7d' | '30d'>('all');
  const [explorerSortKey, setExplorerSortKey] = useState<'date' | 'sender' | 'process' | 'tribunal'>('date');
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<any | null>(null);
  const [emailDetailsLoading, setEmailDetailsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [controladoriaModalData, setControladoriaModalData] = useState<any | null>(null);
  const [delegarPrazoModalData, setDelegarPrazoModalData] = useState<any | null>(null);
  const [manualCNJModalData, setManualCNJModalData] = useState<any | null>(null);
  const [manualCNJInput, setManualCNJInput] = useState('');
  const [notificationAlert, setNotificationAlert] = useState<{ isOpen: boolean; message: string; systemName?: string } | null>(null);

  // --- STATE FOR CENTRAL DE PROCESSAMENTO (TODOIST INTEGRATION) ---
  const [controladoriaActiveItem, setControladoriaActiveItem] = useState<any | null>(null);
  const [todoistTaskTitle, setTodoistTaskTitle] = useState('');
  const [todoistTaskDescription, setTodoistTaskDescription] = useState('');
  const [todoistTaskProject, setTodoistTaskProject] = useState('');
  const [todoistTaskSection, setTodoistTaskSection] = useState('');
  const [todoistTaskAssignee, setTodoistTaskAssignee] = useState('direito.rgr@gmail.com');
  const [todoistTaskPriority, setTodoistTaskPriority] = useState(2); // 1: low, 2: medium, 4: high
  const [todoistTaskDate, setTodoistTaskDate] = useState('');
  const [todoistTaskComments, setTodoistTaskComments] = useState('');
  const [todoistTaskLabels, setTodoistTaskLabels] = useState<string[]>([]);
  const [todoistTaskSubtasks, setTodoistTaskSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [todoistProjects, setTodoistProjects] = useState<any[]>([]);
  const [todoistSections, setTodoistSections] = useState<any[]>([]);
  const [todoistLoading, setTodoistLoading] = useState(false);
  const [todoistSyncing, setTodoistSyncing] = useState(false);
  const [todoistLinkedTask, setTodoistLinkedTask] = useState<any | null>(null);
  const [todoistMultipleTasksFound, setTodoistMultipleTasksFound] = useState<any[]>([]);
  const [isTodoistSelectionModalOpen, setIsTodoistSelectionModalOpen] = useState(false);
  const [todoistNotFoundForCnj, setTodoistNotFoundForCnj] = useState(false);
  const [isDelegarPanelOpen, setIsDelegarPanelOpen] = useState(false);
  const [isRevisaoPanelOpen, setIsRevisaoPanelOpen] = useState(false);
  const [selectedRevisionOption, setSelectedRevisionOption] = useState('');
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [todoistToken, setTodoistToken] = useState(() => {
    return localStorage.getItem('boss_todoist_api_token') || '';
  });

  const handleAcesseProcessoClique = (cnj: string | undefined, senderRaw: string, subject: string = '', snippet: string = '') => {
    // Clean sender email
    const senderMatch = senderRaw.match(/<([^>]+)>/);
    const sender = senderMatch ? senderMatch[1].trim().toLowerCase() : senderRaw.trim().toLowerCase();

    if (!cnj || cnj === 'Não identificado') {
      // Open modal to preencher manualmente
      setManualCNJModalData({ sender, subject, snippet });
      setManualCNJInput('');
      return;
    }

    const cleanCnj = cnj.replace(/\s+/g, '');

    // Copy to clipboard
    navigator.clipboard.writeText(cleanCnj);
    setCopiedText("Número CNJ");
    setTimeout(() => setCopiedText(null), 2500);

    // Heuristics based on sender
    let targetUrl = '';
    let systemName = '';

    if (sender === 'nao-responda@trt3.jus.br') {
      // TRT3 / PJe Trabalhista
      targetUrl = `https://pje.trt3.jus.br/consultaprocessual/detalhe-processo/${cleanCnj}`;
      systemName = 'PJe do TRT3';
    } else if (sender === 'pje@tjmg.jus.br') {
      // TJMG / PJe
      targetUrl = 'https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam';
      systemName = 'PJe do TJMG';
    } else if (sender === 'push@tjmg.jus.br') {
      // TJMG / Push -> Identify PJe vs Eproc
      const content = `${subject} ${snippet}`.toLowerCase();
      if (content.includes('eproc')) {
        targetUrl = 'https://eproc.tjmg.jus.br/eproc/externo_controlador.php?controle=publicacao_pesquisa';
        systemName = 'Eproc do TJMG';
      } else {
        targetUrl = 'https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam';
        systemName = 'PJe do TJMG';
      }
    } else if (sender === 'noreply@tjmg.jus.br') {
      // TJMG / Eproc
      targetUrl = 'https://eproc.tjmg.jus.br/eproc/externo_controlador.php?controle=publicacao_pesquisa';
      systemName = 'Eproc do TJMG';
    } else if (sender === 'eproc@trf6.jus.br') {
      // TRF6 / Eproc
      targetUrl = 'https://eproc.trf6.jus.br/eproc/externo_controlador.php?controle=publicacao_pesquisa';
      systemName = 'Eproc do TRF6';
    } else {
      // General fallback
      targetUrl = 'https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam';
      systemName = 'PJe / Tribunal';
    }

    // Open target url
    window.open(targetUrl, '_blank');

    addSystemLog('info', `Acesso ao processo (${cleanCnj}) iniciado para o tribunal ${systemName}. CNJ copiado para área de transferência.`, 'gmail_sync');

    setNotificationAlert({
      isOpen: true,
      message: `CNJ copiado: ${cleanCnj}. Cole no campo de busca do tribunal (${systemName}).`,
      systemName
    });
  };

  const [lastUpdateCompletedAt, setLastUpdateCompletedAt] = useState<string | null>(() => {
    return localStorage.getItem('boss_pushes_last_updated') || null;
  });

  const handleOpenControladoriaFromPush = (msg: any, group: any) => {
    setControladoriaModalData({
      id: msg.id,
      subject: msg.subject,
      from: group.senderName || group.sender || 'Gmail Push',
      to: 'direito.rgr@gmail.com',
      date: msg.date,
      snippet: msg.snippet,
      processNumber: group.processNumber,
      autor: group.autor,
      reu: group.reu,
      vara: group.vara,
      classe: group.classe,
      tribunal: group.tribunal,
      movementType: group.movementType || 'Movimentação PUSH'
    });
  };

  const handleOpenDelegarPrazoFromPush = (msg: any, group: any) => {
    setDelegarPrazoModalData({
      id: msg.id,
      subject: msg.subject,
      from: group.senderName || group.sender || 'Gmail Push',
      to: 'direito.rgr@gmail.com',
      date: msg.date,
      snippet: msg.snippet,
      processNumber: group.processNumber,
      autor: group.autor,
      reu: group.reu,
      vara: group.vara,
      classe: group.classe,
      tribunal: group.tribunal,
      movementType: group.movementType || 'Movimentação PUSH',
      prazoSugerido: 15,
      responsavel: 'direito.rgr@gmail.com',
      prioridade: 'Alta',
      observacoes: ''
    });
  };

  // --- METHODS FOR CENTRAL DE PROCESSAMENTO & TODOIST INTEGRATION ---
  
  const prefillTodoistForm = (item: any) => {
    if (!item) return;

    let partyTitle = '';
    if (item.autor && item.autor !== 'Não identificado' && item.reu && item.reu !== 'Não identificado') {
      partyTitle = `${item.autor} x ${item.reu}`;
    } else if (item.processNumber && item.processNumber !== 'Não identificado') {
      partyTitle = item.processNumber;
    } else {
      partyTitle = 'Parte Não Identificada';
    }

    let action = 'Cumprir intimação';
    const textToScan = `${item.subject} ${item.snippet} ${item.bodyText || ''}`.toLowerCase();
    
    if (textToScan.includes('réplica') || textToScan.includes('impugnação')) {
      action = 'Apresentar réplica à contestação';
    } else if (textToScan.includes('recurso')) {
      action = 'Interpor recurso';
    } else if (textToScan.includes('audiência') || textToScan.includes('audiencia') || textToScan.includes('julgamento')) {
      action = 'Audiência designada';
    } else if (textToScan.includes('perito') || textToScan.includes('perícia') || textToScan.includes('pericia')) {
      action = 'Manifestar sobre laudo pericial';
    } else if (textToScan.includes('liminar') || textToScan.includes('tutela') || textToScan.includes('decisão liminar')) {
      action = 'Cumprir decisão liminar';
    } else if (item.movementType && item.movementType !== 'Movimentação PUSH' && item.movementType !== 'Publicação Geral') {
      action = item.movementType;
    }

    const cleanCnj = (item.processNumber || 'Não identificado').replace(/\s+/g, '');
    const title = `${partyTitle} — ${action} — ${cleanCnj}`;

    const desc = `### Detalhes do Processo
* **CNJ:** ${cleanCnj}
* **Tribunal:** ${item.tribunal || 'Não identificado'}
* **Classe:** ${item.classe || 'Não identificada'}
* **Vara:** ${item.vara || 'Não identificada'}
* **Autor:** ${item.autor || 'Não identificado'}
* **Réu:** ${item.reu || 'Não identificado'}
* **Movimentação:** ${item.movementType || 'Não identificada'}
* **Link do Gmail:** https://mail.google.com/mail/u/0/#search/in%3Ainbox+%22${encodeURIComponent(cleanCnj)}%22

### Resumo do E-mail
${item.snippet || item.subject || 'Sem resumo disponível.'}`;

    setTodoistTaskTitle(title);
    setTodoistTaskDescription(desc);
    
    // Set auto-labels
    const autoLabels = ["Push", "Prazo", "Controladoria"];
    const senderLower = (item.from || '').toLowerCase();
    if (senderLower.includes('trt3') || textToScan.includes('trt')) {
      autoLabels.push("TRT");
    } else if (senderLower.includes('tjmg') || textToScan.includes('tjmg')) {
      autoLabels.push("TJMG");
    } else if (senderLower.includes('trf6') || textToScan.includes('trf6')) {
      autoLabels.push("TRF6");
    }
    setTodoistTaskLabels(autoLabels);

    // Suggested Deadline & Priority
    let days = 15;
    if (textToScan.includes('urgente') || textToScan.includes('liminar') || textToScan.includes('tutela')) {
      days = 3;
      setTodoistTaskPriority(4); // Highest in Todoist
    } else {
      setTodoistTaskPriority(2); // Medium-high
    }
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + days);
    setTodoistTaskDate(defaultDueDate.toISOString().split('T')[0]);

    setTodoistTaskAssignee('direito.rgr@gmail.com');
    setTodoistTaskComments('');
    
    // Subtasks default
    setTodoistTaskSubtasks([
      'Conferir CNJ no sistema do tribunal',
      'Fazer carga/leitura integral dos autos',
      'Elaborar minuta da peça processual',
      'Protocolar e atualizar controladoria'
    ]);
  };

  const searchTodoistTasks = async (item: any, tokenToUse: string) => {
    if (!item || !tokenToUse) return;
    setTodoistLoading(true);
    setTodoistNotFoundForCnj(false);
    setIsTodoistSelectionModalOpen(false);
    setTodoistMultipleTasksFound([]);
    try {
      const cleanCnj = (item.processNumber || '').replace(/\s+/g, '');
      if (!cleanCnj || cleanCnj === 'Nãoidentificado' || cleanCnj === 'Não identificado') {
        setTodoistLoading(false);
        return;
      }

      // Check if there is a saved link for this CNJ
      const savedLinksRaw = localStorage.getItem('boss_cnj_todoist_links');
      const savedLinks = savedLinksRaw ? JSON.parse(savedLinksRaw) : {};
      const savedTaskId = savedLinks[cleanCnj];

      if (savedTaskId) {
        // Fetch specific task
        const taskRes = await fetch(`/api/todoist/tasks/${savedTaskId}`, {
          headers: { 'x-todoist-token': tokenToUse }
        });
        if (taskRes.ok) {
          const task = await taskRes.json();
          if (task && !task.error) {
            setTodoistLinkedTask(task);
            setTodoistTaskTitle(task.content);
            setTodoistTaskDescription(task.description || '');
            setTodoistTaskPriority(task.priority || 1);
            if (task.due) {
              setTodoistTaskDate(task.due.date || '');
            }
            setTodoistTaskLabels(task.labels || []);
            setTodoistMultipleTasksFound([]);
            setIsTodoistSelectionModalOpen(false);
            setTodoistNotFoundForCnj(false);
            addSystemLog('info', `Tarefa vinculada carregada do histórico para o CNJ ${cleanCnj}.`, 'gmail_sync');
            setTodoistLoading(false);
            return;
          }
        }
      }

      // If no saved link or loading fails, call the consolidated search-all endpoint
      const response = await fetch(`/api/todoist/search-all?cnj=${encodeURIComponent(cleanCnj)}`, {
        headers: {
          'x-todoist-token': tokenToUse
        }
      });

      if (response.ok) {
        const tasks = await response.json();
        if (Array.isArray(tasks) && tasks.length > 0) {
          if (tasks.length === 1) {
            // Exactly one task found
            const linked = tasks[0];
            setTodoistLinkedTask(linked);
            setTodoistTaskTitle(linked.content);
            setTodoistTaskDescription(linked.description || '');
            setTodoistTaskPriority(linked.priority || 1);
            if (linked.due) {
              setTodoistTaskDate(linked.due.date || '');
            }
            setTodoistTaskLabels(linked.labels || []);
            setTodoistMultipleTasksFound([]);
            setIsTodoistSelectionModalOpen(false);
            setTodoistNotFoundForCnj(false);
            addSystemLog('info', `Tarefa relacionada encontrada no Todoist: "${linked.content}". Carregando para edição.`, 'gmail_sync');
          } else {
            // Multiple tasks found
            setTodoistMultipleTasksFound(tasks);
            setIsTodoistSelectionModalOpen(true);
            setTodoistLinkedTask(null);
            setTodoistNotFoundForCnj(false);
            addSystemLog('info', `Encontramos ${tasks.length} tarefas possíveis para este CNJ. Seleção obrigatória pendente.`, 'gmail_sync');
          }
        } else {
          setTodoistLinkedTask(null);
          setTodoistMultipleTasksFound([]);
          setIsTodoistSelectionModalOpen(false);
          setTodoistNotFoundForCnj(true);
          addSystemLog('warning', `Nenhuma tarefa Todoist encontrada para este CNJ: ${cleanCnj}`, 'gmail_sync');
        }
      }
    } catch (err) {
      console.error("Erro ao buscar no Todoist:", err);
    } finally {
      setTodoistLoading(false);
    }
  };

  const fetchTodoistMetadata = async (tokenToUse: string) => {
    if (!tokenToUse) return;
    try {
      const projRes = await fetch("/api/todoist/projects", {
        headers: { 'x-todoist-token': tokenToUse }
      });
      if (projRes.ok) {
        const projects = await projRes.json();
        setTodoistProjects(projects);
        if (projects.length > 0) {
          const defaultProj = projects.find((p: any) => p.name.toLowerCase() === 'inbox' || p.is_inbox_project) || projects[0];
          setTodoistTaskProject(defaultProj.id);
        }
      }

      const secRes = await fetch("/api/todoist/sections", {
        headers: { 'x-todoist-token': tokenToUse }
      });
      if (secRes.ok) {
        const sections = await secRes.json();
        setTodoistSections(sections);
      }
    } catch (err) {
      console.error("Erro ao carregar metadados do Todoist:", err);
    }
  };

  const handleSaveTodoistTask = async (skipRedirect = false) => {
    if (!todoistToken) {
      addSystemLog('warning', 'Token de API do Todoist não configurado. Por favor, insira o token para salvar.');
      return;
    }

    setTodoistSyncing(true);
    try {
      const taskPayload: any = {
        content: todoistTaskTitle,
        description: todoistTaskDescription,
        priority: todoistTaskPriority,
        labels: todoistTaskLabels,
      };

      if (todoistTaskProject) taskPayload.project_id = todoistTaskProject;
      if (todoistTaskSection) taskPayload.section_id = todoistTaskSection;
      if (todoistTaskDate) taskPayload.due_date = todoistTaskDate;

      let savedTask: any = null;

      if (todoistLinkedTask) {
        // Update existing task
        const updateRes = await fetch(`/api/todoist/tasks/${todoistLinkedTask.id}`, {
          method: "POST",
          headers: {
            'x-todoist-token': todoistToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskPayload)
        });

        if (!updateRes.ok) {
          throw new Error("Erro ao atualizar tarefa existente no Todoist.");
        }

        savedTask = await updateRes.json();
        addSystemLog('success', `Sucesso: Tarefa no Todoist atualizada com sucesso! (${todoistTaskTitle})`, 'gmail_sync');
      } else {
        // Create new task
        const createRes = await fetch(`/api/todoist/tasks`, {
          method: "POST",
          headers: {
            'x-todoist-token': todoistToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskPayload)
        });

        if (!createRes.ok) {
          throw new Error("Erro ao criar nova tarefa no Todoist.");
        }

        savedTask = await createRes.json();
        addSystemLog('success', `Sucesso: Tarefa no Todoist criada com sucesso! (${todoistTaskTitle})`, 'gmail_sync');
      }

      // Add comments if any
      if (todoistTaskComments && savedTask?.id) {
        await fetch(`/api/todoist/comments`, {
          method: "POST",
          headers: {
            'x-todoist-token': todoistToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            task_id: savedTask.id,
            content: todoistTaskComments
          })
        });
      }

      // Add subtasks
      if (todoistTaskSubtasks.length > 0 && savedTask?.id && !todoistLinkedTask) {
        for (const sub of todoistTaskSubtasks) {
          await fetch(`/api/todoist/tasks`, {
            method: "POST",
            headers: {
              'x-todoist-token': todoistToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: sub,
              parent_id: savedTask.id
            })
          });
        }
      }

      addSystemLog('info', `Controladoria atualizada para o processo ${controladoriaActiveItem.processNumber}.`, 'gmail_sync');
      
      if (!skipRedirect) {
        // Navigate back
        setTimeout(() => {
          const sender = (controladoriaActiveItem.from || '').toLowerCase();
          const source = PUSH_SOURCES.find(s => sender.includes(s.sender.toLowerCase()) || s.sender.toLowerCase().includes(sender));
          const resolvedPushId = source ? source.id : 'trt-mg';
          setActiveTab(`pushes/push-${resolvedPushId}` as any);
        }, 1500);
      }

    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao salvar no Todoist: ${err.message}`, 'gmail_sync');
    } finally {
      setTodoistSyncing(false);
    }
  };

  const handleOpenControladoriaWorkspace = async (msg: any, group: any = null, sourceId: string = '') => {
    let resolvedSourceId = sourceId;
    if (!resolvedSourceId) {
      const sender = (msg.from || msg.sender || group?.sender || '').toLowerCase();
      const source = PUSH_SOURCES.find(s => sender.includes(s.sender.toLowerCase()) || s.sender.toLowerCase().includes(sender));
      resolvedSourceId = source ? source.id : 'trt-mg';
    }

    const initialItem = {
      id: msg.id,
      subject: msg.subject || '',
      from: msg.from || msg.sender || group?.senderName || group?.sender || 'Gmail Push',
      to: msg.to || 'direito.rgr@gmail.com',
      date: msg.date || new Date().toISOString(),
      snippet: msg.snippet || '',
      bodyText: msg.bodyText || '',
      processNumber: msg.processNumber || group?.processNumber || 'Não identificado',
      autor: msg.autor || group?.autor || 'Não identificado',
      reu: msg.reu || group?.reu || 'Não identificado',
      vara: msg.vara || group?.vara || '',
      classe: msg.classe || group?.classe || 'Não identificada',
      tribunal: msg.tribunal || group?.tribunal || '',
      movementType: msg.movementType || group?.movementType || 'Movimentação PUSH',
      hasAttachments: msg.hasAttachments || false,
      attachments: msg.attachments || []
    };

    setControladoriaActiveItem(initialItem);
    prefillTodoistForm(initialItem);
    
    // Navigate immediately
    setActiveTab(`pushes/push-${resolvedSourceId}/atualizar-controladoria` as any);

    // Fetch Todoist projects/sections if token is present
    const savedToken = localStorage.getItem('boss_todoist_api_token');
    if (savedToken) {
      fetchTodoistMetadata(savedToken);
    }

    // If no bodyText, fetch details
    if (!msg.bodyText) {
      try {
        const gmailToken = cachedToken || localStorage.getItem('boss_gmail_token');
        if (gmailToken) {
          const response = await fetch("/api/gmail-messages-details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: gmailToken,
              messageIds: [msg.id]
            })
          });
          if (!response.ok) {
            const errJson = await response.json();
            if (response.status === 401 || errJson.error === "UNAUTHENTICATED") {
              setCachedToken(null);
              localStorage.removeItem('boss_gmail_token');
              addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
            }
          } else {
            const data = await response.json();
            if (data.messages && data.messages.length > 0 && data.messages[0].success) {
              const detailed = data.messages[0];
              const updatedItem = {
                ...initialItem,
                bodyText: detailed.bodyText || '',
                processNumber: detailed.processNumber || initialItem.processNumber,
                autor: detailed.autor || initialItem.autor,
                reu: detailed.reu || initialItem.reu,
                vara: detailed.vara || initialItem.vara,
                classe: detailed.classe || initialItem.classe,
                tribunal: detailed.tribunal || initialItem.tribunal,
                movementType: detailed.movementType || initialItem.movementType,
                hasAttachments: detailed.hasAttachments || false,
                attachments: detailed.attachments || []
              };
              setControladoriaActiveItem(updatedItem);
              prefillTodoistForm(updatedItem);
              
              if (savedToken) {
                searchTodoistTasks(updatedItem, savedToken);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes da publicação:", err);
      }
    } else {
      if (savedToken) {
        searchTodoistTasks(initialItem, savedToken);
      }
    }
  };

  const handleNextPublication = (activeSubRouteId: string) => {
    if (!groupedPushes || !groupedPushes.groups || !controladoriaActiveItem) {
      addSystemLog('warning', 'Nenhuma lista de publicações carregada para localizar o próximo item.', 'gmail_sync');
      return;
    }
    const groups = groupedPushes.groups;
    const currentIndex = groups.findIndex((g: any) => g.processNumber === controladoriaActiveItem.processNumber);
    if (currentIndex !== -1 && currentIndex < groups.length - 1) {
      const nextGroup = groups[currentIndex + 1];
      const nextMsg = nextGroup.messages[0];
      handleOpenControladoriaWorkspace(nextMsg, nextGroup, activeSubRouteId);
      addSystemLog('info', `Avançando para próxima publicação: Processo ${nextGroup.processNumber}`, 'gmail_sync');
    } else {
      addSystemLog('warning', 'Esta já é a última publicação desta lista de pushes.', 'gmail_sync');
    }
  };

  const handleSelectTaskInApp = (task: any) => {
    const cleanCnj = (controladoriaActiveItem?.processNumber || '').replace(/\s+/g, '');
    if (!cleanCnj) return;
    const savedLinksRaw = localStorage.getItem('boss_cnj_todoist_links');
    const savedLinks = savedLinksRaw ? JSON.parse(savedLinksRaw) : {};
    savedLinks[cleanCnj] = task.id;
    localStorage.setItem('boss_cnj_todoist_links', JSON.stringify(savedLinks));

    setTodoistLinkedTask(task);
    setTodoistTaskTitle(task.content);
    setTodoistTaskDescription(task.description || '');
    setTodoistTaskPriority(task.priority || 1);
    if (task.due) {
      setTodoistTaskDate(task.due.date || '');
    }
    setTodoistTaskLabels(task.labels || []);
    setIsTodoistSelectionModalOpen(false);
    setTodoistMultipleTasksFound([]);
    setTodoistNotFoundForCnj(false);

    addSystemLog('success', `Tarefa vinculada com sucesso ao CNJ ${cleanCnj}!`, 'gmail_sync');
  };

  const renderControladoriaWorkspace = (source: any, theme: any) => {
    if (!controladoriaActiveItem) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin" />
          <h3 className="text-base font-bold text-slate-800">Carregando Área de Trabalho...</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Aguarde enquanto os metadados do e-mail e as informações da publicação jurídica são carregados e analisados pelo Portal BOSS.
          </p>
        </div>
      );
    }

    return (
      <ControladoriaWorkspaceComponent
        controladoriaActiveItem={controladoriaActiveItem}
        groupedPushes={groupedPushes}
        theme={theme}
        todoistToken={todoistToken}
        setTodoistToken={setTodoistToken}
        todoistProjects={todoistProjects}
        todoistTaskTitle={todoistTaskTitle}
        setTodoistTaskTitle={setTodoistTaskTitle}
        todoistTaskDescription={todoistTaskDescription}
        setTodoistTaskDescription={setTodoistTaskDescription}
        todoistTaskAssignee={todoistTaskAssignee}
        setTodoistTaskAssignee={setTodoistTaskAssignee}
        todoistTaskDate={todoistTaskDate}
        setTodoistTaskDate={setTodoistTaskDate}
        todoistTaskPriority={todoistTaskPriority}
        setTodoistTaskPriority={setTodoistTaskPriority}
        todoistTaskProject={todoistTaskProject}
        setTodoistTaskProject={setTodoistTaskProject}
        todoistTaskComments={todoistTaskComments}
        setTodoistTaskComments={setTodoistTaskComments}
        todoistTaskSubtasks={todoistTaskSubtasks}
        setTodoistTaskSubtasks={setTodoistTaskSubtasks}
        todoistTaskLabels={todoistTaskLabels}
        setTodoistTaskLabels={setTodoistTaskLabels}
        todoistLinkedTask={todoistLinkedTask}
        setTodoistLinkedTask={setTodoistLinkedTask}
        todoistLoading={todoistLoading}
        todoistSyncing={todoistSyncing}
        handleSaveTodoistTask={handleSaveTodoistTask}
        handleOpenControladoriaWorkspace={handleOpenControladoriaWorkspace}
        handleMarkAsConferred={handleMarkAsConferred}
        publications={publications}
        setPublications={setPublications}
        systemLogs={systemLogs}
        addSystemLog={addSystemLog}
        setActiveTab={setActiveTab}
        source={source}
        todoistMultipleTasksFound={todoistMultipleTasksFound}
        setTodoistMultipleTasksFound={setTodoistMultipleTasksFound}
        isTodoistSelectionModalOpen={isTodoistSelectionModalOpen}
        setIsTodoistSelectionModalOpen={setIsTodoistSelectionModalOpen}
        todoistNotFoundForCnj={todoistNotFoundForCnj}
        setTodoistNotFoundForCnj={setTodoistNotFoundForCnj}
        handleSelectTask={handleSelectTaskInApp}
        cachedToken={cachedToken}
      />
    );
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    addSystemLog('info', `${label} copiado para a área de transferência.`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const openGmailExplorer = async (source: { name: string; sender?: string; query?: string }, filter: 'all' | 'unread') => {
    let token = cachedToken;
    if (!token) {
      token = localStorage.getItem('boss_gmail_token');
      if (token) {
        setCachedToken(token);
      }
    }
    if (!token) {
      addSystemLog('warning', 'Acesso ao Gmail expirado ou não fornecido. Por favor, conecte sua conta Google no painel para autorizar o acesso.', 'gmail_sync');
      return;
    }

    setIsGmailExplorerOpen(true);
    setExplorerSource({ name: source.name, sender: source.sender || source.query || '' });
    setExplorerFilter(filter);
    setExplorerQuickFilter(filter === 'unread' ? 'unread' : 'all');
    setExplorerMessageIds([]);
    setExplorerMessages([]);
    setExplorerSearch('');
    setSelectedEmailDetail(null);
    setExplorerListLoading(true);
    addSystemLog('info', `Abrindo central de e-mails para ${source.name} (${filter === 'unread' ? 'não lidos' : 'todos'})...`, 'gmail_sync');

    try {
      const bodyParams: any = {
        accessToken: cachedToken,
        filter: filter
      };

      if (source.query) {
        bodyParams.query = source.query;
      } else if (source.sender) {
        bodyParams.sender = source.sender === 'all_senders' ? PUSH_SOURCES.map(s => s.sender).join(' OR ') : source.sender;
      } else {
        bodyParams.sender = 'all_senders';
      }

      const response = await fetch("/api/gmail-messages-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyParams)
      });

      if (!response.ok) {
        const errJson = await response.json();
        if (response.status === 401 || errJson.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(errJson.error || "Erro ao obter lista de e-mails do Gmail.");
      }

      const data = await response.json();
      setExplorerMessageIds(data.messageIds || []);
      
      if (data.messageIds && data.messageIds.length > 0) {
        await loadBatchDetails(data.messageIds.slice(0, 15), []);
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao carregar listagem de e-mails: ${err.message}`, 'gmail_sync');
    } finally {
      setExplorerListLoading(false);
    }
  };

  const loadBatchDetails = async (idsToFetch: string[], currentMessages: any[]) => {
    if (idsToFetch.length === 0) return;
    setExplorerDetailsLoading(true);
    try {
      const response = await fetch("/api/gmail-messages-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: cachedToken,
          messageIds: idsToFetch
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        if (response.status === 401 || errJson.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(errJson.error || "Erro ao carregar detalhes dos e-mails.");
      }

      const data = await response.json();
      if (data.messages) {
        setExplorerMessages(prev => {
          const list = prev.length > 0 ? prev : currentMessages;
          const existingIds = list.map(m => m.id);
          const newMessages = data.messages.filter((m: any) => m.success && !existingIds.includes(m.id));
          return [...list, ...newMessages];
        });
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao carregar detalhes de mensagens do Gmail: ${err.message}`, 'gmail_sync');
    } finally {
      setExplorerDetailsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    const loadedCount = explorerMessages.length;
    const nextBatch = explorerMessageIds.slice(loadedCount, loadedCount + 15);
    await loadBatchDetails(nextBatch, explorerMessages);
  };

  const handleMarkAsConferred = async (email: any) => {
    try {
      const isProcessValid = email.processNumber && email.processNumber !== 'Não identificado';
      const processNum = isProcessValid ? email.processNumber : "Não identificado";

      const newPub: Publication = {
        id: `gmail-checked-${Date.now()}`,
        processNumber: processNum,
        title: email.subject || "E-mail de Push",
        content: `Remetente: ${email.from}\nDestinatário: ${email.to}\nData do E-mail: ${new Date(email.date).toLocaleString('pt-BR')}\n\nSnippet: ${email.snippet}\n\nConteúdo Integral:\n${email.bodyText || ''}`,
        source: "gmail",
        category: "informativo",
        urgencyLevel: "baixa",
        subpoenaDate: email.date || new Date().toISOString(),
        deadlineDays: 0,
        dueDate: email.date || new Date().toISOString(),
        actionRequired: "Conferido manualmente a partir da central de pushes.",
        status: "concluido",
        userId: user?.uid || "demo-user",
        createdAt: new Date().toISOString()
      };

      if (user) {
        const docRef = await addDoc(collection(db, "publications"), newPub);
        newPub.id = docRef.id;
      }

      setPublications(prev => [newPub, ...prev]);
      addSystemLog('success', `E-mail "${email.subject}" marcado como conferido com sucesso. Processo: ${processNum}`);
      
      setExplorerMessages(prev => prev.map(m => m.id === email.id ? { ...m, isConferred: true } : m));
      if (selectedEmailDetail?.id === email.id) {
        setSelectedEmailDetail((prev: any) => prev ? { ...prev, isConferred: true } : null);
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao marcar e-mail como conferido: ${err.message}`);
    }
  };

  const handleRefreshSingleEmail = async (id: string) => {
    setEmailDetailsLoading(true);
    try {
      const response = await fetch("/api/gmail-messages-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: cachedToken,
          messageIds: [id]
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        if (response.status === 401 || errJson.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(errJson.error || "Erro ao recarregar e-mail.");
      }

      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        const updatedMsg = data.messages[0];
        if (updatedMsg.success) {
          setExplorerMessages(prev => prev.map(m => m.id === id ? updatedMsg : m));
          if (selectedEmailDetail?.id === id) {
            setSelectedEmailDetail(updatedMsg);
          }
          addSystemLog('success', `E-mail "${updatedMsg.subject}" atualizado com sucesso.`, 'gmail_sync');
        }
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao atualizar informações do e-mail: ${err.message}`, 'gmail_sync');
    } finally {
      setEmailDetailsLoading(false);
    }
  };

  const getConferenciaHistory = (processNumber: string) => {
    if (!processNumber || processNumber === 'Não identificado') return [];
    return publications.filter(p => p.processNumber === processNumber);
  };

  // Load initial pushes from localStorage if any
  useEffect(() => {
    const cached = localStorage.getItem('boss_pushes_data');
    const cachedTime = localStorage.getItem('boss_pushes_last_updated');
    if (cached) {
      try {
        setPushesData(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }
    if (cachedTime) {
      setPushesLastUpdated(cachedTime);
    }
  }, []);

  const fetchAllPushes = async () => {
    if (!cachedToken) {
      handleGoogleLogin();
      return;
    }

    setGlobalPushesLoading(true);
    setPushesError(null);
    addSystemLog('info', 'Iniciando atualização de todas as fontes de PUSH processuais no Gmail...', 'gmail_sync');

    // Set all as loading
    const initialLoading: Record<string, boolean> = {};
    PUSH_SOURCES.forEach(s => { initialLoading[s.sender] = true; });
    setPushesLoading(initialLoading);

    try {
      const res = await fetch("/api/gmail-pushes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken })
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 401 || errData.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(errData.message || errData.error || "Erro ao consultar o Gmail.");
      }

      const data = await res.json() as { stats: PushStat[] };
      const updatedData: Record<string, PushStat> = { ...pushesData };
      
      data.stats.forEach(stat => {
        updatedData[stat.sender] = stat;
      });

      setPushesData(updatedData);
      localStorage.setItem('boss_pushes_data', JSON.stringify(updatedData));
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setPushesLastUpdated(nowStr);
      localStorage.setItem('boss_pushes_last_updated', nowStr);

      addSystemLog('success', 'Todas as fontes de PUSH processuais foram atualizadas com sucesso.', 'gmail_sync');
    } catch (err: any) {
      console.error(err);
      setPushesError("Não foi possível consultar o Gmail neste momento. Tente atualizar novamente.");
      addSystemLog('error', `Falha ao atualizar PUSHes: ${err.message}`, 'gmail_sync');
    } finally {
      setGlobalPushesLoading(false);
      setPushesLoading({});
    }
  };

  const fetchSinglePush = async (sender: string) => {
    if (!cachedToken) {
      handleGoogleLogin();
      return;
    }

    setPushesLoading(prev => ({ ...prev, [sender]: true }));
    addSystemLog('info', `Atualizando PUSH processual para o remetente ${sender}...`, 'gmail_sync');

    try {
      const res = await fetch("/api/gmail-pushes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, sender })
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 401 || errData.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(errData.message || errData.error || "Erro ao consultar o Gmail.");
      }

      const data = await res.json() as { stats: PushStat[] };
      if (data.stats && data.stats.length > 0) {
        const stat = data.stats[0];
        const updatedData = { ...pushesData, [sender]: stat };
        setPushesData(updatedData);
        localStorage.setItem('boss_pushes_data', JSON.stringify(updatedData));
        
        const nowStr = new Date().toLocaleString('pt-BR');
        setPushesLastUpdated(nowStr);
        localStorage.setItem('boss_pushes_last_updated', nowStr);
        
        addSystemLog('success', `PUSH processual para ${sender} atualizado com sucesso.`, 'gmail_sync');
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao atualizar PUSH (${sender}): ${err.message}`, 'gmail_sync');
    } finally {
      setPushesLoading(prev => ({ ...prev, [sender]: false }));
    }
  };

  // Loading & process indicators
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [isSimulatingApi, setIsSimulatingApi] = useState(false);
  const [gmailSyncResults, setGmailSyncResults] = useState<Publication[]>([]);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Forms state (strictly vertical, single-column)
  const [manualProcessNumber, setManualProcessNumber] = useState('');
  const [manualSubpoenaDate, setManualSubpoenaDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualContent, setManualContent] = useState('');
  const [tokenSystemName, setTokenSystemName] = useState('');

  // API Simulation fields (simulating what legacy system would send)
  const [simApiProcess, setSimApiProcess] = useState('1003445-99.2026.8.26.0000');
  const [simApiTitle, setSimApiTitle] = useState('Intimação de Despacho de Agravo');
  const [simApiContent, setSimApiContent] = useState('Fica intimado o agravante para comprovar o recolhimento das custas de preparo recursal, no prazo fatal de 5 dias, sob pena de deserção.');

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (currentUser.email !== 'direito.rgr@gmail.com') {
          // Block immediately
          await signOut(auth);
          setUser(null);
          setCachedToken(null);
          setLoginError('Usuário não autorizado para acessar este sistema.');
          setAuthLoading(false);
          setActiveTab('login');
          try {
            window.history.replaceState(null, '', '/login');
          } catch (e) {
            console.warn('History API block warning:', e);
          }
          return;
        }

        setUser(currentUser);
        setAuthLoading(false);
        setLoginError(null);
        // Load data from firestore in the background
        loadUserPublications(currentUser.uid);
        loadUserEmailRules(currentUser.uid);
        addSystemLog('info', `Usuário ${currentUser.email} autenticado com sucesso.`);

        // Redirect to dashboard-principal if currently on /login or default path
        const path = window.location.pathname.replace(/^\//, '');
        if (path === 'login' || path === '') {
          setActiveTab('dashboard-principal');
          try {
            window.history.replaceState(null, '', '/dashboard-principal');
          } catch (e) {
            console.warn('History API block warning:', e);
          }
        }
      } else {
        setUser(null);
        setCachedToken(null);
        localStorage.removeItem('boss_gmail_token');
        setAuthLoading(false);
        setActiveTab('login');
        try {
          if (window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
          }
        } catch (e) {
          console.warn('History API block warning:', e);
        }

        // Fallback to local storage or initial mockup data
        const stored = localStorage.getItem('boss_publications');
        if (stored) {
          try {
            setPublications(JSON.parse(stored));
          } catch {
            setPublications(initialPublications);
          }
        } else {
          setPublications(initialPublications);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Sync to localStorage as a local cache for offline/demo use
  useEffect(() => {
    if (!user && publications.length > 0) {
      localStorage.setItem('boss_publications', JSON.stringify(publications));
    }
  }, [publications, user]);

  // Auto-fetch pushes when user enters pushes tab
  useEffect(() => {
    if (activeTab === 'pushes' && cachedToken) {
      fetchAllPushes();
    }
  }, [activeTab, cachedToken]);

  // Load from firestore
  const loadUserPublications = async (uid: string) => {
    // 1. First, attempt to load from local cache instantly to prevent empty flash
    const stored = localStorage.getItem('boss_publications');
    if (stored) {
      try {
        setPublications(JSON.parse(stored));
      } catch {
        // no-op
      }
    }

    try {
      const q = query(collection(db, "publications"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const fetched: Publication[] = [];
      querySnapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as Publication);
      });
      
      if (fetched.length > 0) {
        setPublications(fetched);
        localStorage.setItem('boss_publications', JSON.stringify(fetched));
      } else {
        // Seed first-time logged in user with mock data
        const batch = writeBatch(db);
        const seeded: Publication[] = initialPublications.map(p => ({ ...p, userId: uid }));
        
        for (const item of seeded) {
          const docRef = doc(collection(db, "publications"));
          batch.set(docRef, item);
        }
        await batch.commit();
        setPublications(seeded);
        localStorage.setItem('boss_publications', JSON.stringify(seeded));
        addSystemLog('success', 'Base de demonstração migrada e salva com sucesso no seu Firestore.');
      }
    } catch (err: any) {
      console.error("Erro ao carregar do Firestore:", err);
      addSystemLog('error', `Falha ao conectar com o banco de dados Cloud Firestore: ${err.message}`);
      // Fallback
      if (publications.length === 0) {
        setPublications(initialPublications);
      }
    }
  };

  const loadUserEmailRules = async (uid: string) => {
    try {
      const q = query(collection(db, "email_rules"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const fetched: EmailRule[] = [];
      querySnapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as EmailRule);
      });

      if (fetched.length > 0) {
        setEmailRules(fetched);
      } else {
        // Seed first-time logged in user with 50+ mock rules
        const batch = writeBatch(db);
        const seeded: EmailRule[] = defaultEmailRules.map((r, idx) => ({
          ...r,
          id: `seed-${idx}-${Math.random().toString(36).substring(2, 9)}`,
          userId: uid,
          createdAt: new Date().toISOString(),
          lastChecked: null
        }));
        
        for (const item of seeded) {
          const docRef = doc(collection(db, "email_rules"));
          // Assign the custom id so it matches firestore id
          const seedWithId = { ...item, id: docRef.id };
          batch.set(docRef, seedWithId);
        }
        await batch.commit();
        
        // Fetch them back to get Firestore IDs
        const reQuerySnapshot = await getDocs(q);
        const reFetched: EmailRule[] = [];
        reQuerySnapshot.forEach((docSnap) => {
          reFetched.push({ id: docSnap.id, ...docSnap.data() } as EmailRule);
        });
        setEmailRules(reFetched);
        addSystemLog('success', 'Árvore global com 50+ regras de arquivamento inteligente semeada no seu Firestore.');
      }
    } catch (err: any) {
      console.error("Erro ao carregar regras do Firestore:", err);
      // Fallback to offline default rules if firestore connection fails
      setEmailRules(defaultEmailRules.map((r, i) => ({ ...r, id: `rule-${i}` }) as EmailRule));
    }
  };

  const syncGlobalGmailStats = async (token = cachedToken, forceRefetch = false) => {
    if (!token) return;
    setIsEmailStatsLoading(true);
    try {
      const res = await fetch("/api/gmail-global-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, forceRefetch })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGlobalEmailStats(prev => ({
            ...prev,
            emailAddress: data.emailAddress || prev.emailAddress,
            messagesTotal: data.messagesTotal,
            inboxCount: data.inboxCount,
            unreadCount: data.unreadCount
          }));
        }
      } else {
        const errData = await res.json();
        if (res.status === 401 || errData.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
      }
    } catch (err) {
      console.error("Erro ao carregar estatísticas do Gmail:", err);
    } finally {
      setIsEmailStatsLoading(false);
    }
  };

  const addSystemLog = (status: 'success' | 'warning' | 'error' | 'info', message: string, type: 'gmail_sync' | 'api_received' | 'manual_add' | 'status_change' = 'manual_add') => {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${randomSuffix}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      userId: user?.uid || 'demo-user',
      status
    };
    setSystemLogs(prev => [newLog, ...prev.slice(0, 49)]);

    // Automatically parse message to append to systemEvents in real time
    let eventType: any = null;
    let source: any = 'Outros';
    
    // Determine source from current context or active sub routes if possible
    if (message.includes('TRT3') || message.includes('TRT-MG')) source = 'TRT3';
    else if (message.includes('TJMG') && !message.includes('eproc')) source = 'TJMG';
    else if (message.includes('Eproc TJMG') || message.includes('eproc_tjmg') || message.includes('Eproc – Push TRF6') || message.includes('pje@tjmg.jus.br')) {
      source = message.includes('trf6') || message.includes('TRF6') ? 'TRF6' : 'Eproc';
    } else if (message.includes('TRF6') || message.includes('eproc@trf6')) source = 'TRF6';
    else if (message.includes('Recorte')) source = 'RecorteDigital';
    else if (message.includes('Prius')) source = 'Prius';

    if (message.toLowerCase().includes('conferido') || message.toLowerCase().includes('conferência') || message.toLowerCase().includes('sucesso')) {
      eventType = 'pub_checked';
    } else if (message.toLowerCase().includes('ignora') || message.toLowerCase().includes('não é publicação')) {
      eventType = 'pub_ignored';
    } else if (message.toLowerCase().includes('duplicad')) {
      eventType = 'pub_duplicate';
    } else if (message.toLowerCase().includes('subtarefa')) {
      eventType = 'subtask_created';
    } else if (message.toLowerCase().includes('comentário')) {
      eventType = 'comment_created';
    } else if (message.toLowerCase().includes('revisar') || message.toLowerCase().includes('revisão')) {
      eventType = 'revision_created';
    } else if (message.toLowerCase().includes('todoist')) {
      eventType = message.toLowerCase().includes('criad') ? 'task_created' : 'task_updated';
    } else if (message.toLowerCase().includes('deletar') || message.toLowerCase().includes('removida')) {
      eventType = 'pub_deleted';
    } else if (message.toLowerCase().includes('gmail') && message.toLowerCase().includes('lido')) {
      eventType = 'email_read';
    } else if (message.toLowerCase().includes('copiad') || message.toLowerCase().includes('download')) {
      eventType = 'download_attachment';
    } else if (message.toLowerCase().includes('upload')) {
      eventType = 'upload_document';
    } else if (message.toLowerCase().includes('controladoria')) {
      eventType = 'controladoria_update';
    }

    if (eventType) {
      const newEvent = {
        id: `live-event-${Date.now()}-${randomSuffix}`,
        timestamp: new Date().toISOString(),
        type: eventType,
        source: source,
        timeSpent: Math.floor(45 + Math.random() * 90), // random duration
        details: message
      };
      setSystemEvents(prev => [newEvent, ...prev]);
    }
  };

  // Google Sign In & Get Gmail Token
  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      const loggedEmail = result.user?.email;
      if (loggedEmail !== 'direito.rgr@gmail.com') {
        // Sign out immediately and block
        await signOut(auth);
        setCachedToken(null);
        localStorage.removeItem('boss_gmail_token');
        setLoginError('Usuário não autorizado para acessar este sistema.');
        addSystemLog('error', `Acesso negado para o e-mail não autorizado: ${loggedEmail}`);
        setActiveTab('login');
        try {
          window.history.replaceState(null, '', '/login');
        } catch (e) {
          console.warn('History API block warning:', e);
        }
        return;
      }

      if (token) {
        setCachedToken(token);
        localStorage.setItem('boss_gmail_token', token);
        addSystemLog('success', 'Autorização do Gmail obtida com sucesso.', 'gmail_sync');
      }

      // Clear any errors
      setLoginError(null);

      // Redirect to dashboard
      setActiveTab('dashboard');
      try {
        window.history.replaceState(null, '', '/dashboard');
      } catch (e) {
        console.warn('History API block warning:', e);
      }
    } catch (error: any) {
      console.error("Erro de autenticação Google:", error);
      setLoginError(`Falha de autenticação com o Google: ${error.message}`);
      addSystemLog('error', `Falha de autenticação com o Google: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCachedToken(null);
      localStorage.removeItem('boss_gmail_token');
      setPublications(initialPublications);
      setHasAutoUpdated(false);
      setLoginError(null);
      addSystemLog('info', 'Sessão encerrada com sucesso.');
      setActiveTab('login');
      try {
        window.history.replaceState(null, '', '/login');
      } catch (e) {
        console.warn('History API block warning:', e);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Dedicated sync for Prius via Gmail API
  const syncPrius = async () => {
    let token = cachedToken;
    if (!token) {
      token = localStorage.getItem('boss_gmail_token');
      if (token) {
        setCachedToken(token);
      }
    }
    if (!token) {
      addSystemLog('warning', 'Acesso ao Gmail expirado ou não fornecido para sincronizar Prius. Por favor, conecte sua conta Google.', 'gmail_sync');
      return;
    }
    setPriusState(prev => ({ ...prev, isLoading: true, error: null }));
    addSystemLog('info', 'Sincronizando dados do Prius via Gmail...', 'gmail_sync');
    try {
      const res = await fetch("/api/prius/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(data.message || data.error || "Erro de conexão com o servidor Prius.");
      }
      setPriusState({
        status: 'conectado',
        lastUpdated: new Date().toLocaleString('pt-BR'),
        totalImported: data.count || 0,
        unreadCount: data.unreadCount || 0,
        newestSubject: data.newestSubject || "Nenhum e-mail recente",
        newestDate: data.newestDate || null,
        error: null,
        isLoading: false
      });
      addSystemLog('success', 'Sincronização com Prius via Gmail concluída com sucesso.', 'gmail_sync');
    } catch (err: any) {
      setPriusState(prev => ({
        ...prev,
        status: 'erro',
        lastUpdated: new Date().toLocaleString('pt-BR'),
        error: err.message,
        isLoading: false
      }));
      addSystemLog('error', `Falha de integração Prius: ${err.message}`, 'gmail_sync');
    }
  };

  // Dedicated sync for a specific Recorte Digital service via Gmail API
  const syncRecorteService = async (serviceId: string, serviceName: string) => {
    let token = cachedToken;
    if (!token) {
      token = localStorage.getItem('boss_gmail_token');
      if (token) {
        setCachedToken(token);
      }
    }
    if (!token) {
      addSystemLog('warning', `Acesso ao Gmail expirado ou não fornecido para sincronizar ${serviceName}. Por favor, conecte sua conta Google.`, 'gmail_sync');
      return;
    }
    setRecorteStates(prev => {
      const current = prev[serviceId] || { status: 'desconectado', lastUpdated: null, error: null, isLoading: false };
      return {
        ...prev,
        [serviceId]: { ...current, isLoading: true, error: null }
      };
    });
    addSystemLog('info', `Sincronizando ${serviceName} via Gmail...`, 'gmail_sync');
    try {
      const res = await fetch("/api/recorte-digital/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, serviceId })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte sua conta Google novamente.', 'gmail_sync');
        }
        throw new Error(data.message || data.error || "Erro de conexão.");
      }
      setRecorteStates(prev => ({
        ...prev,
        [serviceId]: {
          status: 'conectado',
          lastUpdated: new Date().toLocaleString('pt-BR'),
          totalCount: data.count || 0,
          unreadCount: data.unreadCount || 0,
          newestSubject: data.newestSubject || "Nenhum e-mail recente",
          newestDate: data.newestDate || null,
          error: null,
          isLoading: false
        }
      }));
      addSystemLog('success', `Integração com ${serviceName} atualizada com sucesso.`, 'gmail_sync');
    } catch (err: any) {
      setRecorteStates(prev => ({
        ...prev,
        [serviceId]: {
          status: 'erro',
          lastUpdated: new Date().toLocaleString('pt-BR'),
          error: err.message,
          isLoading: false
        }
      }));
      addSystemLog('error', `Falha de integração ${serviceName}: ${err.message}`, 'gmail_sync');
    }
  };

  // --- Prius & Recorte Digital Conferidor Frontend Actions ---
  const handleSyncPriusConferidor = async () => {
    let token = cachedToken || localStorage.getItem('boss_gmail_token');
    if (!token) {
      addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte com o Google novamente.', 'gmail_sync');
      return;
    }
    setPriusSyncing(true);
    addSystemLog('info', 'Processando e-mail Prius e desmembrando em publicações...', 'gmail_sync');
    try {
      const res = await fetch("/api/prius/conferidor/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida.', 'gmail_sync');
        }
        throw new Error(data.message || data.error || "Erro ao processar e-mail Prius.");
      }
      
      setPriusSession({
        emailSubject: data.emailSubject,
        gmailMessageId: data.gmailMessageId,
        publications: data.publications,
        lastSync: new Date().toLocaleString('pt-BR')
      });
      setPriusSelectedIdx(data.publications && data.publications.length > 0 ? 0 : null);
      addSystemLog('success', `Varredura concluída! ${data.publications?.length || 0} publicações desmembradas para o Prius.`, 'gmail_sync');
    } catch (err: any) {
      addSystemLog('error', `Erro na conferência Prius: ${err.message}`, 'gmail_sync');
    } finally {
      setPriusSyncing(false);
    }
  };

  const handleSyncRecorteConferidor = async (serviceId: string, serviceName: string) => {
    let token = cachedToken || localStorage.getItem('boss_gmail_token');
    if (!token) {
      addSystemLog('warning', 'Sessão Google expirada ou inválida. Por favor, conecte com o Google novamente.', 'gmail_sync');
      return;
    }
    setRecorteSyncing(prev => ({ ...prev, [serviceId]: true }));
    addSystemLog('info', `Processando e-mail do ${serviceName} e desmembrando em publicações...`, 'gmail_sync');
    try {
      const res = await fetch("/api/recorte-digital/conferidor/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, serviceId })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "UNAUTHENTICATED") {
          setCachedToken(null);
          localStorage.removeItem('boss_gmail_token');
          addSystemLog('warning', 'Sessão Google expirada ou inválida.', 'gmail_sync');
        }
        throw new Error(data.message || data.error || `Erro ao processar e-mail ${serviceName}.`);
      }

      setRecorteSessions(prev => ({
        ...prev,
        [serviceId]: {
          emailSubject: data.emailSubject,
          gmailMessageId: data.gmailMessageId,
          publications: data.publications,
          lastSync: new Date().toLocaleString('pt-BR')
        }
      }));
      setRecorteSelectedIdx(data.publications && data.publications.length > 0 ? 0 : null);
      addSystemLog('success', `Varredura concluída! ${data.publications?.length || 0} publicações desmembradas para o ${serviceName}.`, 'gmail_sync');
    } catch (err: any) {
      addSystemLog('error', `Erro na conferência ${serviceName}: ${err.message}`, 'gmail_sync');
    } finally {
      setRecorteSyncing(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleModifyEmailStatus = async (gmailMessageId: string, removeLabelIds: string[], actionName: string) => {
    let token = cachedToken || localStorage.getItem('boss_gmail_token');
    if (!token) {
      addSystemLog('warning', 'Sessão Google inválida para modificar e-mail.', 'gmail_sync');
      return;
    }
    if (!gmailMessageId) {
      addSystemLog('warning', 'Nenhum e-mail carregado para realizar esta ação.', 'gmail_sync');
      return;
    }

    try {
      const res = await fetch("/api/gmail-messages/batch-modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          messageIds: [gmailMessageId],
          removeLabelIds
        })
      });
      if (res.ok) {
        addSystemLog('success', `E-mail original: ${actionName} com sucesso no Gmail!`, 'gmail_sync');
      } else {
        const err = await res.json();
        throw new Error(err.error || "Erro desconhecido ao modificar.");
      }
    } catch (err: any) {
      addSystemLog('error', `Falha ao ${actionName.toLowerCase()} e-mail: ${err.message}`, 'gmail_sync');
    }
  };

  const handleGenerateConferidorReport = (publications: any[], sourceTitle: string) => {
    if (!publications || publications.length === 0) {
      addSystemLog('warning', 'Nenhuma publicação carregada para gerar relatório.', 'gmail_sync');
      return;
    }

    const total = publications.length;
    const pending = publications.filter(p => p.status === 'Pendente').length;
    const conferred = publications.filter(p => p.status === 'Conferida').length;
    const delegated = publications.filter(p => p.status === 'Delegada').length;
    const ignored = publications.filter(p => p.status === 'Ignorada').length;
    const duplicates = publications.filter(p => p.status === 'Duplicada').length;

    const reportContent = `
========================================
RELATÓRIO DE CONFERÊNCIA - ${sourceTitle.toUpperCase()}
Gerado em: ${new Date().toLocaleString('pt-BR')}
========================================

ESTATÍSTICAS GERAIS:
- Total de Publicações: ${total}
- Conferidas sem Prazo: ${conferred}
- Delegadas (com Prazo no Todoist): ${delegated}
- Ignoradas / Sem Ação: ${ignored}
- Duplicadas Identificadas: ${duplicates}
- Pendentes de Análise: ${pending}

DETALHAMENTO DE ITENS CONFERIDOS E DELEGADOS:
${publications.map((p, idx) => {
  return `\n[${idx + 1}/${total}] Processo CNJ: ${p.cnj || 'Não identificado'}
- Tribunal/Órgão: ${p.tribunal || 'N/A'} - ${p.orgao || 'N/A'}
- Cliente: ${p.cliente || 'Não informado'}
- Status: ${p.status}
- Data Divulgação/Publicação: ${p.dataDivulgacao || p.dataPublicacao || 'N/A'}
${p.todoistTaskId ? `- ID Tarefa Todoist: ${p.todoistTaskId}\n- Link Todoist: https://todoist.com/showTask?id=${p.todoistTaskId}` : ''}
`;
}).join('')}
========================================
BOSS JUDICIAL - CONTROLADORIA INTELIGENTE
`;

    // Download file
    const element = document.createElement("a");
    const file = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `relatorio-conferencia-${sourceTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addSystemLog('success', 'Relatório de conferência exportado com sucesso!', 'gmail_sync');
  };

  const [delegationTitle, setDelegationTitle] = useState('');
  const [delegationDesc, setDelegationDesc] = useState('');
  const [delegationDate, setDelegationDate] = useState('');
  const [delegationPriority, setDelegationPriority] = useState(2);
  const [delegationLabels, setDelegationLabels] = useState<string[]>([]);
  const [delegationSubtasks, setDelegationSubtasks] = useState<string[]>([
    "Protocolar no prazo de segurança",
    "Atualizar sistema interno",
    "Notificar o cliente principal"
  ]);
  const [delegationComment, setDelegationComment] = useState('');

  const prefillDelegationForm = (pub: any) => {
    if (!pub) return;
    setDelegationTitle(`PRAZO: ${pub.cnj || 'Sem CNJ'} - ${pub.cliente || 'Sem cliente'} (${pub.tribunal || 'Tribunal'})`);
    setDelegationDesc(`Publicado em: ${pub.dataPublicacao || pub.dataDivulgacao}\nTribunal: ${pub.tribunal}\nÓrgão: ${pub.orgao}\nCliente: ${pub.cliente}`);
    setDelegationDate('');
    setDelegationComment(`Segue teor integral da publicação para conferência:\n\n${pub.textClean}`);
    
    // Auto-search in Todoist
    if (todoistToken && pub.cnj) {
      searchTodoistTasks({ processNumber: pub.cnj }, todoistToken);
    }
  };

  useEffect(() => {
    if (activeTab === 'consulta.prius' && priusSession && priusSelectedIdx !== null) {
      const pub = priusSession.publications[priusSelectedIdx];
      if (pub) prefillDelegationForm(pub);
    }
  }, [priusSelectedIdx, activeTab]);

  useEffect(() => {
    if (activeTab === 'consulta.recorte-digital' && activeRecorteServiceId) {
      const session = recorteSessions[activeRecorteServiceId];
      if (session && recorteSelectedIdx !== null) {
        const pub = session.publications[recorteSelectedIdx];
        if (pub) prefillDelegationForm(pub);
      }
    }
  }, [recorteSelectedIdx, activeRecorteServiceId, activeTab]);

  const handleConfirmDelegation = async (source: 'prius' | 'recorte') => {
    if (!todoistToken) {
      addSystemLog('warning', 'Token de API do Todoist não configurado.');
      return;
    }

    const session = source === 'prius' ? priusSession : recorteSessions[activeRecorteServiceId];
    const idx = source === 'prius' ? priusSelectedIdx : recorteSelectedIdx;
    if (!session || idx === null) return;
    
    const pub = session.publications[idx];
    if (!pub) return;

    setTodoistSyncing(true);
    try {
      // 1. Create primary task
      const taskPayload: any = {
        content: delegationTitle,
        description: delegationDesc,
        priority: delegationPriority,
        labels: [...delegationLabels, 'prazo-judicial', source],
      };
      if (todoistTaskProject) taskPayload.project_id = todoistTaskProject;
      if (todoistTaskSection) taskPayload.section_id = todoistTaskSection;
      if (delegationDate) taskPayload.due_date = delegationDate;

      const createRes = await fetch("/api/todoist/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-todoist-token": todoistToken
        },
        body: JSON.stringify(taskPayload)
      });

      if (!createRes.ok) {
        throw new Error(`Erro ao criar tarefa: ${await createRes.text()}`);
      }

      const createdTask = await createRes.json();
      const taskId = createdTask.id;
      const taskUrl = createdTask.url || `https://todoist.com/showTask?id=${taskId}`;

      // 2. Add description / content comment
      if (delegationComment) {
        await fetch("/api/todoist/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-todoist-token": todoistToken
          },
          body: JSON.stringify({
            task_id: taskId,
            content: delegationComment
          })
        });
      }

      // 3. Create subtasks
      for (const sub of delegationSubtasks) {
        if (!sub.trim()) continue;
        await fetch("/api/todoist/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-todoist-token": todoistToken
          },
          body: JSON.stringify({
            content: sub,
            parent_id: taskId,
            project_id: todoistTaskProject
          })
        });
      }

      // 4. Save link in boss_cnj_todoist_links
      const cleanCnj = (pub.cnj || '').replace(/\s+/g, '');
      if (cleanCnj) {
        const savedLinksRaw = localStorage.getItem('boss_cnj_todoist_links');
        const savedLinks = savedLinksRaw ? JSON.parse(savedLinksRaw) : {};
        savedLinks[cleanCnj] = taskId;
        localStorage.setItem('boss_cnj_todoist_links', JSON.stringify(savedLinks));
      }

      // 5. Update publication status in state
      const updatedPubs = [...session.publications];
      updatedPubs[idx] = {
        ...pub,
        status: 'Delegada',
        todoistTaskId: taskId,
        todoistTaskUrl: taskUrl
      };

      if (source === 'prius') {
        setPriusSession({ ...session, publications: updatedPubs });
        addSystemLog('success', `Prazo delegado com sucesso! Tarefa vinculada criada no Todoist.`, 'gmail_sync');
        // Advance to next pending item
        const nextPending = updatedPubs.findIndex((p, i) => i > idx && p.status === 'Pendente');
        if (nextPending !== -1) {
          setPriusSelectedIdx(nextPending);
        } else {
          const firstPending = updatedPubs.findIndex(p => p.status === 'Pendente');
          if (firstPending !== -1) setPriusSelectedIdx(firstPending);
        }
      } else {
        setRecorteSessions(prev => ({
          ...prev,
          [activeRecorteServiceId]: {
            ...session,
            publications: updatedPubs
          }
        }));
        addSystemLog('success', `Prazo delegado com sucesso! Tarefa vinculada criada no Todoist.`, 'gmail_sync');
        // Advance to next pending item
        const nextPending = updatedPubs.findIndex((p, i) => i > idx && p.status === 'Pendente');
        if (nextPending !== -1) {
          setRecorteSelectedIdx(nextPending);
        } else {
          const firstPending = updatedPubs.findIndex(p => p.status === 'Pendente');
          if (firstPending !== -1) setRecorteSelectedIdx(firstPending);
        }
      }

    } catch (err: any) {
      addSystemLog('error', `Falha ao delegar prazo: ${err.message}`, 'gmail_sync');
    } finally {
      setTodoistSyncing(false);
    }
  };

  const handleActionNoDeadline = (source: 'prius' | 'recorte', status: 'Conferida' | 'Ignorada' | 'Duplicada' | 'Revisar depois' | 'Delegada') => {
    const session = source === 'prius' ? priusSession : recorteSessions[activeRecorteServiceId];
    const idx = source === 'prius' ? priusSelectedIdx : recorteSelectedIdx;
    if (!session || idx === null) return;

    const pub = session.publications[idx];
    if (!pub) return;

    const updatedPubs = [...session.publications];
    updatedPubs[idx] = {
      ...pub,
      status: status
    };

    if (source === 'prius') {
      setPriusSession({ ...session, publications: updatedPubs });
      addSystemLog('success', `Publicação marcada como "${status}" com sucesso.`, 'gmail_sync');
      
      // Auto-advance
      const nextPending = updatedPubs.findIndex((p, i) => i > idx && p.status === 'Pendente');
      if (nextPending !== -1) {
        setPriusSelectedIdx(nextPending);
      } else {
        const firstPending = updatedPubs.findIndex(p => p.status === 'Pendente');
        if (firstPending !== -1) setPriusSelectedIdx(firstPending);
      }
    } else {
      setRecorteSessions(prev => ({
        ...prev,
        [activeRecorteServiceId]: {
          ...session,
          publications: updatedPubs
        }
      }));
      addSystemLog('success', `Publicação marcada como "${status}" com sucesso.`, 'gmail_sync');
      
      // Auto-advance
      const nextPending = updatedPubs.findIndex((p, i) => i > idx && p.status === 'Pendente');
      if (nextPending !== -1) {
        setRecorteSelectedIdx(nextPending);
      } else {
        const firstPending = updatedPubs.findIndex(p => p.status === 'Pendente');
        if (firstPending !== -1) setRecorteSelectedIdx(firstPending);
      }
    }
  };

  // --- End Prius & Recorte Digital Conferidor Frontend Actions ---

  // General Sincronização Automática - Background & Progressive & Parallelized
  const triggerGeneralUpdate = async () => {
    if (!cachedToken) {
      addSystemLog('warning', 'Não foi possível iniciar a atualização geral automática: Necessário conectar ao Google.');
      return;
    }

    setIsGeneralUpdating(true);
    addSystemLog('info', 'Iniciando varredura e sincronização automática de todas as fontes jurídicas em segundo plano...', 'gmail_sync');

    const services = [
      { id: 'oab-mg', name: 'Recorte Digital OAB/MG' },
      { id: 'rj', name: 'Recorte Digital RJ' },
      { id: 'ceara', name: 'Recorte Digital Ceará' },
      { id: 'sao-paulo', name: 'Recorte Digital São Paulo' }
    ];

    // Fire all requests concurrently (Parallel) and progressively update without blocking
    Promise.allSettled([
      fetchAllPushes(),
      syncPrius(),
      ...services.map(service => syncRecorteService(service.id, service.name))
    ]).then(() => {
      setIsGeneralUpdating(false);
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastUpdateCompletedAt(nowTime);
      addSystemLog('success', 'Varredura de atualização geral concluída em segundo plano.', 'gmail_sync');
    }).catch((err) => {
      console.error(err);
      setIsGeneralUpdating(false);
      addSystemLog('warning', 'Varredura concluída com alguns avisos ou falhas nas conexões.', 'gmail_sync');
    });
  };

  // Trigger general update on first successful authorization (with small safety delay to render layout first)
  useEffect(() => {
    if (user && user.email === 'direito.rgr@gmail.com' && cachedToken && !hasAutoUpdated) {
      setHasAutoUpdated(true);
      const timer = setTimeout(() => {
        triggerGeneralUpdate();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, cachedToken, hasAutoUpdated]);

  // Synchronize global email stats on token mount/change
  useEffect(() => {
    if (cachedToken) {
      syncGlobalGmailStats(cachedToken);
    }
  }, [cachedToken]);

  // Trigger loading of grouped pushes when entering a specific push sub-dashboard
  useEffect(() => {
    if (activeTab.startsWith('pushes/push-')) {
      const isControladoriaWorkspace = activeTab.endsWith('/atualizar-controladoria');
      const subRouteId = isControladoriaWorkspace 
        ? activeTab.replace('pushes/push-', '').replace('/atualizar-controladoria', '') 
        : activeTab.replace('pushes/push-', '');
      const source = PUSH_SOURCES.find(s => s.id === subRouteId);
      if (source) {
        if (lastActivePushSourceIdRef.current !== source.id) {
          lastActivePushSourceIdRef.current = source.id;
          setGroupedPushes(null);
          setGroupedPushesSearch('');
          setGroupedPushesPage(1);
          setExpandedGroupCNJ(null);
          fetchGroupedPushes(source.sender, 1, '');
        }
      }
    } else {
      lastActivePushSourceIdRef.current = null;
    }
  }, [activeTab, cachedToken]);

  // Trigger loading of Prius on-demand when entering its tab
  useEffect(() => {
    if (activeTab === 'consulta.prius' && cachedToken && priusState.status === 'desconectado' && !priusState.isLoading) {
      syncPrius();
    }
  }, [activeTab, cachedToken, priusState.status, priusState.isLoading]);

  // Trigger loading of Recorte Digital services on-demand when entering its tab
  useEffect(() => {
    if (activeTab === 'consulta.recorte-digital' && cachedToken) {
      const services = [
        { id: 'oab-mg', name: 'Recorte Digital OAB/MG' },
        { id: 'rj', name: 'Recorte Digital RJ' },
        { id: 'ceara', name: 'Recorte Digital Ceará' },
        { id: 'sao-paulo', name: 'Recorte Digital São Paulo' }
      ];
      services.forEach(service => {
        const sState = recorteStates[service.id];
        if (!sState || (sState.status === 'desconectado' && !sState.isLoading)) {
          syncRecorteService(service.id, service.name);
        }
      });
    }
  }, [activeTab, cachedToken, recorteStates]);

  // Sync Gmail (scans Gmail inbox via server proxy)
  const syncGmailInbox = async () => {
    let token = cachedToken;
    if (!token) {
      token = localStorage.getItem('boss_gmail_token');
      if (token) {
        setCachedToken(token);
      }
    }
    if (!token) {
      addSystemLog('warning', 'Acesso ao Gmail expirado ou não fornecido para varrer caixa de entrada. Por favor, conecte sua conta Google.', 'gmail_sync');
      return;
    }

    setIsSyncingGmail(true);
    setGmailError(null);
    setGmailSyncResults([]);
    addSystemLog('info', 'Iniciando busca automatizada por intimações em sua caixa do Gmail...', 'gmail_sync');

    try {
      const res = await fetch("/api/gmail-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro desconhecido na sincronização.");
      }

      const data = await res.json();
      setGmailSyncResults(data.publications || []);
      
      if (data.publications && data.publications.length > 0) {
        addSystemLog('success', `Varredura concluída. Encontradas ${data.publications.length} possíveis publicações jurídicas com IA no Gmail.`, 'gmail_sync');
      } else {
        addSystemLog('warning', 'Nenhum e-mail de intimação novo foi identificado na varredura recente.', 'gmail_sync');
      }
    } catch (err: any) {
      console.error("Erro sync Gmail:", err);
      setGmailError(err.message);
      addSystemLog('error', `Erro na sincronização Gmail: ${err.message}`, 'gmail_sync');
    } finally {
      setIsSyncingGmail(false);
    }
  };

  // Import one Gmail publication
  const importGmailPublication = async (pub: Publication) => {
    try {
      const preparedPub = {
        ...pub,
        userId: user?.uid || 'demo-user',
        id: `gmail-imp-${Date.now()}`
      };

      if (user) {
        const docRef = await addDoc(collection(db, "publications"), preparedPub);
        preparedPub.id = docRef.id;
      }

      setPublications(prev => [preparedPub, ...prev]);
      setGmailSyncResults(prev => prev.filter(p => p.id !== pub.id));
      addSystemLog('success', `Publicação do Processo ${pub.processNumber} importada do Gmail e registrada.`);
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Erro ao importar publicação: ${err.message}`);
    }
  };

  // Import all scanned Gmail publications
  const importAllGmailPublications = async () => {
    if (gmailSyncResults.length === 0) return;
    
    try {
      const listToImport = [...gmailSyncResults];
      
      if (user) {
        const batch = writeBatch(db);
        const preparedList = listToImport.map(pub => {
          const docRef = doc(collection(db, "publications"));
          const prepared = { ...pub, userId: user.uid, id: docRef.id };
          batch.set(docRef, prepared);
          return prepared;
        });
        await batch.commit();
        setPublications(prev => [...preparedList, ...prev]);
      } else {
        const preparedList = listToImport.map(pub => ({
          ...pub,
          id: `gmail-imp-${Math.random()}`,
          userId: 'demo-user'
        }));
        setPublications(prev => [...preparedList, ...prev]);
      }

      addSystemLog('success', `Sucesso! ${listToImport.length} publicações importadas em lote para a central jurídica.`);
      setGmailSyncResults([]);
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha na importação em lote: ${err.message}`);
    }
  };

  // Manual Creation (using Gemini AI for automatic parsing)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContent.trim()) return;

    setIsAnalyzing(true);
    addSystemLog('info', 'Analisando teor da publicação manualmente colada utilizando inteligência artificial...');

    try {
      const res = await fetch("/api/analyze-publication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: manualContent,
          subpoenaDate: manualSubpoenaDate
        })
      });

      if (!res.ok) {
        throw new Error("Erro de processamento da API de análise.");
      }

      const parsedData = await res.json();
      
      const newPub: Publication = {
        id: `manual-${Date.now()}`,
        processNumber: manualProcessNumber || parsedData.processNumber,
        title: parsedData.title,
        content: manualContent,
        source: "manual",
        category: parsedData.category,
        urgencyLevel: parsedData.urgencyLevel,
        subpoenaDate: parsedData.subpoenaDate,
        deadlineDays: parsedData.deadlineDays,
        dueDate: parsedData.dueDate,
        actionRequired: parsedData.actionRequired,
        status: "pendente",
        userId: user?.uid || "demo-user",
        createdAt: new Date().toISOString()
      };

      if (user) {
        const docRef = await addDoc(collection(db, "publications"), newPub);
        newPub.id = docRef.id;
      }

      setPublications(prev => [newPub, ...prev]);
      addSystemLog('success', `Nova intimação categorizada como '${newPub.category}' registrada com sucesso.`);
      
      // Clear forms
      setManualContent('');
      setManualProcessNumber('');
      setActiveTab('publications');
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao analisar publicação: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Simulation: posting legacy publication to server API to test endpoints live!
  const simulateLegacyApiPost = async () => {
    setIsSimulatingApi(true);
    addSystemLog('info', 'Simulando requisição de sistema legado contendo publicação...', 'api_received');
    
    try {
      const defaultToken = apiTokens[0]?.token || "BOSS_LEGACY_INTEGRATION_TOKEN_DEFAULT";
      const response = await fetch("/api/legacy/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: defaultToken,
          processNumber: simApiProcess,
          title: simApiTitle,
          content: simApiContent,
          subpoenaDate: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro ao postar na API legada.");
      }

      const responseData = await response.json();
      
      // Since it's stored in the server, let's also pull it into the frontend local state
      const syncedPub = {
        ...responseData.publication,
        userId: user?.uid || 'demo-user'
      };

      if (user) {
        const docRef = await addDoc(collection(db, "publications"), syncedPub);
        syncedPub.id = docRef.id;
      }

      setPublications(prev => [syncedPub, ...prev]);
      addSystemLog('success', `API Integração: Novo processo ${syncedPub.processNumber} postado via API externa e integrado automaticamente com IA.`, 'api_received');
      setActiveTab('publications');

    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Simulação de API falhou: ${err.message}`, 'api_received');
    } finally {
      setIsSimulatingApi(false);
    }
  };

  // Generate new integration token
  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenSystemName.trim()) return;

    try {
      const res = await fetch("/api/legacy/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenSystemName })
      });

      if (res.ok) {
        const data = await res.json();
        const newToken: ApiToken = {
          id: `tok-${Date.now()}`,
          token: data.token,
          name: tokenSystemName,
          userId: user?.uid || 'demo-user',
          createdAt: data.createdAt
        };
        setApiTokens(prev => [...prev, newToken]);
        addSystemLog('success', `Novo Token de integração gerado para '${tokenSystemName}'.`);
        setTokenSystemName('');
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Erro ao gerar token: ${err.message}`);
    }
  };

  // Update status (e.g., concluidos, arquivados)
  const handleUpdateStatus = async (pubId: string, newStatus: 'pendente' | 'concluido' | 'arquivado') => {
    try {
      const updatedList = publications.map(pub => {
        if (pub.id === pubId) {
          return { ...pub, status: newStatus };
        }
        return pub;
      });

      if (user && !pubId.startsWith('pub-') && !pubId.startsWith('gmail-') && !pubId.startsWith('legacy-')) {
        const pubRef = doc(db, "publications", pubId);
        await updateDoc(pubRef, { status: newStatus });
      }

      setPublications(updatedList);
      
      const match = updatedList.find(p => p.id === pubId);
      if (match) {
        addSystemLog('info', `Status do Processo ${match.processNumber} alterado para '${newStatus}'.`, 'status_change');
        if (selectedPub && selectedPub.id === pubId) {
          setSelectedPub({ ...selectedPub, status: newStatus });
        }
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Falha ao atualizar status da publicação: ${err.message}`);
    }
  };

  // Delete publication
  const handleDeletePub = async (pubId: string) => {
    if (!confirm("Deseja realmente remover esta intimação?")) return;
    try {
      if (user && !pubId.startsWith('pub-') && !pubId.startsWith('gmail-') && !pubId.startsWith('legacy-')) {
        await deleteDoc(doc(db, "publications", pubId));
      }
      setPublications(prev => prev.filter(p => p.id !== pubId));
      addSystemLog('warning', `Publicação jurídica removida com sucesso.`);
      if (selectedPub?.id === pubId) {
        setSelectedPub(null);
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog('error', `Erro ao deletar: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations for dashboard
  const activePublications = publications.filter(p => {
    const matchesSearch = p.processNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: publications.length,
    pending: publications.filter(p => p.status === 'pendente' && isActuallyPending(p, publications)).length,
    urgent: publications.filter(p => p.urgencyLevel === 'alta' && p.status === 'pendente' && isActuallyPending(p, publications)).length,
    completed: publications.filter(p => p.status === 'concluido').length,
    gmailSynced: publications.filter(p => p.source === 'gmail').length,
  };

  // Calculations for Gmail Explorer
  const filteredMessages = explorerMessages.filter(m => {
    // 1. Search filter
    if (explorerSearch.trim()) {
      const q = explorerSearch.toLowerCase();
      const matchSearch = 
        m.subject?.toLowerCase().includes(q) ||
        m.snippet?.toLowerCase().includes(q) ||
        m.bodyText?.toLowerCase().includes(q) ||
        m.from?.toLowerCase().includes(q) ||
        m.processNumber?.toLowerCase().includes(q) ||
        m.autor?.toLowerCase().includes(q) ||
        m.reu?.toLowerCase().includes(q) ||
        m.tribunal?.toLowerCase().includes(q);
      
      if (!matchSearch) return false;
    }

    // 2. Quick filter
    if (explorerQuickFilter === 'unread') return m.isUnread;
    if (explorerQuickFilter === 'read') return !m.isUnread;
    if (explorerQuickFilter === 'hasAttachments') return m.hasAttachments;
    
    if (explorerQuickFilter === '24h') {
      return Date.now() - new Date(m.date).getTime() < 24 * 60 * 60 * 1000;
    }
    if (explorerQuickFilter === '7d') {
      return Date.now() - new Date(m.date).getTime() < 7 * 24 * 60 * 60 * 1000;
    }
    if (explorerQuickFilter === '30d') {
      return Date.now() - new Date(m.date).getTime() < 30 * 24 * 60 * 60 * 1000;
    }

    return true;
  });

  const sortedMessages = [...filteredMessages].sort((a, b) => {
    if (explorerSortKey === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (explorerSortKey === 'sender') {
      return (a.from || '').localeCompare(b.from || '');
    }
    if (explorerSortKey === 'process') {
      return (a.processNumber || '').localeCompare(b.processNumber || '');
    }
    if (explorerSortKey === 'tribunal') {
      return (a.tribunal || '').localeCompare(b.tribunal || '');
    }
    return 0;
  });

  if (activeTab === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

          <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <div className="w-7 h-7 border-4 border-white rotate-45"></div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold tracking-tight text-white leading-none">
                  PORTAL<span className="text-blue-500">BOSS</span>
                </span>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2 font-mono">
                  Administrador Jurídico Inteligente
                </span>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-bold tracking-tight text-slate-100">Controle de Ingressos</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Sistema integrado de varredura automatizada, conferência inteligente e classificação com Inteligência Artificial em tempo real.
                </p>
              </div>

              {loginError && (
                <div className="bg-red-950/50 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs flex items-start gap-2.5 animate-pulse">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{loginError}</span>
                </div>
              )}

              <button
                id="btn-login-google"
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition shadow-lg hover:shadow-white/10 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Entrar com Conta do Google
              </button>

              <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 text-[10px] text-slate-500 text-center leading-normal">
                <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider">Aviso de Segurança</span>
                O Portal BOSS utiliza o fluxo oficial de login do Google. Nós **não** solicitamos, armazenamos ou visualizamos a sua senha do Gmail.
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-600">
              Desenvolvido exclusivamente para direito.rgr@gmail.com.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-500 selection:text-white text-slate-800">
      {/* Top Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
                <div className="w-4 h-4 border-2 border-white rotate-45"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                  PORTAL<span className="text-blue-600">BOSS</span>
                </span>
                <span className="text-[9px] text-blue-600 block mt-0.5 font-mono tracking-wider leading-none">
                  ADMINISTRADOR JURÍDICO AI
                </span>
              </div>
            </div>

            {/* Global Search Bar (Syncs with state) */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar processos ou OAB..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-100 border-none rounded-md py-2 pl-10 pr-4 w-64 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden lg:block text-right">
                    <span className="block text-xs font-semibold text-slate-900">{user.email}</span>
                    {cachedToken ? (
                      <span className="text-[10px] text-emerald-600 font-mono">FIRESTORE & GMAIL ATIVOS</span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-mono">GMAIL DESCONECTADO</span>
                    )}
                  </div>
                  <div className="h-9 w-9 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center font-bold text-sm text-blue-700">
                    {user.email?.[0].toUpperCase() || "A"}
                  </div>
                  {!cachedToken && (
                    <button
                      id="btn-auth-reconnect"
                      onClick={handleGoogleLogin}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                      title="Reconectar sua Conta Google para sincronizar o Gmail"
                    >
                      <RefreshCw className="h-3 w-3 animate-pulse" />
                      Conectar Gmail
                    </button>
                  )}
                  <button 
                    id="btn-auth-logout"
                    onClick={handleSignOut}
                    title="Sair da conta"
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-auth-login"
                  onClick={handleGoogleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-md transition flex items-center gap-2 shadow-sm"
                >
                  <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.74-.08-1.3-.176-1.85h-10.617z"/>
                  </svg>
                  Conectar Google
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation bottom bar */}
      <div className="md:hidden bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 shadow-lg flex justify-around">
        <button 
          onClick={() => handleTabChange('dashboard')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Scale className="h-4 w-4 mb-0.5" />
          Início
        </button>
        <button 
          onClick={() => handleTabChange('publications')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'publications' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileText className="h-4 w-4 mb-0.5" />
          Processos
        </button>
        <button 
          onClick={() => handleTabChange('pushes')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab.startsWith('pushes') ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Inbox className="h-4 w-4 mb-0.5" />
          Pushes
        </button>
        <button 
          onClick={() => handleTabChange('configuracoes.gmail')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'configuracoes.gmail' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Settings className="h-4 w-4 mb-0.5" />
          Configurações
        </button>
      </div>

      {/* Main layout frame with fixed sidebar + scrolling content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Navigation (Geometric Balance style) */}
        <nav className="hidden md:flex w-60 bg-white border-r border-slate-200 flex-col p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Centro de Comando</p>
              
              <button 
                id="btn-nav-sidebar-dashboard-principal"
                onClick={() => handleTabChange('dashboard-principal')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'dashboard-principal' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'dashboard-principal' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Dashboard Principal
              </button>

              <button 
                id="btn-nav-sidebar-central-emails"
                onClick={() => handleTabChange('central-emails')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'central-emails' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'central-emails' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Central Global de Emails
              </button>

              <button 
                id="btn-nav-sidebar-intensivo-gmail"
                onClick={() => handleTabChange('intensivo-gmail')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'intensivo-gmail' 
                    ? 'bg-blue-50 text-amber-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'intensivo-gmail' ? 'bg-amber-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Intensivo Gmail Zero (30m)
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Controladoria & BI</p>
              
              <button 
                id="btn-nav-sidebar-dashboard"
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Dashboard de Publicações
              </button>

              <button 
                id="btn-nav-sidebar-bi"
                onClick={() => handleTabChange('bi-dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'bi-dashboard' 
                    ? 'bg-blue-50 text-indigo-700 font-bold border-l-2 border-l-indigo-600 pl-2' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'bi-dashboard' ? 'bg-indigo-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Legal Operations BI
              </button>

              <button 
                id="btn-nav-sidebar-publications"
                onClick={() => handleTabChange('publications')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'publications' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'publications' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Processos & PJE
              </button>

              <button 
                id="btn-nav-sidebar-deadlines"
                onClick={() => handleTabChange('deadlines')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'deadlines' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'deadlines' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Central de Prazos
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Controladoria & Consultas</p>

              <button 
                id="btn-nav-sidebar-pushes"
                onClick={() => handleTabChange('pushes')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab.startsWith('pushes') 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab.startsWith('pushes') ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Pushes (Tribunais)
              </button>

              <button 
                id="btn-nav-sidebar-prius"
                onClick={() => handleTabChange('consulta.prius')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'consulta.prius' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'consulta.prius' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Consulta Prius
              </button>

              <button 
                id="btn-nav-sidebar-recorte"
                onClick={() => handleTabChange('consulta.recorte-digital')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'consulta.recorte-digital' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'consulta.recorte-digital' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Consulta Recorte Digital
              </button>

              <button 
                id="btn-nav-sidebar-djen"
                onClick={() => handleTabChange('consulta.djen')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'consulta.djen' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'consulta.djen' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Painel DJEN Nacional
              </button>

              <button 
                id="btn-nav-sidebar-configuracoes"
                onClick={() => handleTabChange('configuracoes.gmail')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'configuracoes.gmail' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'configuracoes.gmail' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Configurações
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-900 rounded-xl text-white">
              <p className="text-[10px] opacity-70 uppercase tracking-wider">API Status</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-xs font-medium">Sistemas Conectados</p>
              </div>
            </div>

            <button
              id="btn-sidebar-logout"
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 rounded-xl border border-red-100 transition active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sair do Sistema
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </nav>

        {/* Scrollable Main Content Pane */}
        <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto mb-16 md:mb-0">
        
        {/* Banner Informando status do Firebase */}
        {!user && (
          <div className="mb-6 bg-slate-900 border-l-4 border-indigo-500 rounded-r-xl p-4 shadow-md text-white flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Painel de Demonstração Interativo</h4>
                <p className="text-xs text-slate-300">Você está utilizando dados de simulação locais. Conecte sua conta Google no topo para ativar a persistência em tempo real no Firestore e sincronização real com o Gmail.</p>
              </div>
            </div>
            <button
              onClick={handleGoogleLogin}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium px-4 py-2 rounded-lg transition shrink-0"
            >
              Ativar Nuvem & Gmail
            </button>
          </div>
        )}

        {/* Legal Operations BI Dashboard Tab */}
        {activeTab === 'bi-dashboard' && (
          <div className="animate-fade-in space-y-6">
            <LegalOpsBIDashboard
              publications={publications}
              systemLogs={systemLogs}
              pushesData={pushesData}
              addSystemLog={addSystemLog}
              externalEvents={systemEvents}
              onAddExternalEvent={(ev) => setSystemEvents(prev => [
                { id: `live-event-${Date.now()}-${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toISOString(), ...ev },
                ...prev
              ])}
            />
          </div>
        )}

        {/* 0.1 TAB: DASHBOARD PRINCIPAL */}
        {activeTab === 'dashboard-principal' && (
          <DashboardPrincipalView 
            emailRules={emailRules}
            globalStats={globalEmailStats}
            publications={publications}
            onTabChange={handleTabChange}
            cachedToken={cachedToken}
            onTriggerSync={triggerGeneralUpdate}
            syncLoading={isGeneralUpdating}
            onForceSyncStats={() => syncGlobalGmailStats(cachedToken, true)}
            statsLoading={isEmailStatsLoading}
          />
        )}

        {/* 0.2 TAB: CENTRAL GLOBAL DE EMAILS */}
        {activeTab === 'central-emails' && (
          <CentralGlobalEmailsView 
            cachedToken={cachedToken}
            emailRules={emailRules}
            onRulesUpdated={setEmailRules}
            userId={user ? user.uid : "demo-user"}
            onAddSystemLog={(status, message, type) => addSystemLog(status, message, type || 'manual_add')}
            onIncrementStats={(archived, deleted) => setGlobalEmailStats(prev => ({
              ...prev,
              archivedToday: prev.archivedToday + archived,
              deletedToday: prev.deletedToday + deleted,
              inboxCount: Math.max(0, prev.inboxCount - (archived + deleted))
            }))}
          />
        )}

        {/* 0.3 TAB: INTENSIVO GMAIL ZERO */}
        {activeTab === 'intensivo-gmail' && (
          <IntensivoGmailZeroView 
            cachedToken={cachedToken}
            emailRules={emailRules}
            onRulesUpdated={setEmailRules}
            onAddSystemLog={(status, message, type) => addSystemLog(status, message, type || 'manual_add')}
            onIncrementStats={(archived, deleted) => setGlobalEmailStats(prev => ({
              ...prev,
              archivedToday: prev.archivedToday + archived,
              deletedToday: prev.deletedToday + deleted,
              inboxCount: Math.max(0, prev.inboxCount - (archived + deleted))
            }))}
            onTabChange={handleTabChange}
          />
        )}

        {/* 1. TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {(() => {
              const hasBackgroundSyncError = !!pushesError || 
                                             priusState.status === 'erro' || 
                                             Object.values(recorteStates).some(r => r.status === 'erro');
              if (isGeneralUpdating) {
                return (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-blue-900 animate-pulse">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                      <div>
                        <h4 className="font-bold text-xs">Atualizando em segundo plano...</h4>
                        <p className="text-[10px] text-blue-700 mt-0.5">Sincronizando Pushes, Prius e Recorte Digital diretamente do Gmail de forma segura e paralela.</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">Segundo Plano</span>
                  </div>
                );
              }
              if (hasBackgroundSyncError) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs">Falha em uma fonte. Clique para tentar novamente.</h4>
                        <p className="text-[10px] text-amber-700 mt-0.5">Ocorreu um erro ao sincronizar uma ou mais fontes jurídicas no Gmail.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerGeneralUpdate()}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Tentar Novamente
                    </button>
                  </div>
                );
              }
              if (lastUpdateCompletedAt) {
                return (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-emerald-900">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs">Última atualização concluída às {lastUpdateCompletedAt}.</h4>
                        <p className="text-[10px] text-emerald-700 mt-0.5">Todas as fontes de dados estão sincronizadas e em conformidade.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerGeneralUpdate()}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 font-bold text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Atualizar Agora
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Visão Geral do Painel</h1>
                <p className="text-slate-500 text-sm mt-1">Controle estratégico de intimações judiciais, análise preditiva de providências com inteligência artificial e central de prazos em dias úteis (CPC).</p>
              </div>
              <button
                id="btn-quick-new-subpoena"
                onClick={() => setActiveTab('new-pub')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-5 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
              >
                <PlusCircle className="h-4 w-4" />
                Nova Publicação (Formulário)
              </button>
            </div>

            {/* Indicator Cards - Bento Grid (Always allowed side-by-side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <div 
                onClick={() => { setActiveTab('publications'); setFilterStatus('all'); }}
                className="bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-blue-600"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Publicações</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</h3>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                  <span>Todas as fontes agregadas</span>
                </p>
              </div>

              <div 
                onClick={() => { setActiveTab('publications'); setFilterStatus('pendente'); }}
                className="bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-amber-500"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prazos Ativos / Pendentes</p>
                    <h3 className="text-3xl font-bold text-amber-600 mt-2">{stats.pending}</h3>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span>Necessitam de providências</span>
                </p>
              </div>

              <div 
                onClick={() => { setActiveTab('publications'); setFilterCategory('urgente'); }}
                className="bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-red-600"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Urgentes (IA)</p>
                    <h3 className="text-3xl font-bold text-red-600 mt-2">{stats.urgent}</h3>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-xl text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                  <span>Prazos fatais identificados por IA</span>
                </p>
              </div>

              <div 
                onClick={() => { setActiveTab('gmail'); }}
                className="bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-red-500"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sincronizado Gmail</p>
                    <h3 className="text-3xl font-bold text-red-600 mt-2">{stats.gmailSynced}</h3>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-xl text-red-500">
                    <Mail className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 block"></span>
                  <span>Conexão ativa para e-mails</span>
                </p>
              </div>

              <div 
                id="btn-nav-dashboard-pushes-card"
                onClick={() => { setActiveTab('pushes'); }}
                className="bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-purple-600"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pushes Pendentes</p>
                    <h3 className="text-3xl font-bold text-purple-600 mt-2">
                      {Object.values(pushesData).reduce((sum, p) => sum + (p.unreadCount || 0), 0)}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                    <Inbox className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${Object.values(pushesData).some(p => p.unreadCount > 0) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} block`}></span>
                  <span className="font-semibold text-[10px] uppercase">
                    {Object.values(pushesData).some(p => p.unreadCount > 0) ? 'Pendente' : 'Em dia'}
                  </span>
                </p>
              </div>
            </div>



            {/* System Audit Logs Area */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 text-base">Atividades de Sincronização & Logs</h4>
                <span className="text-xs text-slate-400 font-mono">Últimas 50 operações</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                {systemLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                        log.status === 'success' ? 'bg-emerald-500' : 
                        log.status === 'warning' ? 'bg-amber-500' : 
                        log.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      <p className="text-slate-600 font-medium">{log.message}</p>
                    </div>
                    <span className="text-slate-400 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 2. TAB: PUBLICATIONS & PJE */}
        {activeTab === 'publications' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header section with print/export */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publicações & Painel PJE</h1>
                <p className="text-slate-500 text-xs mt-1">Gerenciamento, filtragem e alteração de status de intimações.</p>
              </div>
              
              {/* Action buttons (Allowed side-by-side) */}
              <div className="flex gap-2 self-start md:self-auto">
                <button
                  onClick={handlePrint}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                >
                  <Printer className="h-4 w-4 text-slate-500" />
                  Imprimir Painel
                </button>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(publications, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `BOSS_relatorio_intimacoes_${Date.now()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    addSystemLog('info', 'Relatório JSON de publicações exportado com sucesso.');
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition"
                >
                  <Download className="h-4 w-4" />
                  Exportar JSON
                </button>
              </div>
            </div>

            {/* Filter and Search Bar (Allowed side-by-side) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por processo, título ou teor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:outline-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">Filtrar:</span>
                </div>
                
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-indigo-500"
                >
                  <option value="all">Todas Categorias</option>
                  <option value="urgente">🚨 Urgente</option>
                  <option value="prazo">📅 Prazo</option>
                  <option value="audiencia">⚖️ Audiência</option>
                  <option value="informativo">ℹ️ Informativo</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-indigo-500"
                >
                  <option value="all">Todos Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="concluido">Concluído</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            </div>

            {/* Active filters summary */}
            {(filterCategory !== 'all' || filterStatus !== 'all' || searchTerm) && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Filtros ativos. Encontrados <strong>{activePublications.length}</strong> resultados de {publications.length}.</span>
                <button 
                  onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setSearchTerm(''); }}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {/* Publications List Grid / Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Publication list table/cards (Col span 7/8 depending on details side-by-side or below) */}
              <div className={`space-y-4 ${selectedPub ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
                {activePublications.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
                    <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-800 text-sm">Nenhuma publicação correspondente</h3>
                    <p className="text-slate-500 text-xs">Ajuste os filtros de busca ou sincronize novos dados para carregar novas intimações.</p>
                  </div>
                ) : (
                  [...activePublications]
                    .sort((a, b) => {
                      const checkA = checkRecentlyConferred(a, publications);
                      const checkB = checkRecentlyConferred(b, publications);
                      if (checkA.isAlreadyChecked && !checkB.isAlreadyChecked) return 1;
                      if (!checkA.isAlreadyChecked && checkB.isAlreadyChecked) return -1;
                      return 0;
                    })
                    .map((pub) => {
                      const check = checkRecentlyConferred(pub, publications);
                      return (
                        <div 
                          key={pub.id}
                          onClick={() => setSelectedPub(pub)}
                          className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 ${
                            selectedPub?.id === pub.id ? 'ring-2 ring-indigo-500 border-l-indigo-600' : 
                            pub.urgencyLevel === 'alta' ? 'border-l-red-500' : 
                            pub.urgencyLevel === 'media' ? 'border-l-amber-500' : 'border-l-slate-300'
                          } ${check.isAlreadyChecked ? 'opacity-65 bg-slate-50/70 border-l-slate-400' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {pub.processNumber}
                                </span>
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                  pub.source === 'gmail' ? 'bg-red-50 text-red-700 border border-red-100' :
                                  pub.source === 'legacy_api' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                  pub.source === 'pje' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {pub.source === 'gmail' ? 'Gmail Integration' : pub.source === 'legacy_api' ? 'Legacy API' : pub.source}
                                </span>
                                {pub.urgencyLevel === 'alta' && !check.isAlreadyChecked && (
                                  <span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <AlertTriangle className="h-2.5 w-2.5" /> urgente
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition">{pub.title}</h3>
                            </div>
                            
                            {/* Status badges */}
                            <div className="flex items-center gap-1.5 self-start">
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                                pub.status === 'pendente' ? 'bg-amber-100 text-amber-800' : 
                                pub.status === 'concluido' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {pub.status === 'pendente' ? 'Pendente' : pub.status === 'concluido' ? 'Concluído' : 'Arquivado'}
                              </span>
                            </div>
                          </div>

                          {/* Check automatic badges */}
                          {check.isAlreadyChecked && (
                            <div className="mt-3 bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                  <CheckCircle className="h-4 w-4 text-slate-500" />
                                  <span>Já conferida recentemente</span>
                                </div>
                                {check.matchingPub && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPub(check.matchingPub);
                                    }}
                                    className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 px-2 py-1 rounded-md font-bold text-slate-600 transition flex items-center gap-0.5"
                                  >
                                    Ver conferência
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-500 border-t border-slate-200/60 pt-2">
                                <div><strong>Conferência:</strong> {check.conferredAt}</div>
                                <div><strong>Usuário:</strong> {check.conferredBy}</div>
                                <div><strong>Origem:</strong> {check.source}</div>
                              </div>
                            </div>
                          )}

                          {check.hasNewMovement && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                  <AlertTriangle className="h-4 w-4 text-amber-600 animate-pulse" />
                                  <span>Nova movimentação em processo já conferido recentemente</span>
                                </div>
                                {check.matchingPub && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPub(check.matchingPub);
                                    }}
                                    className="text-[10px] bg-white border border-amber-200 hover:bg-amber-100/50 px-2 py-1 rounded-md font-bold text-amber-800 transition flex items-center gap-0.5"
                                  >
                                    Ver movimentação anterior
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-amber-700 border-t border-amber-200/50 pt-2">
                                <div><strong>Anterior em:</strong> {check.conferredAt}</div>
                                <div><strong>Por:</strong> {check.conferredBy}</div>
                                <div><strong>Origem:</strong> {check.source}</div>
                              </div>
                            </div>
                          )}

                          <p className="text-slate-600 text-xs mt-3 line-clamp-2 leading-relaxed">
                            {pub.content}
                          </p>

                          <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>Intimação: {new Date(pub.subpoenaDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                            {pub.deadlineDays > 0 ? (
                              <div className="flex items-center gap-1 text-amber-600 font-semibold">
                                <Clock className="h-3 w-3" />
                                <span>Prazo: {pub.deadlineDays} d.ú. (Até {new Date(pub.dueDate).toLocaleDateString('pt-BR')})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Sem prazo legal aplicável</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Sidebar/Drawer for selected publication details (Read-only reading card side-by-side allowed) */}
              {selectedPub && (
                <div className="lg:col-span-6 bg-white border border-indigo-100 rounded-2xl p-6 shadow-md space-y-6 self-start sticky top-24 border-t-4 border-t-indigo-600">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        Processo {selectedPub.processNumber}
                      </span>
                      <h2 className="text-lg font-bold text-slate-800 mt-2">{selectedPub.title}</h2>
                    </div>
                    <button 
                      onClick={() => setSelectedPub(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-100 px-2 py-1 rounded-lg"
                    >
                      Fechar
                    </button>
                  </div>

                  {/* IA Analysis card */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 shadow space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Scale className="h-4 w-4 text-indigo-400" />
                        <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-indigo-200">Recomendação AI Portal BOSS</span>
                      </div>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded">gemini-3.5-flash</span>
                    </div>
                    
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      {selectedPub.actionRequired}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700 text-[10px] text-slate-300">
                      <div>
                        <span className="block text-slate-400">Classificação:</span>
                        <strong className="text-white uppercase">{selectedPub.category}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-400">Vencimento Calculado:</span>
                        <strong className="text-amber-400">{new Date(selectedPub.dueDate).toLocaleDateString('pt-BR')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Status updater */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alterar Status</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedPub.id, 'pendente')}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                          selectedPub.status === 'pendente' 
                            ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        Pendente
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedPub.id, 'concluido')}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                          selectedPub.status === 'concluido' 
                            ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        Marcar Concluído
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedPub.id, 'arquivado')}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                          selectedPub.status === 'arquivado' 
                            ? 'bg-slate-200 text-slate-800 font-bold border border-slate-300' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        Arquivar
                      </button>
                    </div>
                  </div>

                  {/* Full Text */}
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teor Integral da Intimação</h4>
                      <span className="text-[10px] text-slate-400">Origem: {selectedPub.source.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1">
                      {selectedPub.content}
                    </p>
                  </div>

                  {/* Delete Option */}
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Adicionado em {new Date(selectedPub.createdAt).toLocaleDateString('pt-BR')}</span>
                    <button
                      onClick={() => handleDeletePub(selectedPub.id)}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir Registro
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* 3. TAB: DEADLINES CALENDAR CENTRAL */}
        {activeTab === 'deadlines' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Central de Prazos Processuais</h1>
              <p className="text-slate-500 text-xs mt-1">Sua centralizada agenda de prazos fatais calculados estritamente em dias úteis (CPC - desconsidera sábados e domingos).</p>
            </div>

            {/* List of active deadlines structured as timeline (Allowed as dashboard element) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="space-y-6">
                {publications.filter(p => p.deadlineDays > 0 && p.status === 'pendente').length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                    <h3 className="font-bold text-slate-800 text-sm">Nenhum prazo pendente!</h3>
                    <p className="text-slate-500 text-xs">Parabéns. Todas as intimações e prazos preditivos foram resolvidos ou arquivados.</p>
                  </div>
                ) : (
                  publications
                    .filter(p => p.deadlineDays > 0 && p.status === 'pendente')
                    // Sort by due date ascending
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((pub, idx) => {
                      const daysLeft = Math.ceil((new Date(pub.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isExpired = daysLeft < 0;
                      const isCritical = daysLeft <= 2;

                      return (
                        <div key={pub.id} className="relative flex items-start gap-4 pb-6 group border-l-2 border-slate-100 pl-4 ml-2">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 bg-white transition-colors ${
                            isExpired ? 'border-red-600 bg-red-100' : 
                            isCritical ? 'border-amber-500 bg-amber-100 animate-pulse' : 'border-indigo-500'
                          }`} />

                          <div className="flex-1 bg-slate-50 border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 hover:bg-white transition space-y-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <span className="text-[10px] font-mono text-slate-400">Processo: {pub.processNumber}</span>
                                <h3 className="font-bold text-slate-800 text-sm mt-0.5">{pub.title}</h3>
                              </div>

                              <div className="text-right">
                                <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-xl ${
                                  isExpired ? 'bg-red-100 text-red-800' :
                                  isCritical ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {isExpired ? 'Vencido!' : isCritical ? `Vence em ${daysLeft} dias!` : `Faltam ${daysLeft} dias`}
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-1">Limite: {new Date(pub.dueDate).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 bg-white/70 border border-slate-100 p-3 rounded-lg leading-relaxed">
                              <strong className="text-slate-800 block mb-1">🎯 Providência recomendada pela IA:</strong>
                              {pub.actionRequired}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100/70 pt-2">
                              <span>Prazo de {pub.deadlineDays} dias úteis contado desde {new Date(pub.subpoenaDate).toLocaleDateString('pt-BR')}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUpdateStatus(pub.id, 'concluido')}
                                  className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                                >
                                  Concluir Prazo
                                </button>
                                <span className="text-slate-300">|</span>
                                <button 
                                  onClick={() => { setSelectedPub(pub); setActiveTab('publications'); }}
                                  className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
                                >
                                  Ver Detalhes
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB: GMAIL INTEGRATION (Vermelho Google Theme) */}
        {activeTab === 'gmail' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-650 to-red-600 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-red-700 bg-red-600">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-6 w-6 text-red-200" />
                  <h1 className="text-xl font-bold tracking-tight">Sincronizador Gmail de Intimações</h1>
                </div>
                <p className="text-xs text-red-100">Varredura e classificação inteligente de e-mails jurídicos utilizando Inteligência Artificial em tempo real.</p>
              </div>

              {user && cachedToken && (
                <button
                  id="btn-sync-inbox-main"
                  onClick={syncGmailInbox}
                  disabled={isSyncingGmail}
                  className="bg-white hover:bg-red-50 text-red-700 font-bold text-xs py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shrink-0 disabled:opacity-75"
                >
                  {isSyncingGmail ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sintonizando & Varrendo...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Varrer Caixa Gmail Agora
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Error or auth missing helper */}
            {gmailError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-2">
                <h4 className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  Falha de sincronização Gmail
                </h4>
                <p>{gmailError}</p>
                <p className="text-[10px] text-slate-500">Isso pode ocorrer caso sua sessão do Google tenha expirado. Re-conecte utilizando o botão no topo do painel.</p>
              </div>
            )}

            {!user || !cachedToken ? (
              <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-sm">
                <Mail className="h-12 w-12 text-red-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">
                  {!user ? "Conexão do Gmail Necessária" : "Sessão do Gmail Expirada ou Ausente"}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {!user 
                    ? "Para realizar a varredura inteligente e sincronização em tempo real de intimações da sua caixa de entrada, conecte sua conta Google."
                    : "Sua sessão de conexão do Gmail expirou ou não está ativa. Re-conecte sua conta do Google para permitir que o Sincronizador de Intimações consulte sua caixa de entrada."}
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition shadow-lg shadow-red-600/15"
                >
                  {!user ? "Conectar Conta Google via Firebase" : "Reconectar Conta Google"}
                </button>
              </div>
            ) : (
              /* Results workspace */
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">E-mails Jurídicos Identificados com IA</h3>
                    <p className="text-slate-500 text-xs">Exibindo os e-mails classificados pela IA como intimação judicial na caixa.</p>
                  </div>
                  {gmailSyncResults.length > 0 && (
                    <button
                      onClick={importAllGmailPublications}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <Download className="h-4 w-4" /> Importar {gmailSyncResults.length} Encontrados
                    </button>
                  )}
                </div>

                {isSyncingGmail ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-red-600 mx-auto" />
                    <div>
                      <h4 className="font-semibold text-slate-700 text-sm">Varrendo caixa postal e lendo e-mails...</h4>
                      <p className="text-slate-500 text-xs">Nossa IA está lendo cada teor e filtrando números de processos e prazos reais.</p>
                    </div>
                  </div>
                ) : gmailSyncResults.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
                    <Mail className="h-8 w-8 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm">Sem dados de varredura ativa</h4>
                    <p className="text-slate-500 text-xs">Clique no botão superior de varredura para buscar correspondências reais na caixa de entrada {user?.email || ""}.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {gmailSyncResults.map((pub) => (
                      <div key={pub.id} className="py-5 flex flex-col md:flex-row justify-between gap-4 items-start first:pt-0 last:pb-0">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[9px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                              {pub.processNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Recebido em: {new Date(pub.subpoenaDate).toLocaleDateString('pt-BR')}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              pub.urgencyLevel === 'alta' ? 'bg-red-100 text-red-800' : 
                              pub.urgencyLevel === 'media' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              Urguência {pub.urgencyLevel}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">{pub.title}</h4>
                          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {pub.content}
                          </p>
                          <div className="text-[11px] text-amber-700 font-medium">
                            <strong>🚨 Providência sugerida com IA:</strong> {pub.actionRequired}
                          </div>
                        </div>

                        <button
                          onClick={() => importGmailPublication(pub)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1 shrink-0 transition"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Importar para Painel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. TAB: LEGACY INTEGRATION API (Azul Institucional Theme) */}
        {activeTab === 'api' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integração API com Sistemas Legados</h1>
              <p className="text-slate-500 text-xs mt-1">Conecte seus sistemas externos (ProJuris, Benner, CPJ, etc.) para enviar publicações automaticamente para triagem com IA.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: API Configuration & Token manager (Form strictly vertical) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Active Tokens list */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm">Chaves de API Ativas</h3>
                  
                  <div className="space-y-3">
                    {apiTokens.map((tok) => (
                      <div key={tok.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-700">{tok.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">Gerada em {new Date(tok.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <code className="bg-slate-200 text-[10px] font-mono px-2 py-1 rounded select-all block truncate flex-1 text-slate-800">
                            {tok.token}
                          </code>
                          <button
                            onClick={() => copyToClipboard(tok.token, tok.id)}
                            className="bg-white hover:bg-slate-100 p-1.5 rounded-lg border border-slate-200 transition shrink-0"
                            title="Copiar token"
                          >
                            {copiedTokenId === tok.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Create token form - STRCITLY VERTICAL LAYOUT */}
                  <form onSubmit={handleGenerateToken} className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registrar Novo Sistema</span>
                    
                    {/* Campo 1 - Vertical Column Layout */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 block">Nome do Sistema Externo</label>
                      <input
                        type="text"
                        placeholder="Ex: CRM Legal de Cobrança"
                        value={tokenSystemName}
                        onChange={(e) => setTokenSystemName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-indigo-500 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!tokenSystemName.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow disabled:opacity-50"
                    >
                      Gerar Token de Integração
                    </button>
                  </form>
                </div>

                {/* Simulated API firing widget */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5 text-emerald-400">
                    <Play className="h-4 w-4" /> Simulação de Disparo API
                  </h3>
                  <p className="text-xs text-slate-300">Preencha e simule a requisição HTTP POST real que o sistema legado enviará ao Portal BOSS para classificar intimações com IA.</p>
                  
                  {/* Simulation form - STRICTLY VERTICAL LAYOUT */}
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-400 block">Número do Processo</label>
                      <input
                        type="text"
                        value={simApiProcess}
                        onChange={(e) => setSimApiProcess(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block">Título do Disparo</label>
                      <input
                        type="text"
                        value={simApiTitle}
                        onChange={(e) => setSimApiTitle(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block">Teor Completo / Publicação</label>
                      <textarea
                        rows={3}
                        value={simApiContent}
                        onChange={(e) => setSimApiContent(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-emerald-500"
                      />
                    </div>

                    <button
                      onClick={simulateLegacyApiPost}
                      disabled={isSimulatingApi}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {isSimulatingApi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Simular Envio de Publicação
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: API Documentation block */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-1.5">
                  <Code className="h-5 w-5 text-indigo-500" /> Documentação da Integração API
                </h3>

                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <p>
                    O Portal BOSS expõe uma API RESTful de alta velocidade para que sistemas terceiros enviem novas publicações automaticamente. Toda publicação recebida é processada assincronamente pelo modelo <strong>Gemini 3.5 Flash</strong> para extrair número de processos no formato CNJ, determinar nível de urgência, sugerir a providência jurídica adequada e calcular o prazo em dias úteis.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs">Especificação do Endpoint</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono space-y-1 text-[11px]">
                      <div><strong className="text-indigo-600">POST</strong> {window.location.origin}/api/legacy/publications</div>
                      <div className="text-slate-400">Content-Type: application/json</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs">Payload da Requisição JSON</h4>
                    <pre className="bg-slate-950 text-indigo-300 rounded-xl p-4 font-mono text-[10px] overflow-x-auto select-all leading-relaxed">
{`{
  "token": "BOSS_LEGACY_INTEGRATION_TOKEN_DEFAULT",
  "processNumber": "1003445-99.2026.8.26.0000",
  "title": "Intimação de Despacho",
  "content": "Fica intimado o agravante para comprovar o recolhimento das custas de preparo..."
}`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs">Exemplo real usando cURL</h4>
                    <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[10px] overflow-x-auto select-all leading-relaxed">
{`curl -X POST ${window.location.origin}/api/legacy/publications \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "${apiTokens[0]?.token || "SEU_TOKEN_AQUI"}",
    "processNumber": "1003445-99.2026.8.26.0000",
    "title": "Recurso Eletrônico",
    "content": "Fica intimada a reclamada sobre a decisão do Recurso de Revista."
  }'`}
                    </pre>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
                    <h5 className="font-bold flex items-center gap-1">
                      <Info className="h-4 w-4" /> Importante sobre prazos do CPC (Brasil)
                    </h5>
                    <p>Nossa inteligência artificial foi parametrizada para seguir rigorosamente as regras de prazos em dias úteis do Código de Processo Civil de 2015 brasileiro, desconsiderando feriados nacionais comuns e finais de semana (sábados e domingos).</p>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {/* 6. TAB: NEW MANUAL PUBLICATION FORM (BOSS Vertical Standard) */}
        {activeTab === 'new-pub' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Novo Cadastro Manual</h1>
                <p className="text-slate-500 text-xs mt-1">A IA processará o teor e preencherá automaticamente as informações de prazo e providências.</p>
              </div>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>

            {/* Strict Vertical Single-Column Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-6">
                
                {/* Campo 1 - Vertical Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Número do Processo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 0012345-67.2026.5.02.0001 (Padrão CNJ)"
                    value={manualProcessNumber}
                    onChange={(e) => setManualProcessNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-indigo-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400">Caso deixe em branco, a IA tentará extrair o número do teor da publicação.</span>
                </div>

                {/* Campo 2 - Vertical Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Data de Recebimento da Intimação</label>
                  <input
                    type="date"
                    value={manualSubpoenaDate}
                    onChange={(e) => setManualSubpoenaDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-indigo-500 transition-colors text-slate-700"
                  />
                  <span className="text-[10px] text-slate-400">Utilizada como termo inicial para a contagem preditiva de prazos úteis.</span>
                </div>

                {/* Campo 3 - Vertical Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Teor Integral da Publicação / Subpoena Text</label>
                  <textarea
                    rows={8}
                    placeholder="Cole aqui o texto copiado do Diário de Justiça, PJE ou e-mail..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-indigo-500 transition-colors leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-400">O conteúdo será enviado de forma segura ao Gemini para extração de dados e agendamento inteligente.</span>
                </div>

                {/* Actions Row */}
                <button
                  type="submit"
                  disabled={isAnalyzing || !manualContent.trim()}
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-3.5 rounded-xl transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analisando teor com Inteligência Artificial BOSS...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4" />
                      Analisar e Salvar Publicação
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>
        )}

        {/* 7. TAB: CENTRAL DE PUSHES (GMAIL INTEGRATION) */}
        {activeTab.startsWith('pushes') && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {activeTab === 'pushes' ? (
              <>
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <Inbox className="h-6 w-6 text-purple-600" />
                      Painel de Conferência de Pushes (Gmail)
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">
                      Página índice de acesso aos dashboards específicos de conferência em tempo real dos pushes processuais.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {user && (
                      <button
                        onClick={fetchAllPushes}
                        disabled={globalPushesLoading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-md shadow-purple-600/15"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${globalPushesLoading ? 'animate-spin' : ''}`} />
                        {globalPushesLoading ? 'Atualizando tudo...' : 'Atualizar Todos os Pushes'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Authentication Guard */}
                {!user || !cachedToken ? (
                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
                    <Mail className="h-12 w-12 text-purple-400 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-800">
                      {!user ? "Conexão do Gmail Necessária" : "Sessão do Gmail Expirada ou Ausente"}
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {!user 
                        ? "Para realizar a consulta real em tempo real dos PUSHes processuais na sua caixa de entrada, você precisa conectar sua conta Google. Isto permite que o Portal BOSS liste de forma segura apenas os remetentes dos tribunais."
                        : "Sua sessão de conexão com os servidores do Gmail expirou ou não foi localizada. Conecte sua conta Google novamente para reativar o monitoramento em tempo real."}
                    </p>
                    <button
                      onClick={handleGoogleLogin}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition shadow-lg shadow-purple-600/15"
                    >
                      {!user ? "Conectar Conta Google via Firebase" : "Reconectar Conta Google"}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Consolidado das Fontes */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                      <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4">Consolidado das Fontes (Clique nos indicadores para navegar)</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div 
                          onClick={() => openGmailExplorer({ name: "Todos os Remetentes", sender: "all_senders" }, 'all')}
                          className="space-y-1 cursor-pointer hover:bg-slate-800/80 p-2.5 rounded-xl transition border border-transparent hover:border-slate-700"
                        >
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            Total de Pushes (Inbox) <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </p>
                          <h4 className="text-2xl font-bold text-white border-b border-dashed border-slate-600 inline-block">
                            {Object.values(pushesData).reduce((sum, p) => sum + (p.totalCount || 0), 0)}
                          </h4>
                        </div>
                        
                        <div 
                          onClick={() => openGmailExplorer({ name: "Todos os Remetentes", sender: "all_senders" }, 'unread')}
                          className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6 cursor-pointer hover:bg-slate-800/80 p-2.5 rounded-xl transition border border-transparent hover:border-slate-700"
                        >
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            Total Não Lido <ExternalLink className="h-2.5 w-2.5 opacity-60 text-purple-400" />
                          </p>
                          <h4 className="text-2xl font-bold text-purple-400 border-b border-dashed border-purple-900 inline-block">
                            {Object.values(pushesData).reduce((sum, p) => sum + (p.unreadCount || 0), 0)}
                          </h4>
                        </div>

                        <div className="space-y-1 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fontes com Pendências</p>
                          <h4 className="text-2xl font-bold text-amber-400">
                            {Object.values(pushesData).filter(p => (p.unreadCount || 0) > 0).length} / {PUSH_SOURCES.length}
                          </h4>
                        </div>

                        <div className="space-y-1 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Última Sincronização</p>
                          <p className="text-sm font-semibold text-slate-200 mt-1">{pushesLastUpdated || 'Nunca atualizado'}</p>
                        </div>
                      </div>
                    </div>

                    {pushesError && (
                      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                        <span>{pushesError}</span>
                      </div>
                    )}

                    {/* Navigation Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {PUSH_SOURCES.map((source) => {
                        const data = pushesData[source.sender] || {
                          sender: source.sender,
                          totalCount: 0,
                          unreadCount: 0,
                          newestSubject: "Sem consulta",
                          newestDate: null,
                          success: true
                        };
                        const hasUnread = data.unreadCount > 0;
                        const isError = data.success === false;

                        return (
                          <div
                            key={source.id}
                            onClick={() => handleTabChange(`pushes/push-${source.id}`)}
                            className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Remetente</span>
                                  <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition">
                                    {source.name}
                                  </h4>
                                </div>
                                <span className={`w-2.5 h-2.5 rounded-full ${isError ? 'bg-red-500' : hasUnread ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                              </div>
                              <p className="text-slate-500 text-xs font-mono truncate">{source.sender}</p>

                              {/* Quick Stats badges */}
                              <div className="flex gap-2 pt-2">
                                <span className="bg-slate-50 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border border-slate-100 font-medium">
                                  {data.totalCount} e-mails
                                </span>
                                {hasUnread && (
                                  <span className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-full border border-purple-100 font-bold">
                                    {data.unreadCount} não lidos
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-800">
                              <span>Abrir painel operacional</span>
                              <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (() => {
              const isControladoriaWorkspace = activeTab.endsWith('/atualizar-controladoria');
              const subRouteId = isControladoriaWorkspace 
                ? activeTab.replace('pushes/push-', '').replace('/atualizar-controladoria', '') 
                : activeTab.replace('pushes/push-', '');
              const source = PUSH_SOURCES.find(s => s.id === subRouteId);
              if (!source) {
                return (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-sm font-semibold text-slate-500">Dashboard específico de push não encontrado.</p>
                    <button 
                      onClick={() => handleTabChange('pushes')} 
                      className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                    >
                      Voltar para Pushes
                    </button>
                  </div>
                );
              }

              // Custom theme colors helper based on requirements (Blue for Docs/General, Red for Todoist/PJe)
              const getSourceTheme = (id: string) => {
                switch (id) {
                  case 'pje-mg':
                  case 'eproc-tjmg':
                    return {
                      primary: 'text-red-600',
                      bg: 'bg-red-600 hover:bg-red-700',
                      lightBg: 'bg-red-50',
                      border: 'border-red-200',
                      badge: 'bg-red-50 text-red-700 border-red-100',
                      accent: 'red'
                    };
                  case 'trt-mg':
                  case 'tjmg':
                  case 'trf6':
                  default:
                    return {
                      primary: 'text-blue-600',
                      bg: 'bg-blue-600 hover:bg-blue-700',
                      lightBg: 'bg-blue-50',
                      border: 'border-blue-200',
                      badge: 'bg-blue-50 text-blue-700 border-blue-100',
                      accent: 'blue'
                    };
                }
              };

              const theme = getSourceTheme(source.id);
              const isLoading = groupedPushesLoading;
              const hasData = groupedPushes && groupedPushes.groups;

              if (isControladoriaWorkspace) {
                return renderControladoriaWorkspace(source, theme);
              }

              return (
                <div className="space-y-6 animate-fade-in text-slate-800">
                  {/* Back button */}
                  <button 
                    onClick={() => handleTabChange('pushes')} 
                    className={`inline-flex items-center gap-1.5 text-xs ${theme.primary} hover:opacity-85 font-bold cursor-pointer transition`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Painel Geral de Pushes
                  </button>

                  {/* Dashboard Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Inbox className={`h-6 w-6 ${theme.primary}`} />
                        Painel Operacional: {source.name}
                      </h1>
                      <p className="text-slate-500 text-xs mt-1">
                        Central de limpeza, conferência e acesso rápido aos e-mails de {source.sender}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchGroupedPushes(source.sender, groupedPushesPage, groupedPushesSearch)}
                        disabled={isLoading}
                        className={`${theme.bg} disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer`}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Atualizando...' : 'Atualizar Dados'}
                      </button>
                    </div>
                  </div>

                  {/* Operational Search Form - Pure Vertical Column */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        fetchGroupedPushes(source.sender, 1, groupedPushesSearch);
                      }} 
                      className="space-y-2"
                    >
                      <label className="text-xs font-bold text-slate-700 block">Pesquisa Rápida</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="Digite o CNJ ou assunto para filtrar..."
                          value={groupedPushesSearch}
                          onChange={(e) => setGroupedPushesSearch(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-slate-400 transition-all text-slate-800"
                        />
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-6 rounded-xl transition"
                        >
                          Filtrar Processos
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        A busca filtrará as mensagens reais do tribunal que contêm a palavra-chave informada.
                      </span>
                    </form>
                  </div>

                  {/* Stats counters row */}
                  {hasData && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Processos Únicos (CNJs)</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 font-mono">
                          {groupedPushes.totalProcesses}
                        </h3>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total de e-mails</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 font-mono">
                          {groupedPushes.totalEmails}
                        </h3>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pendentes sem Leitura</p>
                        <h3 className={`text-3xl font-extrabold font-mono ${groupedPushes.groups.some((g: any) => g.unreadCount > 0) ? 'text-amber-600' : 'text-slate-600'}`}>
                          {groupedPushes.groups.reduce((acc: number, g: any) => acc + (g.unreadCount || 0), 0)}
                        </h3>
                      </div>
                    </div>
                  )}

                  {/* Clipboard feedback tooltip banner */}
                  {copiedText && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in font-medium shadow-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>{copiedText} copiado para a área de transferência!</span>
                    </div>
                  )}

                  {/* Main grouped list */}
                  {isLoading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                      <RefreshCw className={`h-8 w-8 ${theme.primary} animate-spin mx-auto`} />
                      <p className="text-slate-500 text-xs font-semibold">Buscando e agrupando pushes da sua conta Gmail...</p>
                    </div>
                  ) : hasData && groupedPushes.groups.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
                      <Inbox className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-800">Nenhum processo encontrado</p>
                      <p className="text-slate-500 text-xs">Tente ajustar seus termos de pesquisa ou recarregue a página.</p>
                    </div>
                  ) : hasData ? (
                    <div className="space-y-4">
                      {groupedPushes.groups.map((group: any, idx: number) => {
                        const isExpanded = expandedGroupCNJ === group.processNumber;
                        const isClearing = clearingGroupCNJ === group.processNumber;
                        const hasUnreadGroup = group.unreadCount > 0;
                        const isNotIdentified = group.processNumber === "Não identificado";

                        return (
                          <div 
                            key={idx}
                            className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${
                              hasUnreadGroup ? `border-l-4 border-l-${theme.accent === 'red' ? 'red' : 'blue'}-500 border-slate-200` : 'border-slate-200'
                            }`}
                          >
                            {/* Card Header row */}
                            <div className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50 border-b border-slate-100">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 
                                    onClick={() => {
                                      if (!isNotIdentified) {
                                        handleCopyText(group.processNumber, `Processo ${group.processNumber}`);
                                      }
                                    }}
                                    className={`font-mono text-sm font-black text-slate-800 cursor-pointer hover:${theme.primary} flex items-center gap-1.5 select-all`}
                                    title="Clique para copiar"
                                  >
                                    {group.processNumber}
                                    {!isNotIdentified && <Copy className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />}
                                  </h3>
                                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-0.5 rounded-full border border-slate-200 font-bold font-mono">
                                    {group.totalCount} e-mails
                                  </span>
                                  {hasUnreadGroup && (
                                    <span className={`bg-${theme.accent}-50 text-${theme.accent}-700 border border-${theme.accent}-100 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider animate-pulse`}>
                                      {group.unreadCount} novos / pendente
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium truncate max-w-2xl leading-relaxed">
                                  <strong className="text-slate-700">Assunto mais recente:</strong> {group.latestSubject}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Último e-mail recebido</span>
                                <span className="text-xs font-mono font-bold text-slate-700 block mt-0.5">
                                  {new Date(group.latestDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                            </div>

                            {/* Actions bar */}
                            <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                              {/* Left navigation shortcuts */}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    if (source) {
                                      openGmailExplorer({
                                        name: source.name,
                                        sender: source.sender
                                      }, 'all');
                                    }
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Inbox className="h-3 w-3" />
                                  Ver todos os e-mails deste Push
                                </button>

                                {!isNotIdentified && (
                                  <>
                                    <a
                                      href={group.todoistUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => handleCopyText(group.processNumber, "Número do Processo")}
                                      className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-red-100"
                                    >
                                      <CheckCircle className="h-3 w-3 text-red-600" />
                                      Ver no Todoist
                                    </a>

                                    <button
                                      onClick={() => handleAcesseProcessoClique(group.processNumber, source?.sender || '', group.latestSubject || '', '')}
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-100"
                                    >
                                      <Zap className="h-3 w-3 text-blue-600" />
                                      Acesse o Processo com 1 Clique
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Right cleaning operations */}
                              <div className="flex gap-2">
                                {hasUnreadGroup && (
                                  <button
                                    onClick={() => clearGroupAsRead(source.sender, group.processNumber, group.messageIds)}
                                    disabled={isClearing}
                                    className={`bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] py-2 px-4 rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer`}
                                  >
                                    {isClearing ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    {isClearing ? 'Limpando...' : 'Limpar / Lido'}
                                  </button>
                                )}

                                <button
                                  onClick={() => setExpandedGroupCNJ(isExpanded ? null : group.processNumber)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-2 px-4 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                                >
                                  {isExpanded ? 'Recolher' : 'Expandir'}
                                  <ChevronRight className={`h-3.5 w-3.5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              </div>
                            </div>

                            {/* Expanded individual emails list */}
                            {isExpanded && (
                              <div className="bg-slate-50/50 p-5 border-t border-slate-100 space-y-4 divide-y divide-slate-100 font-sans">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">Histórico de e-mails recebidos</h4>
                                {group.messages.map((msg: any, mIdx: number) => (
                                  <div key={mIdx} className="pt-3 first:pt-0 space-y-2">
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="space-y-0.5">
                                        <p className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                          {msg.isUnread && <span className="w-2 h-2 rounded-full bg-amber-500 block shrink-0" />}
                                          {msg.subject}
                                        </p>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-normal">{msg.snippet}</p>
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-400 shrink-0 font-bold mt-0.5">
                                        {new Date(msg.date).toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                      <a
                                        href={`https://mail.google.com/mail/u/0/#inbox/${msg.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-md px-2 py-1 transition"
                                      >
                                        Abrir e-mail original <ExternalLink className="h-2.5 w-2.5" />
                                      </a>

                                      <button
                                        onClick={() => handleOpenControladoriaWorkspace(msg, group, source.id)}
                                        className="text-[10px] font-bold text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 rounded-md px-2 py-1 transition flex items-center gap-1"
                                      >
                                        <Sliders className="h-2.5 w-2.5" />
                                        Atualizar Controladoria
                                      </button>

                                      <button
                                        onClick={() => handleOpenDelegarPrazoFromPush(msg, group)}
                                        className="text-[10px] font-bold text-amber-700 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-md px-2 py-1 transition flex items-center gap-1"
                                      >
                                        <CalendarRange className="h-2.5 w-2.5" />
                                        Delegar Prazo
                                      </button>

                                      <button
                                        onClick={() => handleAcesseProcessoClique(group.processNumber, source?.sender || '', msg.subject || '', msg.snippet || '')}
                                        className="text-[10px] font-bold text-blue-700 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 border border-blue-200/50 rounded-md px-2 py-1 transition flex items-center gap-1"
                                      >
                                        <Zap className="h-2.5 w-2.5 text-blue-600" />
                                        Acesse o Processo com 1 Clique
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        );
                      })}

                      {/* Pagination row */}
                      {groupedPushes.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-4 border-t border-slate-100">
                          <button
                            onClick={() => fetchGroupedPushes(source.sender, groupedPushesPage - 1, groupedPushesSearch)}
                            disabled={groupedPushesPage <= 1 || isLoading}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50 cursor-pointer"
                          >
                            Anterior
                          </button>
                          <span className="text-xs text-slate-500 font-medium font-mono">
                            Página <strong className="text-slate-800">{groupedPushesPage}</strong> de <strong className="text-slate-800">{groupedPushes.totalPages}</strong>
                          </span>
                          <button
                            onClick={() => fetchGroupedPushes(source.sender, groupedPushesPage + 1, groupedPushesSearch)}
                            disabled={groupedPushesPage >= groupedPushes.totalPages || isLoading}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50 cursor-pointer"
                          >
                            Próxima
                          </button>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                      <Inbox className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-800">Pronto para carregar</p>
                      <p className="text-slate-500 text-xs">Clique no botão "Atualizar Dados" acima para buscar as mensagens agrupadas.</p>
                    </div>
                  )}

                  {/* Sincronização info */}
                  <p className="text-[10px] text-slate-400 font-mono text-right">
                    Último agrupamento realizado: {pushesLastUpdated || 'Nunca'}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* 8. TAB: CONFIGURAÇÕES DO GMAIL */}
        {activeTab === 'configuracoes.gmail' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Page Header */}
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Settings className="h-6 w-6 text-indigo-600" />
                Configurações do Gmail
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Gerencie integrações, sincronizações e conexões técnicas do Gmail com os sistemas internos.
              </p>
            </div>

            {/* Config cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick AI Inbox Syncer - Gmail Card (Vermelho Google Brand Color) */}
              <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500 text-white p-2.5 rounded-xl shadow-md">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Sincronizador Gmail</h4>
                    <p className="text-[11px] text-slate-500">Varredura e classificação com IA</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conecte sua caixa de correio e execute varredura automática em seu e-mail buscando novos comunicados, e-mails de tribunais ou Diários de Justiça oficiais. O modelo de inteligência artificial categorizará os prazos para você.
                </p>
                <div className="pt-2">
                  <button
                    id="btn-dashboard-sync-gmail"
                    onClick={syncGmailInbox}
                    disabled={isSyncingGmail}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/15 disabled:opacity-75"
                  >
                    {isSyncingGmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Varrer Caixa de Entrada Gmail
                      </>
                    )}
                  </button>
                </div>
                {gmailSyncResults.length > 0 && (
                  <div className="bg-red-100/55 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center justify-between">
                    <span>Encontradas <strong>{gmailSyncResults.length}</strong> publicações pendentes de importação.</span>
                    <button onClick={() => setActiveTab('gmail')} className="font-bold underline text-red-600 hover:text-red-800 flex items-center gap-0.5">
                      Ver <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Legacy System Live API Stream Card (Azul Institucional BOSS) */}
              <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">API com Sistemas Legados</h4>
                    <p className="text-[11px] text-slate-500">Fluxo automatizado integrado</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exponha endpoints para seus sistemas jurídicos legados (ProJuris, Benner, etc.) enviarem dados brutos de publicações via API. A inteligência artificial integrada fará a triagem e agendamento dos prazos automaticamente.
                </p>
                
                <div className="border border-indigo-100 bg-white/80 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>MÉTODO: POST</span>
                    <span className="text-indigo-600 font-bold">LIVE API</span>
                  </div>
                  <code className="text-[10px] font-mono bg-slate-100 p-1.5 rounded block text-slate-700 truncate select-all">
                    /api/legacy/publications
                  </code>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => setActiveTab('api')}
                    className="flex-1 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-medium text-xs py-2.5 px-3 rounded-lg transition text-center"
                  >
                    Ver Credenciais / Docs
                  </button>
                </div>
              </div>

              {/* Simulated ERP Terminal Widget - Super Interactive! */}
              <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider">CONSOLE DE INTEGRAÇÃO</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">SIMULAÇÃO DE DISPARO</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Envie um push simulado para testar instantaneamente a inteligência artificial categorizando dados em tempo real no Portal BOSS.
                  </p>
                  
                  <div className="mt-3 space-y-2 text-[10px] font-mono">
                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                      <span className="text-indigo-400">Processo:</span> {simApiProcess}
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700 truncate">
                      <span className="text-indigo-400">Teor:</span> {simApiContent}
                    </div>
                  </div>
                </div>

                <button
                  onClick={simulateLegacyApiPost}
                  disabled={isSimulatingApi}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 disabled:opacity-75 mt-3"
                >
                  {isSimulatingApi ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analisando com IA...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Disparar Publicação (Simular API)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 9. TAB: CONSULTA PRIUS */}
        {activeTab === 'consulta.prius' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Compass className="h-6 w-6 text-blue-600" />
                  Conferidor Inteligente PRIUS
                </h1>
                <p className="text-slate-500 text-xs mt-1">
                  Varredura de e-mails Prius no Gmail com desmembramento inteligente automático em publicações individuais conferíveis.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSyncPriusConferidor()}
                  disabled={priusSyncing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${priusSyncing ? 'animate-spin' : ''}`} />
                  {priusSyncing ? 'Sincronizando...' : 'Sincronizar PRIUS'}
                </button>
                {priusSession && (
                  <button
                    onClick={() => handleGenerateConferidorReport(priusSession.publications, 'Conferidor Prius')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl border border-slate-200 transition flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar Relatório
                  </button>
                )}
              </div>
            </div>

            {/* If no session has been synchronized yet */}
            {!priusSession ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="space-y-5">
                  <div className="bg-blue-50 text-blue-700 h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl">
                    ⚖️
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Como funciona o Conferidor Inteligente?</h2>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    O sistema busca em sua caixa postal o e-mail unificado do PRIUS e o decodifica por completo. Cada publicação, processo e intimação presente no e-mail é automaticamente desmembrada em um card exclusivo de conferência.
                  </p>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Deduplicação Automática</p>
                        <p className="text-[11px] text-slate-500">Identifica se a publicação já foi conferida por outros membros da equipe.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Vinculação de Tarefas no Todoist</p>
                        <p className="text-[11px] text-slate-500">Verifica se já há tarefa para o CNJ correspondente no Todoist.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Integração Direta com Tribunais</p>
                        <p className="text-[11px] text-slate-500">Links para abertura rápida do inteiro teor ou pesquisa no tribunal respectivo.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white border border-slate-100 p-2 rounded-lg w-fit">
                      <span className="font-bold text-blue-600">Busca Gmail:</span>
                      <span>(from:prius OR subject:PRIUS)</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-800">Instruções de Inicialização:</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Garanta que seu e-mail do Gmail esteja ativo. Caso sua sessão tenha expirado, clique no botão superior para reconectar. Ao carregar o e-mail, as publicações surgirão automaticamente nesta tela.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleSyncPriusConferidor()}
                      disabled={priusSyncing}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow"
                    >
                      <RefreshCw className={`h-4 w-4 ${priusSyncing ? 'animate-spin' : ''}`} />
                      {priusSyncing ? 'Sincronizando caixa...' : 'Sincronizar e Iniciar Conferência'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Active Conference Session layout
              <div className="space-y-6">
                {/* Upper Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Detectadas</span>
                    <span className="text-2xl font-black text-slate-800 font-mono block mt-1">{priusSession.publications.length}</span>
                    <span className="text-[9px] text-slate-400 block mt-1">{priusSession.publications.filter(p => !p.isDuplicate).length} únicas</span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Pendentes</span>
                    <span className="text-2xl font-black text-amber-700 font-mono block mt-1">
                      {priusSession.publications.filter(p => p.status === 'Pendente').length}
                    </span>
                    <span className="text-[9px] text-amber-600 block mt-1">Aguardando conferência</span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Conferidas</span>
                    <span className="text-2xl font-black text-emerald-700 font-mono block mt-1">
                      {priusSession.publications.filter(p => p.status === 'Conferida').length}
                    </span>
                    <span className="text-[9px] text-emerald-600 block mt-1">Sem prazo exigido</span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Delegadas</span>
                    <span className="text-2xl font-black text-blue-700 font-mono block mt-1">
                      {priusSession.publications.filter(p => p.status === 'Delegada').length}
                    </span>
                    <span className="text-[9px] text-blue-600 block mt-1">No Todoist</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ignoradas / Duplicadas</span>
                    <span className="text-2xl font-black text-slate-700 font-mono block mt-1">
                      {priusSession.publications.filter(p => p.status === 'Ignorada' || p.status === 'Duplicada').length}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-1">Sem providências</span>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Ações do E-mail</span>
                    <div className="flex flex-col gap-1 mt-2">
                      <button
                        onClick={() => handleModifyEmailStatus(priusSession.gmailMessageId, ["UNREAD"], "Marcar como Lido")}
                        className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 text-left"
                      >
                        <Check className="h-3 w-3" /> Marcar como Lido
                      </button>
                      <button
                        onClick={() => handleModifyEmailStatus(priusSession.gmailMessageId, ["INBOX"], "Arquivar")}
                        className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 text-left"
                      >
                        <Trash2 className="h-3 w-3" /> Arquivar no Gmail
                      </button>
                      <a
                        href={`https://mail.google.com/mail/u/0/#inbox/${priusSession.gmailMessageId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 text-left"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir no Gmail ↗
                      </a>
                    </div>
                  </div>
                </div>

                {/* Sub-header info */}
                <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-bold">E-mail:</span>
                    <span className="font-mono text-slate-800 font-medium">{priusSession.emailSubject}</span>
                  </div>
                  <div className="text-slate-400 font-medium font-mono text-[11px]">
                    Sincronizado: {priusSession.lastSync}
                  </div>
                </div>

                {/* Main 12-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Sidebar (4 Columns): Publication list */}
                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[650px] overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Lista de Publicações Desmembradas</span>
                      <div className="text-[10px] text-slate-500 font-medium font-mono">
                        Selecione para detalhar e conferir
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {priusSession.publications.map((p, idx) => {
                        const isSelected = priusSelectedIdx === idx;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPriusSelectedIdx(idx)}
                            className={`w-full p-4 text-left transition flex gap-3 hover:bg-slate-50/50 ${isSelected ? 'bg-blue-50/40 border-l-4 border-blue-600' : ''}`}
                          >
                            <span className="bg-slate-100 text-slate-700 font-mono font-bold text-[10px] px-2 py-1 rounded h-fit shrink-0">
                              {p.index}/{p.total}
                            </span>
                            <div className="space-y-1 min-w-0 flex-1">
                              <p className="font-bold font-mono text-slate-800 text-[11px] truncate flex items-center gap-1.5">
                                {p.cnj || 'CNJ não identificado'}
                                {p.isDuplicate && (
                                  <span className="bg-red-50 text-red-600 text-[9px] px-1 py-0.5 rounded font-bold">Dupl</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">
                                Cliente: <span className="text-slate-700 font-bold">{p.cliente || 'Sem cliente'}</span>
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono truncate">
                                {p.tribunal} • {p.orgao}
                              </p>
                              
                              <div className="flex items-center justify-between pt-1">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  p.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  p.status === 'Conferida' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  p.status === 'Delegada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-slate-50 text-slate-500 border border-slate-200'
                                }`}>
                                  {p.status}
                                </span>
                                {p.todoistTaskId && (
                                  <span className="text-[9px] text-blue-600 font-bold font-mono">Todoist conectado</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main Work Area (8 Columns) */}
                  <div className="lg:col-span-8 flex flex-col h-[650px] gap-6">
                    {priusSelectedIdx !== null && priusSession.publications[priusSelectedIdx] ?
                      (() => {
                        const pub = priusSession.publications[priusSelectedIdx];
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full overflow-hidden">
                            {/* Column A (7 Columns): Content & Text */}
                            <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teor da Publicação</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(pub.cnj || '');
                                      addSystemLog('success', 'CNJ copiado!', 'gmail_sync');
                                    }}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-600 font-bold text-[10px] flex items-center gap-1 transition"
                                  >
                                    <Copy className="h-3 w-3" /> CNJ
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(pub.content || '');
                                      addSystemLog('success', 'Conteúdo copiado!', 'gmail_sync');
                                    }}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-600 font-bold text-[10px] flex items-center gap-1 transition"
                                  >
                                    <Copy className="h-3 w-3" /> Teor
                                  </button>
                                  {pub.linkInteiroTeor && (
                                    <a
                                      href={pub.linkInteiroTeor}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded font-bold text-[10px] flex items-center gap-1 transition"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Inteiro Teor
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                {/* Metadata grid */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] font-mono shrink-0">
                                  <div>
                                    <span className="text-slate-400 block font-sans font-bold">Processo CNJ</span>
                                    <span className="text-slate-800 font-bold text-xs">{pub.cnj || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans font-bold">Cliente / Interessado</span>
                                    <span className="text-slate-800 font-bold">{pub.cliente || 'Não identificado'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans font-bold">Tribunal</span>
                                    <span className="text-slate-800 font-bold">{pub.tribunal || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans font-bold">Órgão</span>
                                    <span className="text-slate-800 font-bold truncate block">{pub.orgao || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans font-bold">Diário Oficial</span>
                                    <span className="text-slate-800 font-bold truncate block">{pub.diario || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans font-bold">Data Divulgação / Pub</span>
                                    <span className="text-slate-800 font-bold">{pub.dataDivulgacao || pub.dataPublicacao || 'N/A'}</span>
                                  </div>
                                </div>

                                {/* Body text container */}
                                <div className="text-[11px] font-sans leading-relaxed text-slate-700 whitespace-pre-wrap bg-slate-50/20 border border-slate-100 rounded-xl p-4 font-serif select-text">
                                  {pub.content}
                                </div>
                              </div>
                            </div>

                            {/* Column B (5 Columns): Conference Controls & Todoist Panel */}
                            <div className="md:col-span-5 flex flex-col gap-4 overflow-y-auto">
                              {/* Action buttons card */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 shrink-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Decisões de Conferência</span>
                                
                                <button
                                  onClick={() => handleActionNoDeadline('prius', 'Conferida')}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle className="h-4 w-4" /> Conferir sem Prazo
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleActionNoDeadline('prius', 'Ignorada')}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 transition"
                                  >
                                    Ignorar
                                  </button>
                                  <button
                                    onClick={() => handleActionNoDeadline('prius', 'Duplicada')}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 transition"
                                  >
                                    Marcar Duplicada
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleActionNoDeadline('prius', 'Revisar depois')}
                                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs py-2 px-3 rounded-xl border border-amber-200 transition"
                                >
                                  Revisar Depois
                                </button>
                              </div>

                              {/* Todoist Live Connector / Delegation Form */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex-1 flex flex-col justify-between space-y-4">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Conector Todoist</span>
                                    {todoistLoading && <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />}
                                  </div>

                                  {todoistLinkedTask ? (
                                    <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-xs space-y-2">
                                      <p className="font-bold flex items-center gap-1">
                                        <Check className="h-4 w-4 text-blue-600" /> Tarefa no Todoist Localizada!
                                      </p>
                                      <p className="font-semibold">{todoistLinkedTask.content}</p>
                                      <div className="flex justify-between items-center pt-2">
                                        <a
                                          href={todoistLinkedTask.url || `https://todoist.com/showTask?id=${todoistLinkedTask.id}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 font-bold hover:underline"
                                        >
                                          Abrir no Todoist ↗
                                        </a>
                                        <button
                                          onClick={() => {
                                            handleActionNoDeadline('prius', 'Delegada');
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded text-[10px]"
                                        >
                                          Vincular Conferência
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] text-slate-500">
                                        Nenhuma tarefa localizada para este CNJ. Use o formulário abaixo para delegar um prazo.
                                      </div>

                                      <div className="space-y-2 text-xs">
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Título da Tarefa</label>
                                          <input
                                            type="text"
                                            value={delegationTitle}
                                            onChange={(e) => setDelegationTitle(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Data de Vencimento</label>
                                            <input
                                              type="date"
                                              value={delegationDate}
                                              onChange={(e) => setDelegationDate(e.target.value)}
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Prioridade</label>
                                            <select
                                              value={delegationPriority}
                                              onChange={(e) => setDelegationPriority(Number(e.target.value))}
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                                            >
                                              <option value={1}>Baixa</option>
                                              <option value={2}>Média</option>
                                              <option value={3}>Alta</option>
                                              <option value={4}>Muito Alta (Fatal)</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div>
                                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Projeto Destino</label>
                                          <select
                                            value={todoistTaskProject}
                                            onChange={(e) => setTodoistTaskProject(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                                          >
                                            <option value="">Selecione um projeto...</option>
                                            {todoistProjects.map((p: any) => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-slate-500 block">Subtarefas Automáticas</label>
                                          <div className="space-y-1">
                                            {delegationSubtasks.map((sub, sidx) => (
                                              <div key={sidx} className="flex gap-1.5 items-center">
                                                <input
                                                  type="text"
                                                  value={sub}
                                                  onChange={(e) => {
                                                    const copy = [...delegationSubtasks];
                                                    copy[sidx] = e.target.value;
                                                    setDelegationSubtasks(copy);
                                                  }}
                                                  className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[10px] flex-1 text-slate-700"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {!todoistLinkedTask && (
                                  <button
                                    onClick={() => handleConfirmDelegation('prius')}
                                    disabled={todoistSyncing || !todoistToken}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-1.5"
                                  >
                                    {todoistSyncing ? (
                                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <PlusCircle className="h-3.5 w-3.5" />
                                    )}
                                    {todoistSyncing ? 'Delegando...' : 'Confirmar e Criar no Todoist'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        })()
                      :
                        <div className="bg-white border border-slate-200 rounded-2xl h-full flex flex-col justify-center items-center text-center p-8">
                          <Scale className="h-12 w-12 text-slate-300 animate-pulse mb-3" />
                          <h3 className="font-bold text-slate-800 text-sm">Nenhuma publicação selecionada</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Selecione um item na lista de publicações à esquerda para iniciar a conferência.
                          </p>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* 10. TAB: CONSULTA RECORTE DIGITAL */}
        {activeTab === 'consulta.recorte-digital' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Layers className="h-6 w-6 text-indigo-600" />
                  Conferidor Recorte Digital
                </h1>
                <p className="text-slate-500 text-xs mt-1">
                  Varredura de e-mails das OABs e Tribunais estaduais no Gmail com desmembramento inteligente automático.
                </p>
              </div>
            </div>

            {/* Service selector bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
              {[
                { id: "oab-mg", name: "OAB/MG" },
                { id: "rj", name: "TJRJ (Rio de Janeiro)" },
                { id: "ceara", name: "TJCE (Ceará)" },
                { id: "sao-paulo", name: "TJSP (São Paulo)" }
              ].map((serv) => {
                const isActive = activeRecorteServiceId === serv.id;
                return (
                  <button
                    key={serv.id}
                    onClick={() => {
                      setActiveRecorteServiceId(serv.id);
                      setRecorteSelectedIdx(0);
                    }}
                    className={`text-xs font-bold py-2.5 px-4 rounded-lg transition-all ${isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    {serv.name}
                  </button>
                );
              })}
            </div>

            {/* Render selected service panel */}
            {(() => {
              const serviceId = activeRecorteServiceId;
              const serviceName = serviceId === 'oab-mg' ? "OAB/MG" : serviceId === 'rj' ? "TJRJ" : serviceId === 'ceara' ? "TJCE" : "TJSP";
              const session = recorteSessions[serviceId];
              const isSyncing = recorteSyncing[serviceId] || false;

              if (!session) {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className="space-y-5">
                      <div className="bg-indigo-50 text-indigo-700 h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl">
                        📬
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Como funciona o Conferidor {serviceName}?</h2>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        O BOSS busca em sua caixa postal o e-mail unificado do Recorte Digital {serviceName} e o decodifica por completo. Cada publicação, processo e intimação presente no e-mail é automaticamente desmembrada em um card exclusivo para conferência individualizada.
                      </p>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Deduplicação Inteligente</p>
                            <p className="text-[11px] text-slate-500">Compara os CNJs com outros cadastros do portal para evitar retrabalho.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Sincronização Direta Todoist</p>
                            <p className="text-[11px] text-slate-500">Se houver correspondência, a tarefa se vincula automaticamente para delegação rápida.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white border border-slate-100 p-2 rounded-lg w-fit">
                          <span className="font-bold text-indigo-600">Busca Gmail:</span>
                          <span>"Recorte Digital" "{serviceName === 'OAB/MG' ? 'OAB/MG' : serviceName === 'TJRJ' ? 'RJ' : serviceName === 'TJCE' ? 'Ceará' : 'São Paulo'}"</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Sincronize com o Gmail para buscar o último recorte diário oficial recebido e iniciar o desmembramento das publicações.
                        </p>
                      </div>

                      <div className="pt-6">
                        <button
                          onClick={() => handleSyncRecorteConferidor(serviceId, serviceName)}
                          disabled={isSyncing}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow"
                        >
                          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Sincronizando caixa...' : `Sincronizar Recorte ${serviceName}`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Active Recorte Digital Session view
              return (
                <div className="space-y-6">
                  {/* Upper Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Detectadas</span>
                      <span className="text-2xl font-black text-slate-800 font-mono block mt-1">{session.publications.length}</span>
                      <span className="text-[9px] text-slate-400 block mt-1">{session.publications.filter(p => !p.isDuplicate).length} únicas</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm text-left">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Pendentes</span>
                      <span className="text-2xl font-black text-amber-700 font-mono block mt-1">
                        {session.publications.filter(p => p.status === 'Pendente').length}
                      </span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm text-left">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Conferidas</span>
                      <span className="text-2xl font-black text-emerald-700 font-mono block mt-1">
                        {session.publications.filter(p => p.status === 'Conferida').length}
                      </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm text-left">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Delegadas</span>
                      <span className="text-2xl font-black text-blue-700 font-mono block mt-1">
                        {session.publications.filter(p => p.status === 'Delegada').length}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm text-left">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ignoradas / Duplicadas</span>
                      <span className="text-2xl font-black text-slate-700 font-mono block mt-1">
                        {session.publications.filter(p => p.status === 'Ignorada' || p.status === 'Duplicada').length}
                      </span>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl shadow-sm text-left">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Ações do E-mail</span>
                      <div className="flex flex-col gap-1 mt-2">
                        <button
                          onClick={() => handleModifyEmailStatus(session.gmailMessageId, ["UNREAD"], "Marcar como Lido")}
                          className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 text-left"
                        >
                          <Check className="h-3 w-3" /> Marcar Lido
                        </button>
                        <button
                          onClick={() => handleModifyEmailStatus(session.gmailMessageId, ["INBOX"], "Arquivar")}
                          className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 text-left"
                        >
                          <Trash2 className="h-3 w-3" /> Arquivar
                        </button>
                        <a
                          href={`https://mail.google.com/mail/u/0/#inbox/${session.gmailMessageId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 text-left"
                        >
                          <ExternalLink className="h-3 w-3" /> Abrir e-mail original
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Sync info bar */}
                  <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="font-bold">E-mail:</span>
                      <span className="font-mono text-slate-800 font-medium">{session.emailSubject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSyncRecorteConferidor(serviceId, serviceName)}
                        disabled={isSyncing}
                        className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Novamente
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleGenerateConferidorReport(session.publications, `Conferidor ${serviceName}`)}
                        className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Exportar Relatório
                      </button>
                    </div>
                  </div>

                  {/* 12-Column Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar list */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[650px] overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Lista de Publicações Desmembradas</span>
                        <div className="text-[10px] text-slate-500 font-medium font-mono">
                          Selecione para detalhar e conferir
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {session.publications.map((p, idx) => {
                          const isSelected = recorteSelectedIdx === idx;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setRecorteSelectedIdx(idx)}
                              className={`w-full p-4 text-left transition flex gap-3 hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/40 border-l-4 border-indigo-600' : ''}`}
                            >
                              <span className="bg-slate-100 text-slate-700 font-mono font-bold text-[10px] px-2 py-1 rounded h-fit shrink-0">
                                {p.index}/{p.total}
                              </span>
                              <div className="space-y-1 min-w-0 flex-1">
                                <p className="font-bold font-mono text-slate-800 text-[11px] truncate flex items-center gap-1.5">
                                  {p.cnj || 'CNJ não identificado'}
                                  {p.isDuplicate && (
                                    <span className="bg-red-50 text-red-600 text-[9px] px-1 py-0.5 rounded font-bold">Dupl</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">
                                  Cliente: <span className="text-slate-700 font-bold">{p.cliente || 'Sem cliente'}</span>
                                </p>
                                <p className="text-[9px] text-slate-400 font-mono truncate">
                                  {p.tribunal} • {p.orgao}
                                </p>
                                
                                <div className="flex items-center justify-between pt-1">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    p.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    p.status === 'Conferida' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    p.status === 'Delegada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    'bg-slate-50 text-slate-500 border border-slate-200'
                                  }`}>
                                    {p.status}
                                  </span>
                                  {p.todoistTaskId && (
                                    <span className="text-[9px] text-blue-600 font-bold font-mono">Todoist conectado</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right detail layout */}
                    <div className="lg:col-span-8 flex flex-col h-[650px] gap-6">
                      {recorteSelectedIdx !== null && session.publications[recorteSelectedIdx] ?
                        (() => {
                          const pub = session.publications[recorteSelectedIdx];
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full overflow-hidden">
                              {/* Left Text Detail */}
                              <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teor da Publicação</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(pub.cnj || '');
                                        addSystemLog('success', 'CNJ copiado!', 'gmail_sync');
                                      }}
                                      className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-600 font-bold text-[10px] flex items-center gap-1 transition"
                                    >
                                      <Copy className="h-3 w-3" /> CNJ
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(pub.content || '');
                                        addSystemLog('success', 'Teor copiado!', 'gmail_sync');
                                      }}
                                      className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-600 font-bold text-[10px] flex items-center gap-1 transition"
                                    >
                                      <Copy className="h-3 w-3" /> Teor
                                    </button>
                                  </div>
                                </div>

                                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                  {/* Metadata grid */}
                                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] font-mono shrink-0">
                                    <div>
                                      <span className="text-slate-400 block font-sans font-bold">Processo CNJ</span>
                                      <span className="text-slate-800 font-bold text-xs">{pub.cnj || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-sans font-bold">Cliente / Interessado</span>
                                      <span className="text-slate-800 font-bold">{pub.cliente || 'Não informado'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-sans font-bold">Tribunal</span>
                                      <span className="text-slate-800 font-bold">{pub.tribunal || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-sans font-bold">Órgão</span>
                                      <span className="text-slate-800 font-bold truncate block">{pub.orgao || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-sans font-bold">Data Publicação / Div</span>
                                      <span className="text-slate-800 font-bold">{pub.dataDivulgacao || pub.dataPublicacao || 'N/A'}</span>
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="text-[11px] font-sans leading-relaxed text-slate-700 whitespace-pre-wrap bg-slate-50/20 border border-slate-100 rounded-xl p-4 font-serif select-text">
                                    {pub.content}
                                  </div>
                                </div>
                              </div>

                              {/* Right Action panel */}
                              <div className="md:col-span-5 flex flex-col gap-4 overflow-y-auto">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 shrink-0">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ações do Conferidor</span>
                                  
                                  <button
                                    onClick={() => handleActionNoDeadline('recorte', 'Conferida')}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                                  >
                                    <CheckCircle className="h-4 w-4" /> Conferir sem Prazo
                                  </button>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => handleActionNoDeadline('recorte', 'Ignorada')}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 transition"
                                    >
                                      Ignorar
                                    </button>
                                    <button
                                      onClick={() => handleActionNoDeadline('recorte', 'Duplicada')}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 transition"
                                    >
                                      Duplicada
                                    </button>
                                  </div>
                                </div>

                                {/* Todoist Link Form */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex-1 flex flex-col justify-between space-y-4">
                                  <div className="space-y-4">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-100 pb-2">Prazo e Todoist</span>
                                    
                                    {todoistLinkedTask ? (
                                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-xl text-xs space-y-2">
                                        <p className="font-bold flex items-center gap-1">
                                          <Check className="h-4 w-4 text-indigo-600" /> Tarefa Vinculada no Todoist!
                                        </p>
                                        <p className="font-semibold">{todoistLinkedTask.content}</p>
                                        <div className="flex justify-between items-center pt-2">
                                          <a
                                            href={todoistLinkedTask.url || `https://todoist.com/showTask?id={todoistLinkedTask.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-600 font-bold hover:underline"
                                          >
                                            Abrir no Todoist ↗
                                          </a>
                                          <button
                                            onClick={() => {
                                              handleActionNoDeadline('recorte', 'Delegada');
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-1 rounded text-[10px]"
                                          >
                                            Vincular Conferência
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3 text-xs">
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Título do Prazo</label>
                                          <input
                                            type="text"
                                            value={delegationTitle}
                                            onChange={(e) => setDelegationTitle(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Vencimento</label>
                                            <input
                                              type="date"
                                              value={delegationDate}
                                              onChange={(e) => setDelegationDate(e.target.value)}
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Prioridade</label>
                                            <select
                                              value={delegationPriority}
                                              onChange={(e) => setDelegationPriority(Number(e.target.value))}
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                                            >
                                              <option value={1}>Baixa</option>
                                              <option value={2}>Média</option>
                                              <option value={3}>Alta</option>
                                              <option value={4}>Fatal</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div>
                                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Projeto Todoist</label>
                                          <select
                                            value={todoistTaskProject}
                                            onChange={(e) => setTodoistTaskProject(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                                          >
                                            <option value="">Selecione...</option>
                                            {todoistProjects.map((p: any) => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {!todoistLinkedTask && (
                                    <button
                                      onClick={() => handleConfirmDelegation('recorte')}
                                      disabled={todoistSyncing || !todoistToken}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-1.5"
                                    >
                                      <PlusCircle className="h-3.5 w-3.5" />
                                      {todoistSyncing ? 'Delegando...' : 'Confirmar e Criar no Todoist'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      :
                        <div className="bg-white border border-slate-200 rounded-2xl h-full flex flex-col justify-center items-center text-center p-8">
                          <Layers className="h-12 w-12 text-slate-300 animate-pulse mb-3" />
                          <h3 className="font-bold text-slate-800 text-sm">Selecione uma publicação</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Selecione um item na lista de publicações à esquerda para iniciar a conferência.
                          </p>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 11. TAB: PAINEL DJEN NACIONAL */}
        {activeTab === 'consulta.djen' && (
          <PainelDjenNacionalView user={user} />
        )}

        {/* Gmail Explorer Modal */}
        {isGmailExplorerOpen && explorerSource && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-100 text-slate-800">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-xl border border-purple-500/30">
                    <Inbox className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Central de Publicações – Gmail</h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Origem: <span className="text-purple-300 font-mono">{explorerSource.name} ({explorerSource.sender})</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openGmailExplorer(explorerSource, explorerFilter)}
                    disabled={explorerListLoading || explorerDetailsLoading}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${explorerListLoading || explorerDetailsLoading ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </button>
                  <button
                    onClick={() => setIsGmailExplorerOpen(false)}
                    className="text-slate-400 hover:text-white p-2 rounded-lg transition hover:bg-slate-800"
                  >
                    <span className="text-xl font-bold font-mono">×</span>
                  </button>
                </div>
              </div>

              {/* Toolbar: Search, Filters & Sorting */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row gap-3 items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar CNJ, parte, tribunal, assunto..."
                    value={explorerSearch}
                    onChange={(e) => setExplorerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-indigo-500 text-slate-800 transition"
                  />
                  {explorerSearch && (
                    <button 
                      onClick={() => setExplorerSearch('')}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'unread', label: 'Não Lidos' },
                    { id: 'read', label: 'Lidos' },
                    { id: 'hasAttachments', label: 'Com Anexos' },
                    { id: '24h', label: 'Últimas 24h' },
                    { id: '7d', label: 'Últimos 7 dias' },
                    { id: '30d', label: 'Últimos 30 dias' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setExplorerQuickFilter(filter.id as any)}
                      className={`text-[11px] font-bold py-1.5 px-3 rounded-lg transition whitespace-nowrap border ${
                        explorerQuickFilter === filter.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto justify-end">
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Ordenar por:</span>
                  <select
                    value={explorerSortKey}
                    onChange={(e) => setExplorerSortKey(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-lg text-xs py-1.5 px-2 focus:outline-indigo-500 font-medium text-slate-700 transition"
                  >
                    <option value="date">Mais recentes primeiro</option>
                    <option value="sender">Remetente</option>
                    <option value="process">Nº do Processo</option>
                    <option value="tribunal">Tribunal</option>
                  </select>
                </div>

              </div>

              {/* Main List Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50 space-y-4">
                {explorerListLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-12">
                    <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
                    <p className="text-xs font-semibold animate-pulse">Obtendo listagem de e-mails diretamente da API do Gmail...</p>
                    <span className="text-[10px] text-slate-400 max-w-sm text-center">Isso garante total tempo real, varrendo todas as páginas de resultados sem usar cache.</span>
                  </div>
                ) : explorerMessages.length === 0 && !explorerDetailsLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-12 text-center bg-white border border-slate-200 rounded-2xl p-6">
                    <Inbox className="h-10 w-10 text-slate-300" />
                    <p className="text-xs font-bold">Nenhuma mensagem encontrada</p>
                    <span className="text-[11px] text-slate-400">Verifique se há e-mails que correspondem a essa busca ou tente limpar a pesquisa.</span>
                  </div>
                ) : (
                  <>
                    {/* Items Grid/List */}
                    <div className="space-y-3">
                      {sortedMessages.map((email) => {
                        const isUnread = email.isUnread;
                        const hasAttachments = email.hasAttachments;
                        const dateObj = email.date ? new Date(email.date) : new Date();
                        const historyList = getConferenciaHistory(email.processNumber);
                        const isConferred = email.isConferred || historyList.length > 0;
                        const latestHistory = historyList[0];

                        return (
                          <div
                            key={email.id}
                            className={`bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md flex flex-col justify-between gap-3 ${
                              isConferred
                                ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                                : isUnread
                                  ? 'border-l-4 border-l-purple-600 border-purple-100 ring-1 ring-purple-100/30'
                                  : 'border-slate-200'
                            }`}
                          >
                            {/* Card Header Info */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                              
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Read/Unread Badge */}
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    isUnread 
                                      ? 'bg-purple-100 text-purple-700 border border-purple-200 font-mono' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200 font-mono'
                                  }`}>
                                    {isUnread ? 'Não Lido' : 'Lido'}
                                  </span>

                                  {/* Conferred Badge */}
                                  {isConferred && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                                      Já Conferido
                                    </span>
                                  )}

                                  {/* Court Badge */}
                                  {email.tribunal && email.tribunal !== 'Não identificado' && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {email.tribunal}
                                    </span>
                                  )}

                                  {/* Attachments indicator */}
                                  {hasAttachments && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                      Anexos
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 leading-snug hover:text-indigo-600 cursor-pointer pt-1" onClick={() => setSelectedEmailDetail(email)}>
                                  {email.subject}
                                </h3>

                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                                  <span>De: <strong className="text-slate-700">{email.from}</strong></span>
                                  <span>Para: <strong className="text-slate-700">{email.to}</strong></span>
                                </div>
                              </div>

                              {/* Date Time display */}
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-mono text-slate-400 block">
                                  {dateObj.toLocaleDateString('pt-BR', { dateStyle: 'short' })}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 block font-medium">
                                  {dateObj.toLocaleTimeString('pt-BR', { timeStyle: 'short' })}
                                </span>
                              </div>

                            </div>

                            {/* Extracted Fields Ribbon - Visual highlight */}
                            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs leading-normal">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Nº do Processo (CNJ)</span>
                                {email.processNumber && email.processNumber !== 'Não identificado' ? (
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <span className="font-mono tracking-tight text-indigo-700">{email.processNumber}</span>
                                    <button 
                                      onClick={() => handleCopyText(email.processNumber, 'Número do processo')}
                                      className="text-slate-400 hover:text-slate-600 font-bold p-0.5"
                                      title="Copiar número do processo"
                                    >
                                      {copiedText === 'Número do processo' ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-medium italic">Não identificado</span>
                                )}
                              </div>

                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Nome das Partes</span>
                                <span className="font-medium text-slate-700 block truncate">
                                  {email.autor && email.autor !== 'Não identificado' ? `${email.autor} v. ` : ''}
                                  {email.reu && email.reu !== 'Não identificado' ? email.reu : 'Não identificado'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Vara / Comarca</span>
                                <span className="font-medium text-slate-700 block truncate">{email.vara || 'Não identificada'}</span>
                              </div>

                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Classe Processual / Movimento</span>
                                <span className="font-medium text-slate-700 block truncate">{email.classe !== 'Não identificada' ? email.classe : email.movementType || 'Não identificada'}</span>
                              </div>
                            </div>

                            {/* Snippet preview */}
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/30 border border-slate-100/50 p-2.5 rounded-lg line-clamp-2">
                              {email.snippet}
                            </p>

                            {/* Conference info ribbon if conferred */}
                            {isConferred && latestHistory && (
                              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-[11px] text-emerald-800 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>
                                    Conferido em <strong className="font-mono">{new Date(latestHistory.createdAt).toLocaleString('pt-BR')}</strong> por <strong>{latestHistory.userId === 'demo-user' ? 'direito.rgr@gmail.com' : (user?.email || 'Sistema BOSS')}</strong>.
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedPub(latestHistory);
                                    setActiveTab('publications');
                                    setIsGmailExplorerOpen(false);
                                  }}
                                  className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                                >
                                  Ver conferência antiga
                                </button>
                              </div>
                            )}

                            {/* Actions Ribbon */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedEmailDetail(email)}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Ver E-mail Completo
                                </button>
                                
                                <button
                                  onClick={() => handleMarkAsConferred(email)}
                                  disabled={isConferred}
                                  className={`font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition border ${
                                    isConferred
                                      ? 'bg-emerald-50 text-emerald-500 border-emerald-100 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                  }`}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  {isConferred ? 'Conferido' : 'Marcar como Conferido'}
                                </button>

                                {isConferred && (
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <button
                                      onClick={() => handleOpenControladoriaWorkspace(email)}
                                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] py-1.5 px-2.5 rounded-lg border border-indigo-200 flex items-center gap-1 transition animate-fade-in"
                                    >
                                      <Sliders className="h-3 w-3" />
                                      Atualizar Controladoria
                                    </button>
                                    <button
                                      onClick={() => setDelegarPrazoModalData({ ...email, prazoSugerido: 15, responsavel: 'direito.rgr@gmail.com', prioridade: 'Alta', observacoes: '' })}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] py-1.5 px-2.5 rounded-lg border border-amber-200 flex items-center gap-1 transition animate-fade-in"
                                    >
                                      <CalendarRange className="h-3 w-3" />
                                      Delegar Prazo
                                    </button>
                                    <button
                                      onClick={() => handleAcesseProcessoClique(email.processNumber, email.from || '', email.subject, email.snippet)}
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] py-1.5 px-2.5 rounded-lg border border-blue-200 flex items-center gap-1 transition animate-fade-in"
                                    >
                                      <Zap className="h-3 w-3 text-blue-600" />
                                      Acesse o Processo com 1 Clique
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopyText(email.subject, 'Assunto')}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Copiar Assunto do E-mail"
                                >
                                  {copiedText === 'Assunto' ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleRefreshSingleEmail(email.id)}
                                  disabled={emailDetailsLoading}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Atualizar informações deste e-mail"
                                >
                                  <RefreshCw className={`h-4 w-4 ${emailDetailsLoading ? 'animate-spin' : ''}`} />
                                </button>

                                <a
                                  href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition border border-slate-200 flex items-center justify-center"
                                  title="Abrir no Gmail"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Infinite / Lazy Loading trigger */}
                    {explorerMessageIds.length > explorerMessages.length && (
                      <div className="pt-4 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={explorerDetailsLoading}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 px-6 rounded-xl shadow-sm inline-flex items-center gap-2 transition disabled:opacity-50"
                        >
                          {explorerDetailsLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Carregando mais detalhes...
                            </>
                          ) : (
                            <>
                              <span>Carregar mais e-mails</span>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full border">
                                {explorerMessages.length} de {explorerMessageIds.length}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {explorerDetailsLoading && explorerMessages.length > 0 && (
                  <div className="text-center text-slate-500 text-xs py-2 font-medium flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Buscando detalhes do próximo lote do Gmail em segundo plano...</span>
                  </div>
                )}
              </div>

              {/* Bottom stats footer */}
              <div className="bg-slate-900 border-t border-slate-800 text-slate-400 p-4 shrink-0 text-xs flex justify-between items-center font-mono">
                <span>Total de mensagens indexadas nesta busca: <strong>{explorerMessageIds.length}</strong></span>
                <span>Detalhes carregados: <strong>{explorerMessages.length}</strong></span>
              </div>

            </div>
          </div>
        )}

        {/* Selected Email Detailed View Modal */}
        {selectedEmailDetail && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-55 flex items-center justify-center p-4 overflow-hidden animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-100 text-slate-800">
              
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Leitor de E-mail BOSS</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkAsConferred(selectedEmailDetail)}
                    disabled={selectedEmailDetail.isConferred || getConferenciaHistory(selectedEmailDetail.processNumber).length > 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {selectedEmailDetail.isConferred || getConferenciaHistory(selectedEmailDetail.processNumber).length > 0 ? 'Conferido' : 'Marcar como Conferido'}
                  </button>
                  <button
                    onClick={() => setSelectedEmailDetail(null)}
                    className="text-slate-400 hover:text-white p-2 rounded-lg transition hover:bg-slate-800"
                  >
                    <span className="text-xl font-bold font-mono">×</span>
                  </button>
                </div>
              </div>

              {/* Body Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Email Metadata */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{selectedEmailDetail.subject}</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block font-mono">Remetente (From)</span>
                      <strong className="text-slate-800 text-xs">{selectedEmailDetail.from}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block font-mono">Destinatário (To)</span>
                      <strong className="text-slate-800 text-xs">{selectedEmailDetail.to}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block font-mono">Sincronização / Recebimento</span>
                      <strong className="text-slate-800 text-xs font-mono">
                        {new Date(selectedEmailDetail.date).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block font-mono">ID do Gmail</span>
                      <code className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded font-mono break-all">{selectedEmailDetail.id}</code>
                    </div>
                  </div>
                </div>

                {/* Extracted Process Info Highlight Card */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                    <Scale className="h-4.5 w-4.5 text-indigo-600" />
                    <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wide">Metadados Processuais Extraídos</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Tribunal de Origem</span>
                      <span className="font-bold text-slate-800">{selectedEmailDetail.tribunal || 'Não identificado'}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Número Único CNJ</span>
                      {selectedEmailDetail.processNumber && selectedEmailDetail.processNumber !== 'Não identificado' ? (
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="font-mono text-indigo-800 text-sm">{selectedEmailDetail.processNumber}</span>
                          <button 
                            onClick={() => handleCopyText(selectedEmailDetail.processNumber, 'Número CNJ')}
                            className="text-slate-400 hover:text-slate-600 font-bold"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Não identificado</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Vara / Órgão Julgador</span>
                      <span className="font-bold text-slate-800">{selectedEmailDetail.vara || 'Não identificado'}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Classe Processual</span>
                      <span className="font-bold text-slate-800">{selectedEmailDetail.classe || 'Não identificada'}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Polo Ativo (Autor)</span>
                      <span className="font-bold text-slate-800">{selectedEmailDetail.autor || 'Não identificado'}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Polo Passivo (Réu)</span>
                      <span className="font-bold text-slate-800">{selectedEmailDetail.reu || 'Não identificado'}</span>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <span className="text-[9px] text-indigo-500 uppercase font-bold block">Tipo de Movimentação Estimada</span>
                      <span className="font-bold text-slate-800">{selectedEmailDetail.movementType || 'Movimentação Geral'}</span>
                    </div>
                  </div>
                </div>

                {/* Email Full Text Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Teor Integral do E-mail</span>
                    <button
                      onClick={() => handleCopyText(selectedEmailDetail.bodyText || '', 'Texto completo do e-mail')}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar teor
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-96">
                    {selectedEmailDetail.bodyText || selectedEmailDetail.snippet || "Sem conteúdo textual disponível."}
                  </div>
                </div>

                {/* Attachments Section */}
                {selectedEmailDetail.hasAttachments && selectedEmailDetail.attachments && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Anexos Disponíveis ({selectedEmailDetail.attachments.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEmailDetail.attachments.map((file: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate" title={file.filename}>{file.filename}</span>
                            <span className="text-[9px] text-slate-400 uppercase block font-mono font-bold">{file.mimeType} ({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          
                          <a
                            href={`https://gmail.googleapis.com/gmail/v1/users/me/messages/${selectedEmailDetail.id}/attachments/${file.attachmentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-lg transition"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conferencia History for this process */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Histórico de Conferências para este Processo</h4>
                  {getConferenciaHistory(selectedEmailDetail.processNumber).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Não há histórico de conferências para este processo no banco de dados.</p>
                  ) : (
                    <div className="space-y-2">
                      {getConferenciaHistory(selectedEmailDetail.processNumber).map((historyItem: any, hIdx: number) => (
                        <div key={hIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-700 block">{historyItem.title}</span>
                            <span className="text-[10px] text-slate-400">
                              Data da conferência: {new Date(historyItem.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <span className="font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                            {historyItem.userId === 'demo-user' ? 'direito.rgr@gmail.com' : (user?.email || 'Sistema BOSS')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex flex-wrap justify-between items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenControladoriaWorkspace(selectedEmailDetail)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Atualizar Controladoria
                  </button>
                  <button
                    onClick={() => setDelegarPrazoModalData({ ...selectedEmailDetail, prazoSugerido: 15, responsavel: 'direito.rgr@gmail.com', prioridade: 'Alta', observacoes: '' })}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    Delegar Prazo
                  </button>
                  <button
                    onClick={() => handleAcesseProcessoClique(selectedEmailDetail.processNumber, selectedEmailDetail.from || '', selectedEmailDetail.subject, selectedEmailDetail.snippet)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Zap className="h-3.5 w-3.5 text-white" />
                    Acesse o Processo com 1 Clique
                  </button>
                </div>

                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmailDetail.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Visualizar Original no Gmail
                </a>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4">
            <p>© 2026 Portal BOSS - Jurídico Inteligente. Todos os direitos reservados.</p>
            <p className="mt-1 font-mono text-[10px]">Tecnologia Gemini 3.5 Flash & Google Workspace</p>
          </div>
        </footer>

        {/* Manual CNJ Input Modal */}
        {manualCNJModalData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] animate-fade-in p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Número do Processo Necessário</h3>
                    <p className="text-xs text-slate-500">
                      Não foi possível identificar o número do processo neste e-mail. Por favor, insira o CNJ manualmente para prosseguir.
                    </p>
                  </div>
                  <button 
                    onClick={() => setManualCNJModalData(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                  >
                    <AlertCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Número CNJ (apenas números, ou com pontos e traços)
                  </label>
                  <input
                    type="text"
                    value={manualCNJInput}
                    onChange={(e) => setManualCNJInput(e.target.value)}
                    placeholder="ex: 0010928-34.2023.5.03.0011"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-mono font-medium outline-none transition"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setManualCNJModalData(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!manualCNJInput.trim()) {
                        addSystemLog('warning', 'O preenchimento do CNJ é obrigatório.');
                        return;
                      }
                      const cnjInput = manualCNJInput.trim();
                      setManualCNJModalData(null);
                      handleAcesseProcessoClique(
                        cnjInput,
                        manualCNJModalData.sender,
                        manualCNJModalData.subject,
                        manualCNJModalData.snippet
                      );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition"
                  >
                    Prosseguir para o Tribunal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Alert Modal for Tribunal Access */}
        {notificationAlert && notificationAlert.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[110] animate-fade-in p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden animate-scale-up">
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Acesso ao Tribunal</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Se o tribunal bloquear o preenchimento automático, utilize o CNJ que já foi copiado para a sua área de transferência.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl font-mono text-xs font-bold text-indigo-700">
                  CNJ copiado. Cole no campo de busca do tribunal.
                </div>

                <button
                  onClick={() => setNotificationAlert(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-sm"
                >
                  Entendi, ir para o Tribunal
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>
    </div>
  );
}

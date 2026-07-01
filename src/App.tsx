import { useState, useEffect } from 'react';
import { 
  Scale, Mail, Calendar, Database, Clock, Search, Filter, 
  PlusCircle, FileText, CheckCircle, AlertTriangle, RefreshCw, 
  LogOut, ExternalLink, Code, Copy, Check, Printer, Download, 
  Trash2, AlertCircle, Info, ChevronRight, Send, UserCheck, Play, HelpCircle, Inbox,
  Settings, Compass, Layers
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { Publication, ApiToken, SystemLog } from './types';
import { initialPublications, calculateBusinessDaysDate } from './mockData';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core Data state
  const [publications, setPublications] = useState<Publication[]>([]);
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([
    {
      id: "tok-default",
      token: "BOSS_LEGACY_INTEGRATION_TOKEN_DEFAULT",
      name: "ERP Legado ProJuris",
      userId: "demo-user",
      createdAt: new Date().toISOString()
    }
  ]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: "api_received",
      message: "Integração API: Processo 1002345-67 recebido do ERP Legado ProJuris com sucesso.",
      userId: "demo-user",
      status: "success"
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: "manual_add",
      message: "Cadastro Manual: Publicação do processo 5001234-89 inserida no sistema.",
      userId: "demo-user",
      status: "info"
    }
  ]);

  // App control states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'publications' | 'deadlines' | 'gmail' | 'api' | 'new-pub' | 'pushes' | 'consulta.prius' | 'consulta.recorte-digital' | 'configuracoes.gmail'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [selectedPub, setSelectedPub] = useState<Publication | null>(null);

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
      if (path === 'configuracoes.gmail') {
        setActiveTab('configuracoes.gmail');
      } else if (path === 'consulta.prius') {
        setActiveTab('consulta.prius');
      } else if (path === 'consulta.recorte-digital') {
        setActiveTab('consulta.recorte-digital');
      } else if (path === 'pushes') {
        setActiveTab('pushes');
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
      } else if (path === 'dashboard' || path === '') {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // run initial sync

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]); // re-run if user changes to bind user email

  const handleTabChange = (tab: string) => {
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
        throw new Error(errData.error || "Erro ao consultar o Gmail.");
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
        throw new Error(errData.error || "Erro ao consultar o Gmail.");
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
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Load data from firestore
        await loadUserPublications(currentUser.uid);
        addSystemLog('info', `Usuário ${currentUser.email} autenticado com sucesso.`);
      } else {
        // Fallback to local storage or initial mockup data
        setCachedToken(null);
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

  // Load from firestore
  const loadUserPublications = async (uid: string) => {
    try {
      const q = query(collection(db, "publications"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const fetched: Publication[] = [];
      querySnapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as Publication);
      });
      
      if (fetched.length > 0) {
        setPublications(fetched);
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
        addSystemLog('success', 'Base de demonstração migrada e salva com sucesso no seu Firestore.');
      }
    } catch (err: any) {
      console.error("Erro ao carregar do Firestore:", err);
      addSystemLog('error', `Falha ao conectar com o banco de dados Cloud Firestore: ${err.message}`);
      // Fallback
      setPublications(initialPublications);
    }
  };

  const addSystemLog = (status: 'success' | 'warning' | 'error' | 'info', message: string, type: 'gmail_sync' | 'api_received' | 'manual_add' | 'status_change' = 'manual_add') => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      userId: user?.uid || 'demo-user',
      status
    };
    setSystemLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // Google Sign In & Get Gmail Token
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setCachedToken(token);
        addSystemLog('success', 'Autorização do Gmail obtida com sucesso.', 'gmail_sync');
      }
    } catch (error: any) {
      console.error("Erro de autenticação Google:", error);
      addSystemLog('error', `Falha de autenticação com o Google: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCachedToken(null);
      setPublications(initialPublications);
      addSystemLog('info', 'Sessão encerrada com sucesso.');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Sync Gmail (scans Gmail inbox via server proxy)
  const syncGmailInbox = async () => {
    if (!cachedToken) {
      handleGoogleLogin();
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
        body: JSON.stringify({ accessToken: cachedToken })
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
                    <span className="text-[10px] text-emerald-600 font-mono">FIRESTORE SYNC ATIVO</span>
                  </div>
                  <div className="h-9 w-9 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center font-bold text-sm text-blue-700">
                    {user.email?.[0].toUpperCase() || "A"}
                  </div>
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
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'pushes' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Principal</p>
              
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
                Dashboard
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
                  activeTab === 'pushes' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'pushes' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
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

          <div className="p-4 bg-slate-900 rounded-lg text-white">
            <p className="text-[10px] opacity-70 uppercase tracking-wider">API Status</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <p className="text-xs font-medium">Sistemas Conectados</p>
            </div>
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

        {/* 1. TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
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
                  activePublications.map((pub) => (
                    <div 
                      key={pub.id}
                      onClick={() => setSelectedPub(pub)}
                      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 ${
                        selectedPub?.id === pub.id ? 'ring-2 ring-indigo-500 border-l-indigo-600' : 
                        pub.urgencyLevel === 'alta' ? 'border-l-red-500' : 
                        pub.urgencyLevel === 'media' ? 'border-l-amber-500' : 'border-l-slate-300'
                      }`}
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
                            {pub.urgencyLevel === 'alta' && (
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
                  ))
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

            {/* Results workspace */}
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
        {activeTab === 'pushes' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Inbox className="h-6 w-6 text-purple-600" />
                  Painel de Conferência de Pushes (Gmail)
                </h1>
                <p className="text-slate-500 text-xs mt-1">
                  Verificação rápida em tempo real dos e-mails de movimentação processual diretamente na sua Caixa de Entrada.
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
            {!user ? (
              <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
                <Mail className="h-12 w-12 text-purple-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">Conexão do Gmail Necessária</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Para realizar a consulta real em tempo real dos PUSHes processuais na sua caixa de entrada, você precisa conectar sua conta Google. Isto permite que o Portal BOSS liste de forma segura apenas os remetentes dos tribunais.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition shadow-lg shadow-purple-600/15"
                >
                  Conectar Conta Google via Firebase
                </button>
              </div>
            ) : (
              <>
                {/* Summary Panel */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4">Consolidado das Fontes</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total de Pushes (Inbox)</p>
                      <h4 className="text-2xl font-bold text-white">
                        {Object.values(pushesData).reduce((sum, p) => sum + (p.totalCount || 0), 0)}
                      </h4>
                    </div>
                    
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Não Lido</p>
                      <h4 className="text-2xl font-bold text-purple-400">
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

                {/* Grid of Cards (Dynamic iteration for easy future additions) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {PUSH_SOURCES.map((source) => {
                    const data = pushesData[source.sender] || {
                      sender: source.sender,
                      totalCount: 0,
                      unreadCount: 0,
                      newestSubject: "Sem consulta",
                      newestDate: null,
                      success: true
                    };
                    const isLoading = pushesLoading[source.sender] || false;
                    const hasUnread = data.unreadCount > 0;
                    
                    // Determine visual priority rules based on count
                    let urgencyLabel = "Em dia";
                    let urgencyColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                    let pulseIndicator = "bg-emerald-500";
                    
                    if (hasUnread) {
                      if (data.unreadCount >= 5) {
                        urgencyLabel = "Urgente (5+)";
                        urgencyColor = "text-red-700 bg-red-50 border-red-100 animate-pulse";
                        pulseIndicator = "bg-red-500 animate-ping";
                      } else {
                        urgencyLabel = `Pendente (${data.unreadCount})`;
                        urgencyColor = "text-amber-700 bg-amber-50 border-amber-100";
                        pulseIndicator = "bg-amber-500";
                      }
                    }

                    // Calculate age of the newest email (warning if > 48h and unread)
                    const newestDateObj = data.newestDate ? new Date(data.newestDate) : null;
                    const diffTime = newestDateObj ? Date.now() - newestDateObj.getTime() : 0;
                    const isOlderThan48h = hasUnread && diffTime > 48 * 60 * 60 * 1000;

                    return (
                      <div 
                        key={source.id}
                        className={`bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden transition-all hover:shadow-md ${
                          hasUnread 
                            ? data.unreadCount >= 5 
                              ? 'border-red-300 ring-1 ring-red-100' 
                              : 'border-amber-300 ring-1 ring-amber-100'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Header Area */}
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Remetente</span>
                              <h4 className="text-base font-bold text-slate-900 tracking-tight truncate">{source.name}</h4>
                              <p className="text-slate-500 text-xs font-mono break-all truncate">{source.sender}</p>
                            </div>
                            
                            {/* Visual Status Tag */}
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${urgencyColor} flex items-center gap-1 shrink-0 ml-2`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${pulseIndicator}`}></span>
                              {urgencyLabel}
                            </span>
                          </div>

                          {/* Stats Row inside card */}
                          <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">Total na Inbox</span>
                              <span className="text-lg font-bold text-slate-800">{data.totalCount}</span>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">Não Lidos</span>
                              <span className={`text-lg font-bold ${hasUnread ? 'text-purple-600' : 'text-slate-500'}`}>
                                {data.unreadCount}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle Area: Latest Email details */}
                        <div className="space-y-2 border-t border-slate-100 pt-3 flex-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Assunto do Push Mais Recente</span>
                          <p className="text-slate-700 text-xs font-medium leading-relaxed line-clamp-2 bg-slate-50/50 p-2 rounded border border-slate-100/50">
                            {data.newestSubject}
                          </p>
                          {newestDateObj && (
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>Data do Push:</span>
                              <span className="font-mono">
                                {newestDateObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          )}

                          {/* Age warning if unread and >48h */}
                          {isOlderThan48h && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2 rounded-lg flex items-start gap-1.5 mt-2 font-medium">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>Atenção: Push pendente há mais de 48h!</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Footer row */}
                        <div className="pt-3 border-t border-slate-100 flex gap-2">
                          {/* Open in Gmail Button */}
                          <a 
                            href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(source.search)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir no Gmail
                          </a>
                          
                          {/* Refresh individual sender */}
                          <button
                            onClick={() => fetchSinglePush(source.sender)}
                            disabled={isLoading}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold p-2.5 rounded-xl transition border border-slate-200 flex items-center justify-center shrink-0 disabled:opacity-50"
                            title="Atualizar esta fonte"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
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
            {/* Page Header */}
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Compass className="h-6 w-6 text-blue-600" />
                Consulta Prius
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Área destinada à consulta, conferência e organização das publicações recebidas pelo sistema Prius.
              </p>
            </div>

            {/* No real integration warning banner */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 animate-pulse" />
              <div>
                <p className="font-bold">Integração ainda não configurada.</p>
                <p className="mt-0.5 opacity-90 font-medium">A conexão com os servidores do sistema Prius está pendente de autenticação e chaves de API do tribunal parceiro.</p>
              </div>
            </div>

            {/* Prius Integration Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: API de Consulta Prius */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Serviço de Varredura Prius</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">Inativo</span>
                  </div>
                  <p className="text-xs text-slate-500">Monitora e consolida as publicações enviadas pelo Prius via API REST.</p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] space-y-1 font-mono text-slate-500">
                    <div><span className="font-bold">URL:</span> N/A</div>
                    <div><span className="font-bold">Status:</span> Desconectado</div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="text-xs text-amber-600 font-semibold bg-amber-50/50 p-2.5 rounded border border-amber-100/50 text-center">
                    Integração ainda não configurada.
                  </div>
                  <button disabled className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs py-2.5 px-4 rounded-xl cursor-not-allowed">
                    Configurar Credenciais
                  </button>
                </div>
              </div>

              {/* Card 2: Webhook Prius */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Webhook Receiver</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">Inativo</span>
                  </div>
                  <p className="text-xs text-slate-500">Recebimento passivo de publicações e intimações processuais em tempo real.</p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] space-y-1 font-mono text-slate-500">
                    <div><span className="font-bold">Endpoint:</span> /api/prius/webhook</div>
                    <div><span className="font-bold">Última Atividade:</span> Sem conexões</div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="text-xs text-amber-600 font-semibold bg-amber-50/50 p-2.5 rounded border border-amber-100/50 text-center">
                    Integração ainda não configurada.
                  </div>
                  <button disabled className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs py-2.5 px-4 rounded-xl cursor-not-allowed">
                    Ativar Webhook
                  </button>
                </div>
              </div>

              {/* Card 3: Histórico de Sincronia */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Histórico e Auditoria</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">Vazio</span>
                  </div>
                  <p className="text-xs text-slate-500">Logs de importação de processos, erros de conexão e eventos de auditoria.</p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] space-y-1 font-mono text-slate-500">
                    <div><span className="font-bold">Total Importado:</span> 0</div>
                    <div><span className="font-bold">Sincronização:</span> Sem dados</div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="text-xs text-amber-600 font-semibold bg-amber-50/50 p-2.5 rounded border border-amber-100/50 text-center">
                    Integração ainda não configurada.
                  </div>
                  <button disabled className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs py-2.5 px-4 rounded-xl cursor-not-allowed">
                    Visualizar Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10. TAB: CONSULTA RECORTE DIGITAL */}
        {activeTab === 'consulta.recorte-digital' && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            {/* Page Header */}
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Layers className="h-6 w-6 text-indigo-600" />
                Consulta Recorte Digital
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Área destinada à conferência das publicações recebidas pelos serviços de Recorte Digital.
              </p>
            </div>

            {/* Integration Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 animate-pulse" />
              <div>
                <p className="font-bold">Integração ainda não configurada.</p>
                <p className="mt-0.5 opacity-90 font-medium">Os serviços de Recorte Digital dependem da configuração de credenciais, chaves de acesso da OAB e tokens do sistema.</p>
              </div>
            </div>

            {/* Recorte Digital Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: "Recorte Digital OAB/MG", url: "https://www.oabmg.org.br" },
                { name: "Recorte Digital RJ", url: "https://www.tjrj.jus.br" },
                { name: "Recorte Digital Ceará", url: "https://www.tjce.jus.br" },
                { name: "Recorte Digital São Paulo", url: "https://www.tjsp.jus.br" }
              ].map((service, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm tracking-tight">{service.name}</h3>
                        <span className="text-[10px] text-slate-400 block font-mono">ID: recorte-{(service.name.split(' ').pop() || '').toLowerCase()}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        Não ativo
                      </span>
                    </div>

                    {/* Stats Table */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Status</span>
                        <span className="font-semibold text-slate-700">Não configurado</span>
                      </div>
                      <div className="border-l border-slate-200 pl-4">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Última Atualização</span>
                        <span className="font-semibold text-slate-700">N/A</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Pubs. Encontradas</span>
                        <span className="font-mono font-bold text-slate-500">N/A</span>
                      </div>
                      <div className="border-l border-slate-200 pl-4 pt-2 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Pubs. Pendentes</span>
                        <span className="font-mono font-bold text-slate-500">N/A</span>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 text-amber-800 text-[10px] p-2.5 rounded-lg text-center font-medium">
                      Integração ainda não configurada.
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button 
                      disabled
                      className="flex-1 bg-slate-100 text-slate-400 font-bold text-xs py-2.5 px-3 rounded-xl cursor-not-allowed text-center transition"
                    >
                      Consultar
                    </button>
                    <a 
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition text-center flex items-center justify-center gap-1 shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir origem
                    </a>
                  </div>
                </div>
              ))}
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

      </main>
      </div>
    </div>
  );
}

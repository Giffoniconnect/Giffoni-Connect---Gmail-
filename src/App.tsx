import { useState, useEffect } from 'react';
import { 
  Scale, Mail, Calendar, Database, Clock, Search, Filter, 
  PlusCircle, FileText, CheckCircle, AlertTriangle, RefreshCw, 
  LogOut, ExternalLink, Code, Copy, Check, Printer, Download, 
  Trash2, AlertCircle, Info, ChevronRight, Send, UserCheck, Play, HelpCircle
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'publications' | 'deadlines' | 'gmail' | 'api' | 'new-pub'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [selectedPub, setSelectedPub] = useState<Publication | null>(null);
  
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
    pending: publications.filter(p => p.status === 'pendente').length,
    urgent: publications.filter(p => p.urgencyLevel === 'alta' && p.status === 'pendente').length,
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
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Scale className="h-4 w-4 mb-0.5" />
          Início
        </button>
        <button 
          onClick={() => setActiveTab('publications')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'publications' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileText className="h-4 w-4 mb-0.5" />
          Processos
        </button>
        <button 
          onClick={() => setActiveTab('deadlines')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'deadlines' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar className="h-4 w-4 mb-0.5" />
          Prazos
        </button>
        <button 
          onClick={() => setActiveTab('gmail')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'gmail' ? 'text-red-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Mail className="h-4 w-4 mb-0.5" />
          Gmail
        </button>
        <button 
          onClick={() => setActiveTab('api')} 
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] transition-colors ${activeTab === 'api' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Database className="h-4 w-4 mb-0.5" />
          API
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
                onClick={() => setActiveTab('dashboard')}
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
                onClick={() => setActiveTab('publications')}
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
                onClick={() => setActiveTab('deadlines')}
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Integrações</p>
              
              <button 
                id="btn-nav-sidebar-gmail"
                onClick={() => setActiveTab('gmail')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'gmail' 
                    ? 'bg-red-50 text-red-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'gmail' ? 'bg-red-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                Gmail Sync (IA)
              </button>

              <button 
                id="btn-nav-sidebar-api"
                onClick={() => setActiveTab('api')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'api' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'api' ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></span>
                API Legada
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
            </div>

            {/* Dynamic Actions Grid (Side-by-side elements allowed in dashboards) */}
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

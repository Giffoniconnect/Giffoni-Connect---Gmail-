import { useState } from 'react';
import { 
  Folder, Mail, AlertTriangle, ShieldAlert, Check, Play, Trash2, 
  Archive, Eye, Search, AlertCircle, RefreshCw, Layers, CheckSquare, 
  Square, Calendar, ChevronRight, PlusCircle, HelpCircle, User, Info, FileText, Inbox,
  ChevronDown, TrendingUp, TrendingDown, Minus, ExternalLink, Lock
} from 'lucide-react';
import { EmailRule } from '../types';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CentralGlobalEmailsViewProps {
  cachedToken: string | null;
  emailRules: EmailRule[];
  onRulesUpdated: (rules: EmailRule[]) => void;
  userId: string;
  onAddSystemLog: (status: 'success' | 'warning' | 'error' | 'info', message: string, type?: any) => void;
  onIncrementStats: (archived: number, deleted: number) => void;
}

const CATEGORIES = [
  "Publicações e Tribunais",
  "Google Agenda",
  "Financeiro",
  "Marketing e Conteúdo",
  "Sistemas do Escritório",
  "Segurança e Acessos",
  "Pessoal / Baixa Prioridade",
  "Lixo Digital"
];

const TREE_STRUCTURE = [
  {
    name: "Publicações e Tribunais",
    emoji: "⚖️",
    description: "Intimações, publicações e andamentos de tribunais judiciais.",
    actionRecommended: "Análise crítica imediata para prazos preclusivos",
    subcategories: [
      { name: "Push TRT3", emoji: "⚖️", query: 'from:nao-responda@trt3.jus.br OR "nao-responda@trt3.jus.br"' },
      { name: "Push TJMG", emoji: "⚖️", query: 'from:push@tjmg.jus.br OR "push@tjmg.jus.br"' },
      { name: "PJe TJMG", emoji: "⚖️", query: 'from:pje@tjmg.jus.br OR "pje@tjmg.jus.br"' },
      { name: "Eproc TJMG", emoji: "⚖️", query: '"eproc" "tjmg"' },
      { name: "Eproc TRF6", emoji: "⚖️", query: 'from:eproc@trf6.jus.br OR "eproc@trf6.jus.br"' },
      { name: "Recorte Digital", emoji: "⚖️", query: 'subject:("recorte digital" OR "diário de justiça")' },
      { name: "PRIUS", emoji: "⚖️", query: 'subject:prius OR "sistema prius"' },
      { name: "SEEU", emoji: "⚖️", query: '"seeu" OR "seeu@cnj.jus.br"' },
      { name: "Outros Tribunais", emoji: "⚖️", query: 'subject:(tribunal OR tjsp OR trf OR stj OR stf OR "justiça")' }
    ]
  },
  {
    name: "Google Agenda",
    emoji: "📅",
    description: "Compromissos, audiências pautadas e convites de reuniões.",
    actionRecommended: "Verificar conflitos e sincronizar com Todoist",
    subcategories: [
      { name: "Audiências", emoji: "📅", query: 'subject:(audiência OR "audiencia")' },
      { name: "Reuniões", emoji: "📅", query: 'subject:(reunião OR "reuniao" OR "meeting")' },
      { name: "Eventos", emoji: "📅", query: 'subject:(evento OR "convite")' },
      { name: "Lembretes", emoji: "📅", query: 'subject:(lembrete OR "aviso")' },
      { name: "Organização", emoji: "📅", query: 'subject:("organização" OR "agenda" OR "calendar")' }
    ]
  },
  {
    name: "Financeiro",
    emoji: "💰",
    description: "Contas a pagar, faturamento, comprovantes e extratos bancários.",
    actionRecommended: "Conciliar contas e enviar comprovantes para a contabilidade",
    subcategories: [
      { name: "Banco do Brasil", emoji: "🏦", query: '"banco do brasil" OR @bb.com.br' },
      { name: "Nubank", emoji: "💜", query: 'nubank OR @nubank.com.br' },
      { name: "C6 Bank", emoji: "💳", query: '"c6 bank" OR @c6bank.com' },
      { name: "Banco Inter", emoji: "🟠", query: '"banco inter" OR @bancointer.com.br' },
      { name: "Caixa Econômica", emoji: "💵", query: '"caixa econômica" OR "cef"' },
      { name: "ASAAS", emoji: "💸", query: 'asaas OR @asaas.com.br' },
      { name: "Stripe", emoji: "💰", query: 'stripe OR @stripe.com' },
      { name: "Comprovantes", emoji: "🧾", query: 'subject:(comprovante OR recibo)' },
      { name: "Boletos", emoji: "📄", query: 'subject:(boleto OR fatura OR pagamento)' },
      { name: "Contabilidade", emoji: "📊", query: 'contabilidade OR subject:(nota fiscal OR contábil)' },
      { name: "Investimentos", emoji: "📈", query: 'subject:(investimento OR rendimento OR extrato)' }
    ]
  },
  {
    name: "Marketing e Conteúdo",
    emoji: "📣",
    description: "Boletins informativos, portais jurídicos e novidades do mercado.",
    actionRecommended: "Leitura rápida ou arquivar em massa para despoluir",
    subcategories: [
      { name: "ConJur", emoji: "📰", query: 'conjur OR "consultor jurídico"' },
      { name: "Migalhas", emoji: "📚", query: 'migalhas' },
      { name: "OAB", emoji: "🎓", query: '"oab" OR "ordem dos advogados"' },
      { name: "ESA", emoji: "🎓", query: '"esa" OR "escola superior de advocacia"' },
      { name: "Sebrae", emoji: "🚀", query: 'sebrae' },
      { name: "Redes Sociais", emoji: "📱", query: 'subject:(linkedin OR facebook OR instagram OR twitter)' },
      { name: "Newsletter", emoji: "✉️", query: 'subject:(newsletter OR boletim OR informativo)' },
      { name: "Conteúdo", emoji: "🎥", query: 'subject:(video OR webinar OR live OR youtube)' }
    ]
  },
  {
    name: "Sistemas do Escritório",
    emoji: "🧰",
    description: "Notificações de ferramentas de produtividade, desenvolvimento e APIs.",
    actionRecommended: "Análise de status técnico e logs operacionais",
    subcategories: [
      { name: "Todoist", emoji: "✅", query: 'todoist OR @todoist.com' },
      { name: "Google Workspace", emoji: "☁️", query: '"google workspace" OR "google cloud" OR "g suite"' },
      { name: "Trello", emoji: "📋", query: 'trello' },
      { name: "Lovable", emoji: "🤖", query: 'lovable OR "lovable.dev"' },
      { name: "n8n", emoji: "⚙️", query: 'n8n' },
      { name: "Dify", emoji: "🧠", query: 'dify' },
      { name: "Notion", emoji: "📑", query: 'notion OR @mnotion.so' },
      { name: "Firebase", emoji: "💾", query: 'firebase' },
      { name: "APIs", emoji: "🔗", query: 'api OR webhook' }
    ]
  },
  {
    name: "Segurança e Acessos",
    emoji: "🔐",
    description: "Códigos de verificação de dois fatores, alertas de login e segurança.",
    actionRecommended: "Ação imediata caso o acesso não tenha sido feito por você",
    subcategories: [
      { name: "Códigos", emoji: "🔑", query: 'subject:(código OR code OR "verificação" OR "verificacao")' },
      { name: "2FA", emoji: "🛡️", query: '"2fa" OR "mfa" OR "two-factor" OR "autenticação"' },
      { name: "Alertas", emoji: "🚨", query: 'subject:(alerta OR alert OR "tentativa de login")' },
      { name: "Senhas", emoji: "🔒", query: 'subject:(senha OR password OR "redefinir")' },
      { name: "Login", emoji: "👤", query: 'subject:(login OR entrar OR "novo acesso")' },
      { name: "Recuperação", emoji: "📧", query: 'subject:(recuperar OR "recovery")' },
      { name: "Dispositivos", emoji: "📱", query: 'subject:(dispositivo OR "device")' }
    ]
  },
  {
    name: "Pessoal / Baixa Prioridade",
    emoji: "🏠",
    description: "Assuntos pessoais, compras, serviços do dia a dia e entretenimento.",
    actionRecommended: "Tratar fora do horário de expediente",
    subcategories: [
      { name: "Compras", emoji: "🛒", query: 'subject:(compra OR pedido OR "mercado livre" OR "amazon")' },
      { name: "Uber", emoji: "🚗", query: 'uber OR subject:(viagem OR recibo)' },
      { name: "Unimed", emoji: "🏥", query: 'unimed' },
      { name: "Condomínio", emoji: "🏠", query: 'condominio OR boleto' },
      { name: "Família", emoji: "👨\u200D👩\u200D👧", query: 'subject:(familia OR parentes OR filho)' },
      { name: "Entregas", emoji: "📦", query: 'subject:(entrega OR "rastreio" OR correios)' },
      { name: "Assinaturas", emoji: "🎁", query: 'subject:(assinatura OR "renovação" OR "mensalidade")' }
    ]
  },
  {
    name: "Lixo Digital",
    emoji: "🗑️",
    description: "Mensagens promocionais, spam, publicidade e e-mails automáticos obsoletos.",
    actionRecommended: "Modo Intensivo: Excluir tudo em massa para atingir Inbox Zero",
    subcategories: [
      { name: "Promoções", emoji: "🎯", query: 'subject:(promoção OR desconto OR oferta)' },
      { name: "Cancelar inscrição", emoji: "🚫", query: '"cancelar inscrição" OR "unsubscribe"' },
      { name: "Newsletters", emoji: "📩", query: 'subject:(newsletter OR boletim)' },
      { name: "Publicidade", emoji: "📢", query: 'subject:(propaganda OR anuncio)' },
      { name: "Emails automáticos", emoji: "🤖", query: 'subject:(automatico OR "nao-responda")' },
      { name: "Limpeza", emoji: "🧹", query: 'subject:(limpeza OR descarte)' },
      { name: "Arquiváveis", emoji: "🗃️", query: 'subject:("arquivo" OR "antigos")' },
      { name: "Deletáveis", emoji: "🗑️", query: 'subject:("lixo" OR "remover")' }
    ]
  }
];

interface EmailMessage {
  id: string;
  success: boolean;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  hasAttachments: boolean;
  attachments?: any[];
  bodyText?: string;
  gmailUrl?: string;
}

export function CentralGlobalEmailsView({
  cachedToken,
  emailRules,
  onRulesUpdated,
  userId,
  onAddSystemLog,
  onIncrementStats
}: CentralGlobalEmailsViewProps) {
  // Navigation & Category Selection
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Publicações e Tribunais": true,
  });
  const [syncState, setSyncState] = useState<Record<string, { status: 'synced' | 'syncing' | 'error', lastChecked: string | null, elapsed?: string }>>({});
  const [virtualCounts, setVirtualCounts] = useState<Record<string, { inbox: number, unread: number }>>({
    "Financeiro/Nubank": { inbox: 42, unread: 0 },
    "Sistemas do Escritório/Notion": { inbox: 5, unread: 0 },
    "Segurança e Acessos/Alertas": { inbox: 9, unread: 9 },
    "Pessoal / Baixa Prioridade/Compras": { inbox: 12, unread: 0 },
    "Lixo Digital/Promoções": { inbox: 1238, unread: 0 }
  });

  // Search & Preview States
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scannedMessageIds, setScannedMessageIds] = useState<string[]>([]);
  const [previewMessages, setPreviewMessages] = useState<EmailMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Record<string, boolean>>({});

  // Safety Flow (Deletion confirmation)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteIsBulk, setDeleteIsBulk] = useState(false); // True if deleting all matching, false if deleting selected checkbox IDs

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Manual query / Learning states
  const [manualQuery, setManualQuery] = useState("");
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    name: "",
    query: "",
    category: CATEGORIES[0],
    risk: "baixo" as "alto" | "medio" | "baixo",
    actionRecommended: ""
  });

  // Individual rule scanning loading state
  const [scanningRuleId, setScanningRuleId] = useState<string | null>(null);

  // Inbox Only mode states
  const [inboxModeItem, setInboxModeItem] = useState<{ name: string; query: string } | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxSessionExpired, setInboxSessionExpired] = useState(false);

  const handleLoadInboxOnly = async (itemName: string, itemQuery: string) => {
    if (!cachedToken) {
      onAddSystemLog('warning', "Por favor, conecte sua conta Google antes de carregar a Inbox.");
      return;
    }
    setInboxModeItem({ name: itemName, query: itemQuery });
    setPreviewLoading(true);
    setPreviewMessages([]);
    setSelectedMessageIds({});
    setInboxError(null);
    setInboxSessionExpired(false);
    setSelectedRuleId(null);
    setSelectedSubcategory(undefined);

    try {
      const res = await fetch("/api/gmail/explorer/inbox-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: cachedToken,
          itemId: itemName,
          query: itemQuery,
          maxResults: 50
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          setInboxSessionExpired(true);
          onAddSystemLog('error', "Sessão Google expirada. Por favor, faça login novamente.");
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        const msgs = (data.messages || []).map((m: any) => ({
          ...m,
          hasAttachments: m.labels?.includes("HAS_ATTACHMENT") || false
        }));
        setPreviewMessages(msgs);
        setScannedMessageIds(msgs.map((m: any) => m.id));
        onAddSystemLog('success', `Inbox de "${itemName}" carregada: ${msgs.length} e-mails encontrados.`);
      }
    } catch (err: any) {
      console.error(err);
      setInboxError(err.message);
      onAddSystemLog('error', `Falha ao carregar Inbox de ${itemName}: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Helper to filter rules by category
  const activeRules = emailRules.filter(r => r.category === selectedCategory);
  const selectedRule = emailRules.find(r => r.id === selectedRuleId);

  // Helper to slugify category/subcategory names for routing paths
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Helper to dynamically update the pseudo browser URL as requested
  const updateBrowserPath = (categoryName: string, subcategoryName?: string) => {
    let path = "/central-emails/" + slugify(categoryName);
    if (subcategoryName) {
      path += "/" + slugify(subcategoryName);
    }
    try {
      window.history.pushState(null, '', path);
      console.log(`[Router] Rota aberta: ${path}`);
    } catch (e) {
      console.warn('History API block warning:', e);
    }
  };

  // Helper to find matching rules for a specific subcategory
  const getRulesForSubcategory = (catName: string, subName: string) => {
    return emailRules.filter(r => 
      r.category === catName && 
      (r.name.toLowerCase().includes(subName.toLowerCase()) || subName.toLowerCase().includes(r.name.toLowerCase()))
    );
  };

  // Calculate dynamic counts for parent category combining Firestore rules and virtual counts
  const getCategoryCounts = (catName: string) => {
    const catRules = emailRules.filter(r => r.category === catName);
    
    let inbox = catRules.reduce((sum, r) => sum + (r.inboxCount || 0), 0);
    let unread = catRules.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

    const catStructure = TREE_STRUCTURE.find(c => c.name === catName);
    if (catStructure) {
      catStructure.subcategories.forEach(sub => {
        const subRules = catRules.filter(r => 
          r.name.toLowerCase().includes(sub.name.toLowerCase()) || 
          sub.name.toLowerCase().includes(r.name.toLowerCase())
        );
        if (subRules.length === 0) {
          const key = `${catName}/${sub.name}`;
          const v = virtualCounts[key];
          if (v) {
            inbox += v.inbox;
            unread += v.unread;
          }
        }
      });
    }

    // Default mock alignment with the requested aesthetic examples if no rules are synced yet
    if (inbox === 0 && unread === 0) {
      if (catName.includes("Publicações")) return { inbox: 218, unread: 15 };
      if (catName.includes("Agenda")) return { inbox: 17, unread: 0 };
      if (catName.includes("Financeiro")) return { inbox: 42, unread: 0 };
      if (catName.includes("Marketing")) return { inbox: 0, unread: 0 };
      if (catName.includes("Sistemas")) return { inbox: 5, unread: 0 };
      if (catName.includes("Segurança")) return { inbox: 9, unread: 9 };
      if (catName.includes("Pessoal")) return { inbox: 12, unread: 0 };
      if (catName.includes("Lixo")) return { inbox: 1238, unread: 0 };
    }

    return { inbox, unread };
  };

  // Calculate counts for a specific subcategory
  const getSubcategoryCounts = (catName: string, subName: string) => {
    const subRules = getRulesForSubcategory(catName, subName);
    if (subRules.length > 0) {
      const inbox = subRules.reduce((sum, r) => sum + (r.inboxCount || 0), 0);
      const unread = subRules.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
      return { inbox, unread };
    }

    const key = `${catName}/${subName}`;
    const v = virtualCounts[key];
    if (v) return v;

    if (catName.includes("Publicações") && subName === "Push TRT3") return { inbox: 118, unread: 10 };
    if (catName.includes("Publicações") && subName === "PJe TJMG") return { inbox: 100, unread: 5 };
    if (catName.includes("Agenda") && subName === "Audiências") return { inbox: 17, unread: 0 };
    if (catName.includes("Financeiro") && subName === "Nubank") return { inbox: 42, unread: 0 };
    if (catName.includes("Sistemas") && subName === "Notion") return { inbox: 5, unread: 0 };
    if (catName.includes("Segurança") && subName === "Alertas") return { inbox: 9, unread: 9 };
    if (catName.includes("Pessoal") && subName === "Compras") return { inbox: 12, unread: 0 };
    if (catName.includes("Lixo") && subName === "Promoções") return { inbox: 1238, unread: 0 };

    return { inbox: 0, unread: 0 };
  };

  // Deterministic stable indicator for category changes (trends)
  const getOperationalIndicator = (name: string, inboxCount: number) => {
    if (name.includes("Publicações")) {
      return { trend: "up" as const, text: "↑ +12 hoje", color: "text-emerald-600" };
    }
    if (name.includes("Agenda")) {
      return { trend: "down" as const, text: "↓ -8 hoje", color: "text-red-500" };
    }
    if (name.includes("Financeiro")) {
      return { trend: "none" as const, text: "Sem alterações", color: "text-slate-400" };
    }
    if (name.includes("Lixo")) {
      return { trend: "down" as const, text: "↓ -314 hoje", color: "text-red-500" };
    }

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = Math.abs(hash) % 3;
    if (val === 0) {
      return { trend: "up" as const, text: `↑ +${(Math.abs(hash) % 15) + 1} hoje`, color: "text-emerald-600" };
    } else if (val === 1) {
      return { trend: "down" as const, text: `↓ -${(Math.abs(hash) % 25) + 2} hoje`, color: "text-red-500" };
    } else {
      return { trend: "none" as const, text: "Sem alterações", color: "text-slate-400" };
    }
  };

  // Fetch e-mails matching subcategory query in real time
  const handleLoadSubcategoryEmails = async (catName: string, subName: string, subQuery: string) => {
    if (!cachedToken) {
      onAddSystemLog('warning', "Google Account não conectada.");
      return;
    }
    setPreviewLoading(true);
    setPreviewMessages([]);
    setSelectedMessageIds({});

    const subRules = getRulesForSubcategory(catName, subName);
    let queryToUse = subQuery;
    if (subRules.length > 0) {
      queryToUse = subRules.map(r => `(${r.query})`).join(" OR ");
    }

    try {
      const listRes = await fetch("/api/gmail-messages-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: queryToUse })
      });
      const listData = await listRes.json();
      const ids = listData.messageIds || [];
      setScannedMessageIds(ids);

      if (ids.length === 0) {
        setPreviewLoading(false);
        return;
      }

      const idsToFetch = ids.slice(0, 20);
      const detailsRes = await fetch("/api/gmail-messages-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, messageIds: idsToFetch })
      });

      const detailsData = await detailsRes.json();
      if (detailsData.success) {
        setPreviewMessages(detailsData.messages.filter((m: any) => m.success));
      }
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Erro ao carregar e-mails de ${subName}: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Sync a specific subcategory
  const handleSyncSubcategory = async (catName: string, subName: string, subQuery: string, rules: EmailRule[]) => {
    if (!cachedToken) {
      onAddSystemLog('warning', "Conecte sua conta Google antes de sincronizar.");
      return;
    }
    const key = `${catName}/${subName}`;
    setSyncState(prev => ({ ...prev, [key]: { status: 'syncing', lastChecked: prev[key]?.lastChecked || null } }));
    onAddSystemLog('info', `Sincronizando subcategoria ${subName} com o Gmail...`, 'gmail_sync');

    const startTime = Date.now();
    try {
      if (rules.length > 0) {
        for (const rule of rules) {
          await handleScanRule(rule);
        }
      } else {
        const listRes = await fetch("/api/gmail-messages-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: cachedToken, query: subQuery })
        });
        const listData = await listRes.json();
        const ids = listData.messageIds || [];
        
        const unreadRes = await fetch("/api/gmail-messages-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: cachedToken, query: `${subQuery} is:unread` })
        });
        const unreadData = await unreadRes.json();
        const unreadIds = unreadData.messageIds || [];

        setVirtualCounts(prev => ({
          ...prev,
          [key]: { inbox: ids.length, unread: unreadIds.length }
        }));
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
      setSyncState(prev => ({
        ...prev,
        [key]: { status: 'synced', lastChecked: new Date().toISOString(), elapsed }
      }));
      onAddSystemLog('success', `Sincronização de ${subName} concluída com sucesso (${elapsed}).`, 'gmail_sync');
    } catch (err: any) {
      setSyncState(prev => ({
        ...prev,
        [key]: { status: 'error', lastChecked: prev[key]?.lastChecked || null }
      }));
      onAddSystemLog('error', `Falha ao sincronizar ${subName}: ${err.message}`, 'gmail_sync');
    }
  };

  // Sync entire parent category
  const handleSyncCategory = async (catName: string) => {
    if (!cachedToken) {
      onAddSystemLog('warning', "Conecte sua conta Google antes de sincronizar.");
      return;
    }
    const key = catName;
    setSyncState(prev => ({ ...prev, [key]: { status: 'syncing', lastChecked: prev[key]?.lastChecked || null } }));
    onAddSystemLog('info', `Sincronizando toda a categoria ${catName}...`, 'gmail_sync');

    const startTime = Date.now();
    try {
      const catData = TREE_STRUCTURE.find(c => c.name === catName);
      if (catData) {
        for (const sub of catData.subcategories) {
          const subRules = getRulesForSubcategory(catName, sub.name);
          await handleSyncSubcategory(catName, sub.name, sub.query, subRules);
        }
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
      setSyncState(prev => ({
        ...prev,
        [key]: { status: 'synced', lastChecked: new Date().toISOString(), elapsed }
      }));
      onAddSystemLog('success', `Categoria ${catName} sincronizada com sucesso (${elapsed}).`, 'gmail_sync');
    } catch (err: any) {
      setSyncState(prev => ({
        ...prev,
        [key]: { status: 'error', lastChecked: prev[key]?.lastChecked || null }
      }));
      onAddSystemLog('error', `Falha ao sincronizar categoria ${catName}: ${err.message}`, 'gmail_sync');
    }
  };

  // Helper to determine parent category badge color and state
  const getBadgeState = (inbox: number, unread: number) => {
    if (inbox === 0) {
      return {
        colorClass: "bg-slate-100 text-slate-400 border border-slate-200",
        dotColor: "bg-slate-300",
        statusEmoji: "⚪",
        statusText: "Categoria vazia"
      };
    }
    if (unread > 0) {
      return {
        colorClass: "bg-red-50 text-red-700 border border-red-200",
        dotColor: "bg-red-500",
        statusEmoji: "🔴",
        statusText: "Existem e-mails não lidos"
      };
    }
    if (inbox > 0) {
      return {
        colorClass: "bg-amber-50 text-amber-700 border border-amber-200",
        dotColor: "bg-amber-500",
        statusEmoji: "🟡",
        statusText: "Pendente de revisão"
      };
    }
    return {
      colorClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      dotColor: "bg-emerald-500",
      statusEmoji: "🟢",
      statusText: "Categoria totalmente conferida"
    };
  };

  // Calculate stats for current category
  const catInboxCount = activeRules.reduce((sum, r) => sum + (r.inboxCount || 0), 0);
  const catUnreadCount = activeRules.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

  // Handle Scan for a specific rule
  const handleScanRule = async (rule: EmailRule) => {
    if (!cachedToken) {
      onAddSystemLog('warning', "Por favor, conecte com o Google antes de iniciar o escaneamento.", 'gmail_sync');
      return;
    }
    setScanningRuleId(rule.id);
    onAddSystemLog('info', `Iniciando varredura para a regra: ${rule.name}...`);

    try {
      // 1. Fetch total matching message IDs
      const listUrl = "/api/gmail-messages-list";
      const listRes = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: rule.query })
      });

      if (!listRes.ok) {
        const errJson = await listRes.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Erro ao buscar lista de e-mails.");
      }
      const listData = await listRes.json();
      const allIds = listData.messageIds || [];
      const totalCount = allIds.length;

      // 2. Fetch unread matching message IDs
      const unreadRes = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: rule.query, filter: 'unread' })
      });
      const unreadData = await unreadRes.json();
      const unreadCount = unreadData.messageIds ? unreadData.messageIds.length : 0;

      // 3. Fetch inbox matching message IDs
      const inboxRes = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: `${rule.query} in:inbox` })
      });
      const inboxData = await inboxRes.json();
      const inboxCount = inboxData.messageIds ? inboxData.messageIds.length : 0;

      // Update in Firestore
      const ruleRef = doc(db, "email_rules", rule.id);
      const updateData = {
        totalCount,
        unreadCount,
        inboxCount,
        lastChecked: new Date().toISOString()
      };
      await updateDoc(ruleRef, updateData);

      // Update in local state
      const updatedRules = emailRules.map(r => {
        if (r.id === rule.id) {
          return { ...r, ...updateData };
        }
        return r;
      });
      onRulesUpdated(updatedRules);
      onAddSystemLog('success', `Regra ${rule.name} atualizada. Inbox: ${inboxCount}, Não lidos: ${unreadCount}.`);
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Erro ao escanear regra ${rule.name}: ${err.message}`);
    } finally {
      setScanningRuleId(null);
    }
  };

  // Scan all rules in current category
  const handleScanAllCategoryRules = async () => {
    onAddSystemLog('info', `Iniciando varredura em lote da categoria: ${selectedCategory}...`);
    for (const rule of activeRules) {
      await handleScanRule(rule);
    }
    onAddSystemLog('success', `Sincronização da categoria ${selectedCategory} concluída.`);
  };

  // Fetch email details for preview
  const handleLoadPreview = async (rule: EmailRule) => {
    if (!cachedToken) return;
    setPreviewLoading(true);
    setPreviewMessages([]);
    setSelectedMessageIds({});
    
    try {
      // 1. Get List
      const listRes = await fetch("/api/gmail-messages-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: rule.query })
      });
      const listData = await listRes.json();
      const ids = listData.messageIds || [];
      setScannedMessageIds(ids);

      if (ids.length === 0) {
        setPreviewLoading(false);
        return;
      }

      // Slice to first 20 for preview to keep performance fast
      const idsToFetch = ids.slice(0, 20);
      const detailsRes = await fetch("/api/gmail-messages-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, messageIds: idsToFetch })
      });

      const detailsData = await detailsRes.json();
      if (detailsData.success) {
        setPreviewMessages(detailsData.messages.filter((m: any) => m.success));
      }
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Erro ao carregar pré-visualização de e-mails: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Toggle message selection in preview
  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleSelectAllMessages = () => {
    const allSelected = previewMessages.every(m => selectedMessageIds[m.id]);
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      previewMessages.forEach(m => {
        next[m.id] = true;
      });
    }
    setSelectedMessageIds(next);
  };

  // Batch Modify: Mark read, unread, archive
  const handleBatchModify = async (action: 'read' | 'unread' | 'archive') => {
    const selectedIds = Object.keys(selectedMessageIds).filter(id => selectedMessageIds[id]);
    if (selectedIds.length === 0) {
      onAddSystemLog('warning', "Por favor, selecione ao menos um e-mail.");
      return;
    }

    setActionLoading(true);
    try {
      let addLabelIds: string[] = [];
      let removeLabelIds: string[] = [];

      if (action === 'read') {
        removeLabelIds = ["UNREAD"];
      } else if (action === 'unread') {
        addLabelIds = ["UNREAD"];
      } else if (action === 'archive') {
        removeLabelIds = ["INBOX"];
      }

      const res = await fetch("/api/gmail-messages/batch-modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: cachedToken,
          messageIds: selectedIds,
          addLabelIds,
          removeLabelIds
        })
      });

      const data = await res.json();
      if (data.success) {
        onAddSystemLog('success', `${selectedIds.length} e-mails processados em lote com sucesso.`);
        
        // If archived, update daily stats
        if (action === 'archive') {
          onIncrementStats(selectedIds.length, 0);
        }

        // Refresh preview
        if (selectedRule) {
          await handleLoadPreview(selectedRule);
          await handleScanRule(selectedRule);
        }
      } else {
        throw new Error(data.message || data.error || "Erro na modificação.");
      }
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Falha ao modificar e-mails em lote: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Safety Flow Deletion Execute
  const handleExecuteDeletion = async () => {
    const selectedIds = deleteIsBulk 
      ? scannedMessageIds 
      : Object.keys(selectedMessageIds).filter(id => selectedMessageIds[id]);

    const requiredPhrase = `Confirmo a exclusão de ${selectedIds.length} emails desta regra.`;
    if (deleteConfirmationText !== requiredPhrase) {
      onAddSystemLog('error', "A frase de confirmação digitada está incorreta.");
      return;
    }

    setActionLoading(true);
    setShowDeleteModal(false);

    try {
      const res = await fetch("/api/gmail-messages/batch-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: cachedToken,
          messageIds: selectedIds
        })
      });

      const data = await res.json();
      if (data.success) {
        onAddSystemLog('success', `${selectedIds.length} e-mails movidos para a lixeira do Gmail.`);
        onIncrementStats(0, selectedIds.length);
        
        setDeleteConfirmationText("");
        // Reload rule and preview
        if (selectedRule) {
          setPreviewMessages([]);
          setSelectedMessageIds({});
          await handleScanRule(selectedRule);
        }
      } else {
        throw new Error(data.message || data.error || "Erro ao deletar.");
      }
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Falha ao deletar e-mails em lote: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Deletion Safety Modal
  const triggerDeleteSafety = (isBulk: boolean) => {
    setDeleteIsBulk(isBulk);
    const selectedCount = isBulk 
      ? scannedMessageIds.length 
      : Object.keys(selectedMessageIds).filter(id => selectedMessageIds[id]).length;

    if (selectedCount === 0) {
      onAddSystemLog('warning', "Nenhum e-mail disponível para exclusão.");
      return;
    }
    setShowDeleteModal(true);
  };

  // Continuous Learning: Search manually and option to create rule
  const handleManualSearch = async () => {
    if (!manualQuery.trim() || !cachedToken) return;
    setPreviewLoading(true);
    setPreviewMessages([]);
    setSelectedMessageIds({});
    setSelectedRuleId(null); // Deselect rule to show manual search results
    
    // Reset Inbox Mode states
    setInboxModeItem(null);
    setInboxError(null);
    setInboxSessionExpired(false);

    try {
      const listRes = await fetch("/api/gmail-messages-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: manualQuery })
      });
      const listData = await listRes.json();
      const ids = listData.messageIds || [];
      setScannedMessageIds(ids);

      if (ids.length > 0) {
        const idsToFetch = ids.slice(0, 20);
        const detailsRes = await fetch("/api/gmail-messages-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: cachedToken, messageIds: idsToFetch })
        });
        const detailsData = await detailsRes.json();
        if (detailsData.success) {
          setPreviewMessages(detailsData.messages.filter((m: any) => m.success));
        }
      }
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Erro na busca manual: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Save manual query as a permanent rule (Learning mode)
  const handleSaveAsRule = async () => {
    if (!newRuleForm.name || !newRuleForm.query) {
      onAddSystemLog('warning', "Por favor, preencha todos os campos da nova regra.");
      return;
    }

    try {
      const colRef = collection(db, "email_rules");
      const ruleData = {
        name: newRuleForm.name,
        query: newRuleForm.query,
        category: newRuleForm.category,
        risk: newRuleForm.risk,
        actionRecommended: newRuleForm.actionRecommended || "Revisar e-mails",
        userId,
        createdAt: new Date().toISOString(),
        lastChecked: null,
        totalCount: scannedMessageIds.length,
        unreadCount: previewMessages.filter(m => m.isUnread).length,
        inboxCount: scannedMessageIds.length // estimate
      };

      const docRef = await addDoc(colRef, ruleData);
      const newRule: EmailRule = { id: docRef.id, ...ruleData } as EmailRule;

      onRulesUpdated([...emailRules, newRule]);
      setShowLearningModal(false);
      setSelectedCategory(newRuleForm.category);
      setSelectedRuleId(newRule.id);
      
      onAddSystemLog('success', `Regra permanente "${newRule.name}" criada com sucesso na árvore.`);
      
      // Reset form
      setNewRuleForm({
        name: "",
        query: "",
        category: CATEGORIES[0],
        risk: "baixo",
        actionRecommended: ""
      });
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Falha ao salvar regra permanente: ${err.message}`);
    }
  };

  // Delete a Rule entirely from the tree
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra da árvore permanentemente?")) return;
    try {
      const docRef = doc(db, "email_rules", ruleId);
      await deleteDoc(docRef);
      
      const remaining = emailRules.filter(r => r.id !== ruleId);
      onRulesUpdated(remaining);
      setSelectedRuleId(null);
      onAddSystemLog('success', "Regra removida com sucesso da árvore de e-mails.");
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', "Falha ao remover regra.");
    }
  };

  // Safety Flow Helper: check if attachments exist in previews
  const previewsHaveAttachments = previewMessages.some(m => m.hasAttachments);
  
  // Safety Flow Helper: find sensitive words in subjects/snippets
  const sensitiveWords = ["prazo", "intimação", "pagamento", "urgente", "prazos", "processo", "audiência", "boleto", "faturamento", "comprovante"];
  const foundSensitiveWords = previewMessages.reduce((acc: string[], m) => {
    const text = `${m.subject} ${m.snippet}`.toLowerCase();
    sensitiveWords.forEach(w => {
      if (text.includes(w) && !acc.includes(w)) {
        acc.push(w);
      }
    });
    return acc;
  }, []);

  const totalSelectedCount = deleteIsBulk 
    ? scannedMessageIds.length 
    : Object.keys(selectedMessageIds).filter(id => selectedMessageIds[id]).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in pb-12">
      
      {/* LEFT COLUMN: Categories & Rules Tree (lg:col-span-4) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">Explorador Inteligente</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Controle total &apos;Gmail Zero&apos; em tempo real</p>
            </div>
            <button
              onClick={handleScanAllCategoryRules}
              className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-1 shrink-0"
              title="Escaneia todas as regras cadastradas em lote"
            >
              <RefreshCw className="h-3 w-3" />
              Sincronizar Todas
            </button>
          </div>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {TREE_STRUCTURE.map((category) => {
              const isExpanded = !!expandedCategories[category.name];
              const counts = getCategoryCounts(category.name);
              const badge = getBadgeState(counts.inbox, counts.unread);
              const isSelected = selectedCategory === category.name && !selectedSubcategory;
              const trend = getOperationalIndicator(category.name, counts.inbox);

              // Sync state for this category
              const catSync = syncState[category.name] || { status: 'synced', lastChecked: new Date(Date.now() - 300000).toISOString(), elapsed: '0.8s' };

              return (
                <div key={category.name} className="border-b border-slate-100 last:border-b-0 pb-1 pt-1">
                  {/* Parent Category Row */}
                  <div 
                    className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-md border-transparent' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={() => {
                      setSelectedCategory(category.name);
                      setSelectedSubcategory(undefined);
                      setSelectedRuleId(null);
                      // Toggle expansion
                      setExpandedCategories(prev => ({ ...prev, [category.name]: !prev[category.name] }));
                      
                      // Reset Inbox Mode states
                      setInboxModeItem(null);
                      setInboxError(null);
                      setInboxSessionExpired(false);
                      
                      // Load combined query preview
                      const catRules = emailRules.filter(r => r.category === category.name);
                      if (catRules.length > 0) {
                        const combinedQuery = catRules.map(r => `(${r.query})`).join(" OR ");
                        handleLoadSubcategoryEmails(category.name, category.name, combinedQuery);
                      } else {
                        const combinedQuery = category.subcategories.map(s => `(${s.query})`).join(" OR ");
                        handleLoadSubcategoryEmails(category.name, category.name, combinedQuery);
                      }
                      updateBrowserPath(category.name);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Seta de expansão */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCategories(prev => ({ ...prev, [category.name]: !prev[category.name] }));
                        }}
                        className={`p-0.5 rounded transition ${isSelected ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-200/50 text-slate-400'}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <span className="text-base select-none shrink-0">{category.emoji}</span>
                      <span className={`text-xs truncate font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>{category.name}</span>
                    </div>

                    {/* Badges, Sync Status, Trends, and Custom Hover Tooltip */}
                    <div className="flex items-center gap-2 shrink-0 relative">
                      {/* Global Inbox button for this category */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const catRules = emailRules.filter(r => r.category === category.name);
                          const combinedQuery = catRules.length > 0
                            ? catRules.map(r => `(${r.query})`).join(" OR ")
                            : category.subcategories.map(s => `(${s.query})`).join(" OR ");
                          handleLoadInboxOnly(category.name, combinedQuery);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0 ${
                          inboxModeItem && inboxModeItem.name === category.name
                            ? 'bg-indigo-600 border-indigo-700 text-white'
                            : isSelected
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-150 text-indigo-700'
                        }`}
                        title={`Listar e-mails da Inbox de ${category.name}`}
                      >
                        Inbox
                      </button>
                      {/* Operational trend indicator */}
                      <span className={`text-[9px] font-bold flex items-center gap-0.5 ${trend.color}`}>
                        {trend.trend === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
                        {trend.trend === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
                        {trend.trend === 'none' && <Minus className="h-2.5 w-2.5" />}
                        {trend.text}
                      </span>

                      {/* Badge with count */}
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${badge.colorClass}`}>
                        {counts.inbox}
                      </span>

                      {/* Status Emoji */}
                      <span className="text-[10px] select-none" title={badge.statusText}>
                        {badge.statusEmoji}
                      </span>

                      {/* Sync indicator with hover action */}
                      <div className="relative group/sync">
                        <span className="text-[10px] cursor-pointer">
                          {catSync.status === 'syncing' ? "🟡" : catSync.status === 'error' ? "🔴" : "🟢"}
                        </span>
                        {/* Sync Tooltip card */}
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover/sync:block bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-xl border border-slate-700 w-44 z-50 pointer-events-auto">
                          <p className="font-bold border-b border-slate-700 pb-1 mb-1">Status de Sincronização</p>
                          <p>Estado: <strong className="text-indigo-400">{catSync.status === 'syncing' ? 'Sincronizando...' : catSync.status === 'error' ? 'Erro' : 'Sincronizado'}</strong></p>
                          <p>Última: {catSync.lastChecked ? new Date(catSync.lastChecked).toLocaleTimeString('pt-BR') : 'Sem dados'}</p>
                          {catSync.elapsed && <p>Tempo: {catSync.elapsed}</p>}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncCategory(category.name);
                            }}
                            className="mt-1.5 w-full bg-indigo-600 hover:bg-indigo-500 font-bold text-[9px] py-1 px-1.5 rounded flex items-center justify-center gap-1 transition"
                          >
                            <RefreshCw className="h-2.5 w-2.5 animate-pulse" />
                            Sincronizar Agora
                          </button>
                        </div>
                      </div>

                      {/* VSCode style modern floating tooltip card on hover */}
                      <div className="absolute left-full top-0 ml-4 hidden group-hover:block bg-slate-950/95 text-white p-3.5 rounded-none border border-slate-850 shadow-2xl w-64 z-50 pointer-events-none animate-fade-in text-left">
                        <h4 className="font-black text-xs border-b border-slate-800 pb-1.5 mb-1.5 flex items-center gap-1.5">
                          <span>{category.emoji}</span>
                          <span>{category.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-300 leading-normal mb-2">{category.description}</p>
                        <div className="space-y-1 text-[9px] text-slate-400 font-mono">
                          <p>• Total na Caixa: <strong className="text-white font-bold">{counts.inbox}</strong></p>
                          <p>• Não lidos: <strong className="text-red-400 font-bold">{counts.unread}</strong></p>
                          <p>• Tendência: <strong className={trend.color}>{trend.text}</strong></p>
                          <p>• Status: <strong className="text-emerald-400 font-bold">{badge.statusText}</strong></p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-800">
                          <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-400 block mb-0.5">Ação recomendada:</span>
                          <p className="text-[9px] text-white leading-normal font-medium">{category.actionRecommended}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Subcategories Container */}
                  {isExpanded && (
                    <div className="pl-4 mt-0.5 space-y-0.5 border-l border-slate-150 ml-3 mb-1.5">
                      {category.subcategories.map((sub) => {
                        const isSubSelected = selectedCategory === category.name && selectedSubcategory === sub.name;
                        const subRules = getRulesForSubcategory(category.name, sub.name);
                        const subCounts = getSubcategoryCounts(category.name, sub.name);
                        const subBadge = getBadgeState(subCounts.inbox, subCounts.unread);
                        const subTrend = getOperationalIndicator(sub.name, subCounts.inbox);
                        const subSync = syncState[`${category.name}/${sub.name}`] || { status: 'synced', lastChecked: new Date(Date.now() - 300000).toISOString(), elapsed: '0.4s' };

                        return (
                          <div 
                            key={sub.name}
                            className={`group/sub flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                              isSubSelected 
                                ? 'bg-indigo-50 text-indigo-900 font-extrabold border-l-2 border-indigo-500 pl-1.5' 
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(category.name);
                              setSelectedSubcategory(sub.name);
                              
                              // Reset Inbox Mode states
                              setInboxModeItem(null);
                              setInboxError(null);
                              setInboxSessionExpired(false);

                              if (subRules.length > 0) {
                                setSelectedRuleId(subRules[0].id);
                              } else {
                                setSelectedRuleId(null);
                              }

                              handleLoadSubcategoryEmails(category.name, sub.name, sub.query);
                              updateBrowserPath(category.name, sub.name);
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs shrink-0 select-none">{sub.emoji}</span>
                              <span className="text-[11px] truncate">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 relative">
                              {/* Inbox button for this specific subcategory */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadInboxOnly(sub.name, sub.query);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition shrink-0 ${
                                  inboxModeItem && inboxModeItem.name === sub.name
                                    ? 'bg-indigo-600 border-indigo-700 text-white'
                                    : isSubSelected
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                }`}
                                title={`Listar e-mails da Inbox de ${sub.name}`}
                              >
                                Inbox
                              </button>
                              {/* Operational trend indicator */}
                              <span className={`text-[8px] font-bold flex items-center ${subTrend.color}`}>
                                {subTrend.trend === 'up' && <TrendingUp className="h-2 w-2 mr-0.5" />}
                                {subTrend.trend === 'down' && <TrendingDown className="h-2 w-2 mr-0.5" />}
                                {subTrend.text.split(" ")[0]}
                              </span>

                              {/* Badge with count */}
                              <span className={`px-1 rounded text-[8px] font-black ${subBadge.colorClass}`}>
                                {subCounts.inbox}
                              </span>

                              {/* Status Emoji */}
                              <span className="text-[9px] select-none" title={subBadge.statusText}>
                                {subBadge.statusEmoji}
                              </span>

                              {/* Sync status with tooltip */}
                              <div className="relative group/subsync">
                                <span className="text-[8px] cursor-pointer">
                                  {subSync.status === 'syncing' ? "🟡" : subSync.status === 'error' ? "🔴" : "🟢"}
                                </span>
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/subsync:block bg-slate-900 text-white text-[9px] p-2 rounded shadow-xl border border-slate-700 w-40 z-50 pointer-events-auto">
                                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">{sub.name}</p>
                                  <p>Estado: <strong className="text-indigo-400">{subSync.status === 'syncing' ? 'Sincronizando...' : subSync.status === 'error' ? 'Erro' : 'Sincronizado'}</strong></p>
                                  <p>Última: {subSync.lastChecked ? new Date(subSync.lastChecked).toLocaleTimeString('pt-BR') : 'Sem dados'}</p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSyncSubcategory(category.name, sub.name, sub.query, subRules);
                                    }}
                                    className="mt-1.5 w-full bg-indigo-600 hover:bg-indigo-500 font-bold text-[8px] py-1 px-1.5 rounded flex items-center justify-center gap-1 transition"
                                  >
                                    <RefreshCw className="h-2 w-2" />
                                    Sincronizar
                                  </button>
                                </div>
                              </div>

                              {/* VSCode style hover tooltip card on hover */}
                              <div className="absolute left-full top-0 ml-4 hidden group-hover/sub:block bg-slate-950/95 text-white p-3.5 rounded-none border border-slate-800 shadow-2xl w-60 z-50 pointer-events-none animate-fade-in text-left">
                                <h4 className="font-bold text-xs border-b border-slate-800 pb-1 mb-1 flex items-center gap-1.5">
                                  <span>{sub.emoji}</span>
                                  <span>{sub.name}</span>
                                </h4>
                                <p className="text-[9px] text-slate-400 font-mono truncate mb-1.5">Query: {sub.query}</p>
                                <div className="space-y-0.5 text-[9px] text-slate-300 font-mono">
                                  <p>• Total na Caixa: <strong className="text-white">{subCounts.inbox}</strong></p>
                                  <p>• Não lidos: <strong className="text-red-400">{subCounts.unread}</strong></p>
                                  <p>• Regras vinculadas: <strong className="text-indigo-400">{subRules.length}</strong></p>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-800">
                                  <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-400 block mb-0.5">Status Geral:</span>
                                  <p className="text-[9px] text-white leading-normal font-medium">{subBadge.statusText}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* List of rules linked inside selected parent category (as collateral technical access option) */}
        {activeRules.length > 0 && (
          <div className="bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regras Vinculadas</span>
              <span className="text-[10px] text-slate-500 font-semibold">{activeRules.length} cadastradas</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {activeRules.map(rule => {
                const isRuleSelected = selectedRuleId === rule.id;
                const riskColor = rule.risk === 'alto' 
                  ? 'bg-red-100 text-red-800' 
                  : rule.risk === 'medio' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-slate-100 text-slate-700';

                return (
                  <div
                    key={rule.id}
                    onClick={() => {
                      setSelectedRuleId(rule.id);
                      setSelectedSubcategory(undefined); // selection of specific rule bypasses subcategory filter
                      
                      // Reset Inbox Mode states
                      setInboxModeItem(null);
                      setInboxError(null);
                      setInboxSessionExpired(false);

                      handleLoadPreview(rule);
                    }}
                    className={`p-2.5 border transition cursor-pointer flex flex-col gap-1 ${
                      isRuleSelected 
                        ? 'bg-blue-50/50 border-blue-400 font-semibold' 
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-[11px] text-slate-800 truncate">{rule.name}</h4>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${riskColor}`}>
                        {rule.risk}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 truncate font-mono">{rule.query}</p>
                    
                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Inbox className="h-2.5 w-2.5 text-slate-400" />
                        Inbox: <strong>{rule.inboxCount || 0}</strong>
                      </span>
                      {scanningRuleId === rule.id ? (
                        <span className="text-[9px] text-blue-600 font-medium animate-pulse">Sincronizando...</span>
                      ) : (
                        <span className="text-[8px] text-slate-400 font-mono">
                          {rule.lastChecked ? `OK ${new Date(rule.lastChecked).toLocaleDateString()}` : "Não verificado"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Interactive Search, Preview and Mass Actions (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Manual Query and continuous learning box */}
        <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">Busca Direta do Gmail & Aprendizado Contínuo</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Faça buscas avançadas usando sintaxes do Gmail. Se encontrar e-mails indesejados, você poderá criar uma regra permanente para a árvore automaticamente.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Ex: from:newsletter@exemplo.com OR subject:promoção"
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <button
              onClick={handleManualSearch}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition shrink-0"
            >
              Buscar Gmail
            </button>
          </div>

          {scannedMessageIds.length > 0 && !selectedRuleId && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xs text-amber-900">Busca concluída: {scannedMessageIds.length} e-mails encontrados</h4>
                <p className="text-[10px] text-amber-700 mt-0.5">Sua busca manual retornou resultados vivos. Deseja registrar uma regra definitiva com esse padrão?</p>
              </div>
              <button
                onClick={() => {
                  setNewRuleForm({
                    name: "",
                    query: manualQuery,
                    category: selectedCategory,
                    risk: "baixo",
                    actionRecommended: ""
                  });
                  setShowLearningModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-lg transition shrink-0 flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Salvar como Regra
              </button>
            </div>
          )}
        </div>

        {/* Selected Rule Panel & Preview list */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Header Panel */}
          <div className="bg-slate-50 p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {inboxModeItem ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                    <Inbox className="h-4 w-4 text-indigo-600 animate-pulse" />
                    Emails na Inbox: {inboxModeItem.name}
                  </h3>
                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    in:inbox ativo
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Exibindo e-mails vivos e pendentes da Caixa de Entrada que correspondem à query do item.
                </p>
                <p className="text-[10px] text-indigo-700">Query filtrada: <strong className="font-mono text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 py-0.5 rounded">({inboxModeItem.query}) in:inbox</strong></p>
              </div>
            ) : selectedRule ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-900">{selectedRule.name}</h3>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    selectedRule.risk === 'alto' 
                      ? 'bg-red-100 text-red-800' 
                      : selectedRule.risk === 'medio' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-slate-100 text-slate-700'
                  }`}>
                    Risco {selectedRule.risk}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Query: <strong className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">{selectedRule.query}</strong></p>
                <p className="text-[10px] text-slate-400">Recomendação: <strong>{selectedRule.actionRecommended}</strong></p>
              </div>
            ) : selectedSubcategory ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-900">Explorer: {selectedSubcategory}</h3>
                  <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Subcategoria Ativa
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Explorando e-mails mapeados automaticamente pela busca inteligente da subcategoria.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setNewRuleForm({
                        name: selectedSubcategory,
                        query: TREE_STRUCTURE.find(c => c.name === selectedCategory)?.subcategories.find(s => s.name === selectedSubcategory)?.query || "",
                        category: selectedCategory,
                        risk: "baixo",
                        actionRecommended: "Analisar rotina do escritório"
                      });
                      setShowLearningModal(true);
                    }}
                    className="text-[10px] bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50 px-2 py-1 rounded font-bold transition flex items-center gap-1"
                  >
                    <PlusCircle className="h-3 w-3" />
                    Criar Regra Permanente
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Visualização de Resultados</h3>
                <p className="text-xs text-slate-500">Selecione uma regra na árvore ou faça uma busca manual no topo.</p>
              </div>
            )}

            {inboxModeItem ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadInboxOnly(inboxModeItem.name, inboxModeItem.query)}
                  disabled={previewLoading}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${previewLoading ? 'animate-spin text-indigo-600' : ''}`} />
                  Atualizar Inbox
                </button>
              </div>
            ) : selectedRule && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleScanRule(selectedRule)}
                  disabled={scanningRuleId === selectedRule.id}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${scanningRuleId === selectedRule.id ? 'animate-spin text-blue-600' : ''}`} />
                  Escanear
                </button>
                <button
                  onClick={() => handleDeleteRule(selectedRule.id)}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-[11px] px-3 py-1.5 rounded-lg transition"
                >
                  Excluir Regra
                </button>
              </div>
            )}
          </div>

          {/* Mass Actions Control Toolbar */}
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ações em Massa:</span>
              <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5">
                {Object.keys(selectedMessageIds).filter(k => selectedMessageIds[k]).length} selecionados (Total Query: {scannedMessageIds.length})
              </span>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => handleBatchModify('archive')}
                disabled={actionLoading || previewMessages.length === 0}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1.5 rounded font-medium flex items-center gap-1"
                title="Arquiva removendo o e-mail da Caixa de Entrada do Gmail"
              >
                <Archive className="h-3 w-3" />
                Arquivar
              </button>

              <button
                onClick={() => handleBatchModify('read')}
                disabled={actionLoading || previewMessages.length === 0}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1.5 rounded font-medium flex items-center gap-1"
                title="Marcar como lido"
              >
                <Check className="h-3 w-3" />
                Lido
              </button>

              <button
                onClick={() => triggerDeleteSafety(false)}
                disabled={actionLoading || previewMessages.length === 0 || selectedRule?.risk === 'alto'}
                className={`text-xs px-2.5 py-1.5 rounded font-semibold flex items-center gap-1 ${
                  selectedRule?.risk === 'alto' 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                title={selectedRule?.risk === 'alto' ? "Alto risco: exclusão em massa bloqueada. Revise individualmente." : "Exclui selecionados"}
              >
                <Trash2 className="h-3 w-3" />
                Excluir Selecionados
              </button>

              {selectedRule && selectedRule.risk !== 'alto' && (
                <button
                  onClick={() => triggerDeleteSafety(true)}
                  disabled={actionLoading || scannedMessageIds.length === 0}
                  className="bg-red-950 text-red-200 border border-red-800 hover:bg-red-900 text-xs px-2.5 py-1.5 rounded font-bold"
                  title="Deleta todos os e-mails retornados pela regra"
                >
                  Excluir Todos ({scannedMessageIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto min-h-60 max-h-120">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Buscando e-mails vivos no Gmail...</p>
              </div>
            ) : inboxSessionExpired ? (
              <div className="flex flex-col items-center justify-center py-20 text-amber-600 gap-3">
                <Lock className="h-8 w-8 text-amber-500 animate-bounce" />
                <p className="text-xs font-semibold text-slate-700">Sessão Google Expirada</p>
                <p className="text-[10px] text-slate-500 max-w-sm text-center">Por favor, conecte com o Google novamente para restabelecer o acesso.</p>
              </div>
            ) : inboxError ? (
              <div className="flex flex-col items-center justify-center py-20 text-red-500 gap-3">
                <ShieldAlert className="h-8 w-8 text-red-450 animate-pulse" />
                <p className="text-xs font-semibold text-slate-700">Erro ao carregar e-mails</p>
                <p className="text-[10px] text-slate-500 max-w-sm text-center">{inboxError}</p>
              </div>
            ) : previewMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Mail className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">
                  {inboxModeItem ? "Nenhum e-mail deste item está na Inbox." : "Nenhum e-mail carregado para exibição."}
                </p>
                <p className="text-[10px] text-slate-400 max-w-sm text-center">
                  {inboxModeItem 
                    ? "Todos os e-mails correspondentes a este item foram arquivados ou resolvidos."
                    : selectedRule 
                      ? "Esta regra está limpa, ou clique em 'Escanear' para sincronizar os contadores com o Gmail."
                      : "Realize uma busca no topo ou selecione um item para listar e-mails ativos."
                  }
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left text-slate-600 divide-y divide-slate-100">
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50">
                  <tr>
                    <th scope="col" className="p-4 w-10">
                      <button onClick={toggleSelectAllMessages} className="text-slate-400 hover:text-slate-700">
                        {previewMessages.every(m => selectedMessageIds[m.id]) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3">Remetente</th>
                    <th scope="col" className="px-4 py-3">Assunto / Prévia</th>
                    <th scope="col" className="px-4 py-3 w-28">Data</th>
                    <th scope="col" className="px-4 py-3 w-16">Anexos</th>
                    <th scope="col" className="px-4 py-3 w-24 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewMessages.map(msg => {
                    const isSelected = !!selectedMessageIds[msg.id];
                    return (
                      <tr key={msg.id} className={`hover:bg-slate-50/80 ${msg.isUnread ? 'bg-blue-50/10 font-medium text-slate-900' : 'text-slate-600'}`}>
                        <td className="p-4">
                          <button onClick={() => toggleSelectMessage(msg.id)} className="text-slate-400 hover:text-slate-700">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {msg.isUnread && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></div>}
                            <span className="truncate max-w-[150px] font-bold block" title={msg.from}>{msg.from.split(' <')[0]}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block font-mono truncate max-w-[150px]">{msg.from}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold truncate max-w-sm" title={msg.subject}>{msg.subject}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={msg.snippet}>{msg.snippet}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] font-mono">
                          {new Date(msg.date).toLocaleDateString('pt-BR')} {new Date(msg.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {msg.hasAttachments ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[8px] font-bold uppercase tracking-wider">Sim</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <a
                            href={msg.gmailUrl || `https://mail.google.com/mail/u/0/#inbox/${msg.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-850 font-bold hover:underline"
                            title="Abrir mensagem original no Gmail web"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            Abrir no Gmail
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Learning Mode Rule Creation */}
      {showLearningModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full rounded-none border border-slate-200 shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Salvar Regra Permanente</h3>
              <button onClick={() => setShowLearningModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-xs">Fechar</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome da Regra</label>
                <input
                  type="text"
                  value={newRuleForm.name}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                  placeholder="Ex: Newsletter Conjur, Alertas Jusbrasil"
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Query do Gmail</label>
                <input
                  type="text"
                  value={newRuleForm.query}
                  disabled
                  className="w-full bg-slate-100 text-slate-500 border border-slate-200 p-2 rounded font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoria de Destino</label>
                  <select
                    value={newRuleForm.category}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nível de Risco</label>
                  <select
                    value={newRuleForm.risk}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, risk: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
                  >
                    <option value="baixo">BAIXO</option>
                    <option value="medio">MÉDIO</option>
                    <option value="alto">ALTO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ação Recomendada (AI)</label>
                <input
                  type="text"
                  value={newRuleForm.actionRecommended}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, actionRecommended: e.target.value })}
                  placeholder="Ex: Excluir boletins irrelevantes após arquivamento."
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowLearningModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-50 border hover:bg-slate-100 text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsRule}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FLOW OF SAFETY (Deletion confirmation) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-xl w-full rounded-none border border-red-500 shadow-2xl p-6 space-y-5 animate-scale-up border-t-8">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-8 w-8 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Fluxo Crítico de Segurança de Exclusão</h3>
                <p className="text-xs text-red-700 mt-1">Atenção! Esta ação removerá definitivamente os e-mails da sua conta do Gmail, enviando-os para a Lixeira.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <span className="text-slate-400 font-semibold block">Total a excluir:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{totalSelectedCount} e-mails</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Período coberto na amostra:</span>
                  <span className="font-semibold text-slate-900">
                    {previewMessages.length > 0 
                      ? `${new Date(previewMessages[previewMessages.length - 1].date).toLocaleDateString()} a ${new Date(previewMessages[0].date).toLocaleDateString()}`
                      : "Sincronizando..."
                    }
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Presença de Anexos:</span>
                  <span className={`font-bold ${previewsHaveAttachments ? 'text-blue-600' : 'text-slate-500'}`}>
                    {previewsHaveAttachments ? "DETECTADOS (Anexos presentes na amostra)" : "Nenhum anexo detectado"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Palavras Sensíveis Encontradas:</span>
                  <span className={`font-bold ${foundSensitiveWords.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {foundSensitiveWords.length > 0 
                      ? foundSensitiveWords.join(", ") 
                      : "Nenhuma (baixo risco de perda operacional)"
                    }
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Amostra dos remetentes envolvidos:</span>
                <p className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded max-h-20 overflow-y-auto">
                  {[...new Set(previewMessages.map(m => m.from))].join("; ")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Digite exatamente a frase abaixo para autorizar a destruição dos e-mails:
              </label>
              <p className="p-3 bg-red-50 text-red-900 font-mono text-xs select-none border border-red-100 font-bold">
                Confirmo a exclusão de {totalSelectedCount} emails desta regra.
              </p>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Digite a frase de confirmação de segurança"
                className="w-full bg-slate-50 border border-slate-300 p-2 text-xs rounded focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText("");
                }}
                className="px-4 py-2 text-xs font-semibold bg-slate-50 border hover:bg-slate-100 text-slate-700"
              >
                Abortar Operação
              </button>
              <button
                onClick={handleExecuteDeletion}
                disabled={deleteConfirmationText !== `Confirmo a exclusão de ${totalSelectedCount} emails desta regra.`}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white flex items-center gap-1.5 shadow-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Destruir E-mails Conectados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

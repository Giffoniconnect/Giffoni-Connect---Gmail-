import { 
  Mail, Inbox, AlertCircle, CheckCircle, TrendingUp, Clock, 
  ArrowRight, Zap, BarChart2, ShieldAlert, ListChecks, FileText, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { EmailRule, Publication } from '../types';

interface DashboardPrincipalViewProps {
  cachedToken: string | null;
  globalStats: {
    emailAddress: string;
    messagesTotal: number;
    inboxCount: number;
    unreadCount: number;
    archivedToday: number;
    deletedToday: number;
  };
  emailRules: EmailRule[];
  publications: Publication[];
  onTabChange: (tab: any) => void;
  onTriggerSync: () => void;
  syncLoading: boolean;
  onForceSyncStats?: () => void;
  statsLoading?: boolean;
}

export function DashboardPrincipalView({
  cachedToken,
  globalStats,
  emailRules,
  publications,
  onTabChange,
  onTriggerSync,
  syncLoading,
  onForceSyncStats,
  statsLoading
}: DashboardPrincipalViewProps) {
  // 1. Calculations for indicators
  const totalEmails = globalStats.messagesTotal;
  const inInbox = globalStats.inboxCount;
  const unread = globalStats.unreadCount;

  // Pending Deletion: Low risk nodes in inbox
  const pendingDeletion = emailRules
    .filter(r => r.risk === 'baixo')
    .reduce((sum, r) => sum + (r.inboxCount || 0), 0);

  // Pending Archive: Medium risk nodes in inbox
  const pendingArchiving = emailRules
    .filter(r => r.risk === 'medio')
    .reduce((sum, r) => sum + (r.inboxCount || 0), 0);

  const archivedToday = globalStats.archivedToday;
  const deletedToday = globalStats.deletedToday;

  // Gmail Zero Index formula: 100% if 0 in inbox, 0% if >= 5000 in inbox
  const gmailZeroProgress = Math.max(0, Math.min(100, Math.round(((5000 - inInbox) / 5000) * 100)));
  const gmailZeroGoal = "Inbox Zero (0 e-mails)";

  // Estimated time to reach Inbox Zero at current speed
  const cleanRate = archivedToday + deletedToday;
  let estimatedTime = "Pendente de ação hoje";
  if (inInbox === 0) {
    estimatedTime = "Caixa já zerada! 🎉";
  } else if (cleanRate > 0) {
    const hoursNeeded = Math.ceil(inInbox / (cleanRate * 2)); // simple formula
    estimatedTime = hoursNeeded > 24 
      ? `Aprox. ${Math.ceil(hoursNeeded / 24)} dias no ritmo atual`
      : `${hoursNeeded} horas de foco intensivo`;
  } else {
    estimatedTime = "Inicie o Modo Intensivo";
  }

  // Publication stats
  const pendingPubs = publications.filter(p => p.status === 'pendente');
  const urgentPubs = pendingPubs.filter(p => p.category === 'urgente' || p.urgencyLevel === 'alta');

  // Next Best Action Engine
  const getSuggestedAction = () => {
    const lowRiskWithInbox = emailRules
      .filter(r => r.risk === 'baixo' && (r.inboxCount || 0) > 0)
      .sort((a, b) => (b.inboxCount || 0) - (a.inboxCount || 0))[0];

    const medioRiskWithInbox = emailRules
      .filter(r => r.risk === 'medio' && (r.inboxCount || 0) > 0)
      .sort((a, b) => (b.inboxCount || 0) - (a.inboxCount || 0))[0];

    if (urgentPubs.length > 0) {
      return {
        text: `Revisar ${urgentPubs.length} publicações urgentes de prazos ativos.`,
        detail: "Providências imediatas pendentes de controladoria processual.",
        tab: "publications",
        badge: "Urgência Legal",
        color: "red"
      };
    } else if (lowRiskWithInbox) {
      return {
        text: `Limpar ${lowRiskWithInbox.inboxCount} e-mails de ${lowRiskWithInbox.name}.`,
        detail: `Regra de Baixo Risco (${lowRiskWithInbox.category}). Recomendado: deletar em massa no Modo Intensivo.`,
        tab: "central-emails",
        badge: "Ação Recomendada",
        color: "amber"
      };
    } else if (medioRiskWithInbox) {
      return {
        text: `Arquivar ${medioRiskWithInbox.inboxCount} e-mails de ${medioRiskWithInbox.name}.`,
        detail: `Regra de Médio Risco. Recomendado: revisão rápida e arquivamento em lote.`,
        tab: "central-emails",
        badge: "Organização",
        color: "blue"
      };
    } else {
      return {
        text: "Mantenha a conformidade do dia! Execute um escaneamento geral.",
        detail: "Tudo limpo ou aguardando sincronização de novas regras de e-mail.",
        tab: "central-emails",
        badge: "Tudo limpo",
        color: "emerald"
      };
    }
  };

  const suggestion = getSuggestedAction();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Painel Executivo</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">Centro de Comando Global</h1>
          <p className="text-slate-500 text-xs mt-1">
            {cachedToken 
              ? `Conectado como ${globalStats.emailAddress || 'usuário do Google'}.`
              : "Conecte sua conta do Google para carregar os dados reais do Gmail."
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onTriggerSync}
            disabled={syncLoading || !cachedToken}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              syncLoading 
                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <RefreshCw className={`h-3 w-3 ${syncLoading ? 'animate-spin text-slate-400' : 'text-slate-500'}`} />
            Sincronizar Gmail
          </button>
          
          <button
            onClick={() => onTabChange('intensivo-gmail')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
          >
            <Zap className="h-3 w-3 text-white fill-white" />
            Intensivo Gmail Zero
          </button>
        </div>
      </div>

      {/* 10 indicators layout (Geometric elegance) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* Row 1 */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total na Conta</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-800">{totalEmails.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">e-mails</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Capacidade total do perfil</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-blue-600">Caixa de Entrada</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-blue-700">{inInbox}</span>
            <span className="text-[10px] text-blue-400">ativos</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Pendentes de triagem</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-amber-600">Emails Não Lidos</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-amber-700">{unread}</span>
            <span className="text-[10px] text-amber-500">não lidos</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Aguardando visualização</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pendente Arquivo</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-700">{pendingArchiving}</span>
            <span className="text-[10px] text-slate-500">e-mails</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Regras de Médio Risco</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-red-600">Pendente Exclusão</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-red-700">{pendingDeletion}</span>
            <span className="text-[10px] text-red-500">e-mails</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Regras de Baixo Risco</p>
        </div>

        {/* Row 2 */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-emerald-600">Arquivados Hoje</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-emerald-700">{archivedToday}</span>
            <span className="text-[10px] text-emerald-500">concluídos</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Limpos por arquivamento</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-red-600">Deletados Hoje</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-red-700">{deletedToday}</span>
            <span className="text-[10px] text-red-500">excluídos</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Enviados para a lixeira</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-violet-600">Gmail Zero Index</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-violet-700">{gmailZeroProgress}%</span>
            <span className="text-[10px] text-violet-500">de progresso</span>
          </div>
          <div className="w-full bg-slate-100 h-1 mt-1 rounded-full overflow-hidden">
            <div className="bg-violet-600 h-full" style={{ width: `${gmailZeroProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Meta Consolidada</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-700">{gmailZeroGoal}</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Foco em Inbox Zero diário</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between col-span-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-amber-600">Tempo para Zerar</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-800 leading-tight">{estimatedTime}</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">No ritmo de limpeza diária</p>
        </div>
      </div>

      {/* Suggested Action Bar */}
      <div className="bg-slate-900 text-white rounded-none p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-2 bg-slate-800 rounded-lg text-amber-400 shrink-0 self-start sm:self-center">
            <Zap className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                {suggestion.badge}
              </span>
              <span className="text-slate-400 text-[10px]">Próximo passo sugerido pelo motor de IA</span>
            </div>
            <h3 className="font-bold text-sm mt-1">{suggestion.text}</h3>
            <p className="text-slate-300 text-[11px] mt-0.5">{suggestion.detail}</p>
          </div>
        </div>
        <button
          onClick={() => onTabChange(suggestion.tab)}
          className="bg-white text-slate-950 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5"
        >
          Executar Ação
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bento Grid layout for blocks (A to E) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BLOCK A: Visão Geral do Escritório */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4.5 w-4.5 text-slate-700" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Visão Geral do Escritório</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-400">
                {statsLoading ? "Sincronizando..." : "Sincronizado"}
              </span>
              {onForceSyncStats && (
                <button
                  onClick={onForceSyncStats}
                  disabled={statsLoading}
                  title="Limpar cache e forçar sincronização do Gmail"
                  className={`p-1 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors duration-200 ${statsLoading ? "animate-spin text-indigo-600 bg-indigo-50" : ""}`}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg relative group">
              <span className="text-[10px] text-slate-400 font-semibold block">Caixa de Entrada</span>
              <span className="text-xl font-bold text-slate-800">{inInbox} e-mails</span>
              <span className="text-[8px] text-slate-400 block mt-0.5 leading-none">Threads ativas</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg relative group">
              <span className="text-[10px] text-slate-400 font-semibold block">E-mails não lidos</span>
              <span className="text-xl font-bold text-slate-800">{unread} pendentes</span>
              <span className="text-[8px] text-slate-400 block mt-0.5 leading-none">Em tópicos</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <span className="text-[10px] text-slate-400 font-semibold block">Prazos Ativos</span>
              <span className="text-xl font-bold text-amber-700">{pendingPubs.length} pendentes</span>
              <span className="text-[8px] text-slate-400 block mt-0.5 leading-none">Em andamento</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <span className="text-[10px] text-slate-400 font-semibold block">Tarefas Urgentes</span>
              <span className="text-xl font-bold text-red-700">{urgentPubs.length} críticas</span>
              <span className="text-[8px] text-slate-400 block mt-0.5 leading-none font-semibold">Críticas OAB/TRT</span>
            </div>
          </div>

          <p className="text-[9px] text-slate-400 leading-normal font-medium bg-slate-50/50 p-2 rounded-lg border border-slate-100">
            * Contagem alinhada por <strong>tópicos/conversas (threads)</strong> para cópia idêntica da Caixa de Entrada do aplicativo oficial do Gmail, ocultando mensagens duplicadas de threads agregadas e e-mails arquivados.
          </p>

          {urgentPubs.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2.5 text-red-900">
              <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-xs">Aviso Crítico de Controladoria</h4>
                <p className="text-[10px] text-red-700 mt-0.5">Existem {urgentPubs.length} publicações que necessitam de providência e cadastro de prazos imediatamente para evitar revelias.</p>
              </div>
            </div>
          )}
        </div>

        {/* BLOCK B: Gmail Zero */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4.5 w-4.5 text-slate-700" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Métrica Gmail Zero</h3>
            </div>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded">Metodologia Connect</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Limpeza da Caixa de Entrada</span>
              <span>{100 - gmailZeroProgress}% Restante</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-violet-600 h-full transition-all duration-500" style={{ width: `${gmailZeroProgress}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mt-2">
            <div className="p-2 border border-slate-100 rounded-lg">
              <p className="text-slate-400 text-[10px] font-medium">Baixo Risco Deletável</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{pendingDeletion} e-mails</p>
            </div>
            <div className="p-2 border border-slate-100 rounded-lg">
              <p className="text-slate-400 text-[10px] font-medium">Médio Risco Arquivável</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{pendingArchiving} e-mails</p>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
            <span>Objetivo final:</span>
            <span className="font-bold text-slate-800">0 e-mails ativos</span>
          </div>
        </div>

        {/* BLOCK C: Publicações e Pushes */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-slate-700" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Publicações & PJE</h3>
            </div>
            <button 
              onClick={() => onTabChange('dashboard')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              Ver Painel de Publicações
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">O Painel de Publicações centraliza publicações conferidas, recortes de Diários Oficiais, e pushes dos tribunais.</p>
            
            <div className="divide-y divide-slate-100">
              <div className="py-2 flex justify-between items-center text-xs">
                <span className="text-slate-600">Publicações ativas no PJE</span>
                <span className="font-bold text-slate-900">{publications.length} registradas</span>
              </div>
              <div className="py-2 flex justify-between items-center text-xs">
                <span className="text-slate-600">Prazos fatais esta semana</span>
                <span className="font-bold text-red-600">{urgentPubs.length} urgentes</span>
              </div>
              <div className="py-2 flex justify-between items-center text-xs">
                <span className="text-slate-600">Tribunal de maior volume</span>
                <span className="font-semibold text-slate-950">TJMG (Belo Horizonte)</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK D: Produtividade do Dia */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4.5 w-4.5 text-slate-700" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Produtividade do Dia</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Eficiência Elevada</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">E-mails arquivados hoje</span>
              </div>
              <span className="font-bold text-slate-800">{archivedToday} e-mails</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <span className="text-slate-600">E-mails deletados hoje</span>
              </div>
              <span className="font-bold text-slate-800">{deletedToday} e-mails</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">Publicações marcadas como conferidas</span>
              </div>
              <span className="font-bold text-slate-800">
                {publications.filter(p => p.status === 'concluido').length} conferidas
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span className="text-slate-600">Sessões de limpeza intensivas</span>
              </div>
              <span className="font-bold text-slate-800">Ativa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

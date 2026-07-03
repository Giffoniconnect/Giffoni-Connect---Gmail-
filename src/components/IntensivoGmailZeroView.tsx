import { useState, useEffect, useRef } from 'react';
import { 
  Zap, Clock, CheckCircle, AlertCircle, ArrowRight, Play, Pause, 
  RotateCcw, Trash2, Archive, SkipForward, BarChart2, ShieldCheck, Mail, RefreshCw
} from 'lucide-react';
import { EmailRule } from '../types';

interface IntensivoGmailZeroViewProps {
  cachedToken: string | null;
  emailRules: EmailRule[];
  onRulesUpdated: (rules: EmailRule[]) => void;
  onAddSystemLog: (status: 'success' | 'warning' | 'error' | 'info', message: string, type?: any) => void;
  onIncrementStats: (archived: number, deleted: number) => void;
  onTabChange: (tab: any) => void;
}

interface CleaningReport {
  reviewedCount: number;
  archivedCount: number;
  deletedCount: number;
  categoriesCleared: string[];
  nextBottleneck: string;
}

export function IntensivoGmailZeroView({
  cachedToken,
  emailRules,
  onRulesUpdated,
  onAddSystemLog,
  onIncrementStats,
  onTabChange
}: IntensivoGmailZeroViewProps) {
  // Session states
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Statistics tracked in this specific session
  const [sessionArchived, setSessionArchived] = useState(0);
  const [sessionDeleted, setSessionDeleted] = useState(0);
  const [skippedRulesCount, setSkippedRulesCount] = useState(0);

  const [loadingAction, setLoadingAction] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter low risk rules with pending emails in inbox
  const lowRiskRulesWithEmails = emailRules.filter(
    r => r.risk === 'baixo' && (r.inboxCount || 0) > 0
  );

  const currentRule = lowRiskRulesWithEmails[currentRuleIndex];

  // Timer effect
  useEffect(() => {
    if (sessionActive && timeLeft > 0 && !sessionFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setSessionFinished(true);
            setSessionActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive, timeLeft, sessionFinished]);

  const handleStartSession = () => {
    if (!cachedToken) {
      alert("Conecte ao Google antes de iniciar a sessão intensiva.");
      return;
    }
    if (lowRiskRulesWithEmails.length === 0) {
      alert("Nenhum e-mail de baixo risco pendente na caixa de entrada. Tudo limpo! 🎉");
      return;
    }
    setSessionActive(true);
    setSessionFinished(false);
    setTimeLeft(1800);
    setCurrentRuleIndex(0);
    setSessionArchived(0);
    setSessionDeleted(0);
    setSkippedRulesCount(0);
    onAddSystemLog('info', 'Sessão de Limpeza Intensiva de 30 minutos iniciada.');
  };

  const handlePauseSession = () => {
    setSessionActive(false);
  };

  const handleResumeSession = () => {
    setSessionActive(true);
  };

  const handleStopSession = () => {
    setSessionActive(false);
    setSessionFinished(true);
    onAddSystemLog('info', 'Sessão de Limpeza Intensiva finalizada pelo usuário.');
  };

  // Skip to next rule
  const handleSkipRule = () => {
    setSkippedRulesCount(prev => prev + 1);
    moveToNext();
  };

  const moveToNext = () => {
    if (currentRuleIndex < lowRiskRulesWithEmails.length - 1) {
      setCurrentRuleIndex(prev => prev + 1);
    } else {
      // Loop or finish
      setSessionFinished(true);
      setSessionActive(false);
    }
  };

  // Perform action on current rule (archive or delete all matching emails)
  const handleExecuteRuleAction = async () => {
    if (!currentRule || !cachedToken) return;
    setLoadingAction(true);
    
    try {
      // 1. Fetch matching message IDs
      const listRes = await fetch("/api/gmail-messages-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, query: `${currentRule.query} in:inbox` })
      });
      const listData = await listRes.json();
      const ids = listData.messageIds || [];

      if (ids.length === 0) {
        onAddSystemLog('info', `Nenhum e-mail na caixa de entrada para a regra ${currentRule.name}.`);
        moveToNext();
        setLoadingAction(false);
        return;
      }

      // Determine action based on rule recommendation or category
      // Default lower risk is deleting trash/spam, medium and marketing is archiving
      const isDelete = currentRule.category === 'Lixo Digital' || 
                       currentRule.actionRecommended.toLowerCase().includes('deletar') || 
                       currentRule.actionRecommended.toLowerCase().includes('excluir');

      let actionSuccess = false;

      if (isDelete) {
        // Move to trash
        const res = await fetch("/api/gmail-messages/batch-trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: cachedToken, messageIds: ids })
        });
        const data = await res.json();
        if (data.success) {
          setSessionDeleted(prev => prev + ids.length);
          onIncrementStats(0, ids.length);
          actionSuccess = true;
        }
      } else {
        // Archive (remove INBOX label)
        const res = await fetch("/api/gmail-messages/batch-modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: cachedToken,
            messageIds: ids,
            removeLabelIds: ["INBOX"]
          })
        });
        const data = await res.json();
        if (data.success) {
          setSessionArchived(prev => prev + ids.length);
          onIncrementStats(ids.length, 0);
          actionSuccess = true;
        }
      }

      if (actionSuccess) {
        onAddSystemLog('success', `Regra "${currentRule.name}" executada com sucesso. ${ids.length} e-mails limpos.`);
        
        // Update local counts
        const updatedRules = emailRules.map(r => {
          if (r.id === currentRule.id) {
            return {
              ...r,
              inboxCount: 0,
              totalCount: Math.max(0, (r.totalCount || 0) - ids.length),
              unreadCount: Math.max(0, (r.unreadCount || 0) - ids.length),
              lastChecked: new Date().toISOString()
            };
          }
          return r;
        });
        onRulesUpdated(updatedRules);
      }

      moveToNext();
    } catch (err: any) {
      console.error(err);
      onAddSystemLog('error', `Falha ao processar regra no modo intensivo: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Formatting minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate Session Report at the end
  const generateReport = (): CleaningReport => {
    const categoriesClearedSet = new Set<string>();
    
    // Check if any category has 0 low-risk emails left
    const categoriesToCheck = ["Marketing e Conteúdo", "Pessoal / Baixa Prioridade", "Lixo Digital"];
    categoriesToCheck.forEach(cat => {
      const remainingForCat = emailRules.filter(r => r.category === cat && r.risk === 'baixo' && (r.inboxCount || 0) > 0).length;
      if (remainingForCat === 0) {
        categoriesClearedSet.add(cat);
      }
    });

    // Find next bottleneck
    const rulesSortedByVolume = [...emailRules]
      .filter(r => (r.inboxCount || 0) > 0)
      .sort((a, b) => (b.inboxCount || 0) - (a.inboxCount || 0));

    const nextBottleneck = rulesSortedByVolume.length > 0
      ? `${rulesSortedByVolume[0].category} (${rulesSortedByVolume[0].name}: ${rulesSortedByVolume[0].inboxCount} e-mails)`
      : "Sua Caixa de Entrada está completamente livre de gargalos!";

    return {
      reviewedCount: sessionArchived + sessionDeleted,
      archivedCount: sessionArchived,
      deletedCount: sessionDeleted,
      categoriesCleared: Array.from(categoriesClearedSet),
      nextBottleneck
    };
  };

  const report = sessionFinished ? generateReport() : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Introduction Card */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex gap-3">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500 shrink-0 self-start">
            <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">Intensivo Gmail Zero (30 Minutos)</h1>
            <p className="text-xs text-slate-500 mt-1">
              Foco total e remoção de distrações. O sistema selecionará automaticamente as suas regras de <strong>Baixo Risco</strong> que possuem e-mails acumulados. Você revisará uma por uma e poderá limpar milhares de e-mails em poucos cliques com segurança.
            </p>
          </div>
        </div>

        {!sessionActive && !sessionFinished && (
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Status de Prontidão</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {lowRiskRulesWithEmails.length} regras de Baixo Risco prontas para limpeza.
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Potencial de limpeza estimada na caixa de entrada.</p>
            </div>
            <button
              onClick={handleStartSession}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition"
            >
              <Play className="h-4 w-4 fill-white text-white" />
              Iniciar Sessão Intensiva
            </button>
          </div>
        )}
      </div>

      {/* ACTIVE SESSION CARD */}
      {sessionActive && currentRule && (
        <div className="bg-white border-2 border-amber-400 shadow-xl overflow-hidden rounded-none">
          {/* Header & Timer */}
          <div className="bg-amber-400 p-5 text-slate-950 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 animate-pulse" />
              <span className="font-extrabold text-sm uppercase tracking-wider">Cronômetro Ativo</span>
            </div>
            <span className="font-mono text-3xl font-extrabold">{formatTime(timeLeft)}</span>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded">
                  {currentRule.category}
                </span>
                <span className="text-slate-400 text-xs">Regra {currentRuleIndex + 1} de {lowRiskRulesWithEmails.length}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">{currentRule.name}</h2>
              <p className="text-xs text-slate-500">Query do Gmail: <code className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] rounded">{currentRule.query}</code></p>
            </div>

            {/* Indicator of accumulated count */}
            <div className="bg-slate-50 p-4 border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-full">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acumulado na Caixa</span>
                <span className="text-2xl font-black text-red-600">{currentRule.inboxCount || 0} e-mails</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Prontos para serem arquivados ou removidos.</p>
              </div>
            </div>

            {/* Smart Advice and confirmation */}
            <div className="border border-slate-200 p-4 rounded-lg bg-slate-50/50 space-y-2 text-xs">
              <h4 className="font-bold text-slate-700">Ação Recomendada (Metodologia Connect):</h4>
              <p className="text-slate-600 leading-relaxed font-semibold">
                {currentRule.category === 'Lixo Digital' 
                  ? `Excluir definitivamente: Estes e-mails são considerados Lixo Digital. O recomendado é mover todos os ${currentRule.inboxCount} e-mails para a Lixeira para liberar espaço.`
                  : `Arquivar em lote: Recomenda-se remover os ${currentRule.inboxCount} e-mails da Caixa de Entrada. Eles continuarão disponíveis na sua conta caso precise buscá-los futuramente.`
                }
              </p>
              <p className="text-slate-500 text-[10px]">Ação: <strong>{currentRule.actionRecommended}</strong></p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                onClick={handleStopSession}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-red-50 hover:text-red-600 transition"
              >
                Encerrar Sessão
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleSkipRule}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 flex items-center gap-1 transition"
                >
                  <SkipForward className="h-4 w-4" />
                  Pular Regra
                </button>

                <button
                  onClick={handleExecuteRuleAction}
                  disabled={loadingAction}
                  className="px-6 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 text-slate-950 flex items-center gap-1.5 transition shadow-md shrink-0"
                >
                  {loadingAction ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  ) : currentRule.category === 'Lixo Digital' ? (
                    <Trash2 className="h-4 w-4 text-slate-950 fill-slate-950" />
                  ) : (
                    <Archive className="h-4 w-4 text-slate-950" />
                  )}
                  {currentRule.category === 'Lixo Digital' ? 'Deletar Tudo' : 'Arquivar Tudo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT VIEW (When session finishes) */}
      {sessionFinished && report && (
        <div className="bg-white border border-emerald-500 shadow-2xl rounded-none overflow-hidden space-y-6">
          <div className="bg-emerald-500 text-white p-6 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-widest">Relatório Executivo Gmail Zero</h2>
              <p className="text-xs text-emerald-100">Parabéns! Sua sessão intensiva de foco de 30 minutos foi concluída.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Revisados & Limpos</span>
                <span className="text-3xl font-black text-slate-800 mt-1 block">{report.reviewedCount} e-mails</span>
                <span className="text-[9px] text-slate-400">Total reduzido da entrada</span>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-emerald-600">Arquivados</span>
                <span className="text-3xl font-black text-emerald-700 mt-1 block">{report.archivedCount}</span>
                <span className="text-[9px] text-slate-400">Removidos da caixa</span>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-red-600">Deletados</span>
                <span className="text-3xl font-black text-red-600 mt-1 block">{report.deletedCount}</span>
                <span className="text-[9px] text-slate-400">Lixo digital destruído</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <BarChart2 className="h-4 w-4 text-emerald-500" />
                  Categorias Totalmente Limpas de Baixo Risco:
                </h4>
                {report.categoriesCleared.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhuma categoria foi completamente zerada nesta sessão. Continue na próxima rodada!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {report.categoriesCleared.map(cat => (
                      <span key={cat} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-full text-[10px]">
                        ✓ {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Próximo Gargalo Identificado:
                </h4>
                <p className="text-xs text-slate-600">
                  O maior gargalo de volume restante na sua caixa de entrada agora é:
                </p>
                <p className="text-xs font-extrabold text-slate-900 bg-amber-50 p-2.5 border border-amber-200 rounded">
                  {report.nextBottleneck}
                </p>
                <p className="text-[9px] text-slate-400">Ataque este gargalo na sua próxima sessão de Limpeza ou crie uma regra de arquivamento direcionada.</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setSessionFinished(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-50 border hover:bg-slate-100 text-slate-700"
              >
                Limpar Resultados
              </button>
              <button
                onClick={() => onTabChange('dashboard-principal')}
                className="px-4 py-2 text-xs font-bold bg-slate-950 hover:bg-slate-900 text-white"
              >
                Voltar ao Centro de Comando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

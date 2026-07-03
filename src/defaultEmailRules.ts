import { EmailRule } from './types';

export const defaultEmailRules: Omit<EmailRule, 'id' | 'userId' | 'createdAt' | 'lastChecked'>[] = [
  // A) Publicações e Tribunais (Risk: alto)
  {
    name: "PJe TJMG",
    query: 'from:pje@tjmg.jus.br OR "pje@tjmg.jus.br"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Revisar intimação PJe e registrar prazo"
  },
  {
    name: "Push TJMG",
    query: 'from:push@tjmg.jus.br OR "push@tjmg.jus.br"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Conferir andamento e atualizar processo"
  },
  {
    name: "Push TRT3",
    query: 'from:nao-responda@trt3.jus.br OR "nao-responda@trt3.jus.br"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Revisar intimação TRT3 e cadastrar prazo"
  },
  {
    name: "Eproc TRF6",
    query: 'from:eproc@trf6.jus.br OR "eproc@trf6.jus.br"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Revisar intimação TRF6"
  },
  {
    name: "Recorte Digital",
    query: 'subject:("recorte digital" OR "diário de justiça")',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Verificar publicações nos Diários Oficiais"
  },
  {
    name: "PRIUS",
    query: 'subject:prius OR "sistema prius"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Importar publicações do sistema PRIUS"
  },
  {
    name: "SEEU",
    query: '"seeu" OR "seeu@cnj.jus.br"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Processo de Execução Penal unificado"
  },
  {
    name: "ESAJ TJSP",
    query: 'from:esaj@tjsp.jus.br OR "esaj@tjsp.jus.br"',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Revisar movimentação TJSP"
  },
  {
    name: "Corregedoria",
    query: 'subject:(corregedoria OR "Conselho Nacional de Justiça")',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Acompanhar expedientes da corregedoria"
  },
  {
    name: "Secretarias judiciais",
    query: 'subject:("secretaria judicial" OR "ofício judicial")',
    category: "Publicações e Tribunais",
    risk: "alto",
    actionRecommended: "Verificar intimações diretas da secretaria"
  },

  // B) Google Agenda (Risk: medio)
  {
    name: "Audiências",
    query: 'subject:(audiência OR "agenda" OR "convite") "google calendar"',
    category: "Google Agenda",
    risk: "medio",
    actionRecommended: "Confirmar pauta de audiências"
  },
  {
    name: "Reuniões",
    query: 'subject:(reunião OR "reuniao" OR "meeting")',
    category: "Google Agenda",
    risk: "medio",
    actionRecommended: "Atualizar agenda de reuniões"
  },
  {
    name: "Correções",
    query: 'subject:("correção de evento" OR "alteração de agenda")',
    category: "Google Agenda",
    risk: "medio",
    actionRecommended: "Confirmar horários reajustados"
  },
  {
    name: "Organização Gmail",
    query: 'subject:("organização" OR "limpeza" OR "configuração") "gmail"',
    category: "Google Agenda",
    risk: "medio",
    actionRecommended: "Arquivar e manter Inbox Zero"
  },
  {
    name: "Pauta gerencial",
    query: 'subject:("pauta gerencial" OR "pauta de julgamento")',
    category: "Google Agenda",
    risk: "medio",
    actionRecommended: "Distribuir relatórios de pauta"
  },
  {
    name: "Rotina",
    query: 'subject:("rotina semanal" OR "agenda diária")',
    category: "Google Agenda",
    risk: "medio",
    actionRecommended: "Revisar pendências de rotina do escritório"
  },

  // C) Financeiro (Risk: alto/medio)
  {
    name: "Comprovantes",
    query: 'subject:(comprovante OR "transferência" OR "pix")',
    category: "Financeiro",
    risk: "medio",
    actionRecommended: "Revisar e arquivar comprovantes"
  },
  {
    name: "Boletos",
    query: 'subject:(boleto OR "fatura" OR "vencimento")',
    category: "Financeiro",
    risk: "alto",
    actionRecommended: "Conferir vencimento e registrar no contas a pagar"
  },
  {
    name: "ASAAS",
    query: 'from:asaas OR "asaas.com"',
    category: "Financeiro",
    risk: "alto",
    actionRecommended: "Atualizar cobranças de clientes"
  },
  {
    name: "Bancos",
    query: 'subject:(banco OR "extrato" OR "saldo")',
    category: "Financeiro",
    risk: "medio",
    actionRecommended: "Revisar movimentação bancária"
  },
  {
    name: "Cartões",
    query: 'subject:(cartão OR "fatura" OR "limite")',
    category: "Financeiro",
    risk: "medio",
    actionRecommended: "Registrar despesas de cartão de crédito"
  },
  {
    name: "Tesouro / Rico / Nubank / Inter / C6",
    query: 'subject:(nubank OR inter OR "c6 bank" OR rico OR "tesouro")',
    category: "Financeiro",
    risk: "medio",
    actionRecommended: "Conciliação de investimentos e caixa"
  },

  // D) Marketing e Conteúdo (Risk: baixo)
  {
    name: "Conjur",
    query: 'from:conjur OR "consultor jurídico"',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Revisar notícias jurídicas e arquivar"
  },
  {
    name: "Migalhas",
    query: 'from:migalhas OR "migalhas.com.br"',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Leitura de boletins informativos"
  },
  {
    name: "Boletins",
    query: 'subject:(boletim OR "newsletter" OR "informativo")',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Leitura rápida e exclusão"
  },
  {
    name: "OAB",
    query: 'from:oab OR "Ordem dos Advogados"',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Revisar comunicados institucionais da OAB"
  },
  {
    name: "ESA",
    query: 'from:esa OR "Escola Superior de Advocacia"',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Verificar cursos e eventos"
  },
  {
    name: "Sebrae",
    query: 'from:sebrae',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Informativos de gestão empresarial"
  },
  {
    name: "Redes sociais",
    query: 'from:(facebook OR linkedin OR instagram OR twitter OR "youtube")',
    category: "Marketing e Conteúdo",
    risk: "baixo",
    actionRecommended: "Excluir alertas e notificações sociais"
  },

  // E) Sistemas do Escritório (Risk: medio)
  {
    name: "Todoist",
    query: 'from:todoist OR "todoist.com"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Sincronizar tarefas pendentes"
  },
  {
    name: "Google Workspace",
    query: 'from:workspace OR "google workspace" OR "google admin"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Verificar alertas de administração"
  },
  {
    name: "Trello",
    query: 'from:trello OR "trello.com"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Revisar atualizações de quadros"
  },
  {
    name: "Nibo",
    query: 'from:nibo OR "nibo.com.br"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Verificar faturamento de clientes"
  },
  {
    name: "Lovable",
    query: 'from:lovable OR "lovable.dev"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Acompanhar builds e deploys"
  },
  {
    name: "Gamma",
    query: 'from:gamma OR "gamma.app"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Revisar apresentações criadas"
  },
  {
    name: "n8n",
    query: 'subject:n8n OR from:n8n',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Revisar alertas de execuções de fluxo"
  },
  {
    name: "Dify",
    query: 'subject:dify OR from:dify',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Acompanhar deploys de IA no Dify"
  },
  {
    name: "Lucid",
    query: 'from:lucidchart OR "lucid.app"',
    category: "Sistemas do Escritório",
    risk: "medio",
    actionRecommended: "Acompanhar diagramas compartilhados"
  },

  // F) Segurança e Acessos (Risk: medio)
  {
    name: "Código de verificação",
    query: 'subject:("código" OR "verification code" OR "verificação" OR "token")',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Revisar e limpar códigos expirados"
  },
  {
    name: "Alerta de segurança",
    query: 'subject:("alerta de segurança" OR "security alert")',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Revisar acessos suspeitos"
  },
  {
    name: "Cadastro de senha",
    query: 'subject:("senha" OR "password" OR "reset")',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Confirmar alteração de senhas"
  },
  {
    name: "Recuperação de conta",
    query: 'subject:("recuperação" OR "recovery")',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Verificar solicitações de login"
  },
  {
    name: "2 fatores",
    query: 'subject:("2 fatores" OR "two-factor" OR "2FA")',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Cadastrar novos tokens"
  },
  {
    name: "Jusbrasil",
    query: 'from:jusbrasil',
    category: "Segurança e Acessos",
    risk: "alto",
    actionRecommended: "Acompanhar alertas processuais Jusbrasil"
  },
  {
    name: "CNJ",
    query: 'from:cnj OR "Conselho Nacional"',
    category: "Segurança e Acessos",
    risk: "alto",
    actionRecommended: "Acompanhar resoluções e regulamentos do CNJ"
  },
  {
    name: "Apple",
    query: 'from:apple OR "icloud"',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Verificar faturas e serviços Apple"
  },
  {
    name: "Google",
    query: 'from:google OR "google account"',
    category: "Segurança e Acessos",
    risk: "medio",
    actionRecommended: "Verificar alertas de conta Google"
  },

  // G) Pessoal / Baixa Prioridade (Risk: baixo)
  {
    name: "Compras",
    query: 'subject:(compra OR "pedido" OR "confirmação de compra")',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Registrar e arquivar notas de compra"
  },
  {
    name: "Condomínio",
    query: 'subject:condomínio OR "boleto de condomínio"',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Agendar pagamento de taxa condominial"
  },
  {
    name: "Unimed",
    query: 'from:unimed OR subject:unimed',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Revisar boletos e guias médicas"
  },
  {
    name: "Magazine Luiza",
    query: 'from:magazineluiza OR "magazine luiza"',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Promoções e pedidos Magazine Luiza"
  },
  {
    name: "Uber",
    query: 'from:uber OR "uber.com"',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Revisar recibos de viagens"
  },
  {
    name: "Redes sociais pessoais",
    query: 'from:(instagram OR facebook OR linkedin)',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Notificações pessoais"
  },
  {
    name: "Informativos pessoais",
    query: 'subject:("informativo" OR "boletim")',
    category: "Pessoal / Baixa Prioridade",
    risk: "baixo",
    actionRecommended: "Leitura rápida e descarte"
  },

  // H) Lixo Digital (Risk: baixo)
  {
    name: "Promoções",
    query: 'category:promotions OR "promoção" OR "oferta"',
    category: "Lixo Digital",
    risk: "baixo",
    actionRecommended: "Excluir em massa com segurança"
  },
  {
    name: "Cancelar inscrição",
    query: '"unsubscribe" OR "cancelar inscrição" OR "deixar de receber"',
    category: "Lixo Digital",
    risk: "baixo",
    actionRecommended: "Excluir e-mails com link de cancelamento"
  },
  {
    name: "Newsletters irrelevantes",
    query: 'subject:(newsletter OR "news") is:unread',
    category: "Lixo Digital",
    risk: "baixo",
    actionRecommended: "Excluir boletins não lidos"
  },
  {
    name: "Ferramentas não utilizadas",
    query: 'subject:("bem-vindo" OR "welcome" OR "trial")',
    category: "Lixo Digital",
    risk: "baixo",
    actionRecommended: "Limpar e-mails de onboarding"
  },
  {
    name: "Emails automáticos repetitivos",
    query: 'subject:("no-reply" OR "não responda")',
    category: "Lixo Digital",
    risk: "baixo",
    actionRecommended: "Revisar e descartar alertas automatizados"
  }
];

import { Publication } from './types';

// Business days helper in client-side to keep consistency
export function calculateBusinessDaysDate(startDate: Date, days: number): string {
  let resultDate = new Date(startDate);
  let count = 0;
  while (count < days) {
    resultDate.setDate(resultDate.getDate() + 1);
    const dayOfWeek = resultDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
  }
  return resultDate.toISOString();
}

export const initialPublications: Publication[] = [
  {
    id: "pub-1",
    processNumber: "5001234-89.2026.8.21.0001",
    title: "Manifestação sobre Liminar Deferida",
    content: "Vistos. Defiro a liminar pleiteada para determinar a suspensão da inscrição nos cadastros restritivos de crédito. Intime-se a parte ré para, no prazo de 5 dias úteis, cumprir a presente determinação sob pena de multa diária de R$ 500,00.",
    source: "pje",
    category: "urgente",
    urgencyLevel: "alta",
    subpoenaDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    deadlineDays: 5,
    dueDate: calculateBusinessDaysDate(new Date(Date.now() - 24 * 60 * 60 * 1000), 5),
    actionRequired: "Comprovar nos autos o cumprimento da liminar e peticionar requerendo a expedição de ofício urgente ao SPC/Serasa.",
    status: "pendente",
    userId: "demo-user",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pub-2",
    processNumber: "1004567-12.2026.8.26.0100",
    title: "Prazo para Réplica à Contestação",
    content: "Fica a parte autora intimada a apresentar réplica à contestação e documentos juntados pelo réu, no prazo legal de 15 dias úteis, devendo também especificar as provas que pretende produzir justificadamente.",
    source: "gmail",
    category: "prazo",
    urgencyLevel: "media",
    subpoenaDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    deadlineDays: 15,
    dueDate: calculateBusinessDaysDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 15),
    actionRequired: "Analisar as teses preliminares e prejudiciais de mérito levantadas pela ré. Elaborar réplica detalhada rebatendo cada ponto.",
    status: "pendente",
    userId: "demo-user",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pub-3",
    processNumber: "0012345-67.2026.5.02.0001",
    title: "Audiência de Conciliação Designada",
    content: "Ficam as partes notificadas de que foi designada audiência de conciliação presencial para o dia 15/08/2026 às 14:30h na sala de audiências da 1ª Vara do Trabalho. O não comparecimento do reclamante importará no arquivamento da reclamação.",
    source: "pje",
    category: "audiencia",
    urgencyLevel: "alta",
    subpoenaDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    deadlineDays: 0,
    dueDate: new Date("2026-08-15T14:30:00").toISOString(),
    actionRequired: "Cadastrar a audiência na agenda do advogado e do cliente. Enviar e-mail de orientações ao cliente e solicitar documentos pessoais atualizados.",
    status: "pendente",
    userId: "demo-user",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pub-4",
    processNumber: "0812345-99.2026.4.01.3400",
    title: "Sentença Improcedente - Ciência",
    content: "Pelo exposto, JULGO IMPROCEDENTES os pedidos formulados na petição inicial, extinguindo o processo com resolução do mérito. Condeno a parte autora ao pagamento de honorários de sucumbência arbitrados em 10% sobre o valor da causa. Registre-se. Intimem-se.",
    source: "legacy_api",
    category: "prazo",
    urgencyLevel: "alta",
    subpoenaDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    deadlineDays: 15,
    dueDate: calculateBusinessDaysDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), 15),
    actionRequired: "Elaborar Recurso de Apelação para rebater a fundamentação da sentença. Reunir precedentes do STJ/TRF favoráveis.",
    status: "concluido",
    userId: "demo-user",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pub-5",
    processNumber: "1029384-55.2026.8.19.0001",
    title: "Despacho Ordinatório - Ciência",
    content: "Mero expediente. Manifestem-se as partes em provas no prazo comum de 5 dias. Decorrido o prazo sem requerimentos, venham os autos conclusos para sentença.",
    source: "pje",
    category: "informativo",
    urgencyLevel: "baixa",
    subpoenaDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    deadlineDays: 5,
    dueDate: calculateBusinessDaysDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 5),
    actionRequired: "Avaliar se há necessidade de produção de outras provas (depoimentos, perícias). Caso contrário, requerer julgamento antecipado da lide.",
    status: "arquivado",
    userId: "demo-user",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

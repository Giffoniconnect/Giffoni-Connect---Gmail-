export interface Publication {
  id: string;
  processNumber: string;
  title: string;
  content: string;
  source: 'gmail' | 'legacy_api' | 'manual' | 'pje';
  category: 'urgente' | 'prazo' | 'informativo' | 'audiencia';
  urgencyLevel: 'alta' | 'media' | 'baixa';
  subpoenaDate: string;
  deadlineDays: number;
  dueDate: string;
  actionRequired: string;
  status: 'pendente' | 'concluido' | 'arquivado';
  userId: string;
  createdAt: string;
}

export interface ApiToken {
  id: string;
  token: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'gmail_sync' | 'api_received' | 'manual_add' | 'status_change';
  message: string;
  userId: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

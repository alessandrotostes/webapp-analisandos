# Modelo de Dados - WebApp Analisandos

Este documento define a modelagem dos dados e as interfaces TypeScript que representam as informações extraídas das planilhas.

---

## 1. Mapeamento das Planilhas para Entidades

Para cobrir todos os dados apresentados no arquivo PDF, dividimos o modelo em quatro entidades principais:

### 1.1. Fatura (`Invoice`) [DEPRECIADO na v1.2.0]
*A entidade `Invoice` foi descontinuada. Todos os cálculos de faturamento, receita prevista, receita efetivada e saldo devedor agora são derivados dinamicamente da coleção `Session` (Single Source of Truth).*

### 1.2. Aluguel de Consultório (`RentLog`)
Representa o rateio de custos de sala com base nos atendimentos físicos.
```typescript
export interface RentLog {
  id?: string;
  patientName: string;     // Paciente atendido
  dateRef: string;         // Data de referência (ex: "21/01", "23/01, 30/01")
  valuePaid: number;       // Custo do aluguel (R$ 30,00 por hora/sessão)
  sessionsCount: number;   // Quantidade de sessões refletidas nesse custo
}
```

### 1.3. Sessão de Análise (`Session`)
Representa o prontuário de atendimentos individuais detalhados.
```typescript
export interface Session {
  id?: string;
  patientName: string;     // Nome do analisando
  date: string;            // Data do atendimento
  modality: 'particular' | 'social_clinic' | 'presencial' | 'online' | 'integrando_ser' | 'zenklub';
  value: number;           // Valor da sessão (R$)
  durationHours: number;   // Duração da sessão (geralmente 1)
  status: 'realized' | 'absent_billed' | 'absent_free' | 'cancelled' | 'paused' | 'active';
  notes?: string;          // Observações qualitativas (ex: "gratuidade devido a catástrofe", "reajuste")
}
```

### 1.4. Atendimentos Zenklub / Integrando Ser (`PlatformTransaction`)
Representa transações registradas diretamente pelas plataformas parceiras.
```typescript
export interface PlatformTransaction {
  id?: string;
  platform: 'zenklub' | 'integrando_ser';
  date: string;
  patientName: string;
  type?: 'corporativo' | 'particular'; // Aplicável ao Zenklub
  value: number;
}
```

---

## 2. Cadastro de Pacientes (`Patient` - CRM)

Representa o perfil unificado de cada analisando e serve como referência cadastral e de faturamento:

```typescript
export interface Patient {
  id?: string;
  name: string;
  modality: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'online' | 'presencial';
  defaultRate: number;     // Valor padrão por atendimento
  status: 'active' | 'paused' | 'ended';
  phone?: string;
  email?: string;
  notes?: string;
}
```

---

## 3. Consolidação de Pacientes (Canonicalization)

Para evitar duplicidades geradas na planilha Excel por erros de digitação, abreviações ou variações de escrita (ex: `'Eduardo Barros'` vs `'Eduardo de Barros'`, `"Laura D'Angelo"` vs `'Laura DAngelo'`), o processo de seed unifica os nomes sob registros canônicos:

* **Tabela de De-duplicação**: Variações comuns são mapeadas para um único nome canônico.
* **Integridade Referencial**: Todas as faturas, logs de aluguel e sessões associados a uma variação são migrados automaticamente para o nome canônico unificado.
* **Quantidade Final**: A base inicial foi limpa e consolidada de **61 nomes brutos** na planilha para **54 analisandos únicos** no CRM.

---

## 4. Relações e Integridade Referencial

Como estamos utilizando o Firestore (NoSQL), os dados serão desnormalizados para otimizar leituras sob o plano gratuito:
* O campo `patientName` será utilizado como chave de relacionamento semântico, pois o número de pacientes únicos é pequeno e controlado.
* O histórico de sessões (`Session`) alimentará automaticamente a contagem de horas e validação dos valores agregados em `Invoice` e `RentLog`.

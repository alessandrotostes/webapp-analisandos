# Changelog e Versões do Sistema

**INSTRUÇÃO PARA A IA:** Ao iniciar uma nova sessão ou antes de propor uma grande alteração, LEIA este arquivo para entender o histórico recente de mudanças, correções e versão atual do sistema. Toda vez que você concluir um conjunto de melhorias significativas, registre a nova versão aqui.

## [v1.2.0] - 21 de Julho de 2026
**Single Source of Truth (`sessions`) & Remoção da Aba de Faturamento:**
- **Remoção Completa do Modelo de Faturas (`invoices`)**: A aba de Faturamento, modais e chamadas de CRUD de faturas (`InvoicesTab.tsx`, `InvoiceModal.tsx`, `useInvoices.ts`, `getInvoices`, `syncInvoiceWithSessions`) foram totalmente removidos da aplicação e das regras do Firestore.
- **`sessions` como Única Fonte da Verdade**: Todos os KPIs e detalhamentos do Dashboard e de Relatórios foram migrados para calcular dinamicamente a partir dos registros de atendimentos (`sessions`).
- **Ajuste do Reconhecimento de Pacotes (`isPackage`)**:
  - Sessões marcadas como pacote (`isPackage === true`) passaram a ser reconhecidas na **Receita Efetivada** no mês em que o atendimento ocorre.
  - Isso garante a convergência da equação financeira fundamental em todos os meses: `Receita Efetivada + Saldo Devedor = Receita Prevista`.
- **Refatoração dos Métricas Anuais e Salário Líquido**: Acumulados brutos/líquidos e salário mensal recalculados dinamicamente com base nas sessões pagas e de pacotes, englobando o faturamento do ciclo Zenklub (24 a 23).

---

## [v1.1.0] - 12 de Julho de 2026
**Mudanças Recentes (Features, Fixes & Security):**
- **Privacidade Máxima (Modo Oculto):** O recurso `hideValues` (ícone de Olho) agora ofusca nomes de pacientes ("Analisando Oculto") em 100% das views, tabelas e modais, permitindo demonstrações limpas e seguras de dados sensíveis. O nome "Zenklub" foi protegido como exceção por ser apenas a plataforma de origem.
- **PWA Auth & Google Calendar:** 
  - Login refatorado para usar `signInWithPopup` em conjunto com `browserLocalPersistence`. Isso corrige problemas gravíssimos de perda de estado de sessão do Firebase ao usar PWA no iOS (Standalone Safari).
  - Adicionado mecanismo inteligente de refresh para o Access Token do Google (que expira em 1 hora). Um botão de "Reconectar Agenda" agora aparece sob demanda na Navbar sem forçar o logout do Firebase inteiro.
- **Refatoração de UI/Responsividade:** Ajustado o CSS (`.dashboard-grid`) para garantir visualização perfeita de 5 colunas em telas de MacBook (`min-width: 1200px`), evitando a quebra de linha do quinto KPI.
- **Organização do Repositório:** Lógica de `seed` depreciada foi limpa do `App.tsx`. A pasta `.context` foi reestruturada por domínios. Todos os arquivos e pastas de segurança e infraestrutura do Firebase foram removidos do histórico do git e movidos para `.gitignore`.

---

## [v1.0.0] - Lançamento Inicial
**Base do Sistema:**
- Dashboard com KPIs (Receita, Prevista, Pendente, Zenklub, Custos) sincronizados com Google Agenda.
- Gestão de Prontuários e Analisandos.
- Relatórios de Faturamento e Repasses.
- Autenticação restrita e hardcoded para a conta de administração principal via Google.

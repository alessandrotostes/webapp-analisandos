# Changelog e Versões do Sistema

**REGRA ESTRITA DE VERSIONAMENTO (POR COMMIT):**
1. **A versão só deve ser incrementada a cada commit realizado**, e NUNCA a cada comando ou resposta intermediária.
2. **Antes de executar qualquer commit**, a versão DEVE ser atualizada obrigatoriamente tanto no `package.json` quanto neste `context/changelog.md`, consolidando todas as alterações feitas no ciclo daquele commit.
3. Respeitar SemVer:
   - **PATCH** (`1.2.0` → `1.2.1`): Correções de bugs, pequenas melhorias de UX/layout e refatorações sem breaking changes.
   - **MINOR** (`1.2.0` → `1.3.0`): Novas funcionalidades ou telas adicionadas sem quebrar compatibilidade.
   - **MAJOR** (`1.0.0` → `2.0.0`): Mudanças arquiteturais profundas ou breaking changes.

---

## [v1.2.1] - 16 de Outubro de 2026
**UX do Prontuário, Idempotência, Sanitização Firestore e Padronização de Selects:**
- **Remoção do Indicador de Ciclo do Pacote**: Removido o badge roxo/alerta (`📦 Ciclo do Pacote: X de Y em andamento / Renovar`) do cabeçalho do prontuário ao lado do total de sessões acumuladas.
- **Remoção do Badge "Cobrar"**: Retirada a etiqueta amarela com o texto "Cobrar" que aparecia na última sessão de cada ciclo de pacote no Histórico de Sessões e na listagem de sessões do mês. A exibição agora permanece limpa com `📦 Pacote (X/Y)`.
- **Sanitização de Dados Firestore (`sanitizeForFirestore`)**: Correção do erro fatal de `Function addDoc() called with invalid data. Unsupported field value: undefined`. Criada camada de sanitização automática em `firestoreService.ts` e no form de sessões em `App.tsx` para remover chaves `undefined` (ex: `packageTotalSessions: undefined`) antes de gravar no Firebase.
- **Idempotência e Proteção contra Duplicação nos Botões de Salvar**:
  - `SessionModal`: Adicionada trava `savingSession` impedindo requisições simultâneas por múltiplos cliques, desabilitando o botão e exibindo "Salvando...".
  - `PatientModal`: Adicionada trava `savingPatient` com estado desabilitado e "Salvando...".
  - `PatientDashboard`: Adicionados estados e travas assíncronas com `await` para "Salvar Notas" (`savingSessionNotes`), "Adicionar Reajuste" (`savingReadjustment`) e "Adicionar Supervisão" (`savingSupervision`).
- **Padronização e Correção das Setas de Todos os Selects**:
  - Substituição da seta nativa travada do sistema operacional (`appearance: none`, `-webkit-appearance: none`, `-moz-appearance: none`) que ignorava padding e colava nas bordas arredondadas.
  - Implementação de seta SVG customizada, limpa e responsiva em todos os selects da aplicação (`.filter-select`, modal de atendimentos, modal de paciente e select de status do prontuário com cor dinâmica de acordo com o status).
- **Estabilidade do Cabeçalho**: Removido o texto dinâmico "Exibir Valores" do botão de privacidade, mantendo apenas os ícones correspondentes para evitar variações de largura e quebras de linha no header.

---

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

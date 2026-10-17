# Padrão de Commits (Commit Guidelines)

Este documento define as regras e padrões de mensagens de commit para o repositório **webapp-analisandos**. Todos os commits devem seguir rigorosamente esta estrutura para manter o histórico limpo e padronizado.

---

## 📋 Estrutura da Mensagem

Todas as mensagens de commit devem seguir o seguinte formato:

```text
<prefixo>: <Descrição em inglês com primeira letra maiúscula>
```

### Regras Obrigatórias:
1. **Prefixo**: Deve ser um dos tipos definidos abaixo, sempre em letras minúsculas.
2. **Separador**: O prefixo deve ser seguido por dois-pontos (`:`) e um espaço em branco.
3. **Idioma**: A descrição do commit deve ser escrita em **inglês**.
4. **Capitalização**: A primeira letra da descrição deve ser **maiúscula**.

---

## 🏷️ Prefixos Permitidos

*   **`feat`**: Introdução de novas funcionalidades ou recursos no projeto.
    *   *Exemplo*: `feat: Add patient management modal`
*   **`fix`**: Correção de bugs ou problemas de comportamento inesperado.
    *   *Exemplo*: `fix: Correct calculations in rent calculations`
*   **`chore`**: Tarefas de manutenção rotineira, atualizações de dependências, configurações ou ferramentas que não alteram o código de produção.
    *   *Exemplo*: `chore: Update yarn package`

---

## 💡 Exemplos de Commits Corretos

*   `chore: Add commit pattern documentation`
*   `feat: Implement offline cache for Firestore`
*   `fix: Resolve layout shift on mobile viewports`

---

## 🔢 Regra de Versionamento por Commit (Obrigatório)

A versão do projeto segue rigorosamente o ciclo de cada **commit**:
1. **Uma versão por commit**: A versão **só deve ser incrementada uma única vez por commit realizado** (nunca a cada comando ou ajuste individual intermediário).
2. **Atualização pré-commit obrigatória**: Antes de disparar qualquer commit (`git commit`), deve-se obrigatoriamente:
   - Incrementar a versão no `package.json` de acordo com o SemVer (`PATCH`, `MINOR` ou `MAJOR`).
   - Atualizar `context/changelog.md` consolidando todas as mudanças implementadas naquele commit.
3. **Escopo SemVer**:
   - **PATCH** (`1.2.0` → `1.2.1`): Correções de bugs, ajustes visuais/UX, refatorações e pequenas melhorias.
   - **MINOR** (`1.2.0` → `1.3.0`): Novas telas ou grandes funcionalidades sem quebrar compatibilidade.
   - **MAJOR** (`1.0.0` → `2.0.0`): Mudanças arquiteturais que quebrem contratos de dados anteriores.

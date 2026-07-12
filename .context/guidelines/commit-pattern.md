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

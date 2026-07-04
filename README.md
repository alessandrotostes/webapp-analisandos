# Analisandos 2026 - Controle Clínico-Financeiro

Este é um WebApp desenvolvido em React + TypeScript + Firebase Firestore para visualização e gerenciamento dos analisandos, sessões de terapia e custos com aluguel de consultório.

O projeto foi projetado utilizando boas práticas do ecossistema React (hooks customizados, separação de responsabilidades) e otimizado para os limites do plano gratuito do Firebase (Spark).

---

## 🛠️ Stack Tecnológica

* **Frontend**: React 19 (Vite), TypeScript (modo estrito)
* **Estilização**: Vanilla CSS (Tema Escuro Premium com Glassmorphism)
* **Banco de Dados**: Firebase Firestore (com persistência offline ativada)
* **Parser de Excel**: `xlsx` (SheetJS)
* **Execução de Scripts**: `tsx` (TypeScript Execute)
* **Gerenciador de Pacotes**: Yarn (exclusivo)

---

## 📂 Estrutura de Pastas

* `.context/` — Documentação e planejamento da arquitetura, dados e Firebase.
* `scripts/` — Scripts utilitários de backend (como o seed de banco).
* `src/`
  * `config/` — Inicialização do Firebase e Firestore.
  * `components/ui/` — Componentes de UI genéricos e reaproveitáveis (Table, Button, Card).
  * `services/firebase/` — Chamadas diretas ao Firestore encapsuladas (serviços puros).
  * `hooks/` — Custom Hooks para ligar a UI aos serviços (ex: `useInvoices`).
  * `types/` — Interfaces rigorosas em TypeScript.

---

## 🚀 Como Executar

### 1. Instalar as dependências do projeto
```bash
yarn install
```

### 2. Configurar as credenciais do Firebase
Crie ou edite o arquivo `.env` na raiz do projeto e configure as chaves do seu projeto Firebase Firestore:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 3. Rodar a Carga Inicial (Seed)
Para ler a planilha `Analisandos 2026.xlsx` da raiz do projeto e popular o Firestore com Batch Writes de forma otimizada (máx 450 por lote, com proteção contra duplicidade), execute:
```bash
yarn seed
```

### 4. Executar em Desenvolvimento
Para rodar o servidor de desenvolvimento local:
```bash
yarn dev
```
O console exibirá o link local (geralmente `http://localhost:5173`).

### 5. Compilar para Produção
Para validar e gerar a build otimizada:
```bash
yarn build
```

# Arquitetura do Sistema - WebApp Analisandos

Este documento descreve a estrutura de arquitetura, princípios de design e divisão de responsabilidades para o desenvolvimento do painel de controle clínico-financeiro.

---

## 1. Princípios de Design e Boas Práticas

Adotamos diretrizes de **Clean Architecture**, **SOLID** e **DRY (Don't Repeat Yourself)** para garantir manutenibilidade e escalabilidade:

### Single Responsibility Principle (SRP)
Cada componente e camada possui uma única responsabilidade clara:
* **Camada de Apresentação (UI)**: Responsável apenas por renderizar o estado e capturar as interações do usuário. Não possui chamadas diretas ao Firebase SDK ou lógica de negócio pesada.
* **Hooks Customizados**: Gerenciam o estado de dados local, lógica de carregamento/erro e ações assíncronas do usuário.
* **Camada de Serviços (Services)**: Ponto único de contato com o Firebase Firestore. Contém métodos puros de leitura/escrita e encapsula o Firebase SDK.
* **Camada de Modelagem (Types/Interfaces)**: Contém as definições estritas de dados, sem comportamento lógico.

### Dependency Inversion Principle (DIP)
A interface do usuário não depende de detalhes do Firebase. Ela consome dados expostos por hooks. Se o banco de dados for alterado no futuro (ex: Supabase), apenas os hooks e serviços precisarão ser reescritos; a camada de UI permanecerá intacta.

---

## 2. Estrutura de Pastas e Arquivos

O projeto está estruturado da seguinte forma no diretório `src/`:

```
src/
├── context/                # Documentação de contexto do projeto (na raiz)
├── src/
│   ├── assets/             # Imagens, ícones e estilos globais
│   ├── components/         # Componentes visuais reutilizáveis (Tabelas, Modais, Inputs)
│   │   ├── dashboard/      # Componentes de Dashboard e detalhamentos (DashboardTab)
│   │   ├── patients/       # Componentes de CRM de analisandos (PatientsTab, PatientDashboard)
│   │   ├── transfers/      # Componentes de repasses e custos (TransfersTab)
│   │   ├── modals/         # Modais reutilizáveis (PatientModal, SessionModal, ConfirmModal)
│   │   └── ui/             # Componentes primitivos/visuais genéricos (Button, Table, Card)
│   ├── config/             # Configurações globais (firebase-config.ts)
│   ├── services/           # Camada de serviços (firestoreService.ts, gcalService.ts)
│   ├── types/              # Definições estritas de tipos TypeScript (index.ts)
│   ├── App.tsx             # Componente raiz da aplicação
│   └── main.tsx            # Ponto de entrada do React
├── package.json
├── yarn.lock
└── tsconfig.json
```

---

## 3. Camada de Serviços (Firebase / Firestore)

A comunicação com o Firebase é isolada em `src/services/firebase/firestoreService.ts`.
Este arquivo expõe funções tipadas como:
* `getSessions()`
* `addSession()`
* `updateSession()`
* `deleteSession()`
* `getPatients()` / `addPatient()` / `updatePatient()` / `deletePatient()`

Toda a lógica de consulta, paginação e escrita no Firestore é tratada nessa camada.

---

## 4. Single Source of Truth (`sessions`)

A coleção `sessions` serve como fonte única da verdade para a inteligência financeira do sistema.
Todos os KPIs de Receita Prevista, Receita Efetivada (incluindo sessões pagas e de pacotes no mês de ocorrência), Saldo Devedor, Salário Líquido e Acumulado Anual são calculados dinamicamente a partir dos registros de `sessions`.

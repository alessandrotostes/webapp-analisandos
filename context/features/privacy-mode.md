# Modo de Privacidade (Demonstração)

O sistema possui um recurso nativo de ocultação de valores financeiros e de informações sensíveis dos pacientes, ativado no cabeçalho superior através de um ícone de "Olho".

## Comportamento (`hideValues`)
Quando o estado `hideValues` é verdadeiro:
- **Valores Financeiros:** Todos os valores (`R$ 150,00`) são substituídos por `R$ ****,**`.
- **Nomes de Pacientes:** Todos os nomes são substituídos pela string constante `"Analisando Oculto"`. 
- **Exceção de Nomes:** O nome `"Zenklub"` não é ofuscado pois se trata de uma plataforma/origem de repasse, não caracterizando violação de privacidade do analisando final.
- **Interatividade:** Mesmo com os nomes ofuscados, links (como aqueles que abrem os prontuários pelo dashboard) continuam clicáveis e funcionais.

## Onde se aplica
O `hideValues` é passado via `props` do `App.tsx` para todas as views:
- **Dashboard:** Cards, gráficos e modais (Detalhamento de Faturamento e Pendências).
- **Analisandos:** Lista de pacientes.
- **Prontuário (PatientDashboard):** Cabeçalho interno e histórico financeiro do paciente.
- **Faturamento e Repasses:** Tabelas detalhadas de extrato.

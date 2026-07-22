# Estratégia Firebase & Firestore - WebApp Analisandos

Este documento detalha o planejamento das coleções do Firestore, a estratégia de carga inicial (seed) sem duplicidade, e otimizações voltadas para manter o projeto no plano gratuito Spark.

---

## 1. Estrutura de Coleções do Firestore

Utilizamos coleções de primeiro nível no Firestore:

```
/patients
  - {patientId} -> Documento do Analisando (Patient)

/sessions
  - {sessionId} -> Documento de Detalhe de Sessão (Session) [Single Source of Truth]

/rent_logs
  - {rentLogId} -> Documento de Log de Aluguel (RentLog)

/platform_transactions
  - {transactionId} -> Documento de Transação (PlatformTransaction)
```

> [!NOTE]
> Optamos por coleções de primeiro nível ao invés de subcoleções (ex: `/patients/{id}/sessions`) para permitir queries globais simplificadas de relatórios financeiros por data, sem requerer queries complexas de subcoleções que consomem mais leituras. A coleção `/invoices` foi descontinuada na v1.2.0.

---

## 2. Estratégia de Seed (Carga Inicial)

O processo de carga inicial lê a planilha consolidada na raiz do projeto e envia os dados estruturados ao Firestore.

### 2.1. Prevenção de Duplicidade
Antes de iniciar a gravação, a aplicação executará uma query de verificação:
```typescript
const querySnapshot = await getDocs(query(collection(db, 'sessions'), limit(1)));
if (!querySnapshot.empty) {
  console.log("Carga inicial já realizada anteriormente. Operação abortada.");
  return;
}
```
Caso a coleção `sessions` já tenha pelo menos um registro, o seed será ignorado automaticamente.

### 2.2. Otimização com Batch Writes (Gravações em Lote)
O Firestore impõe um limite de **500 operações** por gravação em lote (Batch Write). Para processar centenas de registros de forma eficiente e atômica, a lógica de seed dividirá os dados:
1. Divide a lista total de registros em pedaços (chunks) de no máximo 450 elementos.
2. Abre uma transação em lote via `writeBatch(db)`.
3. Adiciona as operações de criação de documentos.
4. Faz o `commit()` do lote e repete para o próximo chunk.

---

## 3. Otimizações para o Plano Spark (Gratuito)

O plano gratuito Spark do Firebase oferece limites diários que exigem uso eficiente:
* **Leituras**: 50.000 por dia.
* **Escritas**: 20.000 por dia.
* **Deleções**: 20.000 por dia.

### Boas Práticas Adotadas:
* **Persistência Offline**: A configuração do Firestore será iniciada com persistência offline habilitada, reduzindo o tráfego de leitura repetitiva no navegador.
* **Paginação**: As tabelas de faturamento e sessões serão paginadas (tamanhos de página de 10 a 20 registros). Evitaremos carregar todo o histórico clínico em uma única listagem.
* **Filtros por Período**: O dashboard exigirá a seleção de um intervalo de datas ou mês para consulta, diminuindo drasticamente a quantidade de documentos lidos.

---

## 4. Índices Compostos (Compound Indexes)

Para dar suporte a ordenações combinadas com filtros de igualdade (essenciais para paginação e navegação do dashboard), configuramos e implantamos os seguintes índices no arquivo `firestore.indexes.json`:

* **Coleção `invoices`**:
  * `year` (DESC) + `invoiceNumber` (ASC) (Padrão para listagem sem filtros)
  * `patientName` (ASC) + `year` (DESC) + `invoiceNumber` (ASC)
  * `month` (ASC) + `year` (DESC) + `invoiceNumber` (ASC)
  * `year` (ASC) + `month` (ASC) + `invoiceNumber` (ASC)
  * `patientName` (ASC) + `year` (ASC) + `month` (ASC) + `invoiceNumber` (ASC)

* **Coleção `sessions`**:
  * `patientName` (ASC) + `date` (DESC)
  * `modality` (ASC) + `date` (DESC)
  * `patientName` (ASC) + `modality` (ASC) + `date` (DESC)


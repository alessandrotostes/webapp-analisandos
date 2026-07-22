# Autenticação em PWA e Integração com Google Agenda

## 1. Firebase Auth vs PWA (iOS)
Aplicativos instalados (PWA) em sistemas operacionais como iOS e iPadOS possuem ambientes isolados (Standalone Safari).
- Evitamos o uso de `signInWithRedirect` pois ele direciona o usuário para fora do PWA, abrindo o navegador do sistema. Ao finalizar a autenticação, o iOS falha em repassar as credenciais de volta para a interface PWA, causando loops de autenticação ou travamentos na tela de Login.
- A solução utilizada foi forçar o **`signInWithPopup`**, que abre uma camada WebView nativa sobre o PWA e consegue devolver a credencial à aplicação sem quebrar o contexto.
- Reforçamos chamando `setPersistence(auth, browserLocalPersistence)` antes do login para garantir o estado.

## 2. Renovação do Token do Google
O sistema necessita ler eventos da Agenda (Google Calendar). Para isso, pedimos escopos de Agenda durante o Auth.
**O Problema:** A sessão do Firebase Auth não expira facilmente, porém, o `google_access_token` gerado pela API do Google tem um **Time-To-Live de cerca de 1 hora**.

**A Solução Inteligente implementada:**
- O estado de login no Firebase se mantém (o usuário não é jogado para fora do app).
- Quando as requisições à API do Google retornam erro `401 Unauthorized`, o app remove o token local e altera o estado `googleAccessToken` para nulo.
- O Frontend reage a isso não deslogando a pessoa, mas renderizando um botão **"Reconectar Agenda"** na barra superior de navegação.
- Ao clicar nele, o popup rápido do Google se abre para atualizar as credenciais silenciosamente e o fluxo volta a funcionar, mantendo excelente experiência no Mobile.

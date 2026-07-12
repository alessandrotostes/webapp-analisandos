# Regras de Segurança e Acesso

## 1. Firebase Firestore Rules
O banco de dados do Firestore está configurado para **permitir acesso apenas** para o email `tauanapavanelli@gmail.com`.
As regras do Firestore não são comitadas neste repositório (`firestore.rules` e `firebase.json` estão no `.gitignore`) para evitar exposição da infraestrutura, mas a regra principal no painel do Firebase deve ser:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.email == 'tauanapavanelli@gmail.com';
    }
  }
}
```

## 2. Autenticação e Bloqueio no Frontend
Mesmo que o backend bloqueie consultas, o frontend (`App.tsx`) possui uma dupla checagem:
- Se qualquer outro usuário conseguir fazer login pelo Google, o sistema identificará o email, mostrará "Acesso Negado" e fará o logout forçado imediatamente (`signOut`).

## 3. Persistência de Dados no PWA
Como o sistema é instalado via PWA em dispositivos móveis, a persistência padrão foi configurada explicitamente para `browserLocalPersistence`. 
Isso garante que o Firebase Auth não perca a sessão ao fechar o aplicativo no iPhone/Android.

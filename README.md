# SOFRETMA TRANSIT — Interface Administration

Interface d'administration du site [sofretmatransit.com](https://sofretmatransit.com).

**URL admin :** https://admin.sofretmatransit.com  
**Développé par :** W2K-Digital

---

## Structure

```
sofretma-transit-admin/
├── index.html          ← Page de connexion
├── dashboard.html      ← Tableau de bord + statistiques paiements
├── clients.html        ← Gestion des clients inscrits
├── paiements.html      ← Gestion des paiements (reçus / en attente)
├── actualites.html     ← Création et gestion des articles
├── medias.html         ← Upload et gestion des médias
├── formulaires.html    ← Consultation des formulaires reçus
├── css/admin.css       ← Styles de l'interface
├── js/
│   ├── auth.js         ← Authentification
│   ├── dashboard.js    ← Statistiques
│   ├── clients.js      ← CRUD clients
│   ├── paiements.js    ← CRUD paiements
│   ├── actualites.js   ← CRUD articles (Quill.js)
│   ├── medias.js       ← Upload médias
│   └── formulaires.js  ← Lecture formulaires
└── CNAME               ← admin.sofretmatransit.com
```

## Déploiement

GitHub Pages activé sur la branche `main` (dossier racine `/`).  
Tout push sur `main` est disponible immédiatement sur `admin.sofretmatransit.com`.

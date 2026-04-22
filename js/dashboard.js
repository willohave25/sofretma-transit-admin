/* ============================================================
   SOFRETMA TRANSIT — Tableau de bord
   W2K-Digital | dashboard.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* Protection de la page */
  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';

  /* ---- Utilitaires ---- */
  function formaterDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formaterMontant(valeur) {
    if (valeur === null || valeur === undefined) return '—';
    return parseInt(valeur, 10).toLocaleString('fr-FR') + ' FCFA';
  }

  function afficherChargement(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="chargement">Chargement des données...</div>';
  }

  function afficherErreur(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="chargement">' + (msg || 'Données indisponibles pour le moment.') + '</div>';
  }

  /* ---- Appel API générique avec fallback silencieux ---- */
  function fetchAPI(endpoint, callback) {
    fetch(API + endpoint)
      .then(function (r) { return r.json(); })
      .then(callback)
      .catch(function () { callback(null); });
  }

  /* ============================================================
     CARTES STATISTIQUES
  ============================================================ */
  function chargerStatistiques() {
    fetchAPI('/stats', function (data) {
      if (!data) {
        /* Valeurs par défaut si API non disponible */
        mettreAJourStat('stat-clients', '—');
        mettreAJourStat('stat-actifs', '—');
        mettreAJourStat('stat-articles', '—');
        mettreAJourStat('stat-formulaires', '—');
        mettreAJourStat('stat-paiements-recus', '—');
        mettreAJourStat('stat-paiements-attente', '—');
        mettreAJourStat('stat-montant-total', '—');
        return;
      }
      mettreAJourStat('stat-clients', data.total_clients || 0);
      mettreAJourStat('stat-actifs', data.clients_actifs || 0);
      mettreAJourStat('stat-articles', data.articles_publies || 0);
      mettreAJourStat('stat-formulaires', data.formulaires_recus || 0);
      mettreAJourStat('stat-paiements-recus', data.paiements_recus || 0);
      mettreAJourStat('stat-paiements-attente', data.paiements_attente || 0);
      mettreAJourStat('stat-montant-total', formaterMontant(data.montant_total));
    });
  }

  function mettreAJourStat(id, valeur) {
    const el = document.getElementById(id);
    if (el) el.textContent = valeur;
  }

  /* ============================================================
     ACTIVITÉ RÉCENTE — CLIENTS
  ============================================================ */
  function chargerDerniersClients() {
    afficherChargement('liste-derniers-clients');
    fetchAPI('/clients?limit=5&tri=date_desc', function (data) {
      const conteneur = document.getElementById('liste-derniers-clients');
      if (!conteneur) return;

      if (!data || !data.clients || data.clients.length === 0) {
        conteneur.innerHTML = '<div class="etat-vide"><div class="etat-vide__icone">👥</div><div class="etat-vide__texte">Aucun client inscrit</div></div>';
        return;
      }

      const html = data.clients.map(function (c) {
        return '<div class="activite-item">' +
          '<div class="activite-item__icone activite-item__icone--vert">👤</div>' +
          '<div class="activite-item__texte">' +
            '<div class="activite-item__nom">' + escHtml(c.nom || 'Client') + '</div>' +
            '<div class="activite-item__detail">' + escHtml(c.email || '') + '</div>' +
          '</div>' +
          '<div class="activite-item__date">' + formaterDate(c.date_inscription) + '</div>' +
        '</div>';
      }).join('');

      conteneur.innerHTML = html;
    });
  }

  /* ============================================================
     ACTIVITÉ RÉCENTE — FORMULAIRES
  ============================================================ */
  function chargerDerniersFormulaires() {
    afficherChargement('liste-derniers-formulaires');
    fetchAPI('/formulaires?limit=5&tri=date_desc', function (data) {
      const conteneur = document.getElementById('liste-derniers-formulaires');
      if (!conteneur) return;

      if (!data || !data.formulaires || data.formulaires.length === 0) {
        conteneur.innerHTML = '<div class="etat-vide"><div class="etat-vide__icone">📋</div><div class="etat-vide__texte">Aucun formulaire reçu</div></div>';
        return;
      }

      const html = data.formulaires.map(function (f) {
        return '<div class="activite-item">' +
          '<div class="activite-item__icone activite-item__icone--or">📋</div>' +
          '<div class="activite-item__texte">' +
            '<div class="activite-item__nom">' + escHtml(f.nom || 'Demande') + '</div>' +
            '<div class="activite-item__detail">' + escHtml(f.type || '') + '</div>' +
          '</div>' +
          '<div class="activite-item__date">' + formaterDate(f.date_envoi) + '</div>' +
        '</div>';
      }).join('');

      conteneur.innerHTML = html;
    });
  }

  /* ============================================================
     PAIEMENTS REÇUS
  ============================================================ */
  function chargerPaiementsRecus() {
    afficherChargement('liste-paiements-recus');
    fetchAPI('/paiements?statut=recu&limit=8', function (data) {
      const conteneur = document.getElementById('liste-paiements-recus');
      if (!conteneur) return;

      if (!data || !data.paiements || data.paiements.length === 0) {
        conteneur.innerHTML = '<div class="etat-vide"><div class="etat-vide__icone">✅</div><div class="etat-vide__texte">Aucun paiement reçu</div></div>';
        return;
      }

      conteneur.innerHTML = construireTableauPaiements(data.paiements, 'recu');
    });
  }

  /* ============================================================
     PAIEMENTS EN ATTENTE
  ============================================================ */
  function chargerPaiementsAttente() {
    afficherChargement('liste-paiements-attente');
    fetchAPI('/paiements?statut=attente&limit=8', function (data) {
      const conteneur = document.getElementById('liste-paiements-attente');
      if (!conteneur) return;

      if (!data || !data.paiements || data.paiements.length === 0) {
        conteneur.innerHTML = '<div class="etat-vide"><div class="etat-vide__icone">⏳</div><div class="etat-vide__texte">Aucun paiement en attente</div></div>';
        return;
      }

      conteneur.innerHTML = construireTableauPaiements(data.paiements, 'attente');
    });
  }

  function construireTableauPaiements(paiements, type) {
    const lignes = paiements.map(function (p) {
      const badge = type === 'recu'
        ? '<span class="badge badge--vert">✓ Reçu</span>'
        : '<span class="badge badge--or">⏳ En attente</span>';

      return '<tr>' +
        '<td>' + escHtml(p.client_nom || '—') + '</td>' +
        '<td>' + escHtml(p.reference || '—') + '</td>' +
        '<td>' + escHtml(p.service || '—') + '</td>' +
        '<td><strong>' + formaterMontant(p.montant) + '</strong></td>' +
        '<td>' + formaterDate(type === 'recu' ? p.date_paiement : p.date_echeance) + '</td>' +
        '<td>' + badge + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="table-wrapper">' +
      '<table>' +
        '<thead><tr>' +
          '<th>Client</th>' +
          '<th>Référence</th>' +
          '<th>Service</th>' +
          '<th>Montant</th>' +
          '<th>' + (type === 'recu' ? 'Date paiement' : 'Échéance') + '</th>' +
          '<th>Statut</th>' +
        '</tr></thead>' +
        '<tbody>' + lignes + '</tbody>' +
      '</table>' +
    '</div>';
  }

  /* ============================================================
     DERNIERS ARTICLES
  ============================================================ */
  function chargerDerniersArticles() {
    afficherChargement('liste-derniers-articles');
    fetchAPI('/actualites?limit=3&tri=date_desc', function (data) {
      const conteneur = document.getElementById('liste-derniers-articles');
      if (!conteneur) return;

      if (!data || !data.articles || data.articles.length === 0) {
        conteneur.innerHTML = '<div class="etat-vide"><div class="etat-vide__icone">📰</div><div class="etat-vide__texte">Aucun article publié</div></div>';
        return;
      }

      const html = data.articles.map(function (a) {
        const badge = a.statut === 'publie'
          ? '<span class="badge badge--vert">Publié</span>'
          : '<span class="badge badge--gris">Brouillon</span>';

        return '<div class="activite-item">' +
          '<div class="activite-item__icone activite-item__icone--bleu">📰</div>' +
          '<div class="activite-item__texte">' +
            '<div class="activite-item__nom">' + escHtml(a.titre || 'Article') + '</div>' +
            '<div class="activite-item__detail">' + badge + '</div>' +
          '</div>' +
          '<div class="activite-item__date">' + formaterDate(a.date_publication) + '</div>' +
        '</div>';
      }).join('');

      conteneur.innerHTML = html;
    });
  }

  /* ---- Protection XSS ---- */
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ============================================================
     SIDEBAR MOBILE
  ============================================================ */
  const hamburger = document.getElementById('hamburger-admin');
  const sidebar   = document.querySelector('.sidebar');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', function () {
      sidebar.classList.toggle('ouverte');
    });

    document.addEventListener('click', function (e) {
      if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove('ouverte');
      }
    });
  }

  /* ============================================================
     INITIALISATION
  ============================================================ */
  chargerStatistiques();
  chargerDerniersClients();
  chargerDerniersFormulaires();
  chargerPaiementsRecus();
  chargerPaiementsAttente();
  chargerDerniersArticles();

});

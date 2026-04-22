/* ============================================================
   SOFRETMA TRANSIT — Gestion clients
   W2K-Digital | clients.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';

  let tousLesClients = [];
  let pageActuelle = 1;
  const parPage = 15;

  /* ---- Utilitaires ---- */
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formaterDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function afficherToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + (type || 'succes');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3500);
  }

  /* ---- Chargement des clients ---- */
  function chargerClients() {
    const tbody = document.getElementById('tbody-clients');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/clients')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tousLesClients = (data && data.clients) ? data.clients : [];
        appliquerFiltres();
      })
      .catch(function () {
        tousLesClients = [];
        appliquerFiltres();
      });
  }

  /* ---- Filtres et recherche ---- */
  function appliquerFiltres() {
    const recherche = (document.getElementById('recherche-clients') || {}).value || '';
    const filtreStatut = (document.getElementById('filtre-statut') || {}).value || '';

    let filtres = tousLesClients.filter(function (c) {
      const correspondRecherche = !recherche ||
        (c.nom && c.nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(recherche.toLowerCase()));

      const correspondStatut = !filtreStatut || c.statut === filtreStatut;

      return correspondRecherche && correspondStatut;
    });

    afficherClients(filtres);
  }

  /* ---- Affichage du tableau ---- */
  function afficherClients(clients) {
    const tbody = document.getElementById('tbody-clients');
    const infoPagination = document.getElementById('info-pagination');
    if (!tbody) return;

    const total = clients.length;
    const debut = (pageActuelle - 1) * parPage;
    const fin   = Math.min(debut + parPage, total);
    const page  = clients.slice(debut, fin);

    if (infoPagination) {
      infoPagination.textContent = total > 0
        ? (debut + 1) + ' – ' + fin + ' sur ' + total + ' clients'
        : '0 client';
    }

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="etat-vide"><div class="etat-vide__icone">👥</div><div class="etat-vide__texte">Aucun client trouvé</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = page.map(function (c) {
      const badgeStatut = c.statut === 'actif'
        ? '<span class="badge badge--vert">Actif</span>'
        : '<span class="badge badge--rouge">Suspendu</span>';

      const labelToggle = c.statut === 'actif' ? 'Suspendre' : 'Activer';
      const classToggle = c.statut === 'actif' ? 'btn--gris' : 'btn--vert';

      return '<tr>' +
        '<td>' + escHtml(c.nom || '—') + '</td>' +
        '<td>' + escHtml(c.email || '—') + '</td>' +
        '<td>' + escHtml(c.telephone || '—') + '</td>' +
        '<td>' + formaterDate(c.date_inscription) + '</td>' +
        '<td>' + badgeStatut + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--gris" onclick="voirClient(\'' + c.id + '\')">Détails</button>' +
          '<button class="btn btn--sm ' + classToggle + '" onclick="toggleStatutClient(\'' + c.id + '\', \'' + c.statut + '\')">' + labelToggle + '</button>' +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerClient(\'' + c.id + '\')">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---- Voir détails client ---- */
  window.voirClient = function (id) {
    const client = tousLesClients.find(function (c) { return c.id == id; });
    if (!client) return;

    const modale = document.getElementById('modale-detail-client');
    const corps  = document.getElementById('detail-client-corps');
    if (!modale || !corps) return;

    corps.innerHTML = '<div class="detail-info">' +
      '<div class="detail-info__item"><div class="detail-info__label">Nom complet</div><div class="detail-info__valeur">' + escHtml(client.nom) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Statut</div><div class="detail-info__valeur">' + (client.statut === 'actif' ? '✅ Actif' : '🔴 Suspendu') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Email</div><div class="detail-info__valeur">' + escHtml(client.email) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Téléphone</div><div class="detail-info__valeur">' + escHtml(client.telephone || '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Date inscription</div><div class="detail-info__valeur">' + formaterDate(client.date_inscription) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Dernière connexion</div><div class="detail-info__valeur">' + formaterDate(client.derniere_connexion) + '</div></div>' +
      (client.adresse ? '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Adresse</div><div class="detail-info__valeur">' + escHtml(client.adresse) + '</div></div>' : '') +
    '</div>';

    modale.classList.add('visible');
  };

  /* ---- Modifier statut client ---- */
  window.toggleStatutClient = function (id, statutActuel) {
    const nouveauStatut = statutActuel === 'actif' ? 'suspendu' : 'actif';
    const message = nouveauStatut === 'suspendu' ? 'Suspendre ce client ?' : 'Activer ce client ?';

    if (!confirm(message)) return;

    fetch(API + '/clients/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: nouveauStatut })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        const client = tousLesClients.find(function (c) { return c.id == id; });
        if (client) client.statut = nouveauStatut;
        appliquerFiltres();
        afficherToast('Statut mis à jour avec succès', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la mise à jour', 'erreur');
      });
  };

  /* ---- Supprimer client ---- */
  window.supprimerClient = function (id) {
    const client = tousLesClients.find(function (c) { return c.id == id; });
    const nom = client ? client.nom : 'ce client';

    if (!confirm('Supprimer définitivement ' + nom + ' ?\nCette action est irréversible.')) return;

    fetch(API + '/clients/' + id, { method: 'DELETE' })
      .then(function () {
        tousLesClients = tousLesClients.filter(function (c) { return c.id != id; });
        appliquerFiltres();
        afficherToast('Client supprimé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Export CSV ---- */
  document.getElementById('btn-export-clients')?.addEventListener('click', function () {
    if (tousLesClients.length === 0) {
      afficherToast('Aucune donnée à exporter', 'info');
      return;
    }

    const entetes = ['Nom', 'Email', 'Téléphone', 'Date inscription', 'Statut'];
    const lignes  = tousLesClients.map(function (c) {
      return [
        '"' + (c.nom || '') + '"',
        '"' + (c.email || '') + '"',
        '"' + (c.telephone || '') + '"',
        '"' + formaterDate(c.date_inscription) + '"',
        '"' + (c.statut || '') + '"'
      ].join(',');
    });

    const csv  = [entetes.join(',')].concat(lignes).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'clients-sofretma-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    afficherToast('Export CSV téléchargé', 'succes');
  });

  /* ---- Fermeture modales ---- */
  document.querySelectorAll('.modale__fermer, .btn-fermer-modale').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.overlay').forEach(function (o) { o.classList.remove('visible'); });
    });
  });

  document.querySelectorAll('.overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  });

  /* ---- Listeners recherche / filtre ---- */
  ['recherche-clients', 'filtre-statut'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { pageActuelle = 1; appliquerFiltres(); });
  });

  /* ---- Sidebar mobile ---- */
  const hamburger = document.getElementById('hamburger-admin');
  const sidebar   = document.querySelector('.sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', function () { sidebar.classList.toggle('ouverte'); });
    document.addEventListener('click', function (e) {
      if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) sidebar.classList.remove('ouverte');
    });
  }

  /* ---- Init ---- */
  chargerClients();

});

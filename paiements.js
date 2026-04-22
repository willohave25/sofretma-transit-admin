/* ============================================================
   SOFRETMA TRANSIT — Gestion des paiements
   W2K-Digital | paiements.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let tousPaiements = [];
  let paiementEnCours = null;
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

  function formaterMontant(valeur) {
    if (valeur === null || valeur === undefined || valeur === '') return '—';
    return parseInt(valeur, 10).toLocaleString('fr-FR') + ' FCFA';
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

  /* ---- Chargement des paiements ---- */
  function chargerPaiements() {
    const tbody = document.getElementById('tbody-paiements');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/paiements')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tousPaiements = (data && data.paiements) ? data.paiements : [];
        appliquerFiltres();
        mettreAJourResume();
      })
      .catch(function () {
        tousPaiements = [];
        appliquerFiltres();
        mettreAJourResume();
      });
  }

  /* ---- Résumé financier ---- */
  function mettreAJourResume() {
    const recus   = tousPaiements.filter(function (p) { return p.statut === 'recu'; });
    const attente = tousPaiements.filter(function (p) { return p.statut === 'attente'; });

    const montantRecu   = recus.reduce(function (s, p) { return s + (parseInt(p.montant, 10) || 0); }, 0);
    const montantAttente = attente.reduce(function (s, p) { return s + (parseInt(p.montant, 10) || 0); }, 0);

    const elNbRecus      = document.getElementById('nb-paiements-recus');
    const elNbAttente    = document.getElementById('nb-paiements-attente');
    const elMontantRecu  = document.getElementById('montant-recus');
    const elMontantAtt   = document.getElementById('montant-attente');
    const elMontantTotal = document.getElementById('montant-total');

    if (elNbRecus)      elNbRecus.textContent      = recus.length;
    if (elNbAttente)    elNbAttente.textContent     = attente.length;
    if (elMontantRecu)  elMontantRecu.textContent   = formaterMontant(montantRecu);
    if (elMontantAtt)   elMontantAtt.textContent    = formaterMontant(montantAttente);
    if (elMontantTotal) elMontantTotal.textContent  = formaterMontant(montantRecu + montantAttente);
  }

  /* ---- Filtres ---- */
  function appliquerFiltres() {
    const recherche    = (document.getElementById('recherche-paiements') || {}).value || '';
    const filtreStatut = (document.getElementById('filtre-statut-paiement') || {}).value || '';
    const filtreService = (document.getElementById('filtre-service') || {}).value || '';

    let filtres = tousPaiements.filter(function (p) {
      const correspondRecherche = !recherche ||
        (p.client_nom && p.client_nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (p.reference && p.reference.toLowerCase().includes(recherche.toLowerCase()));

      const correspondStatut  = !filtreStatut  || p.statut  === filtreStatut;
      const correspondService = !filtreService || p.service === filtreService;

      return correspondRecherche && correspondStatut && correspondService;
    });

    afficherPaiements(filtres);
  }

  /* ---- Affichage tableau ---- */
  function afficherPaiements(paiements) {
    const tbody = document.getElementById('tbody-paiements');
    const infoPagination = document.getElementById('info-pagination');
    if (!tbody) return;

    const total = paiements.length;
    const debut = (pageActuelle - 1) * parPage;
    const fin   = Math.min(debut + parPage, total);
    const page  = paiements.slice(debut, fin);

    if (infoPagination) {
      infoPagination.textContent = total > 0
        ? (debut + 1) + ' – ' + fin + ' sur ' + total + ' paiement(s)'
        : '0 paiement';
    }

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="etat-vide"><div class="etat-vide__icone">💰</div><div class="etat-vide__texte">Aucun paiement trouvé</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = page.map(function (p) {
      const badge = p.statut === 'recu'
        ? '<span class="badge badge--vert">✓ Reçu</span>'
        : p.statut === 'annule'
          ? '<span class="badge badge--rouge">✗ Annulé</span>'
          : '<span class="badge badge--or">⏳ En attente</span>';

      return '<tr>' +
        '<td><strong>' + escHtml(p.reference || '—') + '</strong></td>' +
        '<td>' + escHtml(p.client_nom || '—') + '</td>' +
        '<td>' + escHtml(p.service || '—') + '</td>' +
        '<td><strong>' + formaterMontant(p.montant) + '</strong></td>' +
        '<td>' + formaterDate(p.date_echeance) + '</td>' +
        '<td>' + formaterDate(p.date_paiement) + '</td>' +
        '<td>' + badge + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--gris" onclick="voirPaiement(\'' + p.id + '\')">Détails</button>' +
          (p.statut === 'attente' ? '<button class="btn btn--sm btn--vert" onclick="marquerRecu(\'' + p.id + '\')">Marquer reçu</button>' : '') +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerPaiement(\'' + p.id + '\')">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---- Voir détails paiement ---- */
  window.voirPaiement = function (id) {
    const p = tousPaiements.find(function (x) { return x.id == id; });
    if (!p) return;

    const corps = document.getElementById('detail-paiement-corps');
    const overlay = document.getElementById('overlay-detail-paiement');
    if (!corps || !overlay) return;

    corps.innerHTML = '<div class="detail-info">' +
      '<div class="detail-info__item"><div class="detail-info__label">Référence</div><div class="detail-info__valeur">' + escHtml(p.reference) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Statut</div><div class="detail-info__valeur">' +
        (p.statut === 'recu' ? '✅ Reçu' : p.statut === 'annule' ? '❌ Annulé' : '⏳ En attente') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Client</div><div class="detail-info__valeur">' + escHtml(p.client_nom) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Service</div><div class="detail-info__valeur">' + escHtml(p.service) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Montant</div><div class="detail-info__valeur"><strong>' + formaterMontant(p.montant) + '</strong></div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Mode de paiement</div><div class="detail-info__valeur">' + escHtml(p.mode_paiement || '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Date d\'échéance</div><div class="detail-info__valeur">' + formaterDate(p.date_echeance) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Date de paiement</div><div class="detail-info__valeur">' + formaterDate(p.date_paiement) + '</div></div>' +
      (p.notes ? '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Notes</div><div class="detail-info__valeur">' + escHtml(p.notes) + '</div></div>' : '') +
    '</div>';

    overlay.classList.add('visible');
  };

  /* ---- Nouveau paiement ---- */
  document.getElementById('btn-nouveau-paiement')?.addEventListener('click', function () {
    paiementEnCours = null;
    reinitialiserFormulaire();
    document.getElementById('modale-paiement-titre').textContent = 'Nouveau paiement';
    document.getElementById('overlay-paiement').classList.add('visible');
  });

  /* ---- Formulaire paiement ---- */
  document.getElementById('formulaire-paiement')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const payload  = {};
    formData.forEach(function (val, cle) { payload[cle] = val; });

    const methode  = paiementEnCours ? 'PUT' : 'POST';
    const endpoint = paiementEnCours ? (API + '/paiements/' + paiementEnCours.id) : (API + '/paiements');

    fetch(endpoint, {
      method: methode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        fermerModales();
        chargerPaiements();
        afficherToast(paiementEnCours ? 'Paiement mis à jour' : 'Paiement enregistré', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de l\'enregistrement', 'erreur');
      });
  });

  function reinitialiserFormulaire() {
    const f = document.getElementById('formulaire-paiement');
    if (f) f.reset();
  }

  /* ---- Marquer paiement comme reçu ---- */
  window.marquerRecu = function (id) {
    if (!confirm('Confirmer la réception de ce paiement ?')) return;

    fetch(API + '/paiements/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'recu', date_paiement: new Date().toISOString().slice(0, 10) })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        const p = tousPaiements.find(function (x) { return x.id == id; });
        if (p) { p.statut = 'recu'; p.date_paiement = new Date().toISOString().slice(0, 10); }
        appliquerFiltres();
        mettreAJourResume();
        afficherToast('Paiement marqué comme reçu', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la mise à jour', 'erreur');
      });
  };

  /* ---- Supprimer paiement ---- */
  window.supprimerPaiement = function (id) {
    if (!confirm('Supprimer ce paiement ?\nCette action est irréversible.')) return;

    fetch(API + '/paiements/' + id, { method: 'DELETE' })
      .then(function () {
        tousPaiements = tousPaiements.filter(function (p) { return p.id != id; });
        appliquerFiltres();
        mettreAJourResume();
        afficherToast('Paiement supprimé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Export CSV ---- */
  document.getElementById('btn-export-paiements')?.addEventListener('click', function () {
    if (tousPaiements.length === 0) {
      afficherToast('Aucune donnée à exporter', 'info');
      return;
    }

    const entetes = ['Référence', 'Client', 'Service', 'Montant (FCFA)', 'Date échéance', 'Date paiement', 'Statut'];
    const lignes  = tousPaiements.map(function (p) {
      return [
        '"' + (p.reference || '') + '"',
        '"' + (p.client_nom || '') + '"',
        '"' + (p.service || '') + '"',
        '"' + (p.montant || '') + '"',
        '"' + formaterDate(p.date_echeance) + '"',
        '"' + formaterDate(p.date_paiement) + '"',
        '"' + (p.statut || '') + '"'
      ].join(',');
    });

    const csv  = [entetes.join(',')].concat(lignes).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'paiements-sofretma-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    afficherToast('Export CSV téléchargé', 'succes');
  });

  /* ---- Listeners filtres ---- */
  ['recherche-paiements', 'filtre-statut-paiement', 'filtre-service'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { pageActuelle = 1; appliquerFiltres(); });
  });

  /* ---- Fermeture modales ---- */
  function fermerModales() {
    document.querySelectorAll('.overlay').forEach(function (o) { o.classList.remove('visible'); });
  }

  document.querySelectorAll('.modale__fermer, .btn-fermer-modale').forEach(function (btn) {
    btn.addEventListener('click', fermerModales);
  });

  document.querySelectorAll('.overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) fermerModales();
    });
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
  chargerPaiements();

});

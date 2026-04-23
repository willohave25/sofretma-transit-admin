/* ============================================================
   SOFRETMA TRANSIT — Gestion des conteneurs
   W2K-Digital | conteneurs.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let tousConteneurs = [];
  let conteneurEnCours = null;
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

  function badgeStatutCont(statut) {
    const map = {
      'disponible':   { classe: 'badge--vert',  label: '✓ Disponible' },
      'en_chargement':{ classe: 'badge--bleu',  label: '⏳ En chargement' },
      'en_transit':   { classe: 'badge--or',    label: '🔄 En transit' },
      'en_decharge':  { classe: 'badge--gris',  label: '📦 Déchargement' },
      'en_douane':    { classe: 'badge--or',    label: '🔍 En douane' },
      'livre':        { classe: 'badge--vert',  label: '🏁 Livré' },
      'bloque':       { classe: 'badge--rouge', label: '🚫 Bloqué' }
    };
    const b = map[statut] || { classe: 'badge--gris', label: statut || '—' };
    return '<span class="badge ' + b.classe + '">' + b.label + '</span>';
  }

  function jaugeHtml(remplissage) {
    const pct  = Math.min(Math.max(parseInt(remplissage, 10) || 0, 0), 100);
    const cls  = pct >= 90 ? 'jauge-conteneur__fill--plein'
               : pct >= 70 ? 'jauge-conteneur__fill--alerte'
               : '';
    return '<div class="jauge-conteneur">' +
      '<div class="jauge-conteneur__barre"><div class="jauge-conteneur__fill ' + cls + '" style="width:' + pct + '%;"></div></div>' +
      '<span class="jauge-conteneur__pct">' + pct + '%</span>' +
    '</div>';
  }

  /* ---- Chargement des conteneurs ---- */
  function chargerConteneurs() {
    const tbody = document.getElementById('tbody-conteneurs');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/conteneurs')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tousConteneurs = (data && data.conteneurs) ? data.conteneurs : [];
        appliquerFiltres();
        mettreAJourCompteurs();
      })
      .catch(function () {
        tousConteneurs = [];
        appliquerFiltres();
        mettreAJourCompteurs();
      });
  }

  function mettreAJourCompteurs() {
    const total      = tousConteneurs.length;
    const transit    = tousConteneurs.filter(function (c) { return c.statut === 'en_transit'; }).length;
    const douane     = tousConteneurs.filter(function (c) { return c.statut === 'en_douane'; }).length;
    const disponible = tousConteneurs.filter(function (c) { return c.statut === 'disponible'; }).length;

    const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('compteur-cont-total',      total);
    set('compteur-cont-transit',    transit);
    set('compteur-cont-douane',     douane);
    set('compteur-cont-disponible', disponible);
  }

  /* ---- Filtres ---- */
  function appliquerFiltres() {
    const recherche    = (document.getElementById('recherche-cont') || {}).value || '';
    const filtreType   = (document.getElementById('filtre-type-cont') || {}).value || '';
    const filtreStatut = (document.getElementById('filtre-statut-cont') || {}).value || '';

    let filtres = tousConteneurs.filter(function (c) {
      const correspondRecherche = !recherche ||
        (c.numero && c.numero.toLowerCase().includes(recherche.toLowerCase())) ||
        (c.compagnie && c.compagnie.toLowerCase().includes(recherche.toLowerCase())) ||
        (c.port_depart && c.port_depart.toLowerCase().includes(recherche.toLowerCase())) ||
        (c.port_arrivee && c.port_arrivee.toLowerCase().includes(recherche.toLowerCase()));

      const correspondType   = !filtreType   || c.type    === filtreType;
      const correspondStatut = !filtreStatut || c.statut  === filtreStatut;

      return correspondRecherche && correspondType && correspondStatut;
    });

    afficherConteneurs(filtres);
  }

  /* ---- Affichage tableau ---- */
  function afficherConteneurs(conteneurs) {
    const tbody = document.getElementById('tbody-conteneurs');
    const infoPagination = document.getElementById('info-pagination');
    if (!tbody) return;

    const total = conteneurs.length;
    const debut = (pageActuelle - 1) * parPage;
    const fin   = Math.min(debut + parPage, total);
    const page  = conteneurs.slice(debut, fin);

    if (infoPagination) {
      infoPagination.textContent = total > 0
        ? (debut + 1) + ' – ' + fin + ' sur ' + total + ' conteneur(s)'
        : '0 conteneur';
    }

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="etat-vide"><div class="etat-vide__icone">📦</div><div class="etat-vide__texte">Aucun conteneur</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = page.map(function (c) {
      const badgeType = c.type === 'FCL'
        ? '<span class="badge badge--bleu">FCL</span>'
        : '<span class="badge badge--gris">LCL</span>';

      return '<tr>' +
        '<td><strong>' + escHtml(c.numero || '—') + '</strong></td>' +
        '<td>' + badgeType + '</td>' +
        '<td>' + escHtml(c.taille || '—') + '</td>' +
        '<td>⚓ ' + escHtml(c.port_depart || '—') + '</td>' +
        '<td>🏁 ' + escHtml(c.port_arrivee || '—') + '</td>' +
        '<td>' + escHtml(c.compagnie || '—') + '</td>' +
        '<td>' + formaterDate(c.date_depart) + '</td>' +
        '<td>' + formaterDate(c.date_arrivee_prevue) + '</td>' +
        '<td>' + jaugeHtml(c.remplissage) + '</td>' +
        '<td>' + badgeStatutCont(c.statut) + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--gris" onclick="voirConteneur(\'' + c.id + '\')">Détails</button>' +
          '<button class="btn btn--sm btn--vert" onclick="modifierConteneur(\'' + c.id + '\')">Éditer</button>' +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerConteneur(\'' + c.id + '\')">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---- Voir détails conteneur ---- */
  window.voirConteneur = function (id) {
    const c = tousConteneurs.find(function (x) { return x.id == id; });
    if (!c) return;

    const corps  = document.getElementById('detail-cont-corps');
    const overlay = document.getElementById('overlay-detail-cont');
    if (!corps || !overlay) return;

    /* Expéditions liées */
    const expeditionsHtml = c.expeditions && c.expeditions.length
      ? '<div style="margin-top:16px;"><div style="font-size:.75rem;font-weight:600;color:var(--gris-moyen);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Expéditions liées</div>' +
        c.expeditions.map(function (exp) {
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--gris-clair);border-radius:6px;margin-bottom:6px;font-size:.875rem;">' +
            '<span><strong>' + escHtml(exp.reference) + '</strong> — ' + escHtml(exp.client_nom) + '</span>' +
            '<a href="expeditions.html" class="badge badge--bleu" style="text-decoration:none;">Voir</a>' +
          '</div>';
        }).join('') +
        '</div>'
      : '';

    corps.innerHTML = '<div class="detail-info">' +
      '<div class="detail-info__item"><div class="detail-info__label">Numéro</div><div class="detail-info__valeur">' + escHtml(c.numero) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Type</div><div class="detail-info__valeur">' + escHtml(c.type) + ' — ' + escHtml(c.taille) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Port de départ</div><div class="detail-info__valeur">⚓ ' + escHtml(c.port_depart) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Port d\'arrivée</div><div class="detail-info__valeur">🏁 ' + escHtml(c.port_arrivee) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Compagnie</div><div class="detail-info__valeur">' + escHtml(c.compagnie || '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">N° connaissement (BL)</div><div class="detail-info__valeur">' + escHtml(c.numero_bl || '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Date de départ</div><div class="detail-info__valeur">' + formaterDate(c.date_depart) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Arrivée prévue</div><div class="detail-info__valeur">' + formaterDate(c.date_arrivee_prevue) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Remplissage</div><div class="detail-info__valeur">' + jaugeHtml(c.remplissage) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Statut</div><div class="detail-info__valeur">' + badgeStatutCont(c.statut) + '</div></div>' +
      (c.notes ? '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Notes</div><div class="detail-info__valeur">' + escHtml(c.notes) + '</div></div>' : '') +
    '</div>' + expeditionsHtml;

    overlay.classList.add('visible');
  };

  /* ---- Ouvrir formulaire nouveau conteneur ---- */
  document.getElementById('btn-nouveau-cont')?.addEventListener('click', function () {
    conteneurEnCours = null;
    reinitialiserFormulaire();
    document.getElementById('modale-cont-titre').textContent = 'Nouveau conteneur';
    document.getElementById('overlay-cont-form').classList.add('visible');
  });

  /* ---- Modifier conteneur ---- */
  window.modifierConteneur = function (id) {
    conteneurEnCours = tousConteneurs.find(function (c) { return c.id == id; });
    if (!conteneurEnCours) return;
    remplirFormulaire(conteneurEnCours);
    document.getElementById('modale-cont-titre').textContent = 'Modifier le conteneur';
    document.getElementById('overlay-cont-form').classList.add('visible');
  };

  function remplirFormulaire(c) {
    const f = document.getElementById('formulaire-conteneur');
    if (!f) return;
    const set = function (name, val) { const el = f.elements[name]; if (el) el.value = val || ''; };
    set('numero', c.numero);
    set('type', c.type);
    set('taille', c.taille);
    set('port_depart', c.port_depart);
    set('port_arrivee', c.port_arrivee);
    set('compagnie', c.compagnie);
    set('numero_bl', c.numero_bl);
    set('remplissage', c.remplissage);
    set('date_depart', c.date_depart ? c.date_depart.slice(0, 10) : '');
    set('date_arrivee_prevue', c.date_arrivee_prevue ? c.date_arrivee_prevue.slice(0, 10) : '');
    set('statut', c.statut);
    set('notes', c.notes);
  }

  function reinitialiserFormulaire() {
    const f = document.getElementById('formulaire-conteneur');
    if (f) f.reset();
  }

  /* ---- Soumission formulaire ---- */
  document.getElementById('formulaire-conteneur')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const payload  = {};
    formData.forEach(function (val, cle) { payload[cle] = val; });

    const methode  = conteneurEnCours ? 'PUT'  : 'POST';
    const endpoint = conteneurEnCours
      ? API + '/conteneurs/' + conteneurEnCours.id
      : API + '/conteneurs';

    fetch(endpoint, {
      method: methode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        fermerModales();
        chargerConteneurs();
        afficherToast(conteneurEnCours ? 'Conteneur mis à jour' : 'Conteneur créé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la sauvegarde', 'erreur');
      });
  });

  /* ---- Supprimer conteneur ---- */
  window.supprimerConteneur = function (id) {
    if (!confirm('Supprimer ce conteneur ? Cette action est irréversible.')) return;

    fetch(API + '/conteneurs/' + id, { method: 'DELETE' })
      .then(function () {
        tousConteneurs = tousConteneurs.filter(function (c) { return c.id != id; });
        appliquerFiltres();
        mettreAJourCompteurs();
        afficherToast('Conteneur supprimé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Export CSV ---- */
  document.getElementById('btn-export-cont')?.addEventListener('click', function () {
    if (tousConteneurs.length === 0) { afficherToast('Aucune donnée à exporter', 'info'); return; }

    const entetes = ['Numéro', 'Type', 'Taille', 'Port départ', 'Port arrivée', 'Compagnie', 'N° BL', 'Date départ', 'Arrivée prévue', 'Remplissage (%)', 'Statut'];
    const lignes  = tousConteneurs.map(function (c) {
      return [
        '"' + (c.numero || '') + '"',
        '"' + (c.type || '') + '"',
        '"' + (c.taille || '') + '"',
        '"' + (c.port_depart || '') + '"',
        '"' + (c.port_arrivee || '') + '"',
        '"' + (c.compagnie || '') + '"',
        '"' + (c.numero_bl || '') + '"',
        '"' + formaterDate(c.date_depart) + '"',
        '"' + formaterDate(c.date_arrivee_prevue) + '"',
        '"' + (c.remplissage || '0') + '"',
        '"' + (c.statut || '') + '"'
      ].join(',');
    });

    const csv  = [entetes.join(',')].concat(lignes).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'conteneurs-sofretma-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    afficherToast('Export CSV téléchargé', 'succes');
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

  /* ---- Listeners filtres ---- */
  ['recherche-cont', 'filtre-type-cont', 'filtre-statut-cont'].forEach(function (id) {
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
  chargerConteneurs();

});

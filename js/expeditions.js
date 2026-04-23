/* ============================================================
   SOFRETMA TRANSIT — Gestion des expéditions
   W2K-Digital | expeditions.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let toutesExpeditions = [];
  let expeditionEnCours = null;
  let pageActuelle = 1;
  const parPage = 15;

  /* ---- Étapes de dédouanement ---- */
  const ETAPES_DEDOUANEMENT = [
    { id: 'prise_en_charge',    label: 'Prise en charge',       icone: '📥' },
    { id: 'depart',             label: 'Départ',                icone: '🚀' },
    { id: 'en_transit',         label: 'En transit',            icone: '🔄' },
    { id: 'arrivee_port',       label: 'Arrivée port',          icone: '⚓' },
    { id: 'declaration',        label: 'Déclaration douane',    icone: '📝' },
    { id: 'verification',       label: 'Vérification',          icone: '🔍' },
    { id: 'validation_douane',  label: 'Validation douane',     icone: '✅' },
    { id: 'livraison',          label: 'Livraison finale',      icone: '🏁' }
  ];

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

  function badgeTransport(type) {
    const map = {
      'Maritime':   { classe: 'badge--maritime',   icone: '🚢' },
      'Aérien':     { classe: 'badge--aerien',      icone: '✈️' },
      'Terrestre':  { classe: 'badge--terrestre',   icone: '🚛' },
      'Ferroviaire':{ classe: 'badge--ferroviaire', icone: '🚂' }
    };
    const b = map[type] || { classe: 'badge--gris', icone: '📦' };
    return '<span class="badge ' + b.classe + '">' + b.icone + ' ' + escHtml(type) + '</span>';
  }

  function badgeStatutExp(statut) {
    const map = {
      'en_preparation': { classe: 'badge--gris',  label: 'En préparation' },
      'en_transit':     { classe: 'badge--bleu',  label: 'En transit' },
      'en_douane':      { classe: 'badge--or',    label: 'En douane' },
      'livre':          { classe: 'badge--vert',  label: 'Livré' },
      'bloque':         { classe: 'badge--rouge', label: 'Bloqué' }
    };
    const b = map[statut] || { classe: 'badge--gris', label: statut || '—' };
    return '<span class="badge ' + b.classe + '">' + b.label + '</span>';
  }

  /* ---- Chargement expéditions ---- */
  function chargerExpeditions() {
    const tbody = document.getElementById('tbody-expeditions');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/expeditions')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        toutesExpeditions = (data && data.expeditions) ? data.expeditions : [];
        appliquerFiltres();
        mettreAJourCompteurs();
      })
      .catch(function () {
        toutesExpeditions = [];
        appliquerFiltres();
        mettreAJourCompteurs();
      });
  }

  function mettreAJourCompteurs() {
    const total     = toutesExpeditions.length;
    const transit   = toutesExpeditions.filter(function (e) { return e.statut === 'en_transit'; }).length;
    const douane    = toutesExpeditions.filter(function (e) { return e.statut === 'en_douane'; }).length;
    const livres    = toutesExpeditions.filter(function (e) { return e.statut === 'livre'; }).length;

    const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('compteur-exp-total',   total);
    set('compteur-exp-transit', transit);
    set('compteur-exp-douane',  douane);
    set('compteur-exp-livres',  livres);
  }

  /* ---- Filtres ---- */
  function appliquerFiltres() {
    const recherche = (document.getElementById('recherche-exp') || {}).value || '';
    const filtreType   = (document.getElementById('filtre-transport') || {}).value || '';
    const filtreStatut = (document.getElementById('filtre-statut-exp') || {}).value || '';

    let filtres = toutesExpeditions.filter(function (e) {
      const correspondRecherche = !recherche ||
        (e.code_client && e.code_client.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.client_nom && e.client_nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.reference && e.reference.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.ville_depart && e.ville_depart.toLowerCase().includes(recherche.toLowerCase())) ||
        (e.ville_arrivee && e.ville_arrivee.toLowerCase().includes(recherche.toLowerCase()));

      const correspondType   = !filtreType   || e.type_transport === filtreType;
      const correspondStatut = !filtreStatut || e.statut          === filtreStatut;

      return correspondRecherche && correspondType && correspondStatut;
    });

    afficherExpeditions(filtres);
  }

  /* ---- Affichage tableau ---- */
  function afficherExpeditions(expeditions) {
    const tbody = document.getElementById('tbody-expeditions');
    const infoPagination = document.getElementById('info-pagination');
    if (!tbody) return;

    const total = expeditions.length;
    const debut = (pageActuelle - 1) * parPage;
    const fin   = Math.min(debut + parPage, total);
    const page  = expeditions.slice(debut, fin);

    if (infoPagination) {
      infoPagination.textContent = total > 0
        ? (debut + 1) + ' – ' + fin + ' sur ' + total + ' expédition(s)'
        : '0 expédition';
    }

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="etat-vide"><div class="etat-vide__icone">🚢</div><div class="etat-vide__texte">Aucune expédition</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = page.map(function (e) {
      const progression = calculerProgression(e.etape_courante);

      return '<tr>' +
        '<td><strong>' + escHtml(e.reference || '—') + '</strong></td>' +
        '<td><code style="background:var(--gris-clair);padding:2px 8px;border-radius:4px;font-size:.8rem;">' + escHtml(e.code_client || '—') + '</code></td>' +
        '<td>' + escHtml(e.client_nom || '—') + '</td>' +
        '<td>' + escHtml(e.type_colis || '—') + '</td>' +
        '<td>📍 ' + escHtml(e.ville_depart || '—') + ' → ' + escHtml(e.ville_arrivee || '—') + '</td>' +
        '<td>' + badgeTransport(e.type_transport) + '</td>' +
        '<td>' + badgeStatutExp(e.statut) + '</td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<div style="flex:1;height:5px;background:var(--gris-bord);border-radius:99px;min-width:50px;">' +
              '<div style="height:100%;width:' + progression + '%;background:var(--vert-logo);border-radius:99px;"></div>' +
            '</div>' +
            '<span style="font-size:.75rem;color:var(--gris-moyen);">' + progression + '%</span>' +
          '</div>' +
        '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--gris" onclick="voirExpedition(\'' + e.id + '\')">Suivi</button>' +
          '<button class="btn btn--sm btn--vert" onclick="modifierExpedition(\'' + e.id + '\')">Éditer</button>' +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerExpedition(\'' + e.id + '\')">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function calculerProgression(etapeCourante) {
    const idx = ETAPES_DEDOUANEMENT.findIndex(function (e) { return e.id === etapeCourante; });
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / ETAPES_DEDOUANEMENT.length) * 100);
  }

  /* ---- Voir suivi / dédouanement ---- */
  window.voirExpedition = function (id) {
    const exp = toutesExpeditions.find(function (e) { return e.id == id; });
    if (!exp) return;

    const corps  = document.getElementById('suivi-corps');
    const overlay = document.getElementById('overlay-suivi');
    if (!corps || !overlay) return;

    const etapeIdx = ETAPES_DEDOUANEMENT.findIndex(function (e) { return e.id === exp.etape_courante; });

    /* ---- Stepper visuel ---- */
    const stepsHtml = ETAPES_DEDOUANEMENT.map(function (etape, i) {
      let classe = '';
      if (i < etapeIdx) classe = 'step--fait';
      else if (i === etapeIdx) classe = 'step--en-cours';

      /* Étape bloquée ? */
      if (exp.statut === 'bloque' && i === etapeIdx) classe = 'step--bloque';

      const iconeContenu = i < etapeIdx ? '✓' : etape.icone;
      const dateEtape = exp.dates_etapes && exp.dates_etapes[etape.id] ? formaterDate(exp.dates_etapes[etape.id]) : '';

      return '<div class="step ' + classe + '">' +
        '<div class="step__cercle">' + iconeContenu + '</div>' +
        '<div class="step__label">' + etape.label + '</div>' +
        (dateEtape ? '<div class="step__date">' + dateEtape + '</div>' : '') +
      '</div>';
    }).join('');

    /* ---- Infos expédition ---- */
    const infoHtml = '<div class="detail-info" style="margin-bottom:20px;">' +
      '<div class="detail-info__item"><div class="detail-info__label">Référence</div><div class="detail-info__valeur">' + escHtml(exp.reference) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Code client</div><div class="detail-info__valeur">' + escHtml(exp.code_client) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Client</div><div class="detail-info__valeur">' + escHtml(exp.client_nom) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Type de colis</div><div class="detail-info__valeur">' + escHtml(exp.type_colis) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Départ</div><div class="detail-info__valeur">📍 ' + escHtml(exp.ville_depart) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Arrivée</div><div class="detail-info__valeur">🏁 ' + escHtml(exp.ville_arrivee) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Transport</div><div class="detail-info__valeur">' + badgeTransport(exp.type_transport) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Statut</div><div class="detail-info__valeur">' + badgeStatutExp(exp.statut) + '</div></div>' +
      (exp.poids ? '<div class="detail-info__item"><div class="detail-info__label">Poids</div><div class="detail-info__valeur">' + escHtml(exp.poids) + ' kg</div></div>' : '') +
      (exp.volume ? '<div class="detail-info__item"><div class="detail-info__label">Volume</div><div class="detail-info__valeur">' + escHtml(exp.volume) + ' m³</div></div>' : '') +
      (exp.date_depart_prevu ? '<div class="detail-info__item"><div class="detail-info__label">Départ prévu</div><div class="detail-info__valeur">' + formaterDate(exp.date_depart_prevu) + '</div></div>' : '') +
      (exp.date_arrivee_prevue ? '<div class="detail-info__item"><div class="detail-info__label">Arrivée prévue</div><div class="detail-info__valeur">' + formaterDate(exp.date_arrivee_prevue) + '</div></div>' : '') +
    '</div>';

    /* ---- Mise à jour étape ---- */
    const selectHtml = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
      '<label style="font-size:.875rem;font-weight:600;">Mettre à jour l\'étape :</label>' +
      '<select id="select-etape-update" style="padding:8px 12px;border:1.5px solid var(--gris-bord);border-radius:8px;font-family:inherit;outline:none;flex:1;">' +
        ETAPES_DEDOUANEMENT.map(function (e, i) {
          return '<option value="' + e.id + '"' + (e.id === exp.etape_courante ? ' selected' : '') + '>' +
            (i + 1) + '. ' + e.label + '</option>';
        }).join('') +
      '</select>' +
      '<select id="select-statut-update" style="padding:8px 12px;border:1.5px solid var(--gris-bord);border-radius:8px;font-family:inherit;outline:none;">' +
        '<option value="en_preparation"' + (exp.statut === 'en_preparation' ? ' selected' : '') + '>En préparation</option>' +
        '<option value="en_transit"' + (exp.statut === 'en_transit' ? ' selected' : '') + '>En transit</option>' +
        '<option value="en_douane"' + (exp.statut === 'en_douane' ? ' selected' : '') + '>En douane</option>' +
        '<option value="livre"' + (exp.statut === 'livre' ? ' selected' : '') + '>Livré</option>' +
        '<option value="bloque"' + (exp.statut === 'bloque' ? ' selected' : '') + '>Bloqué</option>' +
      '</select>' +
      '<button class="btn btn--or btn--sm" onclick="mettreAJourEtape(\'' + exp.id + '\')">Mettre à jour</button>' +
    '</div>';

    corps.innerHTML =
      infoHtml +
      '<h3 style="font-size:.9rem;font-weight:700;color:var(--noir-texte);margin-bottom:4px;">Avancement dédouanement</h3>' +
      '<div class="stepper">' + stepsHtml + '</div>' +
      '<div style="margin-top:20px;padding:16px;background:var(--gris-clair);border-radius:10px;">' + selectHtml + '</div>';

    overlay.classList.add('visible');
  };

  /* ---- Mettre à jour étape ---- */
  window.mettreAJourEtape = function (id) {
    const etape  = (document.getElementById('select-etape-update') || {}).value;
    const statut = (document.getElementById('select-statut-update') || {}).value;
    if (!etape) return;

    fetch(API + '/expeditions/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etape_courante: etape, statut: statut })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        const exp = toutesExpeditions.find(function (e) { return e.id == id; });
        if (exp) { exp.etape_courante = etape; exp.statut = statut; }
        fermerModales();
        appliquerFiltres();
        afficherToast('Expédition mise à jour', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la mise à jour', 'erreur');
      });
  };

  /* ---- Ouvrir formulaire nouvelle expédition ---- */
  document.getElementById('btn-nouvelle-exp')?.addEventListener('click', function () {
    expeditionEnCours = null;
    reinitialiserFormulaire();
    document.getElementById('modale-exp-titre').textContent = 'Nouvelle expédition';
    document.getElementById('overlay-exp-form').classList.add('visible');
  });

  /* ---- Modifier expédition ---- */
  window.modifierExpedition = function (id) {
    expeditionEnCours = toutesExpeditions.find(function (e) { return e.id == id; });
    if (!expeditionEnCours) return;
    remplirFormulaire(expeditionEnCours);
    document.getElementById('modale-exp-titre').textContent = 'Modifier l\'expédition';
    document.getElementById('overlay-exp-form').classList.add('visible');
  };

  function remplirFormulaire(exp) {
    const f = document.getElementById('formulaire-expedition');
    if (!f) return;
    const set = function (name, val) {
      const el = f.elements[name];
      if (el) el.value = val || '';
    };
    set('reference', exp.reference);
    set('code_client', exp.code_client);
    set('client_nom', exp.client_nom);
    set('type_colis', exp.type_colis);
    set('description_colis', exp.description_colis);
    set('poids', exp.poids);
    set('volume', exp.volume);
    set('ville_depart', exp.ville_depart);
    set('ville_arrivee', exp.ville_arrivee);
    set('type_transport', exp.type_transport);
    set('date_depart_prevu', exp.date_depart_prevu ? exp.date_depart_prevu.slice(0, 10) : '');
    set('date_arrivee_prevue', exp.date_arrivee_prevue ? exp.date_arrivee_prevue.slice(0, 10) : '');
    set('statut', exp.statut);
    set('etape_courante', exp.etape_courante);
    set('notes', exp.notes);
  }

  function reinitialiserFormulaire() {
    const f = document.getElementById('formulaire-expedition');
    if (f) f.reset();
  }

  /* ---- Soumission formulaire ---- */
  document.getElementById('formulaire-expedition')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const payload  = {};
    formData.forEach(function (val, cle) { payload[cle] = val; });

    const methode  = expeditionEnCours ? 'PUT'  : 'POST';
    const endpoint = expeditionEnCours
      ? API + '/expeditions/' + expeditionEnCours.id
      : API + '/expeditions';

    fetch(endpoint, {
      method: methode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        fermerModales();
        chargerExpeditions();
        afficherToast(expeditionEnCours ? 'Expédition mise à jour' : 'Expédition créée', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la sauvegarde', 'erreur');
      });
  });

  /* ---- Supprimer expédition ---- */
  window.supprimerExpedition = function (id) {
    if (!confirm('Supprimer cette expédition ? Cette action est irréversible.')) return;

    fetch(API + '/expeditions/' + id, { method: 'DELETE' })
      .then(function () {
        toutesExpeditions = toutesExpeditions.filter(function (e) { return e.id != id; });
        appliquerFiltres();
        mettreAJourCompteurs();
        afficherToast('Expédition supprimée', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Export CSV ---- */
  document.getElementById('btn-export-exp')?.addEventListener('click', function () {
    if (toutesExpeditions.length === 0) { afficherToast('Aucune donnée à exporter', 'info'); return; }

    const entetes = ['Référence', 'Code client', 'Client', 'Type colis', 'Départ', 'Arrivée', 'Transport', 'Statut', 'Étape'];
    const lignes  = toutesExpeditions.map(function (e) {
      const etapeLabel = (ETAPES_DEDOUANEMENT.find(function (x) { return x.id === e.etape_courante; }) || {}).label || '';
      return [
        '"' + (e.reference || '') + '"',
        '"' + (e.code_client || '') + '"',
        '"' + (e.client_nom || '') + '"',
        '"' + (e.type_colis || '') + '"',
        '"' + (e.ville_depart || '') + '"',
        '"' + (e.ville_arrivee || '') + '"',
        '"' + (e.type_transport || '') + '"',
        '"' + (e.statut || '') + '"',
        '"' + etapeLabel + '"'
      ].join(',');
    });

    const csv  = [entetes.join(',')].concat(lignes).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'expeditions-sofretma-' + new Date().toISOString().slice(0, 10) + '.csv';
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
  ['recherche-exp', 'filtre-transport', 'filtre-statut-exp'].forEach(function (id) {
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
  chargerExpeditions();

});

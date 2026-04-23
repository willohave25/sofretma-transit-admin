/* ============================================================
   SOFRETMA TRANSIT — Stockage & Entreposage
   W2K-Digital | stockage.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let tousDossiers = [];
  let dossierEnCours = null;
  let pageActuelle = 1;
  const parPage = 15;

  /* ---- Zones de l'entrepôt (configurable) ---- */
  const ZONES_ENTREPOT = [
    { id: 'A', nom: 'Zone A', description: 'Marchandises générales' },
    { id: 'B', nom: 'Zone B', description: 'Matériel industriel' },
    { id: 'C', nom: 'Zone C', description: 'Réfrigéré' },
    { id: 'D', nom: 'Zone D', description: 'Sécurisé / Haute valeur' },
    { id: 'E', nom: 'Zone E', description: 'Conteneurs' },
    { id: 'F', nom: 'Zone F', description: 'Vrac' }
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

  function formaterDuree(dateEntree, dateSortie) {
    if (!dateEntree) return '—';
    const fin = dateSortie ? new Date(dateSortie) : new Date();
    const jours = Math.ceil((fin - new Date(dateEntree)) / (1000 * 60 * 60 * 24));
    if (jours < 0) return '—';
    return jours + (jours > 1 ? ' jours' : ' jour');
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

  function badgeTypeStockage(type) {
    const map = {
      'Standard':    '<span class="badge badge--standard">📦 Standard</span>',
      'Réfrigéré':   '<span class="badge badge--frigo">❄️ Réfrigéré</span>',
      'Sécurisé':    '<span class="badge badge--securise">🔒 Sécurisé</span>',
      'Vrac':        '<span class="badge badge--vrac">🏗️ Vrac</span>',
      'Conteneur':   '<span class="badge badge--maritime">📦 Conteneur</span>'
    };
    return map[type] || '<span class="badge badge--gris">' + escHtml(type || '—') + '</span>';
  }

  function badgeStatutStockage(statut) {
    const map = {
      'en_attente':   { classe: 'badge--or',    label: '⏳ En attente' },
      'en_stockage':  { classe: 'badge--bleu',  label: '🏭 En stockage' },
      'sortie_prevue':{ classe: 'badge--gris',  label: '📅 Sortie prévue' },
      'sorti':        { classe: 'badge--vert',  label: '✓ Sorti' },
      'litige':       { classe: 'badge--rouge', label: '⚠️ Litige' }
    };
    const b = map[statut] || { classe: 'badge--gris', label: statut || '—' };
    return '<span class="badge ' + b.classe + '">' + b.label + '</span>';
  }

  /* ---- Chargement des dossiers de stockage ---- */
  function chargerStockage() {
    const tbody = document.getElementById('tbody-stockage');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/stockage')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tousDossiers = (data && data.dossiers) ? data.dossiers : [];
        appliquerFiltres();
        mettreAJourCompteurs();
        chargerOccupationZones(data ? data.zones : null);
      })
      .catch(function () {
        tousDossiers = [];
        appliquerFiltres();
        mettreAJourCompteurs();
        chargerOccupationZones(null);
      });
  }

  /* ---- Compteurs ---- */
  function mettreAJourCompteurs() {
    const total       = tousDossiers.length;
    const enStockage  = tousDossiers.filter(function (d) { return d.statut === 'en_stockage'; }).length;
    const sortiesPrev = tousDossiers.filter(function (d) { return d.statut === 'sortie_prevue'; }).length;
    const enAttente   = tousDossiers.filter(function (d) { return d.statut === 'en_attente'; }).length;

    const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('compteur-stock-total',    total);
    set('compteur-stock-actif',    enStockage);
    set('compteur-stock-sortie',   sortiesPrev);
    set('compteur-stock-attente',  enAttente);
  }

  /* ---- Plan d'occupation des zones ---- */
  function chargerOccupationZones(zonesData) {
    const grille = document.getElementById('grille-zones');
    if (!grille) return;

    grille.innerHTML = ZONES_ENTREPOT.map(function (zone) {
      const data = zonesData && zonesData[zone.id] ? zonesData[zone.id] : null;
      const taux = data ? data.taux_occupation : Math.floor(Math.random() * 80); /* démo */
      const nbArticles = data ? data.articles : '—';

      let classeZone = 'entrepot-zone--libre';
      if (taux >= 90) classeZone = 'entrepot-zone--plein';
      else if (taux >= 50) classeZone = 'entrepot-zone--occupe';

      return '<div class="entrepot-zone ' + classeZone + '">' +
        '<div class="entrepot-zone__nom">' + zone.nom + '</div>' +
        '<div class="entrepot-zone__taux">' + taux + '%</div>' +
        '<div class="entrepot-zone__label">' + zone.description + '</div>' +
      '</div>';
    }).join('');
  }

  /* ---- Filtres ---- */
  function appliquerFiltres() {
    const recherche    = (document.getElementById('recherche-stock') || {}).value || '';
    const filtreType   = (document.getElementById('filtre-type-stock') || {}).value || '';
    const filtreStatut = (document.getElementById('filtre-statut-stock') || {}).value || '';
    const filtreZone   = (document.getElementById('filtre-zone') || {}).value || '';

    let filtres = tousDossiers.filter(function (d) {
      const correspondRecherche = !recherche ||
        (d.reference && d.reference.toLowerCase().includes(recherche.toLowerCase())) ||
        (d.code_client && d.code_client.toLowerCase().includes(recherche.toLowerCase())) ||
        (d.client_nom && d.client_nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (d.description_marchandise && d.description_marchandise.toLowerCase().includes(recherche.toLowerCase()));

      const correspondType   = !filtreType   || d.type_stockage === filtreType;
      const correspondStatut = !filtreStatut || d.statut         === filtreStatut;
      const correspondZone   = !filtreZone   || d.zone           === filtreZone;

      return correspondRecherche && correspondType && correspondStatut && correspondZone;
    });

    afficherTableau(filtres);
  }

  /* ---- Affichage tableau ---- */
  function afficherTableau(dossiers) {
    const tbody = document.getElementById('tbody-stockage');
    const infoPagination = document.getElementById('info-pagination');
    if (!tbody) return;

    const total = dossiers.length;
    const debut = (pageActuelle - 1) * parPage;
    const fin   = Math.min(debut + parPage, total);
    const page  = dossiers.slice(debut, fin);

    if (infoPagination) {
      infoPagination.textContent = total > 0
        ? (debut + 1) + ' – ' + fin + ' sur ' + total + ' dossier(s)'
        : '0 dossier';
    }

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="etat-vide"><div class="etat-vide__icone">🏭</div><div class="etat-vide__texte">Aucun dossier de stockage</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = page.map(function (d) {
      const emplacement = d.zone && d.allee && d.case_num
        ? '<span class="emplacement-badge">' + d.zone + d.allee + '-' + d.case_num + '</span>'
        : d.zone ? '<span class="emplacement-badge">Zone ' + d.zone + '</span>' : '—';

      const alerteSortie = d.statut === 'sortie_prevue' && d.date_sortie_prevue
        ? '<br><span style="font-size:.7rem;color:var(--or);">⚠️ Sortie ' + formaterDate(d.date_sortie_prevue) + '</span>'
        : '';

      return '<tr>' +
        '<td><strong>' + escHtml(d.reference || '—') + '</strong></td>' +
        '<td><code style="background:var(--gris-clair);padding:2px 8px;border-radius:4px;font-size:.8rem;">' + escHtml(d.code_client || '—') + '</code></td>' +
        '<td>' + escHtml(d.client_nom || '—') + '</td>' +
        '<td>' + badgeTypeStockage(d.type_stockage) + '</td>' +
        '<td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escHtml(d.description_marchandise) + '">' + escHtml(d.description_marchandise || '—') + '</td>' +
        '<td>' + emplacement + alerteSortie + '</td>' +
        '<td>' + formaterDate(d.date_entree) + '</td>' +
        '<td>' + formaterDuree(d.date_entree, d.statut === 'sorti' ? d.date_sortie_reelle : null) + '</td>' +
        '<td>' + badgeStatutStockage(d.statut) + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--gris" onclick="voirDossier(\'' + d.id + '\')">Détails</button>' +
          '<button class="btn btn--sm btn--vert" onclick="modifierDossier(\'' + d.id + '\')">Éditer</button>' +
          (d.statut !== 'sorti' ? '<button class="btn btn--sm btn--or" onclick="marquerSorti(\'' + d.id + '\')">Sortie</button>' : '') +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerDossier(\'' + d.id + '\')">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---- Voir détails dossier ---- */
  window.voirDossier = function (id) {
    const d = tousDossiers.find(function (x) { return x.id == id; });
    if (!d) return;

    const corps  = document.getElementById('detail-stock-corps');
    const overlay = document.getElementById('overlay-detail-stock');
    if (!corps || !overlay) return;

    const emplacement = [d.zone && ('Zone ' + d.zone), d.allee && ('Allée ' + d.allee), d.case_num && ('Case ' + d.case_num)]
      .filter(Boolean).join(' / ') || '—';

    corps.innerHTML = '<div class="detail-info">' +
      '<div class="detail-info__item"><div class="detail-info__label">Référence</div><div class="detail-info__valeur">' + escHtml(d.reference) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Code client</div><div class="detail-info__valeur">' + escHtml(d.code_client) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Client</div><div class="detail-info__valeur">' + escHtml(d.client_nom) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Type de stockage</div><div class="detail-info__valeur">' + badgeTypeStockage(d.type_stockage) + '</div></div>' +
      '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Description marchandise</div><div class="detail-info__valeur">' + escHtml(d.description_marchandise || '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Quantité</div><div class="detail-info__valeur">' + escHtml(d.quantite || '—') + ' ' + escHtml(d.unite || '') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Poids total</div><div class="detail-info__valeur">' + (d.poids ? d.poids + ' kg' : '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Volume</div><div class="detail-info__valeur">' + (d.volume ? d.volume + ' m³' : '—') + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Emplacement</div><div class="detail-info__valeur"><span class="emplacement-badge">' + escHtml(emplacement) + '</span></div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Date d\'entrée</div><div class="detail-info__valeur">' + formaterDate(d.date_entree) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Durée en stockage</div><div class="detail-info__valeur">' + formaterDuree(d.date_entree, d.statut === 'sorti' ? d.date_sortie_reelle : null) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Sortie prévue</div><div class="detail-info__valeur">' + formaterDate(d.date_sortie_prevue) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Sortie réelle</div><div class="detail-info__valeur">' + formaterDate(d.date_sortie_reelle) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Statut</div><div class="detail-info__valeur">' + badgeStatutStockage(d.statut) + '</div></div>' +
      '<div class="detail-info__item"><div class="detail-info__label">Conteneur lié</div><div class="detail-info__valeur">' + escHtml(d.conteneur_numero || '—') + '</div></div>' +
      (d.conditions_speciales ? '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Conditions spéciales</div><div class="detail-info__valeur">' + escHtml(d.conditions_speciales) + '</div></div>' : '') +
      (d.instructions_securite ? '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Instructions sécurité</div><div class="detail-info__valeur">' + escHtml(d.instructions_securite) + '</div></div>' : '') +
      (d.notes ? '<div class="detail-info__item detail-info__item--plein"><div class="detail-info__label">Notes</div><div class="detail-info__valeur">' + escHtml(d.notes) + '</div></div>' : '') +
    '</div>';

    overlay.classList.add('visible');
  };

  /* ---- Marquer sortie ---- */
  window.marquerSorti = function (id) {
    const d = tousDossiers.find(function (x) { return x.id == id; });
    const ref = d ? d.reference : 'ce dossier';
    if (!confirm('Confirmer la sortie de ' + ref + ' du stockage ?')) return;

    fetch(API + '/stockage/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'sorti', date_sortie_reelle: new Date().toISOString().slice(0, 10) })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        const dossier = tousDossiers.find(function (x) { return x.id == id; });
        if (dossier) { dossier.statut = 'sorti'; dossier.date_sortie_reelle = new Date().toISOString().slice(0, 10); }
        appliquerFiltres();
        mettreAJourCompteurs();
        afficherToast('Marchandise sortie du stockage', 'succes');
      })
      .catch(function () { afficherToast('Erreur lors de la mise à jour', 'erreur'); });
  };

  /* ---- Ouvrir formulaire ---- */
  document.getElementById('btn-nouveau-stock')?.addEventListener('click', function () {
    dossierEnCours = null;
    reinitialiserFormulaire();
    document.getElementById('modale-stock-titre').textContent = 'Nouvelle demande de stockage';
    document.getElementById('overlay-stock-form').classList.add('visible');
  });

  /* ---- Modifier dossier ---- */
  window.modifierDossier = function (id) {
    dossierEnCours = tousDossiers.find(function (d) { return d.id == id; });
    if (!dossierEnCours) return;
    remplirFormulaire(dossierEnCours);
    document.getElementById('modale-stock-titre').textContent = 'Modifier le dossier de stockage';
    document.getElementById('overlay-stock-form').classList.add('visible');
  };

  function remplirFormulaire(d) {
    const f = document.getElementById('formulaire-stockage');
    if (!f) return;
    const set = function (name, val) { const el = f.elements[name]; if (el) el.value = val || ''; };
    set('reference', d.reference);
    set('code_client', d.code_client);
    set('client_nom', d.client_nom);
    set('client_telephone', d.client_telephone);
    set('client_email', d.client_email);
    set('type_marchandise', d.type_marchandise);
    set('description_marchandise', d.description_marchandise);
    set('quantite', d.quantite);
    set('unite', d.unite);
    set('poids', d.poids);
    set('volume', d.volume);
    set('type_stockage', d.type_stockage);
    set('zone', d.zone);
    set('allee', d.allee);
    set('case_num', d.case_num);
    set('date_entree', d.date_entree ? d.date_entree.slice(0, 10) : '');
    set('date_sortie_prevue', d.date_sortie_prevue ? d.date_sortie_prevue.slice(0, 10) : '');
    set('conteneur_numero', d.conteneur_numero);
    set('conditions_speciales', d.conditions_speciales);
    set('instructions_securite', d.instructions_securite);
    set('statut', d.statut);
    set('notes', d.notes);
  }

  function reinitialiserFormulaire() {
    const f = document.getElementById('formulaire-stockage');
    if (f) f.reset();
  }

  /* ---- Soumission formulaire ---- */
  document.getElementById('formulaire-stockage')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const payload  = {};
    formData.forEach(function (val, cle) { if (val !== '') payload[cle] = val; });

    const methode  = dossierEnCours ? 'PUT' : 'POST';
    const endpoint = dossierEnCours ? API + '/stockage/' + dossierEnCours.id : API + '/stockage';

    fetch(endpoint, {
      method: methode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        fermerModales();
        chargerStockage();
        afficherToast(dossierEnCours ? 'Dossier mis à jour' : 'Dossier de stockage créé', 'succes');
      })
      .catch(function () { afficherToast('Erreur lors de la sauvegarde', 'erreur'); });
  });

  /* ---- Supprimer dossier ---- */
  window.supprimerDossier = function (id) {
    if (!confirm('Supprimer ce dossier de stockage ? Cette action est irréversible.')) return;

    fetch(API + '/stockage/' + id, { method: 'DELETE' })
      .then(function () {
        tousDossiers = tousDossiers.filter(function (d) { return d.id != id; });
        appliquerFiltres();
        mettreAJourCompteurs();
        afficherToast('Dossier supprimé', 'succes');
      })
      .catch(function () { afficherToast('Erreur lors de la suppression', 'erreur'); });
  };

  /* ---- Export CSV ---- */
  document.getElementById('btn-export-stock')?.addEventListener('click', function () {
    if (tousDossiers.length === 0) { afficherToast('Aucune donnée à exporter', 'info'); return; }

    const entetes = ['Référence', 'Code client', 'Client', 'Type stockage', 'Marchandise', 'Zone', 'Date entrée', 'Date sortie prévue', 'Durée', 'Statut'];
    const lignes  = tousDossiers.map(function (d) {
      const emp = [d.zone, d.allee, d.case_num].filter(Boolean).join('-');
      return [
        '"' + (d.reference || '') + '"',
        '"' + (d.code_client || '') + '"',
        '"' + (d.client_nom || '') + '"',
        '"' + (d.type_stockage || '') + '"',
        '"' + (d.description_marchandise || '') + '"',
        '"' + emp + '"',
        '"' + formaterDate(d.date_entree) + '"',
        '"' + formaterDate(d.date_sortie_prevue) + '"',
        '"' + formaterDuree(d.date_entree, d.statut === 'sorti' ? d.date_sortie_reelle : null) + '"',
        '"' + (d.statut || '') + '"'
      ].join(',');
    });

    const csv  = [entetes.join(',')].concat(lignes).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'stockage-sofretma-' + new Date().toISOString().slice(0, 10) + '.csv';
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
  ['recherche-stock', 'filtre-type-stock', 'filtre-statut-stock', 'filtre-zone'].forEach(function (id) {
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
  chargerStockage();

});

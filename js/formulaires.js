/* ============================================================
   SOFRETMA TRANSIT — Formulaires reçus
   W2K-Digital | formulaires.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let tousLesFormulaires = [];
  let pageActuelle = 1;
  const parPage = 15;

  /* ---- Utilitaires ---- */
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formaterDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
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

  /* ---- Chargement des formulaires ---- */
  function chargerFormulaires() {
    const tbody = document.getElementById('tbody-formulaires');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/formulaires')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tousLesFormulaires = (data && data.formulaires) ? data.formulaires : [];
        appliquerFiltres();
        mettreAJourCompteurs();
      })
      .catch(function () {
        tousLesFormulaires = [];
        appliquerFiltres();
      });
  }

  /* ---- Compteurs par type ---- */
  function mettreAJourCompteurs() {
    const total    = tousLesFormulaires.length;
    const traites  = tousLesFormulaires.filter(function (f) { return f.traite; }).length;
    const enAttente = total - traites;

    const elTotal   = document.getElementById('compteur-total');
    const elTraites = document.getElementById('compteur-traites');
    const elAttente = document.getElementById('compteur-attente');

    if (elTotal)   elTotal.textContent   = total;
    if (elTraites) elTraites.textContent = traites;
    if (elAttente) elAttente.textContent = enAttente;
  }

  /* ---- Filtres ---- */
  function appliquerFiltres() {
    const recherche    = (document.getElementById('recherche-formulaires') || {}).value || '';
    const filtreType   = (document.getElementById('filtre-type') || {}).value || '';
    const filtreStatut = (document.getElementById('filtre-traite') || {}).value || '';

    let filtres = tousLesFormulaires.filter(function (f) {
      const correspondRecherche = !recherche ||
        (f.nom && f.nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (f.email && f.email.toLowerCase().includes(recherche.toLowerCase()));

      const correspondType = !filtreType || f.type === filtreType;

      const correspondStatut = filtreStatut === ''
        ? true
        : filtreStatut === 'traite'
          ? f.traite === true
          : f.traite === false;

      return correspondRecherche && correspondType && correspondStatut;
    });

    afficherFormulaires(filtres);
  }

  /* ---- Affichage tableau ---- */
  function afficherFormulaires(formulaires) {
    const tbody = document.getElementById('tbody-formulaires');
    const infoPagination = document.getElementById('info-pagination');
    if (!tbody) return;

    const total = formulaires.length;
    const debut = (pageActuelle - 1) * parPage;
    const fin   = Math.min(debut + parPage, total);
    const page  = formulaires.slice(debut, fin);

    if (infoPagination) {
      infoPagination.textContent = total > 0
        ? (debut + 1) + ' – ' + fin + ' sur ' + total + ' demande(s)'
        : '0 demande';
    }

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="etat-vide"><div class="etat-vide__icone">📋</div><div class="etat-vide__texte">Aucun formulaire trouvé</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = page.map(function (f) {
      const badgeType   = '<span class="badge badge--bleu">' + escHtml(f.type || 'Général') + '</span>';
      const badgeStatut = f.traite
        ? '<span class="badge badge--vert">✓ Traité</span>'
        : '<span class="badge badge--or">⏳ En attente</span>';

      const btnTraiter = !f.traite
        ? '<button class="btn btn--sm btn--vert" onclick="marquerTraite(\'' + f.id + '\')">Marquer traité</button>'
        : '<button class="btn btn--sm btn--gris" disabled>Traité</button>';

      return '<tr>' +
        '<td>' + badgeType + '</td>' +
        '<td>' + escHtml(f.nom || '—') + '</td>' +
        '<td>' + escHtml(f.email || '—') + '</td>' +
        '<td>' + escHtml(f.telephone || '—') + '</td>' +
        '<td>' + formaterDate(f.date_envoi) + '</td>' +
        '<td>' + badgeStatut + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--gris" onclick="voirFormulaire(\'' + f.id + '\')">Détails</button>' +
          btnTraiter +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerFormulaire(\'' + f.id + '\')">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---- Voir détails formulaire ---- */
  window.voirFormulaire = function (id) {
    const form = tousLesFormulaires.find(function (f) { return f.id == id; });
    if (!form) return;

    const corps = document.getElementById('detail-formulaire-corps');
    const modale = document.getElementById('overlay-detail-formulaire');
    if (!corps || !modale) return;

    /* Construction dynamique selon les champs disponibles */
    const champs = Object.entries(form).filter(function (entry) {
      return !['id', 'traite'].includes(entry[0]);
    });

    const labels = {
      type: 'Type de demande',
      nom: 'Nom complet',
      email: 'Email',
      telephone: 'Téléphone',
      date_envoi: 'Date d\'envoi',
      port_depart: 'Port de départ',
      port_arrivee: 'Port d\'arrivée',
      description_marchandise: 'Description marchandise',
      poids: 'Poids estimé',
      volume: 'Volume estimé',
      message: 'Message',
      societe: 'Société',
      pays_origine: 'Pays d\'origine',
      pays_destination: 'Pays de destination'
    };

    corps.innerHTML = '<div class="detail-info">' +
      champs.map(function (entry) {
        const cle   = entry[0];
        const val   = entry[1];
        const label = labels[cle] || cle;
        const valeur = cle === 'date_envoi' ? formaterDate(val) : escHtml(String(val || '—'));
        const plein  = ['message', 'description_marchandise'].includes(cle);

        return '<div class="detail-info__item' + (plein ? ' detail-info__item--plein' : '') + '">' +
          '<div class="detail-info__label">' + label + '</div>' +
          '<div class="detail-info__valeur">' + valeur + '</div>' +
        '</div>';
      }).join('') +
    '</div>';

    modale.classList.add('visible');
  };

  /* ---- Marquer comme traité ---- */
  window.marquerTraite = function (id) {
    fetch(API + '/formulaires/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traite: true })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        const form = tousLesFormulaires.find(function (f) { return f.id == id; });
        if (form) form.traite = true;
        appliquerFiltres();
        mettreAJourCompteurs();
        afficherToast('Formulaire marqué comme traité', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la mise à jour', 'erreur');
      });
  };

  /* ---- Supprimer formulaire ---- */
  window.supprimerFormulaire = function (id) {
    if (!confirm('Supprimer ce formulaire ?\nCette action est irréversible.')) return;

    fetch(API + '/formulaires/' + id, { method: 'DELETE' })
      .then(function () {
        tousLesFormulaires = tousLesFormulaires.filter(function (f) { return f.id != id; });
        appliquerFiltres();
        mettreAJourCompteurs();
        afficherToast('Formulaire supprimé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Export CSV ---- */
  document.getElementById('btn-export-formulaires')?.addEventListener('click', function () {
    if (tousLesFormulaires.length === 0) {
      afficherToast('Aucune donnée à exporter', 'info');
      return;
    }

    const entetes = ['Type', 'Nom', 'Email', 'Téléphone', 'Date envoi', 'Traité'];
    const lignes  = tousLesFormulaires.map(function (f) {
      return [
        '"' + (f.type || '') + '"',
        '"' + (f.nom || '') + '"',
        '"' + (f.email || '') + '"',
        '"' + (f.telephone || '') + '"',
        '"' + formaterDate(f.date_envoi) + '"',
        '"' + (f.traite ? 'Oui' : 'Non') + '"'
      ].join(',');
    });

    const csv  = [entetes.join(',')].concat(lignes).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'formulaires-sofretma-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    afficherToast('Export CSV téléchargé', 'succes');
  });

  /* ---- Listeners ---- */
  ['recherche-formulaires', 'filtre-type', 'filtre-traite'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { pageActuelle = 1; appliquerFiltres(); });
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
  chargerFormulaires();

});

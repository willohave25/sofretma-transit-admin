/* ============================================================
   SOFRETMA TRANSIT — Candidatures reçues
   W2K-Digital | candidatures.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  var API = 'https://api-sofretma.sofretmatransit.com/api';
  var toutesLesCandidatures = [];
  var pageActuelle = 1;
  var parPage = 15;
  var candidatureSelectionnee = null;

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
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + (type || 'succes');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3500);
  }

  function badgeStatut(statut) {
    if (statut === 'acceptee') return '<span class="badge badge--vert">Acceptée</span>';
    if (statut === 'refusee') return '<span class="badge badge--rouge">Refusée</span>';
    return '<span class="badge badge--or">En attente</span>';
  }

  /* ---- Chargement ---- */
  function chargerCandidatures() {
    var tbody = document.getElementById('tbody-candidatures');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/candidatures', {
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sofretma_token') || '') }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        toutesLesCandidatures = (data && data.candidatures) ? data.candidatures : [];
        appliquerFiltres();
        mettreAJourCompteurs();
      })
      .catch(function () {
        toutesLesCandidatures = [];
        appliquerFiltres();
        afficherToast('Erreur de chargement des candidatures', 'erreur');
      });
  }

  /* ---- Compteurs ---- */
  function mettreAJourCompteurs() {
    var total = toutesLesCandidatures.length;
    var acceptees = toutesLesCandidatures.filter(function (c) { return c.statut === 'acceptee'; }).length;
    var refusees = toutesLesCandidatures.filter(function (c) { return c.statut === 'refusee'; }).length;
    var enAttente = total - acceptees - refusees;

    var elTotal = document.getElementById('compteur-total');
    var elAttente = document.getElementById('compteur-attente');
    var elAcceptees = document.getElementById('compteur-acceptees');
    var elRefusees = document.getElementById('compteur-refusees');

    if (elTotal) elTotal.textContent = total;
    if (elAttente) elAttente.textContent = enAttente;
    if (elAcceptees) elAcceptees.textContent = acceptees;
    if (elRefusees) elRefusees.textContent = refusees;
  }

  /* ---- Filtres ---- */
  function appliquerFiltres() {
    var recherche = (document.getElementById('recherche-candidatures') || {}).value || '';
    var filtrePoste = (document.getElementById('filtre-poste') || {}).value || '';
    var filtreStatut = (document.getElementById('filtre-statut') || {}).value || '';

    var filtres = toutesLesCandidatures.filter(function (c) {
      var correspondRecherche = !recherche ||
        (c.nom && c.nom.toLowerCase().includes(recherche.toLowerCase())) ||
        (c.prenoms && c.prenoms.toLowerCase().includes(recherche.toLowerCase())) ||
        (c.telephone && c.telephone.includes(recherche)) ||
        (c.commune && c.commune.toLowerCase().includes(recherche.toLowerCase()));

      var correspondPoste = !filtrePoste || c.poste === filtrePoste;
      var correspondStatut = !filtreStatut || c.statut === filtreStatut;

      return correspondRecherche && correspondPoste && correspondStatut;
    });

    afficherTableau(filtres);
  }

  /* ---- Affichage tableau ---- */
  function afficherTableau(liste) {
    var tbody = document.getElementById('tbody-candidatures');
    if (!tbody) return;

    if (liste.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="chargement">Aucune candidature trouvée</td></tr>';
      mettreAJourPagination(0);
      return;
    }

    var debut = (pageActuelle - 1) * parPage;
    var fin = debut + parPage;
    var page = liste.slice(debut, fin);

    tbody.innerHTML = page.map(function (c) {
      return '<tr>' +
        '<td><strong>' + escHtml(c.nom) + ' ' + escHtml(c.prenoms) + '</strong></td>' +
        '<td>' + escHtml(c.telephone) + '</td>' +
        '<td>' + escHtml(c.commune) + '</td>' +
        '<td>' + escHtml(c.poste || 'Livreur moto') + '</td>' +
        '<td>' + (c.permis_conduire === 'oui' ? '✅ Oui' : '❌ Non') + '</td>' +
        '<td>' + formaterDate(c.created_at) + '</td>' +
        '<td>' + badgeStatut(c.statut) + '</td>' +
        '<td><button class="btn btn--sm btn--bleu btn-voir-candidature" data-id="' + c.id + '">Voir</button></td>' +
        '</tr>';
    }).join('');

    mettreAJourPagination(liste.length);
  }

  /* ---- Pagination ---- */
  function mettreAJourPagination(total) {
    var el = document.getElementById('info-pagination');
    if (!el) return;
    var totalPages = Math.ceil(total / parPage) || 1;
    el.innerHTML = 'Page ' + pageActuelle + ' / ' + totalPages + ' — ' + total + ' candidature(s)' +
      (pageActuelle > 1 ? ' <button class="btn btn--sm btn--gris btn-page-prec">◀</button>' : '') +
      (pageActuelle < totalPages ? ' <button class="btn btn--sm btn--gris btn-page-suiv">▶</button>' : '');
  }

  /* ---- Modale détail ---- */
  function ouvrirDetail(id) {
    var c = toutesLesCandidatures.find(function (x) { return x.id == id; });
    if (!c) return;
    candidatureSelectionnee = c;

    var corps = document.getElementById('detail-candidature-corps');
    if (!corps) return;

    corps.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        '<div><strong>Nom :</strong> ' + escHtml(c.nom) + '</div>' +
        '<div><strong>Prénoms :</strong> ' + escHtml(c.prenoms) + '</div>' +
        '<div><strong>Date naissance :</strong> ' + escHtml(c.date_naissance) + '</div>' +
        '<div><strong>Lieu naissance :</strong> ' + escHtml(c.lieu_naissance) + '</div>' +
        '<div><strong>Nationalité :</strong> ' + escHtml(c.nationalite) + '</div>' +
        '<div><strong>Situation :</strong> ' + escHtml(c.situation_matrimoniale) + '</div>' +
        '<div><strong>Téléphone :</strong> ' + escHtml(c.telephone) + '</div>' +
        '<div><strong>Email :</strong> ' + escHtml(c.email) + '</div>' +
        '<div><strong>Commune :</strong> ' + escHtml(c.commune) + '</div>' +
        '<div><strong>Quartier :</strong> ' + escHtml(c.quartier) + '</div>' +
      '</div>' +
      '<hr style="margin:16px 0;border-color:rgba(255,255,255,.1);">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        '<div><strong>Poste :</strong> ' + escHtml(c.poste) + '</div>' +
        '<div><strong>Permis :</strong> ' + (c.permis_conduire === 'oui' ? '✅ Oui' : '❌ Non') + '</div>' +
        '<div><strong>Type permis :</strong> ' + escHtml(c.type_permis) + '</div>' +
        '<div><strong>Connait Abidjan :</strong> ' + (c.connaissance_abidjan === 'oui' ? 'Oui' : 'Non') + '</div>' +
        '<div><strong>Disponibilité :</strong> ' + escHtml(c.disponibilite) + '</div>' +
        '<div><strong>Expérience :</strong> ' + escHtml(c.experience) + '</div>' +
      '</div>' +
      (c.motivation ? '<hr style="margin:16px 0;border-color:rgba(255,255,255,.1);"><div><strong>Motivation :</strong><br>' + escHtml(c.motivation) + '</div>' : '') +
      (c.cv_url ? '<hr style="margin:16px 0;border-color:rgba(255,255,255,.1);"><a href="' + escHtml(c.cv_url) + '" target="_blank" class="btn btn--sm btn--bleu">📄 Voir le CV</a>' : '') +
      '<hr style="margin:16px 0;border-color:rgba(255,255,255,.1);">' +
      '<div style="display:flex;gap:12px;align-items:center;">' +
        '<strong>Statut :</strong> ' + badgeStatut(c.statut) +
        '<span style="margin-left:auto;color:var(--texte-muted);font-size:.85rem;">Reçue le ' + formaterDate(c.created_at) + '</span>' +
      '</div>';

    // Boutons accepter/refuser
    var btnAccepter = document.querySelector('.btn-accepter');
    var btnRefuser = document.querySelector('.btn-refuser');
    if (c.statut === 'en_attente') {
      if (btnAccepter) btnAccepter.style.display = '';
      if (btnRefuser) btnRefuser.style.display = '';
    } else {
      if (btnAccepter) btnAccepter.style.display = 'none';
      if (btnRefuser) btnRefuser.style.display = 'none';
    }

    document.getElementById('overlay-detail-candidature').classList.add('actif');
  }

  function fermerModale() {
    document.getElementById('overlay-detail-candidature').classList.remove('actif');
    candidatureSelectionnee = null;
  }

  /* ---- Changer statut ---- */
  function changerStatut(statut) {
    if (!candidatureSelectionnee) return;
    var id = candidatureSelectionnee.id;

    fetch(API + '/candidatures/' + id + '/statut', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('sofretma_token') || '')
      },
      body: JSON.stringify({ statut: statut })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      })
      .then(function () {
        afficherToast('Candidature ' + (statut === 'acceptee' ? 'acceptée' : 'refusée'), 'succes');
        fermerModale();
        chargerCandidatures();
      })
      .catch(function () {
        afficherToast('Erreur lors de la mise à jour', 'erreur');
      });
  }

  /* ---- Export CSV ---- */
  function exporterCSV() {
    if (toutesLesCandidatures.length === 0) {
      afficherToast('Aucune candidature à exporter', 'erreur');
      return;
    }

    var entetes = ['Nom', 'Prénoms', 'Téléphone', 'Email', 'Commune', 'Quartier', 'Date naissance', 'Poste', 'Permis', 'Disponibilité', 'Statut', 'Date envoi'];
    var lignes = toutesLesCandidatures.map(function (c) {
      return [
        c.nom, c.prenoms, c.telephone, c.email, c.commune, c.quartier,
        c.date_naissance, c.poste, c.permis_conduire, c.disponibilite,
        c.statut, c.created_at
      ].map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
    });

    var csv = '\uFEFF' + entetes.join(',') + '\n' + lignes.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'candidatures_sofretma_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    afficherToast('Export CSV téléchargé', 'succes');
  }

  /* ---- Événements ---- */
  var champRecherche = document.getElementById('recherche-candidatures');
  var selectPoste = document.getElementById('filtre-poste');
  var selectStatut = document.getElementById('filtre-statut');

  if (champRecherche) champRecherche.addEventListener('input', function () { pageActuelle = 1; appliquerFiltres(); });
  if (selectPoste) selectPoste.addEventListener('change', function () { pageActuelle = 1; appliquerFiltres(); });
  if (selectStatut) selectStatut.addEventListener('change', function () { pageActuelle = 1; appliquerFiltres(); });

  // Clic tableau — voir détail
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-voir-candidature')) {
      ouvrirDetail(e.target.dataset.id);
    }
    if (e.target.classList.contains('btn-page-prec')) {
      pageActuelle--;
      appliquerFiltres();
    }
    if (e.target.classList.contains('btn-page-suiv')) {
      pageActuelle++;
      appliquerFiltres();
    }
  });

  // Modale
  var overlay = document.getElementById('overlay-detail-candidature');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('modale__fermer') || e.target.classList.contains('btn-fermer-modale')) {
        fermerModale();
      }
    });
  }

  // Boutons accepter/refuser
  var btnAccepter = document.querySelector('.btn-accepter');
  var btnRefuser = document.querySelector('.btn-refuser');
  if (btnAccepter) btnAccepter.addEventListener('click', function () { changerStatut('acceptee'); });
  if (btnRefuser) btnRefuser.addEventListener('click', function () { changerStatut('refusee'); });

  // Export CSV
  var btnExport = document.getElementById('btn-export-candidatures');
  if (btnExport) btnExport.addEventListener('click', exporterCSV);

  /* ---- Init ---- */
  chargerCandidatures();

});

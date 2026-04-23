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
     GRAPHIQUE CLIENTS — COURBES ANNUELLES (Chart.js)
  ============================================================ */
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  let chartClients = null;
  let anneeSelectionnee = new Date().getFullYear();

  /* Initialiser le sélecteur d'années (3 ans en arrière) */
  function initialiserSelectAnnee() {
    const select = document.getElementById('select-annee-chart');
    const anneeActuelle = new Date().getFullYear();
    const el = document.getElementById('annee-courante');
    if (el) el.textContent = anneeActuelle;

    if (!select) return;

    for (let a = anneeActuelle; a >= anneeActuelle - 3; a--) {
      const option = document.createElement('option');
      option.value = a;
      option.textContent = a;
      if (a === anneeActuelle) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', function () {
      anneeSelectionnee = parseInt(this.value, 10);
      const el2 = document.getElementById('annee-courante');
      if (el2) el2.textContent = anneeSelectionnee;
      chargerDonneesChart(anneeSelectionnee);
    });
  }

  /* Charger les données depuis l'API */
  function chargerDonneesChart(annee) {
    fetchAPI('/stats/clients-par-mois?annee=' + annee, function (data) {
      /* Si l'API n'est pas encore branchée, générer des données de démonstration */
      if (!data || !data.particuliers || !data.entreprises) {
        const moisActuel = annee === new Date().getFullYear()
          ? new Date().getMonth()
          : 11;

        /* Données de démonstration réalistes jusqu'au mois en cours */
        const demo_particuliers = [3, 5, 4, 7, 6, 8, 5, 9, 7, 6, 4, 2];
        const demo_entreprises  = [1, 2, 1, 3, 2, 4, 2, 3, 4, 2, 1, 1];

        data = {
          particuliers: demo_particuliers.map(function (v, i) { return i <= moisActuel ? v : null; }),
          entreprises:  demo_entreprises.map(function (v, i) { return i <= moisActuel ? v : null; })
        };
      }

      mettreAJourTotaux(data.particuliers, data.entreprises);
      dessinerChart(data.particuliers, data.entreprises, annee);
    });
  }

  /* Calculer et afficher les totaux */
  function mettreAJourTotaux(particuliers, entreprises) {
    const totalP = particuliers.reduce(function (s, v) { return s + (v || 0); }, 0);
    const totalE = entreprises.reduce(function (s, v) { return s + (v || 0); }, 0);

    const elP = document.getElementById('total-particuliers');
    const elE = document.getElementById('total-entreprises');
    const elC = document.getElementById('total-combine');

    if (elP) elP.textContent = totalP;
    if (elE) elE.textContent = totalE;
    if (elC) elC.textContent = totalP + totalE;
  }

  /* Dessiner ou mettre à jour le graphique */
  function dessinerChart(particuliers, entreprises, annee) {
    const canvas = document.getElementById('chart-clients');
    if (!canvas || typeof Chart === 'undefined') return;

    /* Limiter les labels aux mois avec données */
    const moisActuel = annee === new Date().getFullYear()
      ? new Date().getMonth()
      : 11;

    const labels = MOIS.slice(0, moisActuel + 1);
    const dataP  = particuliers.slice(0, moisActuel + 1);
    const dataE  = entreprises.slice(0, moisActuel + 1);

    /* Détruire le graphique précédent si existant */
    if (chartClients) {
      chartClients.destroy();
      chartClients = null;
    }

    const ctx = canvas.getContext('2d');

    /* Dégradé vert sous la courbe particuliers */
    const degradeVert = ctx.createLinearGradient(0, 0, 0, 280);
    degradeVert.addColorStop(0, 'rgba(26, 107, 58, 0.18)');
    degradeVert.addColorStop(1, 'rgba(26, 107, 58, 0)');

    /* Dégradé or sous la courbe entreprises */
    const degradeOr = ctx.createLinearGradient(0, 0, 0, 280);
    degradeOr.addColorStop(0, 'rgba(201, 146, 43, 0.18)');
    degradeOr.addColorStop(1, 'rgba(201, 146, 43, 0)');

    chartClients = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Particuliers',
            data: dataP,
            borderColor: '#1a6b3a',
            backgroundColor: degradeVert,
            borderWidth: 2.5,
            pointBackgroundColor: '#1a6b3a',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Entreprises',
            data: dataE,
            borderColor: '#C9922B',
            backgroundColor: degradeOr,
            borderWidth: 2.5,
            pointBackgroundColor: '#C9922B',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            padding: 12,
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            callbacks: {
              title: function (items) {
                return items[0].label + ' ' + anneeSelectionnee;
              },
              label: function (item) {
                return ' ' + item.dataset.label + ' : ' + item.parsed.y + ' client(s)';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(0,0,0,0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#888',
              font: { family: 'Inter', size: 12 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#888',
              font: { family: 'Inter', size: 12 },
              stepSize: 1,
              precision: 0
            }
          }
        }
      }
    });
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
  initialiserSelectAnnee();
  chargerDonneesChart(anneeSelectionnee);

});

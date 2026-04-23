<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiements | Administration SOFRETMA TRANSIT</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="images/logo-sofretma-blanc.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>

  <div class="admin-layout">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar__logo">
        <picture>
          <source srcset="images/logo-sofretma-blanc.webp" type="image/webp">
          <img src="images/logo-sofretma-blanc.png" alt="SOFRETMA TRANSIT" width="140">
        </picture>
      </div>
      <nav class="sidebar__nav">
        <a href="dashboard.html" class="sidebar__lien">
          <span class="icone">🏠</span> Tableau de bord
        </a>
        <a href="clients.html" class="sidebar__lien">
          <span class="icone">👥</span> Clients inscrits
        </a>
        <a href="paiements.html" class="sidebar__lien actif">
          <span class="icone">💰</span> Paiements
        </a>
        <a href="expeditions.html" class="sidebar__lien">
          <span class="icone">🚢</span> Expéditions
        </a>
        <a href="conteneurs.html" class="sidebar__lien">
          <span class="icone">📦</span> Conteneurs
        </a>
        <a href="stockage.html" class="sidebar__lien">
          <span class="icone">🏭</span> Stockage & Entreposage
        </a>
        <a href="actualites.html" class="sidebar__lien">
          <span class="icone">📰</span> Actualités
        </a>
        <a href="medias.html" class="sidebar__lien">
          <span class="icone">🖼️</span> Médiathèque
        </a>
        <a href="formulaires.html" class="sidebar__lien">
          <span class="icone">📋</span> Formulaires reçus
        </a>
        <div class="sidebar__separateur"></div>
      </nav>
      <div class="sidebar__footer">
        <button class="sidebar__deconnexion" id="btn-deconnexion">
          <span class="icone">🚪</span> Déconnexion
        </button>
      </div>
    </aside>

    <!-- CONTENU PRINCIPAL -->
    <div class="contenu-principal">

      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="hamburger-admin" id="hamburger-admin" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
          <h1 class="topbar__titre">Gestion des paiements</h1>
        </div>
        <div class="topbar__droite">
          <button class="btn btn--gris btn--sm" id="btn-export-paiements">⬇ Export CSV</button>
          <button class="btn btn--or" id="btn-nouveau-paiement">+ Nouveau paiement</button>
        </div>
      </header>

      <main class="page-contenu">

        <!-- Résumé financier -->
        <div class="stats-grille" style="margin-bottom:24px;">
          <div class="stat-card stat-card--vert">
            <div class="stat-card__icone">✅</div>
            <div class="stat-card__valeur" id="nb-paiements-recus">—</div>
            <div class="stat-card__label">Paiements reçus</div>
          </div>
          <div class="stat-card stat-card--or">
            <div class="stat-card__icone">⏳</div>
            <div class="stat-card__valeur" id="nb-paiements-attente">—</div>
            <div class="stat-card__label">En attente</div>
          </div>
          <div class="stat-card stat-card--vert">
            <div class="stat-card__icone">💸</div>
            <div class="stat-card__valeur" id="montant-recus" style="font-size:1.1rem;">—</div>
            <div class="stat-card__label">Montant encaissé</div>
          </div>
          <div class="stat-card stat-card--bleu">
            <div class="stat-card__icone">💰</div>
            <div class="stat-card__valeur" id="montant-total" style="font-size:1.1rem;">—</div>
            <div class="stat-card__label">Total (reçu + attente)</div>
          </div>
        </div>

        <!-- Résumé montant en attente -->
        <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,#fff8e6,#fff);border-left:4px solid var(--or);">
          <div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div>
              <div style="font-size:.8125rem;font-weight:600;color:var(--or);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">⏳ Montant en attente de règlement</div>
              <div style="font-size:1.5rem;font-weight:700;color:var(--noir-texte);" id="montant-attente">—</div>
            </div>
            <a href="#section-attente" style="color:var(--or);font-size:.875rem;font-weight:600;">Voir les factures en attente →</a>
          </div>
        </div>

        <!-- Barre d'outils -->
        <div class="barre-outils">
          <div class="barre-outils__recherche">
            <input type="text" id="recherche-paiements" placeholder="Rechercher par client ou référence...">
          </div>
          <select id="filtre-statut-paiement">
            <option value="">Tous les statuts</option>
            <option value="recu">Reçus</option>
            <option value="attente">En attente</option>
            <option value="annule">Annulés</option>
          </select>
          <select id="filtre-service">
            <option value="">Tous les services</option>
            <option value="Maritime">Maritime</option>
            <option value="Aérien">Aérien</option>
            <option value="Ferroviaire">Ferroviaire</option>
            <option value="Terrestre">Terrestre</option>
            <option value="Bureau d'achats">Bureau d'achats</option>
            <option value="Voyages">Voyages</option>
            <option value="Assurances">Assurances</option>
          </select>
        </div>

        <!-- Tableau paiements -->
        <div class="card" id="section-attente">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Montant</th>
                  <th>Date échéance</th>
                  <th>Date paiement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="tbody-paiements">
                <tr><td colspan="8" class="chargement">Chargement des données...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span class="pagination__info" id="info-pagination"></span>
          </div>
        </div>

      </main>
    </div>

  </div>

  <!-- MODALE DÉTAIL PAIEMENT -->
  <div class="overlay" id="overlay-detail-paiement">
    <div class="modale">
      <div class="modale__entete">
        <h2 class="modale__titre">Détails du paiement</h2>
        <button class="modale__fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="modale__corps" id="detail-paiement-corps"></div>
      <div class="modale__pied">
        <button class="btn btn--gris btn-fermer-modale">Fermer</button>
      </div>
    </div>
  </div>

  <!-- MODALE NOUVEAU PAIEMENT -->
  <div class="overlay" id="overlay-paiement">
    <div class="modale" style="max-width:600px;">
      <div class="modale__entete">
        <h2 class="modale__titre" id="modale-paiement-titre">Nouveau paiement</h2>
        <button class="modale__fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="modale__corps">
        <form id="formulaire-paiement">

          <div class="form-article">

            <div class="form-groupe">
              <label for="ref-paiement">Référence *</label>
              <input type="text" id="ref-paiement" name="reference" placeholder="Ex: PAY-2025-001" required>
            </div>

            <div class="form-groupe">
              <label for="client-paiement">Nom du client *</label>
              <input type="text" id="client-paiement" name="client_nom" placeholder="Nom du client" required>
            </div>

            <div class="form-groupe">
              <label for="service-paiement">Service</label>
              <select id="service-paiement" name="service">
                <option value="Maritime">Maritime</option>
                <option value="Aérien">Aérien</option>
                <option value="Ferroviaire">Ferroviaire</option>
                <option value="Terrestre">Terrestre</option>
                <option value="Bureau d'achats">Bureau d'achats</option>
                <option value="Voyages">Voyages</option>
                <option value="Assurances">Assurances</option>
              </select>
            </div>

            <div class="form-groupe">
              <label for="montant-paiement">Montant (FCFA) *</label>
              <input type="number" id="montant-paiement" name="montant" placeholder="0" min="0" required>
            </div>

            <div class="form-groupe">
              <label for="mode-paiement">Mode de paiement</label>
              <select id="mode-paiement" name="mode_paiement">
                <option value="Virement bancaire">Virement bancaire</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Espèces">Espèces</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>

            <div class="form-groupe">
              <label for="statut-paiement">Statut</label>
              <select id="statut-paiement" name="statut">
                <option value="attente">En attente</option>
                <option value="recu">Reçu</option>
                <option value="annule">Annulé</option>
              </select>
            </div>

            <div class="form-groupe">
              <label for="date-echeance">Date d'échéance</label>
              <input type="date" id="date-echeance" name="date_echeance">
            </div>

            <div class="form-groupe">
              <label for="date-paiement-effectif">Date paiement effectif</label>
              <input type="date" id="date-paiement-effectif" name="date_paiement">
            </div>

            <div class="form-groupe form-groupe--plein">
              <label for="notes-paiement">Notes</label>
              <textarea id="notes-paiement" name="notes" placeholder="Notes optionnelles..." style="min-height:80px;"></textarea>
            </div>

          </div>

          <div class="modale__pied" style="padding:0;margin-top:24px;">
            <button type="button" class="btn btn--gris btn-fermer-modale">Annuler</button>
            <button type="submit" class="btn btn--or">Enregistrer</button>
          </div>

        </form>
      </div>
    </div>
  </div>

  <!-- Notifications -->
  <div class="toast-container" id="toast-container"></div>

  <script src="js/auth.js"></script>
  <script src="js/paiements.js"></script>

</body>
</html>

/* ============================================================
   SOFRETMA TRANSIT — Authentification administration
   W2K-Digital | auth.js
   ============================================================ */

(function () {

  /* Encodage simple du mot de passe — ne jamais stocker en clair */
  const MOT_DE_PASSE_HASH = btoa('8025');

  /* Clé utilisée dans sessionStorage */
  const CLE_SESSION = 'sofretma_admin';

  /* Durée de session max en millisecondes (8 heures) */
  const DUREE_SESSION = 8 * 60 * 60 * 1000;

  /* ---- Vérification session au chargement ---- */
  function verifierSession() {
    const session = sessionStorage.getItem(CLE_SESSION);
    const horodatage = sessionStorage.getItem(CLE_SESSION + '_ts');

    if (!session || session !== 'true') return false;
    if (!horodatage) return false;

    /* Vérifier l'expiration */
    const maintenant = Date.now();
    if (maintenant - parseInt(horodatage, 10) > DUREE_SESSION) {
      deconnecter();
      return false;
    }

    return true;
  }

  /* ---- Connexion avec le mot de passe ---- */
  function connecter(motDePasse) {
    if (btoa(motDePasse) === MOT_DE_PASSE_HASH) {
      sessionStorage.setItem(CLE_SESSION, 'true');
      sessionStorage.setItem(CLE_SESSION + '_ts', Date.now().toString());
      return true;
    }
    return false;
  }

  /* ---- Déconnexion ---- */
  function deconnecter() {
    sessionStorage.removeItem(CLE_SESSION);
    sessionStorage.removeItem(CLE_SESSION + '_ts');
    window.location.href = 'index.html';
  }

  /* ---- Protection des pages admin ---- */
  function protegerPage() {
    if (!verifierSession()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  /* ---- Formulaire de connexion ---- */
  const formulaireLogin = document.getElementById('formulaire-login');
  if (formulaireLogin) {
    /* Sur la page de connexion — si déjà connecté, rediriger */
    if (verifierSession()) {
      window.location.href = 'dashboard.html';
      return;
    }

    formulaireLogin.addEventListener('submit', function (e) {
      e.preventDefault();

      const champMdp  = document.getElementById('champ-mdp');
      const alerte    = document.getElementById('alerte-login');
      const btnSubmit = formulaireLogin.querySelector('button[type="submit"]');

      if (!champMdp) return;

      const valeur = champMdp.value.trim();
      if (!valeur) return;

      /* Animation bouton */
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Vérification...';

      setTimeout(function () {
        if (connecter(valeur)) {
          btnSubmit.textContent = '✓ Connexion réussie';
          window.location.href = 'dashboard.html';
        } else {
          /* Afficher l'erreur */
          if (alerte) {
            alerte.classList.add('visible');
            setTimeout(function () {
              alerte.classList.remove('visible');
            }, 3000);
          }
          champMdp.value = '';
          champMdp.focus();
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Accéder à l\'administration';
        }
      }, 400);
    });
  }

  /* ---- Bouton déconnexion sur toutes les pages ---- */
  const btnDeconnexion = document.getElementById('btn-deconnexion');
  if (btnDeconnexion) {
    btnDeconnexion.addEventListener('click', function () {
      if (confirm('Voulez-vous vous déconnecter de l\'administration ?')) {
        deconnecter();
      }
    });
  }

  /* ---- Exposer les fonctions globalement ---- */
  window.SofretmaAuth = {
    verifierSession: verifierSession,
    protegerPage: protegerPage,
    deconnecter: deconnecter
  };

})();

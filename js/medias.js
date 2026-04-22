/* ============================================================
   SOFRETMA TRANSIT — Médiathèque
   W2K-Digital | medias.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let tousLesMedias = [];

  /* ---- Utilitaires ---- */
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formaterDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formaterTaille(octets) {
    if (!octets) return '—';
    if (octets < 1024) return octets + ' o';
    if (octets < 1024 * 1024) return Math.round(octets / 1024) + ' Ko';
    return (octets / (1024 * 1024)).toFixed(1) + ' Mo';
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

  function estImage(nom) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(nom);
  }

  function estVideo(nom) {
    return /\.(mp4|mov|avi|webm)$/i.test(nom);
  }

  function iconeMedia(nom) {
    if (estImage(nom)) return '🖼️';
    if (estVideo(nom)) return '🎬';
    return '📄';
  }

  /* ---- Chargement des médias ---- */
  function chargerMedias() {
    const grille = document.getElementById('grille-medias');
    if (grille) grille.innerHTML = '<div class="chargement">Chargement des médias...</div>';

    fetch(API + '/medias')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tousLesMedias = (data && data.medias) ? data.medias : [];
        afficherMedias(tousLesMedias);
        mettreAJourCompteur();
      })
      .catch(function () {
        tousLesMedias = [];
        afficherMedias([]);
      });
  }

  function afficherMedias(medias) {
    const grille = document.getElementById('grille-medias');
    if (!grille) return;

    if (medias.length === 0) {
      grille.innerHTML = '<div class="etat-vide" style="grid-column:1/-1"><div class="etat-vide__icone">🖼️</div><div class="etat-vide__texte">Aucun média uploadé</div><div class="etat-vide__sous-texte">Glissez vos fichiers ci-dessus pour commencer</div></div>';
      return;
    }

    grille.innerHTML = medias.map(function (m) {
      const vignette = estImage(m.nom)
        ? '<img src="' + escHtml(m.url) + '" alt="' + escHtml(m.nom) + '" loading="lazy">'
        : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;">' + iconeMedia(m.nom) + '</div>';

      return '<div class="media-card" data-id="' + m.id + '">' +
        '<div class="media-card__vignette">' + vignette + '</div>' +
        '<div class="media-card__infos">' +
          '<div class="media-card__nom" title="' + escHtml(m.nom) + '">' + escHtml(m.nom) + '</div>' +
          '<div class="media-card__meta">' + formaterTaille(m.taille) + ' · ' + formaterDate(m.date_upload) + '</div>' +
          '<div class="media-card__actions">' +
            (estImage(m.nom) ? '<button class="btn btn--sm btn--gris" onclick="voirMedia(\'' + m.id + '\')">Voir</button>' : '') +
            '<button class="btn btn--sm btn--rouge" onclick="supprimerMedia(\'' + m.id + '\')">✕</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function mettreAJourCompteur() {
    const el = document.getElementById('compteur-medias');
    if (el) el.textContent = tousLesMedias.length + ' fichier' + (tousLesMedias.length > 1 ? 's' : '');
  }

  /* ---- Voir image en grand ---- */
  window.voirMedia = function (id) {
    const media = tousLesMedias.find(function (m) { return m.id == id; });
    if (!media) return;

    const overlay = document.getElementById('overlay-apercu');
    const img = document.getElementById('apercu-image');
    if (overlay && img) {
      img.src = media.url;
      img.alt = media.nom;
      overlay.classList.add('visible');
    }
  };

  /* ---- Supprimer un média ---- */
  window.supprimerMedia = function (id) {
    const media = tousLesMedias.find(function (m) { return m.id == id; });
    const nom = media ? media.nom : 'ce fichier';

    if (!confirm('Supprimer "' + nom + '" ?\nCette action est irréversible.')) return;

    fetch(API + '/medias/' + id, { method: 'DELETE' })
      .then(function () {
        tousLesMedias = tousLesMedias.filter(function (m) { return m.id != id; });
        afficherMedias(tousLesMedias);
        mettreAJourCompteur();
        afficherToast('Fichier supprimé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Zone d'upload drag & drop ---- */
  const zoneUpload = document.getElementById('zone-upload');
  const inputFichier = document.getElementById('input-fichier');

  if (zoneUpload) {
    zoneUpload.addEventListener('click', function () {
      if (inputFichier) inputFichier.click();
    });

    zoneUpload.addEventListener('dragover', function (e) {
      e.preventDefault();
      zoneUpload.classList.add('drag-over');
    });

    zoneUpload.addEventListener('dragleave', function () {
      zoneUpload.classList.remove('drag-over');
    });

    zoneUpload.addEventListener('drop', function (e) {
      e.preventDefault();
      zoneUpload.classList.remove('drag-over');
      const fichiers = e.dataTransfer.files;
      if (fichiers.length) uploaderFichiers(fichiers);
    });
  }

  if (inputFichier) {
    inputFichier.addEventListener('change', function () {
      if (this.files.length) uploaderFichiers(this.files);
      this.value = '';
    });
  }

  /* ---- Upload fichiers ---- */
  function uploaderFichiers(fichiers) {
    const typesAcceptes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];
    const tailleMax     = 10 * 1024 * 1024; /* 10 Mo */

    const valides = Array.from(fichiers).filter(function (f) {
      if (!typesAcceptes.includes(f.type)) {
        afficherToast(f.name + ' : format non accepté', 'erreur');
        return false;
      }
      if (f.taille > tailleMax) {
        afficherToast(f.name + ' : fichier trop lourd (max 10 Mo)', 'erreur');
        return false;
      }
      return true;
    });

    if (valides.length === 0) return;

    afficherBarreProgression(true);

    const promesses = valides.map(function (fichier, index) {
      const formData = new FormData();
      formData.append('fichier', fichier);

      return fetch(API + '/medias/upload', { method: 'POST', body: formData })
        .then(function (r) { return r.json(); })
        .then(function () {
          const progression = Math.round(((index + 1) / valides.length) * 100);
          mettreAJourProgression(progression);
        });
    });

    Promise.all(promesses)
      .then(function () {
        setTimeout(function () {
          afficherBarreProgression(false);
          chargerMedias();
          afficherToast(valides.length + ' fichier(s) uploadé(s) avec succès', 'succes');
        }, 500);
      })
      .catch(function () {
        afficherBarreProgression(false);
        afficherToast('Erreur lors de l\'upload', 'erreur');
      });
  }

  function afficherBarreProgression(afficher) {
    const barre = document.getElementById('barre-progression');
    if (barre) barre.style.display = afficher ? 'block' : 'none';
    if (!afficher) mettreAJourProgression(0);
  }

  function mettreAJourProgression(pct) {
    const fill = document.getElementById('progression-fill');
    if (fill) fill.style.width = pct + '%';
  }

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
  chargerMedias();

});

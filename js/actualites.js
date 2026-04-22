/* ============================================================
   SOFRETMA TRANSIT — Gestion actualités
   W2K-Digital | actualites.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  if (!window.SofretmaAuth || !window.SofretmaAuth.protegerPage()) return;

  const API = 'http://81.17.101.202/api';
  let articles = [];
  let articleEnCours = null;
  let editeur = null;

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

  /* ---- Initialisation Quill ---- */
  if (typeof Quill !== 'undefined') {
    editeur = new Quill('#editeur-contenu', {
      theme: 'snow',
      placeholder: 'Rédigez le contenu de votre article...',
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean']
        ]
      }
    });

    /* Encapsuler dans le wrapper pour le style */
    const toolbarEl    = document.querySelector('.ql-toolbar');
    const containerEl  = document.querySelector('.ql-container');
    const wrapperEl    = document.getElementById('quill-wrapper');
    if (wrapperEl && toolbarEl && containerEl) {
      wrapperEl.appendChild(toolbarEl);
      wrapperEl.appendChild(containerEl);
    }
  }

  /* ---- Chargement des articles ---- */
  function chargerArticles() {
    const tbody = document.getElementById('tbody-articles');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="chargement">Chargement des données...</td></tr>';

    fetch(API + '/actualites')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        articles = (data && data.articles) ? data.articles : [];
        afficherArticles();
      })
      .catch(function () {
        articles = [];
        afficherArticles();
      });
  }

  function afficherArticles() {
    const tbody = document.getElementById('tbody-articles');
    if (!tbody) return;

    if (articles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="etat-vide"><div class="etat-vide__icone">📰</div><div class="etat-vide__texte">Aucun article</div><div class="etat-vide__sous-texte">Créez votre premier article ci-dessus</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = articles.map(function (a) {
      const badge = a.statut === 'publie'
        ? '<span class="badge badge--vert">Publié</span>'
        : '<span class="badge badge--gris">Brouillon</span>';

      return '<tr>' +
        '<td>' + escHtml(a.titre || '—') + '</td>' +
        '<td>' + formaterDate(a.date_publication) + '</td>' +
        '<td><span class="badge badge--bleu">' + escHtml(a.categorie || 'Non classé') + '</span></td>' +
        '<td>' + badge + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn--sm btn--vert" onclick="modifierArticle(\'' + a.id + '\')">Modifier</button>' +
          '<button class="btn btn--sm btn--rouge" onclick="supprimerArticle(\'' + a.id + '\')">Supprimer</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---- Ouvrir formulaire création ---- */
  document.getElementById('btn-nouvel-article')?.addEventListener('click', function () {
    articleEnCours = null;
    reinitialiserFormulaire();
    document.getElementById('modale-titre').textContent = 'Nouvel article';
    document.getElementById('overlay-article').classList.add('visible');
  });

  /* ---- Modifier un article ---- */
  window.modifierArticle = function (id) {
    articleEnCours = articles.find(function (a) { return a.id == id; });
    if (!articleEnCours) return;

    remplirFormulaire(articleEnCours);
    document.getElementById('modale-titre').textContent = 'Modifier l\'article';
    document.getElementById('overlay-article').classList.add('visible');
  };

  /* ---- Remplir le formulaire ---- */
  function remplirFormulaire(article) {
    const f = document.getElementById('formulaire-article');
    if (!f) return;

    f.elements['titre'].value = article.titre || '';
    f.elements['date_publication'].value = article.date_publication ? article.date_publication.slice(0, 10) : '';
    f.elements['categorie'].value = article.categorie || '';
    f.elements['statut'].value = article.statut || 'brouillon';

    if (editeur) editeur.root.innerHTML = article.contenu || '';

    /* Preview image */
    const preview = document.getElementById('preview-image');
    if (preview && article.image_url) {
      preview.src = article.image_url;
      preview.classList.add('visible');
    }
  }

  function reinitialiserFormulaire() {
    const f = document.getElementById('formulaire-article');
    if (f) f.reset();
    if (editeur) editeur.root.innerHTML = '';
    const preview = document.getElementById('preview-image');
    if (preview) { preview.src = ''; preview.classList.remove('visible'); }
  }

  /* ---- Soumission formulaire ---- */
  document.getElementById('formulaire-article')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const contenu  = editeur ? editeur.root.innerHTML : '';

    const payload = {
      titre:            formData.get('titre'),
      date_publication: formData.get('date_publication'),
      categorie:        formData.get('categorie'),
      statut:           formData.get('statut'),
      contenu:          contenu
    };

    const methode  = articleEnCours ? 'PUT' : 'POST';
    const endpoint = articleEnCours ? (API + '/actualites/' + articleEnCours.id) : (API + '/actualites');

    fetch(endpoint, {
      method: methode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        fermerModale();
        chargerArticles();
        afficherToast(articleEnCours ? 'Article mis à jour' : 'Article créé avec succès', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la sauvegarde', 'erreur');
      });
  });

  /* ---- Supprimer article ---- */
  window.supprimerArticle = function (id) {
    const article = articles.find(function (a) { return a.id == id; });
    const titre = article ? article.titre : 'cet article';

    if (!confirm('Supprimer "' + titre + '" ?\nCette action est irréversible.')) return;

    fetch(API + '/actualites/' + id, { method: 'DELETE' })
      .then(function () {
        articles = articles.filter(function (a) { return a.id != id; });
        afficherArticles();
        afficherToast('Article supprimé', 'succes');
      })
      .catch(function () {
        afficherToast('Erreur lors de la suppression', 'erreur');
      });
  };

  /* ---- Preview image ---- */
  document.getElementById('champ-image')?.addEventListener('change', function () {
    const fichier = this.files[0];
    const preview = document.getElementById('preview-image');
    if (fichier && preview) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.classList.add('visible');
      };
      reader.readAsDataURL(fichier);
    }
  });

  /* ---- Fermeture modale ---- */
  function fermerModale() {
    document.getElementById('overlay-article')?.classList.remove('visible');
    reinitialiserFormulaire();
    articleEnCours = null;
  }

  document.querySelectorAll('.modale__fermer, .btn-fermer-modale').forEach(function (btn) {
    btn.addEventListener('click', fermerModale);
  });

  document.querySelectorAll('.overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) fermerModale();
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
  chargerArticles();

});

// Navigation entre les écrans + mode de jeu choisi ("solo" ou "duo")
let mode = null;
let typingTimer = null;

// Histoire affichée avant le lancement (à modifier librement)
const STORY = [
    "Il fut un temps où le village de Brume-Lune brillait de mille lanternes.",
    "Puis, une nuit, les lumières se sont éteintes une à une. Personne ne sait pourquoi.",
    "Seule une petite silhouette sombre a osé quitter le village pour retrouver l'origine de l'obscurité.",
];
const STORY_DUO = "Cette fois, tu n'es pas seul : un compagnon marche à tes côtés. Ensemble, vous avez plus de chances de rallumer les lanternes.";
const STORY_SOLO = "Personne ne viendra t'aider. Il ne reste que toi, ta petite lanterne et la nuit.";

const $ = (id) => document.getElementById(id);

function show(name) {
    clearInterval(typingTimer);
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    if (name === "controls") setControlsView(mode === "duo" ? "duo" : "solo");
}

// Affichage des commandes (indépendant du mode réellement lancé) :
// le Joueur 2 joue du côté droit du clavier (flèches + pavé numérique).
function setControlsView(view) {
    const section = $("screen-controls");
    section.classList.toggle("view-duo", view === "duo");
    $("controls-view-label").textContent = view === "duo" ? "Mode duo — 2 joueurs" : "Mode solo — 1 joueur";
    $("controls-note").textContent = view === "duo"
        ? "Le Joueur 2 joue à droite du clavier : flèches directionnelles pour se déplacer, 1 et 2 pour agir. Échap : retour au menu."
        : "En solo, seul le Joueur 1 est utilisé. Échap : retour au menu.";
    $("controls-toggle").textContent = view === "duo" ? "Afficher les commandes solo" : "Afficher les commandes en duo";
    $("controls-toggle").dataset.view = view;
}

function startStory(selectedMode) {
    mode = selectedMode;
    $("story-mode").textContent = mode === "duo" ? "Mode duo — 2 joueurs" : "Mode solo — 1 joueur";
    $("story-start").hidden = true;
    $("story-skip").hidden = false;
    show("story");

    const paragraphs = [...STORY, mode === "duo" ? STORY_DUO : STORY_SOLO];
    const box = $("story-text");
    box.innerHTML = "";
    const els = paragraphs.map((t) => {
        const p = document.createElement("p");
        box.appendChild(p);
        return { p, t };
    });

    let i = 0, c = 0;
    const finish = () => {
        clearInterval(typingTimer);
        els.forEach(({ p, t }) => { p.textContent = t; p.classList.remove("cursor"); });
        $("story-skip").hidden = true;
        $("story-start").hidden = false;
        $("story-start").focus();
    };
    $("story-skip").onclick = finish;

    typingTimer = setInterval(() => {
        const { p, t } = els[i];
        p.classList.add("cursor");
        p.textContent = t.slice(0, ++c);
        if (c >= t.length) {
            p.classList.remove("cursor");
            i++; c = 0;
            if (i >= els.length) finish();
        }
    }, 28);
}

function startGame() {
    // TODO (2e étape) : générer / lancer le jeu ici
    $("game-mode").textContent = mode === "duo" ? "Mode duo" : "Mode solo";
    show("game");
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.id === "controls-toggle") setControlsView(btn.dataset.view === "duo" ? "solo" : "duo");
    else if (btn.dataset.goto) show(btn.dataset.goto);
    else if (btn.dataset.action) startStory(btn.dataset.action);
    else if (btn.id === "story-start") startGame();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") show("home");
});

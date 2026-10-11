// chargement des scènes du jeu (une classe par fichier)
import chargement from "./js/chargement.js";
import niveau1 from "./js/niveau1.js";
import niveau2 from "./js/niveau2.js";
import hud from "./js/hud.js";
import pvp from "./js/pvp.js";
import fin from "./js/fin.js";

// Navigation entre les écrans + mode de jeu choisi ("solo" ou "duo")
let mode = null;
let typingTimer = null;
let game = null; // le jeu Phaser, créé au lancement d'une partie

// configuration générale du jeu
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 576,
    parent: "game-container", // le canvas est placé dans l'écran de jeu de la page
    backgroundColor: "#0b0b12",
    pixelArt: true, // pas de lissage : les pixels restent nets
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [chargement, niveau1, niveau2, pvp, hud, fin]
};

// Histoire affichée avant le lancement (à modifier librement)
const STORY = [
    "Il fut un temps où le village de Brume-Lune brillait de mille lanternes.",
    "Puis, une nuit, les lumières se sont éteintes une à une. Personne ne sait pourquoi.",
    "Seule une petite silhouette sombre a osé quitter le village pour retrouver l'origine de l'obscurité.",
];
const STORY_DUO = "Cette fois, tu n'es pas seul : une autre silhouette, bleue, a quitté le village. Mais il n'y a qu'une lanterne à rallumer... Que le duel commence.";
const STORY_SOLO = "Personne ne viendra t'aider. Il ne reste que toi, ta petite lanterne et la nuit.";

const $ = (id) => document.getElementById(id);

function show(name) {
    clearInterval(typingTimer);
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    $("app").classList.toggle("in-game", name === "game");
    if (name !== "game") stopGame();
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
    show("game");
    // création et lancement du jeu à partir de la configuration config
    game = new Phaser.Game(config);
    // le mode choisi au menu ("solo" = histoire, "duo" = PvP) est lu par la scène de chargement
    game.registry.set("mode", mode);
}

// ferme le jeu Phaser (et coupe la musique) quand on quitte l'écran de jeu
function stopGame() {
    if (!game) return;
    game.destroy(true);
    game = null;
}

// envoyé par le bouton "Retour au menu" de la scène de fin
window.addEventListener("retour-menu", () => show("home"));

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

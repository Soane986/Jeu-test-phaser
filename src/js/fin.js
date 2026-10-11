import { nouvellePartie } from "./chargement.js";

// Scène de fin : écran de victoire ou de game over, avec deux boutons cliquables.

const POLICE = "Courier New, monospace";

export default class fin extends Phaser.Scene {
    constructor() {
        super({ key: "fin" });
    }

    // mode histoire -> data.victoire : true si le joueur a franchi la porte finale, false s'il n'a plus de vies
    // mode duo      -> data.mode vaut "pvp" et data.gagnant est le numéro du joueur vainqueur
    init(data) {
        this.pvp = data.mode == "pvp";
        this.gagnant = data.gagnant;
        this.victoire = this.pvp ? true : data.victoire;
    }

    create() {
        this.cameras.main.setBackgroundColor("#0e024f");
        this.cameras.main.fadeIn(400);
        this.sound.play(this.victoire ? "son_victoire" : "son_gameover");

        let titre = this.victoire ? "VICTOIRE !" : "GAME OVER";
        let phrase = this.victoire
            ? "Tu as traversé la grotte : les lanternes de Brume-Lune se rallument."
            : "L'obscurité a eu raison de toi... pour cette fois.";
        let resultat = "";
        if (this.pvp) {
            titre = "JOUEUR " + this.gagnant + " GAGNE !";
            phrase = "Le duel est terminé : une seule lanterne brille encore.";
            resultat = "Manches : " + this.registry.get("manches1") + " - " + this.registry.get("manches2");
        } else {
            const temps = this.registry.get("temps");
            const duree = Math.floor(temps / 60) + ":" + String(temps % 60).padStart(2, "0");
            resultat = "Score : " + this.registry.get("score") + "     Temps : " + duree;
        }
        this.add.text(512, 130, titre, { fontFamily: POLICE, fontSize: "64px", fontStyle: "bold", color: "#ffcf5c", stroke: "#000000", strokeThickness: 8 }).setOrigin(0.5);
        this.add.text(512, 215, phrase, { fontFamily: POLICE, fontSize: "20px", color: "#f1ecff" }).setOrigin(0.5);

        this.add.text(512, 275, resultat, { fontFamily: POLICE, fontSize: "24px", color: "#9a93b8" }).setOrigin(0.5);

        // un petit personnage animé (et le halo de sa lanterne) pour habiller l'écran
        this.add.image(512, 350, "img_lumiere").setBlendMode(Phaser.BlendModes.ADD).setAlpha(this.victoire ? 0.8 : 0.3);
        const numero = this.pvp ? this.gagnant : 1; // en duo, on montre le vainqueur
        this.add.sprite(512, 350, "img_joueur" + numero).setScale(5).play("anim_j" + numero + (this.victoire ? "_marche" : "_repos"));

        this.creerBouton(380, 460, "REJOUER", function () {
            nouvellePartie(this.registry);
            this.scene.start(this.pvp ? "pvp" : "niveau1");
        });
        this.creerBouton(650, 460, "RETOUR AU MENU", function () {
            // le menu est la page d'accueil HTML : on prévient index.js, qui ferme le jeu
            window.dispatchEvent(new CustomEvent("retour-menu"));
        });
    }

    // crée un bouton cliquable qui réagit au survol de la souris
    creerBouton(x, y, libelle, action) {
        const bouton = this.add.text(x, y, libelle, {
            fontFamily: POLICE, fontSize: "22px", color: "#050606",
            backgroundColor: "#2600ff", padding: { x: 18, y: 12 }
        }).setOrigin(0.5);

        // on rend le bouton interactif
        bouton.setInteractive({ useHandCursor: true });
        // cas où la souris passe sur le bouton
        bouton.on("pointerover", () => {
            bouton.setStyle({ color: "#ffcf5c", backgroundColor: "#340ce4" });
        });
        // cas où la souris ne passe plus sur le bouton
        bouton.on("pointerout", () => {
            bouton.setStyle({ color: "#050606", backgroundColor: "#2600ff" });
        });
        // cas où la souris clique sur le bouton
        bouton.on("pointerup", action, this);
        return bouton;
    }
}

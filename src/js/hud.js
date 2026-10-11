// Scène d'affichage (HUD) : elle tourne en parallèle du niveau, par-dessus lui.
// Comme sa caméra n'est pas zoomée, les textes restent nets et fixes à l'écran.
// Les valeurs affichées sont lues dans le registry, partagé entre toutes les scènes.

const POLICE = "Courier New, monospace";
const VIES_MAX = 5;

export default class hud extends Phaser.Scene {
    constructor() {
        super({ key: "hud" });
    }

    create() {
        // barre de vie : une rangée de cœurs (frame 0 = plein, frame 1 = vide)
        this.coeurs = [];
        for (let i = 0; i < VIES_MAX; i++) {
            this.coeurs.push(this.add.image(30 + i * 34, 30, "img_coeur", 0).setScale(4));
        }
        const style = { fontFamily: POLICE, fontSize: "20px", color: "#f1ecff", stroke: "#000000", strokeThickness: 4 };
        this.texteScore = this.add.text(1004, 16, "", style).setOrigin(1, 0);
        this.texteTemps = this.add.text(1004, 42, "", style).setOrigin(1, 0);
        this.texteNiveau = this.add.text(512, 16, "", { ...style, color: "#ffcf5c" }).setOrigin(0.5, 0);
        // lanternes rallumées : une petite lanterne et un compteur
        this.iconeLanterne = this.add.image(32, 76, "img_lanterne", 0).setScale(0.75);
        this.texteLanternes = this.add.text(54, 64, "", { ...style, color: "#ffcf5c" });
        this.texteBouclier = this.add.text(20, 104, "", { ...style, color: "#7dffb0" });
        this.texteIndice = this.add.text(512, 520, "", { ...style, color: "#ffcf5c" }).setOrigin(0.5);
        this.texteMessage = this.add.text(512, 110, "", { ...style, fontSize: "18px", align: "center" }).setOrigin(0.5);
        this.dernierMessage = "";
        this.timerMessage = null;
    }

    update() {
        const vies = this.registry.get("vies");
        this.coeurs.forEach(function (coeur, i) { coeur.setFrame(i < vies ? 0 : 1); });

        const temps = this.registry.get("temps");
        const secondes = String(temps % 60).padStart(2, "0");
        this.texteScore.setText("Score : " + this.registry.get("score"));
        this.texteTemps.setText("Temps : " + Math.floor(temps / 60) + ":" + secondes);
        this.texteNiveau.setText(this.registry.get("niveau"));
        this.texteIndice.setText(this.registry.get("indice"));

        const lanternes = this.registry.get("lanternes");
        this.texteLanternes.setText(lanternes + " / 3");
        this.iconeLanterne.setFrame(lanternes > 0 ? 8 : 0); // éteinte tant qu'aucune n'est rallumée

        const bouclier = this.registry.get("bouclier");
        this.texteBouclier.setText(bouclier > 0 ? "Bouclier : " + bouclier + " s" : "");

        // un nouveau message est affiché, puis effacé par un timer après quelques secondes
        const message = this.registry.get("message");
        if (message != this.dernierMessage) {
            this.dernierMessage = message;
            this.texteMessage.setText(message).setAlpha(1);
            if (this.timerMessage) this.timerMessage.remove();
            this.timerMessage = this.time.delayedCall(6000, function () {
                this.tweens.add({ targets: this.texteMessage, alpha: 0, duration: 500 });
            }, null, this);
        }
    }
}

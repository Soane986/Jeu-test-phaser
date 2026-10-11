import Niveau from "./niveau.js";

// Niveau 4 : le cœur de la grotte (17 ennemis, troisième et dernière lanterne)
export default class niveau4 extends Niveau {
    constructor() {
        super("niveau4", "carte_4", "Niveau 4 - Le cœur de la grotte");
        this.typeItem = "tresor"; // les cristaux rapportent des points
    }

    create() {
        super.create();
        this.registry.set("message", "Dernière lanterne ! Rallume-la et franchis la porte\npour sauver Brume-Lune.");
    }

    // la porte de sortie ne s'ouvre qu'une fois la lanterne du niveau rallumée (voir niveau.js)
    destinationPorte(objet) {
        return { nom: "sortie", scene: "fin" };
    }
}

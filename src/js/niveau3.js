import Niveau from "./niveau.js";

// Niveau 3 : les profondeurs (14 ennemis, deuxième lanterne)
export default class niveau3 extends Niveau {
    constructor() {
        super("niveau3", "carte_3", "Niveau 3 - Les profondeurs");
        this.typeItem = "tresor"; // les cristaux rapportent des points
    }

    create() {
        super.create();
        this.registry.set("message", "Les ennemis sont plus nombreux ici.\nTrouve et rallume la deuxième lanterne.");
    }

    // la porte de sortie ne s'ouvre qu'une fois la lanterne du niveau rallumée (voir niveau.js)
    destinationPorte(objet) {
        return { nom: "sortie", scene: "niveau4" };
    }
}

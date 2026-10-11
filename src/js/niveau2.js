import Niveau from "./niveau.js";

// Niveau 2 : les galeries (11 ennemis, première lanterne)
export default class niveau2 extends Niveau {
    constructor() {
        super("niveau2", "carte_2", "Niveau 2 - Les galeries");
        this.typeItem = "tresor"; // les cristaux rapportent des points
    }

    create() {
        super.create();
        this.registry.set("message", "Une lanterne éteinte se cache dans ces galeries.\nRallume-la pour ouvrir la porte de sortie.");
    }

    // la porte de sortie ne s'ouvre qu'une fois la lanterne du niveau rallumée (voir niveau.js)
    destinationPorte(objet) {
        return { nom: "sortie", scene: "niveau3" };
    }
}

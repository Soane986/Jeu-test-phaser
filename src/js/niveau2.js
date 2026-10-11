import Niveau from "./niveau.js";

// Niveau 2 : la salle secrète, accessible par la porte cachée du niveau 1
export default class niveau2 extends Niveau {
    constructor() {
        super("niveau2", "carte_2", "Niveau 2 - La salle secrète");
        this.typeItem = "tresor"; // ici les cristaux rapportent des points
    }

    create() {
        super.create();
        this.registry.set("message", "Une salle secrète ! Ramasse les cristaux,\nla porte te ramène au début de la grotte.");
    }

    // la porte de la salle ramène au point de départ (Spawn) du niveau 1 :
    // sans "arrivee", le niveau démarre à son point "Spawn"
    destinationPorte(objet) {
        return { nom: "retour", scene: "niveau1" };
    }
}

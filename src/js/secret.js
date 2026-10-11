import Niveau from "./niveau.js";

// Salle secrète : niveau bonus accessible par la porte cachée du niveau 1
export default class secret extends Niveau {
    constructor() {
        super("secret", "carte_secret", "Salle secrète");
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

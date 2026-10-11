import Niveau from "./niveau.js";

// Niveau 1 : la grotte (carte map_1 créée dans Tiled)
export default class niveau1 extends Niveau {
    constructor() {
        super("niveau1", "carte_1", "Niveau 1 - La grotte");
        this.typeItem = "bouclier"; // l'item de ce niveau est le cristal protecteur
    }

    create() {
        super.create();
        // consignes affichées en début de niveau (le HUD les efface après quelques secondes)
        if (!this.arrivee) {
            this.registry.set("message", "Traverse la grotte et trouve la porte de sortie.\nQ/D : bouger   ESPACE : sauter   Z/S : échelle   H : tirer   E : porte");
        }
    }

    // la carte contient deux portes : celle du bas, cachée au-dessus de l'acide, mène à la
    // salle secrète ; celle du haut, au bout de la grotte, termine le jeu
    destinationPorte(objet) {
        if (objet.y > this.carte.heightInPixels / 2) {
            return { nom: "secrete", scene: "niveau2" };
        }
        return { nom: "finale", scene: "fin" };
    }
}

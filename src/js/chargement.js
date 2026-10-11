// Scène de chargement : charge une seule fois tous les assets et crée les animations.
// Une image ou une animation chargée dans une scène est ensuite disponible dans tout le jeu.

// remet à zéro les données de la partie (partagées entre les scènes grâce au registry)
export function nouvellePartie(registry) {
    registry.set("vies", 5);
    registry.set("score", 0);
    registry.set("temps", 0);
    registry.set("lanternes", 0); // lanternes rallumées (il en faut 3 pour gagner)
    registry.set("manches1", 0); // manches gagnées par chaque joueur en mode duo
    registry.set("manches2", 0);
    registry.set("bouclier", 0);
    registry.set("indice", "");
    registry.set("message", "");
}

export default class chargement extends Phaser.Scene {
    constructor() {
        super({ key: "chargement" });
    }

    preload() {
        // texte d'attente pendant le chargement
        this.add.text(512, 288, "Chargement...", { fontFamily: "Courier New, monospace", fontSize: "24px", color: "#ffcf5c" }).setOrigin(0.5);

        // cartes Tiled et jeu de tuiles
        this.load.tilemapTiledJSON("carte_1", "src/assets/map_1.json");
        this.load.tilemapTiledJSON("carte_2", "src/assets/map_2.json");
        this.load.tilemapTiledJSON("carte_3", "src/assets/map_3.json");
        this.load.tilemapTiledJSON("carte_4", "src/assets/map_4.json");
        this.load.tilemapTiledJSON("carte_secret", "src/assets/map_secret.json");
        this.load.tilemapTiledJSON("carte_pvp", "src/assets/map_pvp.json");
        this.load.image("img_tuiles", "src/assets/crystal_cave_tiles.png");
        // le même jeu de tuiles, découpé en frames pour en tirer des sprites (le cristal)
        this.load.spritesheet("img_objets", "src/assets/crystal_cave_tiles.png", { frameWidth: 32, frameHeight: 32 });

        // personnages
        this.load.spritesheet("img_joueur1", "src/assets/Sprite test .png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("img_joueur2", "src/assets/joueur2.png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("img_rat", "src/assets/rat.png", { frameWidth: 36, frameHeight: 18 });
        this.load.spritesheet("img_gobelin", "src/assets/gobelin.png", { frameWidth: 40, frameHeight: 34 });

        // objets
        this.load.spritesheet("img_porte", "src/assets/porte.png", { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet("img_lanterne", "src/assets/lanterne.png", { frameWidth: 40, frameHeight: 56 });
        this.load.spritesheet("img_coeur", "src/assets/coeur.png", { frameWidth: 7, frameHeight: 7 });
        this.load.image("img_balle", "src/assets/balle.png");
        this.load.image("img_balle2", "src/assets/balle2.png");
        this.load.image("img_caillou", "src/assets/caillou.png");
        this.load.image("img_lumiere", "src/assets/lumiere.png");

        // musique et bruitages
        this.load.audio("musique", "src/assets/musique.wav");
        this.load.audio("son_tir", "src/assets/tir.wav");
        this.load.audio("son_saut", "src/assets/saut.wav");
        this.load.audio("son_touche", "src/assets/touche.wav");
        this.load.audio("son_ennemi_touche", "src/assets/ennemi_touche.wav");
        this.load.audio("son_ennemi_mort", "src/assets/ennemi_mort.wav");
        this.load.audio("son_item", "src/assets/item.wav");
        this.load.audio("son_porte", "src/assets/porte.wav");
        this.load.audio("son_mort", "src/assets/mort.wav");
        this.load.audio("son_victoire", "src/assets/victoire.wav");
        this.load.audio("son_gameover", "src/assets/gameover.wav");
    }

    create() {
        // --- animations du joueur 1 ---
        this.anims.create({
            key: "anim_j1_marche",
            frames: this.anims.generateFrameNumbers("img_joueur1", { start: 0, end: 11 }),
            frameRate: 14,
            repeat: -1
        });
        this.anims.create({
            key: "anim_j1_repos",
            frames: this.anims.generateFrameNumbers("img_joueur1", { frames: [0, 2] }),
            frameRate: 2,
            repeat: -1
        });

        // --- animations du joueur 2 (même découpage, spritesheet bleu) ---
        this.anims.create({
            key: "anim_j2_marche",
            frames: this.anims.generateFrameNumbers("img_joueur2", { start: 0, end: 11 }),
            frameRate: 14,
            repeat: -1
        });
        this.anims.create({
            key: "anim_j2_repos",
            frames: this.anims.generateFrameNumbers("img_joueur2", { frames: [0, 2] }),
            frameRate: 2,
            repeat: -1
        });

        // --- animations du rat (ennemi 1) : lignes attaque / mort / course du spritesheet ---
        this.anims.create({
            key: "anim_rat_attaque",
            frames: this.anims.generateFrameNumbers("img_rat", { start: 0, end: 2 }),
            frameRate: 12,
            repeat: -1
        });
        this.anims.create({
            key: "anim_rat_mort",
            frames: this.anims.generateFrameNumbers("img_rat", { start: 4, end: 7 }),
            frameRate: 8,
            repeat: 0
        });
        this.anims.create({
            key: "anim_rat_course",
            frames: this.anims.generateFrameNumbers("img_rat", { start: 8, end: 10 }),
            frameRate: 8,
            repeat: -1
        });

        // --- animations du gobelin (ennemi 2) : lignes marche / attaque ---
        this.anims.create({
            key: "anim_gobelin_marche",
            frames: this.anims.generateFrameNumbers("img_gobelin", { start: 0, end: 5 }),
            frameRate: 7,
            repeat: -1
        });
        this.anims.create({
            key: "anim_gobelin_attaque",
            frames: this.anims.generateFrameNumbers("img_gobelin", { start: 6, end: 9 }),
            frameRate: 9,
            repeat: 0
        });

        // --- animations de la lanterne : la flamme s'allume (frames 0 à 5), puis brûle en boucle ---
        this.anims.create({
            key: "anim_lanterne_allume",
            frames: this.anims.generateFrameNumbers("img_lanterne", { start: 0, end: 5 }),
            frameRate: 8,
            repeat: 0
        });
        this.anims.create({
            key: "anim_lanterne_brule",
            frames: this.anims.generateFrameNumbers("img_lanterne", { start: 6, end: 33 }),
            frameRate: 10,
            repeat: -1
        });

        // --- animation d'ouverture de la porte ---
        this.anims.create({
            key: "anim_ouvreporte",
            frames: this.anims.generateFrameNumbers("img_porte", { start: 0, end: 5 }),
            frameRate: 12,
            repeat: 0
        });

        // tout est prêt : on démarre une nouvelle partie, dans la scène du mode choisi au menu
        nouvellePartie(this.registry);
        this.scene.start(this.registry.get("mode") == "duo" ? "pvp" : "niveau1");
    }
}

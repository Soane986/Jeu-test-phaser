// Mode duo (PvP) : deux joueurs s'affrontent dans une arène.
// Chacun tire sur l'autre pour faire baisser sa barre de vie ; le premier à 2 manches gagne.

const POLICE = "Courier New, monospace";
const VITESSE_JOUEUR = 170;
const VITESSE_SAUT = 330;
const VITESSE_BALLE = 420;
const DELAI_TIR = 350;          // ms entre deux tirs
const VIE_MAX = 10;
const DEGATS_ACIDE = 2;
const SOIN_CRISTAL = 3;
const DELAI_CRISTAL = 8000;     // ms entre deux apparitions d'un cristal de soin
const MANCHES_POUR_GAGNER = 2;
const LARGEUR_BARRE = 300;
const FRAME_CRISTAL = 66;

export default class pvp extends Phaser.Scene {
    constructor() {
        super({ key: "pvp" });
    }

    create() {
        /*************************
         *  CARTE TILED          *
         *************************/
        this.carte = this.make.tilemap({ key: "carte_pvp" });
        const tileset = this.carte.addTilesetImage("jeu de tuile test", "img_tuiles");
        this.carte.createLayer("background", tileset, 0, 0);
        this.calquePlateformes = this.carte.createLayer("plateform", tileset, 0, 0);
        this.carte.createLayer("decoration", tileset, 0, 0);
        this.calqueMort = this.carte.createLayer("death layer", tileset, 0, 0);
        this.calquePlateformes.setCollisionByExclusion([-1]);
        this.physics.world.setBounds(0, 0, this.carte.widthInPixels, this.carte.heightInPixels);

        // points placés dans le calque d'objets : départ de chaque joueur et emplacements des cristaux
        const departs = {};
        this.pointsItems = [];
        const calqueObjets = this.carte.getObjectLayer("objets") || this.carte.objects[0];
        calqueObjets.objects.forEach(function (objet) {
            if (objet.name == "Spawn 1") departs[1] = { x: objet.x, y: objet.y };
            if (objet.name == "Spawn 2") departs[2] = { x: objet.x, y: objet.y };
            if (objet.name == "Item") this.pointsItems.push({ x: objet.x, y: objet.y });
        }, this);

        /*************************
         *  JOUEURS              *
         *************************/
        // chaque joueur a son propre jeu de touches
        const clavier = this.input.keyboard;
        const touchesJ1 = clavier.addKeys({ gauche: "Q", droite: "D", saut: "SPACE", tir: "H" });
        const touchesJ2 = clavier.addKeys({
            gauche: "LEFT", droite: "RIGHT",
            saut: "NUMPAD_TWO", saut2: "TWO",   // le 2 du pavé numérique ou celui du haut du clavier
            tir: "NUMPAD_ONE", tir2: "ONE"
        });
        this.joueur1 = this.creerJoueur(1, departs[1], "right", touchesJ1);
        this.joueur2 = this.creerJoueur(2, departs[2], "left", touchesJ2);
        this.joueurs = [this.joueur1, this.joueur2];

        /*************************
         *  BALLES ET CRISTAUX   *
         *************************/
        this.groupeBalles = this.physics.add.group();
        this.groupeItems = this.physics.add.staticGroup();

        /*************************
         *  COLLISIONS           *
         *************************/
        this.physics.add.collider(this.joueurs, this.calquePlateformes);
        // les deux joueurs se bloquent l'un l'autre
        this.physics.add.collider(this.joueur1, this.joueur2);
        // une balle qui touche un mur est détruite
        this.physics.add.collider(this.groupeBalles, this.calquePlateformes, function (balle) { balle.destroy(); });
        // superposition balle / joueur : le 4e paramètre évite qu'un joueur soit touché par sa propre balle
        this.joueurs.forEach(function (joueur) {
            this.physics.add.overlap(this.groupeBalles, joueur, this.hit, function (a, b) {
                const balle = a.tireur ? a : b;
                return balle.tireur !== joueur;
            }, this);
            this.physics.add.overlap(joueur, this.groupeItems, this.ramasserCristal, null, this);
        }, this);

        // bords du monde : les balles qui sortent sont détruites, un joueur qui touche le bas est tombé
        this.physics.world.on(
            "worldbounds",
            function (body, up, down, left, right) {
                const objet = body.gameObject;
                if (this.groupeBalles.contains(objet)) {
                    objet.destroy();
                }
                if (this.joueurs.includes(objet) && down == true) {
                    this.tomber(objet);
                }
            },
            this
        );

        /*************************
         *  AFFICHAGE            *
         *************************/
        this.creerBarreDeVie(this.joueur1, 20, "JOUEUR 1", 0xffcf5c);
        this.creerBarreDeVie(this.joueur2, 1004 - LARGEUR_BARRE, "JOUEUR 2", 0x4b5bab);
        this.texteCentre = this.add.text(512, 200, "", {
            fontFamily: POLICE, fontSize: "64px", fontStyle: "bold", color: "#ffcf5c", stroke: "#000000", strokeThickness: 8
        }).setOrigin(0.5).setDepth(10);
        this.add.text(512, 22, "Manche " + (this.registry.get("manches1") + this.registry.get("manches2") + 1), {
            fontFamily: POLICE, fontSize: "20px", color: "#f1ecff", stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5, 0);

        // musique de fond en boucle (lancée une seule fois pour tout le jeu)
        if (!this.sound.get("musique")) {
            this.sound.add("musique", { loop: true, volume: 0.35 }).play();
        }

        /*************************
         *  TIMERS               *
         *************************/
        // timer à nombre de répétitions fixe : compte à rebours 3, 2, 1 avant le début de la manche
        this.mancheEnCours = false;
        this.mancheFinie = false;
        let compte = 3;
        this.texteCentre.setText(compte);
        this.time.addEvent({
            delay: 700,
            repeat: 3,
            callback: function () {
                compte--;
                if (compte > 0) {
                    this.texteCentre.setText(compte);
                } else if (compte == 0) {
                    this.texteCentre.setText("TIREZ !");
                    this.mancheEnCours = true;
                } else {
                    this.texteCentre.setText("");
                }
            },
            callbackScope: this
        });

        // timer récurrent : un cristal de soin apparaît régulièrement dans l'arène
        this.time.addEvent({
            delay: DELAI_CRISTAL,
            callback: this.apparaitreCristal,
            callbackScope: this,
            loop: true
        });

        this.cameras.main.fadeIn(300);
    }

    /***********************************************************************/
    /** CRÉATION DES ÉLÉMENTS
    /***********************************************************************/

    creerJoueur(numero, depart, direction, touches) {
        const joueur = this.physics.add.sprite(depart.x, depart.y, "img_joueur" + numero);
        joueur.setScale(2); // sprite de 16x16 affiché en 32x32
        joueur.body.setSize(10, 14).setOffset(3, 2);
        joueur.setCollideWorldBounds(true);
        joueur.body.onWorldBounds = true;
        // attributs ajoutés à la volée
        joueur.numero = numero;
        joueur.depart = depart;
        joueur.touches = touches;
        joueur.direction = direction;
        joueur.pointsVie = VIE_MAX;
        joueur.peutTirer = true;
        joueur.invincible = false;
        joueur.horsJeu = false;   // vrai pendant une chute, avant la réapparition
        joueur.etourdi = false;
        joueur.setFlipX(direction == "left");
        // halo de lanterne, pour bien distinguer le personnage du décor
        joueur.lumiere = this.add.image(depart.x, depart.y, "img_lumiere").setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4);
        joueur.setDepth(1);
        return joueur;
    }

    // barre de vie : un fond sombre, une jauge colorée dont la largeur suit les points de vie
    creerBarreDeVie(joueur, x, nom, couleur) {
        this.add.text(x, 12, nom, { fontFamily: POLICE, fontSize: "18px", color: "#f1ecff", stroke: "#000000", strokeThickness: 4 });
        this.add.rectangle(x - 3, 37, LARGEUR_BARRE + 6, 24, 0x000000).setOrigin(0, 0);
        this.add.rectangle(x, 40, LARGEUR_BARRE, 18, 0x3a2a4a).setOrigin(0, 0);
        joueur.barre = this.add.rectangle(x, 40, LARGEUR_BARRE, 18, couleur).setOrigin(0, 0);
        // une pastille par manche gagnée
        for (let i = 0; i < MANCHES_POUR_GAGNER; i++) {
            const gagnee = i < this.registry.get("manches" + joueur.numero);
            this.add.circle(x + 10 + i * 24, 76, 8, gagnee ? couleur : 0x3a2a4a).setStrokeStyle(2, 0x000000);
        }
    }

    /***********************************************************************/
    /** BOUCLE DE JEU
    /***********************************************************************/

    update() {
        this.joueurs.forEach(function (joueur) {
            joueur.lumiere.setPosition(joueur.x, joueur.y);
            joueur.barre.width = LARGEUR_BARRE * Math.max(joueur.pointsVie, 0) / VIE_MAX;
            if (joueur.horsJeu) return;

            // tant que le compte à rebours tourne (ou que la manche est finie), personne ne bouge
            if (!this.mancheEnCours) {
                joueur.setVelocityX(0);
                joueur.anims.play("anim_j" + joueur.numero + "_repos", true);
                return;
            }
            this.deplacerJoueur(joueur);

            // l'acide blesse le joueur et le renvoie à son point de départ
            if (this.calqueMort.getTileAtWorldXY(joueur.body.center.x, joueur.body.center.y)) {
                this.tomber(joueur);
            }
        }, this);
    }

    // même fonction pour les deux joueurs : seul le jeu de touches change
    deplacerJoueur(joueur) {
        const touches = joueur.touches;
        const anim = "anim_j" + joueur.numero;
        if (joueur.etourdi) return;

        if (touches.gauche.isDown) {
            joueur.direction = "left";
            joueur.setVelocityX(-VITESSE_JOUEUR);
            joueur.anims.play(anim + "_marche", true);
        } else if (touches.droite.isDown) {
            joueur.direction = "right";
            joueur.setVelocityX(VITESSE_JOUEUR);
            joueur.anims.play(anim + "_marche", true);
        } else {
            joueur.setVelocityX(0);
            joueur.anims.play(anim + "_repos", true);
        }
        joueur.setFlipX(joueur.direction == "left");

        // le joueur 2 a deux touches possibles pour sauter et pour tirer (pavé numérique ou haut du clavier)
        const saute = Phaser.Input.Keyboard.JustDown(touches.saut) || (touches.saut2 && Phaser.Input.Keyboard.JustDown(touches.saut2));
        const tire = Phaser.Input.Keyboard.JustDown(touches.tir) || (touches.tir2 && Phaser.Input.Keyboard.JustDown(touches.tir2));
        if (saute && joueur.body.blocked.down) {
            joueur.setVelocityY(-VITESSE_SAUT);
            this.sound.play("son_saut", { volume: 0.5 });
        }
        if (tire) {
            this.tirer(joueur);
        }
    }

    /***********************************************************************/
    /** TIR
    /***********************************************************************/

    // fonction de tir : prend en paramètre l'auteur du tir
    tirer(tireur) {
        if (tireur.peutTirer == false) return;
        var coefDir;
        if (tireur.direction == "left") { coefDir = -1; } else { coefDir = 1; }
        // chaque joueur a sa couleur de balle
        var balle = this.groupeBalles.create(tireur.x + 25 * coefDir, tireur.y + 4, tireur.numero == 1 ? "img_balle" : "img_balle2");
        balle.setScale(2);
        balle.tireur = tireur; // pour savoir à qui appartient la balle
        balle.setCollideWorldBounds(true);
        balle.body.onWorldBounds = true;
        balle.body.allowGravity = false;
        balle.setVelocity(VITESSE_BALLE * coefDir, 0);
        this.sound.play("son_tir", { volume: 0.5 });

        // cooldown : un timer réactive le tir après un délai
        tireur.peutTirer = false;
        this.time.delayedCall(DELAI_TIR, function () { tireur.peutTirer = true; }, null, this);
    }

    // fonction déclenchée lorsqu'une balle touche le joueur adverse
    hit(a, b) {
        // selon l'ordre des paramètres donné par Phaser, on retrouve qui est la balle
        const balle = a.tireur ? a : b;
        const joueur = a.tireur ? b : a;
        const sens = balle.body.velocity.x < 0 ? -1 : 1;
        balle.destroy();
        if (joueur.invincible || joueur.horsJeu || this.mancheFinie) return;

        this.sound.play("son_touche");
        this.cameras.main.shake(100, 0.005);
        // recul et clignotement
        joueur.etourdi = true;
        joueur.setVelocity(160 * sens, -140);
        joueur.setTintFill(0xffffff);
        this.time.delayedCall(180, function () {
            joueur.etourdi = false;
            joueur.clearTint();
        }, null, this);
        this.retirerVie(joueur, 1);
    }

    retirerVie(joueur, degats) {
        joueur.pointsVie -= degats;
        if (joueur.pointsVie <= 0) {
            this.finManche(joueur.numero == 1 ? this.joueur2 : this.joueur1, joueur);
        }
    }

    /***********************************************************************/
    /** CHUTES ET CRISTAUX DE SOIN
    /***********************************************************************/

    // le joueur est tombé dans l'acide ou dans le vide : il perd de la vie et repart de son point de départ
    tomber(joueur) {
        if (joueur.horsJeu || this.mancheFinie) return;
        joueur.horsJeu = true;
        joueur.setVelocity(0, 0);
        joueur.body.enable = false;
        joueur.setTint(0xff0000);
        this.sound.play("son_mort");
        this.retirerVie(joueur, DEGATS_ACIDE);
        if (this.mancheFinie) return;

        // timer simple : réapparition après un délai, avec un court instant d'invincibilité
        this.time.delayedCall(900, function () {
            joueur.body.enable = true;
            joueur.body.reset(joueur.depart.x, joueur.depart.y);
            joueur.clearTint();
            joueur.horsJeu = false;
            joueur.invincible = true;
            this.tweens.add({ targets: joueur, alpha: 0.3, duration: 100, yoyo: true, repeat: 6 });
            this.time.delayedCall(1500, function () {
                joueur.invincible = false;
                joueur.setAlpha(1);
            }, null, this);
        }, null, this);
    }

    // appelée par le timer récurrent : un seul cristal à la fois, à un emplacement tiré au hasard
    apparaitreCristal() {
        if (!this.mancheEnCours || this.groupeItems.countActive() > 0) return;
        const point = Phaser.Utils.Array.GetRandom(this.pointsItems);
        const cristal = this.groupeItems.create(point.x, point.y, "img_objets", FRAME_CRISTAL);
        cristal.body.setSize(14, 14).setOffset(9, 9);
        cristal.setScale(0);
        this.tweens.add({ targets: cristal, scale: 1.5, duration: 300, ease: "Back.easeOut" });
    }

    ramasserCristal(joueur, cristal) {
        cristal.destroy();
        joueur.pointsVie = Math.min(joueur.pointsVie + SOIN_CRISTAL, VIE_MAX);
        this.sound.play("son_item");
    }

    /***********************************************************************/
    /** FIN DE MANCHE
    /***********************************************************************/

    finManche(gagnant, perdant) {
        if (this.mancheFinie) return;
        this.mancheFinie = true;
        this.mancheEnCours = false;
        this.physics.pause();
        perdant.setTint(0xff0000);
        this.sound.play("son_ennemi_mort");
        this.registry.inc("manches" + gagnant.numero, 1);
        this.texteCentre.setText("JOUEUR " + gagnant.numero + "\ngagne la manche").setFontSize(44).setAlign("center");

        // timer simple : on laisse le résultat affiché avant de passer à la suite
        this.time.delayedCall(2200, function () {
            if (this.registry.get("manches" + gagnant.numero) >= MANCHES_POUR_GAGNER) {
                this.scene.start("fin", { mode: "pvp", gagnant: gagnant.numero });
            } else {
                this.scene.restart(); // manche suivante
            }
        }, null, this);
    }
}

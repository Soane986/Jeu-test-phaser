// Classe de base des niveaux du mode histoire.
// Elle contient tout ce qui est commun aux niveaux : la carte Tiled, le joueur, le tir,
// les ennemis, les portes, les items, les timers et les collisions.
// niveau1.js et niveau2.js en héritent et ne précisent que ce qui leur est propre.

const VITESSE_JOUEUR = 140;
const VITESSE_SAUT = 330;
const VITESSE_ECHELLE = 90;
const VITESSE_BALLE = 380;
const DELAI_TIR = 350;            // ms entre deux tirs (cooldown)
const DUREE_INVINCIBLE = 1500;    // ms d'invincibilité après un coup
const DUREE_BOUCLIER = 8000;      // ms de protection donnée par le cristal
const DELAI_ATTAQUE_GOBELIN = 2200;
const TUILES_INVISIBLES = [1, 52, 101, 102]; // tuiles transparentes du calque plateform (chemin caché)
const FRAME_CRISTAL = 66;

export default class Niveau extends Phaser.Scene {
    constructor(cle, cleCarte, titre) {
        super({ key: cle });
        this.cleCarte = cleCarte;
        this.titre = titre;
        this.typeItem = "tresor"; // "tresor" (points) ou "bouclier" (protection contre l'acide)
    }

    // data.arrivee : nom de la porte par laquelle on arrive (sinon on part du point "Spawn")
    init(data) {
        this.arrivee = data && data.arrivee ? data.arrivee : null;
    }

    create() {
        /*************************
         *  CARTE TILED          *
         *************************/
        this.carte = this.make.tilemap({ key: this.cleCarte });
        const tileset = this.carte.addTilesetImage("jeu de tuile test", "img_tuiles");
        // les calques sont créés dans l'ordre d'affichage (du fond vers l'avant)
        this.carte.createLayer("background", tileset, 0, 0);
        this.calquePlateformes = this.carte.createLayer("plateform", tileset, 0, 0);
        this.calqueEchelle = this.carte.createLayer("ladder", tileset, 0, 0);
        this.calqueDeco = this.carte.createLayer("decoration", tileset, 0, 0);
        this.calqueMort = this.carte.createLayer("death layer", tileset, 0, 0);

        // toutes les tuiles du calque plateform sont solides
        this.calquePlateformes.setCollisionByExclusion([-1]);
        // les deux tuiles de pont posées sur le calque decoration sont solides elles aussi
        this.calqueDeco.setCollision([89, 90]);

        // le monde et la caméra ont la taille de la carte
        const largeur = this.carte.widthInPixels;
        const hauteur = this.carte.heightInPixels;
        this.physics.world.setBounds(0, 0, largeur, hauteur);
        this.cameras.main.setBounds(0, 0, largeur, hauteur);
        this.cameras.main.setZoom(2);

        /*************************
         *  GROUPES D'OBJETS     *
         *************************/
        this.groupeBalles = this.physics.add.group();
        this.groupeCailloux = this.physics.add.group();
        this.groupeEnnemis = this.physics.add.group();
        this.groupePortes = this.physics.add.staticGroup();
        this.groupeItems = this.physics.add.staticGroup();
        this.indicesChemin = [];

        // halo de la lanterne : il suit le joueur et éclaire le décor autour de lui
        this.lumiere = this.add.image(0, 0, "img_lumiere").setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(1.5);

        /*************************
         *  CALQUE D'OBJETS      *
         *************************/
        // chaque objet placé dans Tiled est créé selon son nom
        let depart = { x: 50, y: 50 };
        let delaiItem = 1500;
        // (le calque d'objets s'appelle "objets" ; à défaut, on prend le premier calque d'objets de la carte)
        const calqueObjets = this.carte.getObjectLayer("objets") || this.carte.objects[0];
        calqueObjets.objects.forEach(function (objet) {
            if (objet.name == "Spawn") depart = { x: objet.x, y: objet.y };
            if (objet.name == "ennemi 1") this.creerRat(objet.x, this.solSous(objet.x, objet.y));
            if (objet.name == "ennemi 2") this.creerGobelin(objet.x, this.solSous(objet.x, objet.y));
            if (objet.name == "door") this.creerPorte(objet);
            if (objet.name == "Item") {
                this.creerItem(objet.x, this.solSous(objet.x, objet.y) - 14, delaiItem);
                delaiItem += 400;
            }
        }, this);

        // si on arrive par une porte, on démarre devant elle
        if (this.arrivee) {
            this.groupePortes.children.iterate(function (porte) {
                if (porte.nom == this.arrivee) depart = { x: porte.x, y: porte.y + 6 };
            }, this);
        }
        this.depart = depart;

        // repères lumineux du chemin caché (affichés quand on ramasse le cristal),
        // posés sur les tuiles invisibles sur lesquelles on peut marcher
        this.calquePlateformes.forEachTile(function (tuile) {
            const auDessus = this.calquePlateformes.getTileAt(tuile.x, tuile.y - 1);
            if (TUILES_INVISIBLES.includes(tuile.index) && !auDessus) {
                const repere = this.add.rectangle(tuile.getCenterX(), tuile.pixelY + 2, 28, 3, 0x7dffb0).setVisible(false);
                this.indicesChemin.push(repere);
            }
        }, this);

        /*************************
         *  JOUEUR               *
         *************************/
        this.joueur = this.physics.add.sprite(depart.x, depart.y, "img_joueur1");
        // le sprite fait 16x16 pixels : on le double pour l'afficher en 32x32 (sa hitbox suit l'échelle)
        this.joueur.setScale(2);
        this.joueur.body.setSize(10, 14).setOffset(3, 2);
        this.joueur.setCollideWorldBounds(true);
        // attributs ajoutés à la volée sur le joueur
        this.joueur.direction = "right"; // direction de tir par défaut
        this.joueur.peutTirer = true;
        this.joueur.invincible = false;
        this.joueur.bouclier = false;
        this.joueur.grimpe = false;
        this.joueur.mort = false;
        this.joueur.etourdi = false;

        this.cameras.main.startFollow(this.joueur, true, 0.12, 0.12);

        /*************************
         *  CLAVIER              *
         *************************/
        this.touches = this.input.keyboard.addKeys({
            haut: "Z", bas: "S", gauche: "Q", droite: "D",
            tir: "H", saut: "SPACE", action: "E"
        });

        /*************************
         *  COLLISIONS           *
         *************************/
        this.physics.add.collider(this.joueur, this.calquePlateformes);
        this.physics.add.collider(this.joueur, this.calqueDeco);
        this.physics.add.collider(this.groupeEnnemis, this.calquePlateformes);
        // une balle ou un caillou qui touche un mur est détruit
        this.physics.add.collider(this.groupeBalles, this.calquePlateformes, function (balle) { balle.destroy(); });
        this.physics.add.collider(this.groupeCailloux, this.calquePlateformes, function (caillou) { caillou.destroy(); });
        // superpositions : balle/ennemi, joueur/ennemi, joueur/caillou, joueur/item
        this.physics.add.overlap(this.groupeBalles, this.groupeEnnemis, this.hit, null, this);
        this.physics.add.overlap(this.joueur, this.groupeEnnemis, this.toucherEnnemi, null, this);
        this.physics.add.overlap(this.joueur, this.groupeCailloux, this.toucherCaillou, null, this);
        this.physics.add.overlap(this.joueur, this.groupeItems, this.ramasserItem, null, this);

        /*************************
         *  BORDS DU MONDE       *
         *************************/
        // on active l'écouteur sur les collisions du joueur avec les bords du monde
        this.joueur.body.onWorldBounds = true;
        this.physics.world.on(
            "worldbounds", // événement surveillé
            function (body, up, down, left, right) {
                const objet = body.gameObject;
                // une balle ou un caillou qui sort du monde est détruit
                if (this.groupeBalles.contains(objet) || this.groupeCailloux.contains(objet)) {
                    objet.destroy();
                }
                // le joueur qui touche le bas du monde est tombé dans le vide
                if (objet === this.joueur && down == true) {
                    this.tomber();
                }
            },
            this
        );

        /*************************
         *  TIMERS, SON, HUD     *
         *************************/
        // timer récurrent : le chronomètre de la partie avance toutes les secondes
        this.time.addEvent({
            delay: 1000,
            callback: function () { this.registry.inc("temps", 1); },
            callbackScope: this,
            loop: true
        });

        // musique de fond en boucle (lancée une seule fois pour tout le jeu)
        if (!this.sound.get("musique")) {
            this.sound.add("musique", { loop: true, volume: 0.35 }).play();
        }

        // l'affichage (vies, score, temps) est une scène à part, superposée au niveau
        this.registry.set("niveau", this.titre);
        this.registry.set("indice", "");
        this.registry.set("bouclier", 0);
        if (!this.scene.isActive("hud")) this.scene.launch("hud");
        this.cameras.main.fadeIn(300);
    }

    /***********************************************************************/
    /** CRÉATION DES ÉLÉMENTS DU NIVEAU
    /***********************************************************************/

    // renvoie la coordonnée y du dessus de la première plate-forme située sous le point (x, y)
    solSous(x, y) {
        const colonne = this.carte.worldToTileX(x);
        for (let ligne = this.carte.worldToTileY(y - 8); ligne < this.carte.height; ligne++) {
            if (this.calquePlateformes.getTileAt(colonne, ligne)) return ligne * this.carte.tileHeight;
        }
        return y;
    }

    // ennemi 1 : le rat patrouille sur sa plate-forme et charge le joueur quand il est proche
    creerRat(x, sol) {
        const rat = this.groupeEnnemis.create(x, sol - 10, "img_rat", 8);
        rat.body.setSize(26, 12).setOffset(5, 6);
        rat.espece = "rat";
        rat.pointsVie = 2;
        rat.vitesse = 50;
        rat.valeur = 10;
        rat.sens = -1;
        rat.anims.play("anim_rat_course");
        return rat;
    }

    // ennemi 2 : le gobelin marche lentement et lance un caillou toutes les X secondes
    creerGobelin(x, sol) {
        const gobelin = this.groupeEnnemis.create(x, sol - 18, "img_gobelin", 0);
        gobelin.body.setSize(14, 24).setOffset(13, 10);
        gobelin.espece = "gobelin";
        gobelin.pointsVie = 3;
        gobelin.vitesse = 22;
        gobelin.valeur = 20;
        gobelin.sens = -1;
        gobelin.attaque = false;
        gobelin.anims.play("anim_gobelin_marche");
        // timer récurrent : le gobelin tente une attaque à intervalle régulier
        gobelin.timerAttaque = this.time.addEvent({
            delay: DELAI_ATTAQUE_GOBELIN,
            startAt: Phaser.Math.Between(0, 1500), // pour que les gobelins n'attaquent pas tous en même temps
            callback: function () { this.attaqueGobelin(gobelin); },
            callbackScope: this,
            loop: true
        });
        return gobelin;
    }

    // la porte est un sprite statique posé sur le sol, fermée au départ
    creerPorte(objet) {
        const porte = this.groupePortes.create(objet.x, this.solSous(objet.x, objet.y) - 24, "img_porte");
        porte.ouverte = false;
        // chaque niveau indique où mène la porte : { nom, scene, arrivee }
        const destination = this.destinationPorte(objet);
        porte.nom = destination.nom;
        porte.destination = destination;
        return porte;
    }

    // à redéfinir dans chaque niveau
    destinationPorte(objet) {
        return { nom: "sortie", scene: "fin" };
    }

    // l'item n'apparaît qu'après un délai (timer simple)
    creerItem(x, y, delai) {
        const item = this.groupeItems.create(x, y, "img_objets", FRAME_CRISTAL);
        item.body.setSize(14, 14).setOffset(9, 9);
        item.disableBody(true, true);
        this.time.delayedCall(delai, function () { this.apparaitreItem(item); }, null, this);
        return item;
    }

    apparaitreItem(item) {
        item.enableBody(false, item.x, item.y, true, true);
        item.setScale(0);
        this.tweens.add({ targets: item, scale: 1, duration: 300, ease: "Back.easeOut" });
    }

    /***********************************************************************/
    /** BOUCLE DE JEU
    /***********************************************************************/

    update() {
        const joueur = this.joueur;
        this.lumiere.setPosition(joueur.x, joueur.y);
        this.deplacerEnnemis();
        if (joueur.mort) return;

        this.deplacerJoueur();

        // tir : une seule balle par appui sur la touche
        if (Phaser.Input.Keyboard.JustDown(this.touches.tir)) {
            this.tirer(joueur);
        }

        // le joueur marche sur une tuile du calque "death layer" (acide) sans protection
        const tuileMortelle = this.calqueMort.getTileAtWorldXY(joueur.body.center.x, joueur.body.center.y);
        if (tuileMortelle && !joueur.bouclier) {
            this.tomber();
        }

        // interaction avec une porte : il faut être dessus ET appuyer sur la touche d'action
        let indice = "";
        this.groupePortes.children.iterate(function (porte) {
            if (porte.ouverte == false && this.physics.overlap(joueur, porte)) indice = "E : ouvrir la porte";
        }, this);
        this.registry.set("indice", indice);
        if (Phaser.Input.Keyboard.JustDown(this.touches.action) == true) {
            this.groupePortes.children.iterate(function (porte) {
                if (porte.ouverte == false && this.physics.overlap(joueur, porte) == true) {
                    this.ouvrirPorte(porte);
                }
            }, this);
        }

        // temps de bouclier restant, affiché par le HUD
        if (joueur.bouclier) {
            this.registry.set("bouclier", Math.ceil((this.finBouclier - this.time.now) / 1000));
        }
    }

    deplacerJoueur() {
        const joueur = this.joueur;
        const touches = this.touches;
        if (joueur.etourdi) return; // recul après un coup : on ne contrôle plus le personnage un court instant

        // --- échelle : on grimpe si une tuile du calque "ladder" est sous les pieds du joueur ---
        const surEchelle = this.calqueEchelle.getTileAtWorldXY(joueur.x, joueur.body.bottom - 1)
            || this.calqueEchelle.getTileAtWorldXY(joueur.x, joueur.body.bottom + 6);
        if (!surEchelle) {
            joueur.grimpe = false;
        } else if (touches.haut.isDown || touches.bas.isDown) {
            joueur.grimpe = true;
        }
        joueur.body.allowGravity = !joueur.grimpe;
        if (joueur.grimpe) {
            if (touches.haut.isDown) joueur.setVelocityY(-VITESSE_ECHELLE);
            else if (touches.bas.isDown) joueur.setVelocityY(VITESSE_ECHELLE);
            else joueur.setVelocityY(0);
        }

        // --- déplacement horizontal ---
        if (touches.gauche.isDown) {
            joueur.direction = "left"; // enregistrement de la direction pour le tir
            joueur.setVelocityX(-VITESSE_JOUEUR);
            joueur.anims.play("anim_j1_marche", true);
        } else if (touches.droite.isDown) {
            joueur.direction = "right";
            joueur.setVelocityX(VITESSE_JOUEUR);
            joueur.anims.play("anim_j1_marche", true);
        } else {
            joueur.setVelocityX(0);
            joueur.anims.play(joueur.grimpe && joueur.body.velocity.y != 0 ? "anim_j1_marche" : "anim_j1_repos", true);
        }

        // le sprite regarde vers la droite par défaut : on le retourne quand le joueur va à gauche
        joueur.setFlipX(joueur.direction == "left");

        // --- saut : seulement depuis le sol ou depuis l'échelle ---
        if (Phaser.Input.Keyboard.JustDown(touches.saut) && (joueur.body.blocked.down || joueur.grimpe)) {
            joueur.grimpe = false;
            joueur.body.allowGravity = true;
            joueur.setVelocityY(-VITESSE_SAUT);
            this.sound.play("son_saut", { volume: 0.5 });
        }
    }

    deplacerEnnemis() {
        const joueur = this.joueur;
        this.groupeEnnemis.children.iterate(function (ennemi) {
            if (ennemi.mort || ennemi.attaque) return;

            // le rat charge le joueur s'il est proche et à la même hauteur
            let charge = false;
            if (ennemi.espece == "rat" && !joueur.mort) {
                const dx = joueur.x - ennemi.x;
                if (Math.abs(dx) < 110 && Math.abs(dx) > 6 && Math.abs(joueur.y - ennemi.y) < 28) {
                    charge = true;
                    ennemi.sens = dx < 0 ? -1 : 1;
                }
                ennemi.anims.play(charge ? "anim_rat_attaque" : "anim_rat_course", true);
            }

            // demi-tour s'il n'y a plus de sol devant lui ou s'il bute contre un mur
            const devant = ennemi.body.center.x + ennemi.sens * (ennemi.body.halfWidth + 4);
            const sol = this.calquePlateformes.getTileAtWorldXY(devant, ennemi.body.bottom + 4);
            const mur = ennemi.sens < 0 ? ennemi.body.blocked.left : ennemi.body.blocked.right;
            let vitesse = ennemi.vitesse * (charge ? 2.4 : 1);
            if (ennemi.body.blocked.down && (!sol || mur)) {
                if (charge) vitesse = 0; // il s'arrête au bord plutôt que de tomber
                else ennemi.sens *= -1;
            }
            ennemi.setVelocityX(ennemi.sens * vitesse);
            ennemi.setFlipX(ennemi.sens > 0); // les sprites regardent vers la gauche par défaut
        }, this);
    }

    /***********************************************************************/
    /** TIR ET CIBLES
    /***********************************************************************/

    // fonction de tir : prend en paramètre l'auteur du tir
    tirer(tireur) {
        if (tireur.peutTirer == false) return;
        var coefDir;
        if (tireur.direction == "left") { coefDir = -1; } else { coefDir = 1; }
        // on crée la balle juste devant le tireur (assez près pour toucher un ennemi collé à lui)
        var balle = this.groupeBalles.create(tireur.x + 12 * coefDir, tireur.y + 4, "img_balle");
        balle.setScale(2); // même agrandissement que le joueur
        // paramètres physiques de la balle
        balle.setCollideWorldBounds(true);
        balle.body.onWorldBounds = true; // on active la détection de l'événement "collision aux bornes"
        balle.body.allowGravity = false;
        balle.setVelocity(VITESSE_BALLE * coefDir, 0);
        this.sound.play("son_tir", { volume: 0.5 });

        // cooldown : on désactive le tir, un timer le réactive après un délai
        tireur.peutTirer = false;
        this.time.delayedCall(DELAI_TIR, function () { tireur.peutTirer = true; }, null, this);
        // portée limitée : la balle s'éteint au bout d'une seconde
        this.time.delayedCall(1000, function () { balle.destroy(); }, null, this);
    }

    // fonction déclenchée lorsqu'une balle et un ennemi se superposent
    hit(balle, ennemi) {
        balle.destroy();
        if (ennemi.mort) return;
        ennemi.pointsVie--;
        if (ennemi.pointsVie == 0) {
            this.tuerEnnemi(ennemi);
        } else {
            // l'ennemi clignote en blanc pour montrer qu'il est touché
            ennemi.setTintFill(0xffffff);
            this.time.delayedCall(90, function () { ennemi.clearTint(); }, null, this);
            this.sound.play("son_ennemi_touche");
        }
    }

    tuerEnnemi(ennemi) {
        ennemi.mort = true;
        ennemi.body.enable = false;
        ennemi.clearTint();
        if (ennemi.timerAttaque) ennemi.timerAttaque.remove();
        this.registry.inc("score", ennemi.valeur);
        this.sound.play("son_ennemi_mort");
        if (ennemi.espece == "rat") ennemi.anims.play("anim_rat_mort");
        else ennemi.anims.stop();
        this.tweens.add({
            targets: ennemi,
            alpha: 0,
            delay: 400,
            duration: 400,
            onComplete: function () { ennemi.destroy(); }
        });
    }

    // appelée par le timer récurrent du gobelin
    attaqueGobelin(gobelin) {
        const joueur = this.joueur;
        if (!gobelin.active || gobelin.mort || gobelin.attaque || joueur.mort) return;
        const dx = joueur.x - gobelin.x;
        if (Math.abs(dx) > 240 || Math.abs(joueur.y - gobelin.y) > 70) return; // joueur trop loin

        gobelin.attaque = true;
        gobelin.sens = dx < 0 ? -1 : 1;
        gobelin.setFlipX(gobelin.sens > 0);
        gobelin.setVelocityX(0);
        gobelin.anims.play("anim_gobelin_attaque");
        // le caillou part à la fin de l'animation d'attaque
        gobelin.once("animationcomplete-anim_gobelin_attaque", function () {
            if (!gobelin.active || gobelin.mort) return;
            const caillou = this.groupeCailloux.create(gobelin.x + 12 * gobelin.sens, gobelin.y, "img_caillou");
            caillou.setCollideWorldBounds(true);
            caillou.body.onWorldBounds = true;
            caillou.body.allowGravity = false;
            caillou.setVelocity(170 * gobelin.sens, 0);
            caillou.setAngularVelocity(400);
            this.time.delayedCall(1800, function () { caillou.destroy(); }, null, this);
            gobelin.attaque = false;
            gobelin.anims.play("anim_gobelin_marche");
        }, this);
    }

    /***********************************************************************/
    /** DÉGÂTS, CHUTES ET RÉAPPARITION
    /***********************************************************************/

    toucherEnnemi(joueur, ennemi) {
        if (ennemi.mort) return;
        this.blesser(joueur.x < ennemi.x ? -1 : 1);
    }

    toucherCaillou(joueur, caillou) {
        const sens = caillou.body.velocity.x < 0 ? -1 : 1;
        caillou.destroy();
        this.blesser(sens);
    }

    // le joueur perd une vie, recule, puis reste invincible un court instant
    blesser(sensRecul) {
        const joueur = this.joueur;
        if (joueur.invincible || joueur.mort) return;
        this.registry.inc("vies", -1);
        this.sound.play("son_touche");
        this.cameras.main.shake(120, 0.006);
        if (this.registry.get("vies") <= 0) {
            this.finDePartie(false);
            return;
        }
        joueur.grimpe = false;
        joueur.etourdi = true;
        joueur.setVelocity(150 * sensRecul, -180);
        joueur.setTint(0xff5a5a);
        this.time.delayedCall(250, function () { joueur.etourdi = false; }, null, this);
        this.rendreInvincible();
    }

    rendreInvincible() {
        const joueur = this.joueur;
        joueur.invincible = true;
        this.tweens.add({ targets: joueur, alpha: 0.3, duration: 100, yoyo: true, repeat: 6 });
        // timer simple : fin de l'invincibilité
        this.time.delayedCall(DUREE_INVINCIBLE, function () {
            joueur.invincible = false;
            joueur.setAlpha(1);
            this.teinterJoueur();
        }, null, this);
    }

    // couleur du joueur selon son état (vert quand le bouclier est actif)
    teinterJoueur() {
        if (this.joueur.bouclier) this.joueur.setTint(0x7dffb0);
        else this.joueur.clearTint();
    }

    // le joueur est tombé dans l'acide ou dans le vide : il perd une vie et est replacé au départ
    tomber() {
        const joueur = this.joueur;
        if (joueur.mort) return;
        joueur.mort = true;
        this.registry.inc("vies", -1);
        this.sound.play("son_mort");
        if (this.registry.get("vies") <= 0) {
            this.finDePartie(false);
            return;
        }
        joueur.setTint(0xff0000);
        joueur.setVelocity(0, 0);
        joueur.body.enable = false;
        this.cameras.main.flash(250, 120, 255, 160);
        // timer simple : réapparition après un délai
        this.time.delayedCall(900, function () {
            joueur.setPosition(this.depart.x, this.depart.y);
            joueur.body.enable = true;
            joueur.body.reset(this.depart.x, this.depart.y);
            joueur.mort = false;
            joueur.grimpe = false;
            this.teinterJoueur();
            this.rendreInvincible();
        }, null, this);
    }

    finDePartie(victoire) {
        this.physics.pause();
        this.joueur.mort = true;
        this.registry.set("indice", "");
        this.time.delayedCall(victoire ? 0 : 700, function () {
            this.scene.stop("hud");
            this.scene.start("fin", { victoire: victoire });
        }, null, this);
    }

    /***********************************************************************/
    /** ITEMS ET PORTES
    /***********************************************************************/

    ramasserItem(joueur, item) {
        this.sound.play("son_item");
        if (this.typeItem == "bouclier") {
            item.disableBody(true, true);
            this.activerBouclier(item);
        } else {
            item.destroy();
            this.registry.inc("score", 50);
        }
    }

    // le cristal protège de l'acide pendant quelques secondes et révèle le chemin caché
    activerBouclier(item) {
        const joueur = this.joueur;
        joueur.bouclier = true;
        this.finBouclier = this.time.now + DUREE_BOUCLIER;
        this.teinterJoueur();
        this.registry.set("message", "Le cristal te protège de l'acide un court instant\net révèle un chemin caché...");
        this.indicesChemin.forEach(function (repere) { repere.setVisible(true); });
        this.tweens.add({ targets: this.indicesChemin, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

        // timer simple : fin de la protection
        this.time.delayedCall(DUREE_BOUCLIER, function () {
            joueur.bouclier = false;
            this.registry.set("bouclier", 0);
            this.teinterJoueur();
            // le cristal réapparaît un peu plus tard pour pouvoir retenter sa chance
            this.time.delayedCall(2500, function () { this.apparaitreItem(item); }, null, this);
        }, null, this);
    }

    ouvrirPorte(porte) {
        porte.ouverte = true;
        porte.anims.play("anim_ouvreporte");
        this.sound.play("son_porte");
        // on laisse l'animation se jouer avant de changer de scène
        this.time.delayedCall(700, function () {
            this.joueur.mort = true; // on bloque le joueur pendant le fondu
            this.joueur.setVelocity(0, 0);
            this.cameras.main.fadeOut(300);
            this.cameras.main.once("camerafadeoutcomplete", function () {
                if (porte.destination.scene == "fin") {
                    this.finDePartie(true);
                } else {
                    this.scene.start(porte.destination.scene, { arrivee: porte.destination.arrivee });
                }
            }, this);
        }, null, this);
    }
}

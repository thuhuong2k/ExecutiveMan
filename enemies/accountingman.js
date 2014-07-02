function AccountingMan(stage, basicCollision, x, y) {

	var accountingManSpriteSheet = new createjs.SpriteSheet({
		"images": [loader.getResult("accountingman")],
		"frames": {
			"width": 24, "height": 28, "count": 8
		},
		"animations": {
			"stand": {
				"frames" : [0],
				"next" : "stand"
			},
			"run": {
				"frames" : [1, 2, 3, 2],
				"next" : "run",
				"speed" : 0.09
			},
			"jump" : {
				"frames" : [6],
				"next" : "jump"
			},
			"shoot" : {
				"frames" : [4],
				"next" : "stand",
				"speed" : 0.0625
			},
			"runshoot" : {
				"frames" : [5],
				"next" : "run",
				"speed" : 0.0625
			},
			"jumpshoot" : {
				"frames" : [7],
				"next" : "jumpshoot",
				"speed" : 0.0625
			}
		}
	});

	this.basicCollision   = basicCollision;
	this.health           = 28;
	this.lasthealth       = 28;
	this.damage           = 3;
	this.stage            = stage;
	this.animations       = new createjs.Sprite(accountingManSpriteSheet, "stand");
	this.x                = x;
	this.y                = y;
	this.xSpeed           = 0;
	this.activated        = false;
	this.jumping          = false;
	this.runningLeft      = false;
	this.runTicker        = 100;
	this.runningRight     = false;
	this.xspeed           = 0;
	this.yspeed           = 0;
	this.masterShotTicks  = 0;
	this.shootTicks       = 100;
	this.jumpspeed        = 0;
	this.jumpTicks        = 0;
	this.hardshell        = false;
	this.lastRunDirLeft   = false;
	this.lastRunDirRight  = false;
	this.dead             = false;
	this.ignoreDamage     = false;
	this.healthbar        = new BossHealthBar(gamestage, this);
	this.watchedElements  = [];
	this.animations.play();
	this.stage.addChild(this.animations);

	this.tickActions = function(actions) {
		this.watchedElements.forEach(function(element) {
			element.tickActions(actions);
		});

		if (!this.ignoreDamage) {
			this.healthbar.tickActions();
		} else {
			this.health = this.lasthealth;
		}

		if (this.dead) {
			return;
		}

		if (this.health <= 0) {
			var explosions = [];
			for (var i = 0; i < 5; i++) {
				explosions[i] = explosionSprite.clone(true);
				this.stage.addChild(explosions[i]);
				explosions[i].gotoAndPlay("explode");
			}
			explosions[0].x = this.animations.x + this.animations.spriteSheet._frameWidth / 2;
			explosions[0].y = this.animations.y + this.animations.spriteSheet._frameHeight / 2;

			explosions[1].x = this.animations.x;
			explosions[1].y = this.animations.y;

			explosions[2].x = this.animations.x + this.animations.spriteSheet._frameWidth;
			explosions[2].y = this.animations.y;

			explosions[3].x = this.animations.x;
			explosions[3].y = this.animations.y + this.animations.spriteSheet._frameHeight;

			explosions[4].x = this.animations.x + this.animations.spriteSheet._frameWidth;
			explosions[4].y = this.animations.y + this.animations.spriteSheet._frameHeight;
			this.stage.removeChild(this.animations);

			this.health = -1;
			setTimeout(function() {
				for (var i = 0; i < 5; i++) {
					this.stage.removeChild(explosions[i]);
				}
			}.bind(this), 300);
			score += 500000 * scoreModifier;
			player.defeatedBoss();
			this.dead = true;
			return;
		}

		if (this.masterShot) {
			if (this.masterShotTicks === 0) {
				this.launchMasterShot();
				this.masterShot = false;
			} else if (this.masterShotTicks > 0) {
				if (this.masterShotTicks < 40) {
					this.animations.gotoAndPlay("longshoot");
				}
				this.x += this.xspeed;
				this.y += this.yspeed;
			}


			this.animations.x = this.x - mapper.completedMapsWidthOffset;
			this.animations.y = this.y;
			this.masterShotTicks--;
			return;
		}

		// end of jump actions
		if (this.jumpTicks > 0) {
			this.jumpTicks--;
		}

		var collisionResults = this.basicCollision.basicCollision(this);
		if (collisionResults.down && !this.jumping) {
			this.jumpspeed = 0;
			this.jumping = true;
		}

		var distanceFromPlayer = player.x - this.x;
		if (this.jumping && collisionResults.down) {
			this.jumpspeed += 0.25;
			if (this.jumpspeed > 12 / lowFramerate) {
				this.jumpspeed = 12 / lowFramerate;
				if (distanceFromPlayer < 0) {
					this.runningLeft = true;
				} else {
					this.runningRight = true;
				}
			}

			this.y += this.jumpspeed;
		}

		if (this.health !== this.lasthealth && this.health < 20) {
			this.shootTicks = 0;
			this.jumpTicks = 0;
			this.ignoreDamage = true;
			setTimeout(function() {
				this.ignoreDamage = false;
			}.bind(this), 1250);
		}
		this.lasthealth = this.health;

		if (!collisionResults.down && this.jumping) {
			this.jumping = false;
			this.jumpspeed = 0;

			if (this.runningLeft || this.runningRight) {
				this.animations.gotoAndPlay("run");
			} else {
				this.animations.gotoAndPlay("stand");
			}
		}

		if (!collisionResults.down) {
			this.y -= (this.y + this.animations.spriteSheet._frameHeight) % 16;
		}

		if ((this.runningLeft && player.goingRight) || this.runningRight && player.goingLeft) {
			setTimeout(function() {
				if ((this.runningLeft && player.goingRight) || this.runningRight && player.goingLeft) {
					this.masterShot = true;
					this.animations.gotoAndPlay("jump");
					this.xspeed = (mapper.getMapWidth() / 2 - (this.x - mapper.completedMapsWidthOffset)) / 60;
					this.yspeed = -1;
					this.masterShotTicks = 60;
					this.ignoreDamage = true;
					setTimeout(function() {
						this.ignoreDamage = false;
					}.bind(this), 2000);
				}
			}.bind(this), 1000);
		}


		// figure out if we can shoot or not
		if (distanceFromPlayer < 0 && !this.runningLeft && !this.runningRight && this.runTicker < 0) { // player is left!
			//console.log("player is left");
			this.lastRunDirRight = false;                                                                                     // ''
			this.runningLeft = true;
			this.animations.gotoAndPlay("run");
		} else if (this.runningLeft && collisionResults.left) {
			this.x -= (this.health < 14) ? 2.5 : 2.1; // faster than executiveman!
			if (Math.abs(distanceFromPlayer) > 192 && !this.lastRunDirLeft) {
				this.lastRunDirLeft = true;
				this.runningRight = false;
				this.runningLeft = false;
				this.animations.gotoAndPlay("shoot");
				this.createManyShotsDown();
			}
		} else if (this.runningLeft && !collisionResults.left) {
			this.runTicker = 120;
			this.runningLeft = false;
			this.runningRight = false;
			this.scaleX = 1;
			this.animations.regX = 0;
			this.watchedElements.push(new Shot(stage, this.x, this.y, this.animations.scaleX, this, mapper));
			this.animations.gotoAndPlay("shoot");
		} else if (distanceFromPlayer > 0 && !this.runningLeft && !this.runningRight && this.runTicker < 0) { // player is right!
			//console.log("player is right");
			this.runningRight = true;
			this.lastRunDirLeft = false;
			this.animations.gotoAndPlay("run");
		} else if (this.runningRight && collisionResults.right) {
			this.x += (this.health < 14) ? 2.1 : 1.7; // faster than executiveman!
			if (Math.abs(distanceFromPlayer) > 192 && !this.lastRunDirRight) {
				this.lastRunDirRight = true;
				this.runningRight = false;
				this.runningLeft = false;
				this.animations.gotoAndPlay("shoot");
				this.createManyShotsDown();
			}
		} else if (this.runningRight && !collisionResults.right) {
			this.runTicker = 120;
			this.runningRight = false;
			this.runningLeft = false;
			this.scaleX = -1;
			this.watchedElements.push(new Shot(stage, this.x, this.y, this.animations.scaleX, this, mapper));
			this.animations.gotoAndPlay("shoot");
			this.animations.regX = this.animations.spriteSheet._frameWidth;
		}
		this.runTicker--;

		if (this.runTicker > 10 && this.shootTicks === 0 && Math.abs(distanceFromPlayer) > 196) {
			//console.log("creating many shots down");
			this.animations.gotoAndPlay("shoot");
			this.createManyShotsDown();
			this.shootTicks = 200 / lowFramerate;
		}

		if (this.jumpTicks === 0 && (Math.abs(distanceFromPlayer) < 64 || Math.abs(distanceFromPlayer) > 128) && !this.jumping) {
			this.jumpTicks = 40 / lowFramerate;
			this.y -= 2;
			this.jumping = true;
            this.jumpspeed = -4.875 * lowFramerate;
			this.animations.gotoAndPlay("jump");

			//this.watchedElements.push(new Shot(stage, this.x, this.y, this.animations.scaleX, this, mapper));
			//this.xSpeed = distanceFromPlayer / (this.jumpTicks - 60) / lowFramerate;
		}

		if (!this.runningLeft && !this.runningRight) {
			if (distanceFromPlayer > 0) {
				this.animations.scaleX = 1;
				this.animations.regX = 0;
			} else {
				this.animations.scaleX  = -1;
				this.animations.regX = this.animations.spriteSheet._frameWidth;
			}
		}

		if (this.shootTicks > 0) {
			this.shootTicks--;
		}
		if (this.shootTicks === 0 && Math.abs(distanceFromPlayer) < 225 && !this.runningLeft && !this.runningRight) {
			this.watchedElements.push(new Shot(stage, this.x, this.y, this.animations.scaleX, this, mapper));
			this.animations.gotoAndPlay("shoot");
			this.shootTicks = 100 / lowFramerate;
		}

		this.animations.x = this.x - mapper.completedMapsWidthOffset;
		this.animations.y = this.y;
	};

	this.launchMasterShot = function() {
		for (var i = 0; i < 4; i++) {
			this.watchedElements.push(new Shot(this.stage, this.x + this.animations.spriteSheet._frameWidth / 2, (mapper.getMapHeight()/ 4) * i, 1, this));
			this.watchedElements.push(new Shot(this.stage, this.x + this.animations.spriteSheet._frameWidth / 2, (mapper.getMapHeight()/ 4) * i, -1, this));
		}
	};

	var Shot = function(stage, x, y, direction, owner) {
		var shotSpriteSheet = new createjs.SpriteSheet({
			"images": [loader.getResult("wastemanshot")],
			"frames": {
				"width": 10, "height": 10, "count": 2
			},
			"animations": {
				"shot": {
					"frames" : [0, 1],
					"next" : "shot",
					"speed" : 0.25
				}
			}
		});

		this.stage      = stage;
		this.damage     = 6;
		this.direction  = direction;
		this.animations = new createjs.Sprite(shotSpriteSheet, "shot");
		if (!owner.masterShot) {
			this.animations.scaleX = -owner.animations.scaleX;
		} else {
			this.animations.scaleX = -direction;
		}
		this.animations.regX = (this.animations.scaleX === -1) ? this.animations.spriteSheet._frameWidth : 0;
		this.x          = x + ((this.direction === 1) ? 16 : -2);
		this.y          = y + 11;
		this.disabled   = false;
		this.owner      = owner;

		this.animations.play();
		this.stage.addChild(this.animations);
		this.x = this.x + (3 * this.direction) * lowFramerate;
		this.animations.x = this.x - mapper.completedMapsWidthOffset;
		this.animations.y = this.y;

		this.tickActions = function() {
			this.x = this.x + (1.5 * this.direction) * lowFramerate;
			this.animations.x = this.x - mapper.completedMapsWidthOffset;
			this.animations.y = this.y;

			if (!this.checkBounds()) {
				this.removeSelf();
			}
		};

		this.removeSelf = function() {
			this.stage.removeChild(this.animations);
			this.disabled = true;
		};

		this.checkBounds = function() {
			return !(this.x < 0 || this.x > player.x + 1000);
		};
	};

	this.createManyShotsDown = function() {
		for (var i = 0; i < 8; i++) {
			this.watchedElements.push(new ShotDown(stage, (mapper.getMapWidth() / 8) * i + mapper.widthOffset));
		}
	};

	var ShotDown = function(stage, x) {
		var shotDownSpriteSheet = new createjs.SpriteSheet({
			"images": [loader.getResult("wastemanshotdown")],
			"frames": {
				"width": 10, "height": 10, "count": 2
			},
			"animations": {
				"shot": {
					"frames" : [0, 1],
					"next" : "shot",
					"speed" : 0.25
				}
			}
		});

		this.stage      = stage;
		this.damage     = 5;
		this.animations = new createjs.Sprite(shotDownSpriteSheet, "shot");
		this.x          = x;
		this.y          = -50;
		this.disabled   = false;

		this.animations.play();
		this.stage.addChild(this.animations);
		this.animations.x = this.x - mapper.completedMapsWidthOffset;
		this.animations.y = this.y;

		this.tickActions = function() {
			this.y += 5;
			this.animations.x = this.x - mapper.completedMapsWidthOffset;
			this.animations.y = this.y;

			if (!this.checkBounds()) {
				this.removeSelf();
			}
		};

		this.removeSelf = function() {
			this.stage.removeChild(this.animations);
			this.disabled = true;
		};

		this.checkBounds = function() {
			return (this.y < player.y + 1000);
		};
	};
}

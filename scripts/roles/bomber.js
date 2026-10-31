"use strict";

import { world, system, Player, Dimension, Entity, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { DeathHandler } from "../death_handler";

export class BomberRole extends MurdererRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(BomberRole.spawnBombParticles, 20);
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            if (allPlayers.length == 0) {
                return;
            }
            let allBombs = allPlayers[0].dimension.getEntities({ type: "umm:grounded_bomb" });
            allBombs.forEach((bomb) => {
                bomb.clearVelocity();
            });
        }, 1);
        super.initialize();
    }

    static clearBombs() {
        let allBombs = world.getAllPlayers()[0].dimension.getEntities({ type: "umm:grounded_bomb" });
        allBombs.forEach((b) => b.remove());
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bomber.initial_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.MURDERER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§cBomber";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Place bombs to massively damage players and take advantage of the confusion!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can place a grounded bomb or a bomb on a player. Grounded bombs explode after a time, and player bombs are attached to players. They have different radii, explosion times, damage, and potentially knockback.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.bomber.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.BOMBER;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this role can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns whether this role counts towards win condition tracking.
     * @returns {boolean}
     */
    countsInTracking(player) {
        return true;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * 
     * @param {Player} player 
     */
    activateAbility(player) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                // player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            let bombTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_explosion_time");
            let bomb = BomberRole.summonBomb(player.dimension, player.location);
            let tickingAreaName = "grounded_bomb_ticking_area_" + bomb.id;
            let bombRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_radius");
            system.run(() => {
                world.tickingAreaManager.createTickingArea(tickingAreaName, {dimension: player.dimension, from: PlayerHandler.addVectors(bomb.location, {x:-bombRadius,y:-bombRadius,z:-bombRadius}), to: PlayerHandler.addVectors(bomb.location, {x:bombRadius,y:bombRadius,z:bombRadius})});
            });
            let takeReducedDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.takes_reduced_damage") != 0;
            system.runTimeout(() => {
                // player.sendMessage("Bomb exploded");
                if (bomb != null && bomb.isValid) {
                    let bombDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_damage");
                    let bombKnockback = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_knockback");
                    let players = world.getAllPlayers();
                    players.forEach((pl) => {
                        let bombDistance = PlayerHandler.distanceBetweenLocations(bomb.location, pl.location);
                        
                        let raycastDirection = PlayerHandler.directionTo(bomb.location, pl.location);
                        let raycast = bomb.dimension.getBlockFromRay(bomb.location, raycastDirection, {maxDistance: bombDistance, includePassableBlocks: false, includeLiquidBlocks: false});
                        // pl.sendMessage("Found block " + (raycast.block != null ? raycast.block.typeId : "none"));
                        // pl.sendMessage("Bomb location: " + PlayerHandler.vecToString(bomb.location));
                        // pl.sendMessage("Player location: " + PlayerHandler.vecToString(pl.location));
                        let inRangeFlag = PlayerHandler.distanceBetweenLocations(bomb.location, pl.location) <= bombRadius;
                        let blockedFlag = raycast != null && raycast.block != null;
                        // pl.sendMessage("Blocked flag: " + blockedFlag);
                        if (bomb.dimension.id == pl.dimension.id && inRangeFlag && !blockedFlag){
                            // hits player
                            let knockbackDirection = PlayerHandler._normalize(PlayerHandler.subtractVectors(pl.location, bomb.location));
                            // pl.sendMessage(PlayerHandler.vecToString(PlayerHandler.subtractVectors(pl.location, bomb.location)));
                            // pl.sendMessage(PlayerHandler.vecToString(knockbackDirection));
                            let distanceToBombCenterScale = (bombRadius - bombDistance) / bombRadius;
                            let knockbackFalloff = .1 + (bombKnockback - .3) * Math.max(.5, distanceToBombCenterScale);
                            let knockback = PlayerHandler.scaleVector(knockbackDirection, knockbackFalloff);
                            
                            let playerRole = RoleManager.getPlayerRole(pl);
                            if (takeReducedDamage && playerRole != null && playerRole.getRoleType() == RoleTypes.BOMBER) {
                                bombDamage /= 4;
                            }
                            
                            pl.applyDamage(bombDamage);
                            pl.applyKnockback({x: knockback.x, z: knockback.z}, .4);
                        }
                    });
                    BomberRole.spawnExplosionParticles(bomb, 3);
                    bomb.remove();
                    world.tickingAreaManager.removeTickingArea(tickingAreaName);
                }
            }, bombTime * 20);
            // player.dimension.spawnEntity()
            
            
            // ability activate message
            SoundManager.playSoundEffect([player], SoundEffectType.BOMBER_PLACE_BOMB);
            player.sendMessage("§cPlaced a bomb!");
            ChatManager.sendDeadPlayersMessage("§c§o" + player.name + " placed a bomb at " + PlayerHandler.vecToString(bomb.location, 0), LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");
        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player" && !DeathHandler.consideredDead(otherEntity)) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.BOMBER_PLACE_BOMB;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                SoundManager.playSoundEffect([player], SoundEffectType.INTERACT_BLOCKED);
                player.sendMessage("§c§oYou were unable to place a bomb on " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§c§o" + player.name + " tried to place a bomb on " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                // player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            let bombTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_explosion_time");
            let takeReducedDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.takes_reduced_damage") != 0;
            BomberRole.addBombToPlayer(otherEntity);
            system.runTimeout(() => {
                // player.sendMessage("Bomb exploded");
                if (BomberRole.playerHasBomb(otherEntity)) {
                    let bombRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_radius");
                    let bombDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_damage");
                    let bombKnockback = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_knockback");
                    let players = world.getAllPlayers();
                    let bombLocation = otherEntity.location;
                    players.forEach((pl) => {
                        let bombDistance = PlayerHandler.distanceBetweenLocations(bombLocation, pl.location);
                        
                        let raycastDirection = PlayerHandler.directionTo(bombLocation, pl.location);
                        let raycast = otherEntity.dimension.getBlockFromRay(bombLocation, raycastDirection, {maxDistance: bombDistance, includePassableBlocks: false, includeLiquidBlocks: false});
                        // pl.sendMessage("Found block " + (raycast.block != null ? raycast.block.typeId : "none"));
                        // pl.sendMessage("Bomb location: " + PlayerHandler.vecToString(bomb.location));
                        // pl.sendMessage("Player location: " + PlayerHandler.vecToString(pl.location));
                        let inRangeFlag = PlayerHandler.distanceBetweenLocations(bombLocation, pl.location) <= bombRadius;
                        let blockedFlag = raycast != null && raycast.block != null;
                        // pl.sendMessage("Blocked flag: " + blockedFlag);
                        if (otherEntity.dimension.id == pl.dimension.id) {
                            let distanceToBomb = PlayerHandler.distanceBetweenLocations(player.location, pl.location);

                            let maxFalloffDistance = 75;
                            let volumeFalloff = Util.lerp(0, 2, 1 - ((distanceToBomb - bombRadius) / maxFalloffDistance));
                            pl.playSound("random.explode", {volume: Math.max(volumeFalloff, 0), location: bombLocation});

                            pl.spawnParticle("minecraft:huge_explosion_emitter", otherEntity.location);
                            if (inRangeFlag && !blockedFlag){
                                // hits player
                                let knockbackDirection = PlayerHandler._normalize(PlayerHandler.subtractVectors(pl.location, bombLocation));
                                let distanceToBombCenterScale = (bombRadius - bombDistance) / bombRadius;
                                let knockbackFalloff = .1 + (bombKnockback - .3) * Math.max(.5, distanceToBombCenterScale);
                                let knockback = PlayerHandler.scaleVector(knockbackDirection, knockbackFalloff);

                                let playerRole = RoleManager.getPlayerRole(pl);
                                if (takeReducedDamage && playerRole != null && playerRole.getRoleType() == RoleTypes.BOMBER) {
                                    bombDamage /= 4;
                                }
                                
                                pl.applyDamage(bombDamage);
                                pl.applyKnockback({x: knockback.x, z: knockback.z}, .4);
                            }
                        }
                        
                    });
                    // BomberRole.spawnExplosionParticles(bomb, 3);
                    BomberRole.removeBombFromPlayer(otherEntity);
                    // bomb.remove();
                }
            }, bombTime * 20);
            // player.dimension.spawnEntity()
            
            
            // ability activate message
            player.sendMessage("§cPlaced a bomb on that player!");
            SoundManager.playSoundEffect([player], SoundEffectType.BOMBER_PLACE_BOMB);
            ChatManager.sendDeadPlayersMessage("§c§o" + player.name + " placed a bomb on " + otherEntity.name, LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.BOMBER_PLACE_BOMB);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    /**
     * Spawns explosion particles at the given bomb.
     * @param {Entity} bomb 
     * @param {number} times the number of times to spawn the explosion
     */
    static spawnExplosionParticles(bomb, times) {
        let bombRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_radius");
        let separation = 10;
        bombRadius -= bombRadius % separation;
        // for (let x = )
        let center = bomb.location;
        let molang = new MolangVariableMap();
        // molang.setFloat('variable.size', 4);
        let spawnLocations = [];

        for (let x = -bombRadius; x <= bombRadius; x += separation) {
            for (let y = -bombRadius; y <= bombRadius; y += separation) {
                for (let z = -bombRadius; z <= bombRadius; z += separation) {
                    spawnLocations.push(PlayerHandler.addVectors(bomb.location, {x:x,y:y,z:z}));
                }   
            }   
        }

        world.getAllPlayers().forEach((pl) => {
            // pl.sendMessage("Found face " + (raycast.face != null ? raycast.face : "none"));
            if (pl.dimension.id != bomb.dimension.id) {
                // pl.sendMessage("Not in the same dimension as the bomb");
                return;
            }
            
            let distanceToBomb = PlayerHandler.distanceBetweenLocations(bomb.location, pl.location);
            let maxFalloffDistance = 75;
            let volumeFalloff = Util.lerp(.1, 2, 1 - ((distanceToBomb - bombRadius) / maxFalloffDistance));
            pl.playSound("random.explode", {volume: Math.min(volumeFalloff, 0), location: bomb.location});
            // pl.sendMessage("Has locations: " + spawnLocations.length);
            for (let i = 0; i < spawnLocations.length; i++) {
                // pl.sendMessage("eoiah");
                let location = spawnLocations[i];
                // pl.sendMessage("Spawning particle at location " + PlayerHandler.vecToString(location));
                for (let t = 0; t < times; t++) {
                    pl.spawnParticle("minecraft:huge_explosion_emitter", location);
                }
            }
        });
    }

    static spawnBombParticles() {
        if (world.getAllPlayers().length <= 0) {
            return;
        }
        let allBombs = world.getAllPlayers()[0].dimension.getEntities({ type: "umm:grounded_bomb" });
        let murderers = PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), [RoleAlignment.MURDERER]);
        let bombRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_radius");
        
        // murderers = murderers.concat(PlayerHandler.sortPlayersByTag(world.getAllPlayers(), "dead"));


        let particleSettings = new MolangVariableMap();
        particleSettings.setColorRGBA('variable.color', {red:1,blue:0,green:0,alpha:1});
        particleSettings.setFloat('variable.dust_lifetime', 1);
        
        let canSeeGroundedBombs = PlayerHandler.getPlayersThatSee(world.getAllPlayers(), ParticleVisibilityType.BOMBER_GROUNDED_BOMB_RADIUS);
        canSeeGroundedBombs = canSeeGroundedBombs.concat(murderers);
        // grounded bomb particles
        allBombs.forEach((bomb) => {
            // spawn bomb particles
            let particleLocations = [];
            for (let i = -bombRadius; i < bombRadius; i++) {
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:i,y:-bombRadius,z:bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:i,y:bombRadius,z:bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:i,y:-bombRadius,z:-bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:i,y:bombRadius,z:-bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:bombRadius,y:i,z:bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:-bombRadius,y:i,z:bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:bombRadius,y:i,z:-bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:-bombRadius,y:i,z:-bombRadius}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:bombRadius,y:bombRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:bombRadius,y:-bombRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:-bombRadius,y:bombRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(bomb.location, {x:-bombRadius,y:-bombRadius,z:i}));
            }
            if (particleLocations.length > 0) {
                try {
                    canSeeGroundedBombs.forEach((player) => {
                        particleLocations.forEach((loc) => player.spawnParticle("umm:line_draw", loc, particleSettings));
                    });
                }
                catch (e) {
                }
            }
        });

        let canSeePlayerBombs = PlayerHandler.getPlayersThatSee(world.getAllPlayers(), ParticleVisibilityType.BOMBER_PLAYER_BOMB_PARTICLE);
        canSeePlayerBombs = canSeePlayerBombs.concat(murderers);
        particleSettings.setColorRGBA('variable.color', {red:1,blue:0,green:0,alpha:1});
        let playersWithBomb = world.getAllPlayers().filter((pl) => BomberRole.playerHasBomb(pl));
        playersWithBomb.forEach((pl) => {
            canSeePlayerBombs.forEach((player) => {
                player.spawnParticle("umm:line_draw", PlayerHandler.addVectors(pl.location, {x:0,y:1,z:0}), particleSettings)
            });
        });
    }

    /**
     * Summons a bomb at the given location
     * @param {Dimension} dimension 
     * @param {Vector3} location 
     * @returns {Entity} the bomb that was spawned.
     */
    static summonBomb(dimension, location) {
        return dimension.spawnEntity("umm:grounded_bomb", location);
    }

    /**
     * 
     * @param {Player} player 
     */
    static addBombToPlayer(player) {
        if (!player.hasTag("isBomb")) {
            player.addTag("isBomb");
        }
    }

    static removeBombFromPlayer(player) {
        if (BomberRole.playerHasBomb(player)) {
            player.removeTag("isBomb");
        }
    }

    /**
     * 
     * @param {Player} player 
     * @returns 
     */
    static playerHasBomb(player) {
        return player.hasTag("isBomb");
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Bomber Settings");

        form.divider();
        form.label("The bomber is a murderer that is able to place down large explosives to take care of crowds, although they are not immune to their bombs.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.bomber.enabled") != 0;
        form.toggle("Bomber Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.initial_cooldown");
        form.slider("Initial Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of placing a bomb at the start.");
        
        let bombCooldown = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_cooldown"); // 6
        form.slider("Bomb Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: bombCooldown })
        form.label("The ability cooldown after placing any bomb.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_uses");
        form.slider("Bomb Ability Uses", -1, 10, { defaultValue: abilityUses }); // 8
        form.label("The number of times bombs can be used. -1 is infinite uses");

        let takeReducedDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.takes_reduced_damage") != 0;
        form.toggle("Bomber Takes Reduced Damage", { defaultValue: takeReducedDamage }); // 10
        form.label("If true, the bomber will take 1/4 of the damage from bombs.");

        let hitThroughBlocks = ScoreboardManager.getTrackedObjective("role_settings.bomber.bombs_hit_through_blocks") != 0;
        form.toggle("Bombs Hit Through Walls", { defaultValue: hitThroughBlocks }); // 10
        form.label("Whether bombs can hit through walls. If false, require line of sight to hit a player.");
        
        // GROUND BOMB
        form.divider();
        form.label("Ground Bomb Settings\nWhen the bomber places a bomb, it will get placed onto the ground and a radius will be drawn to other murderers. This bomb should be powerful, helping significantly to take care of crowds.");
        
        let groundRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_radius");
        form.slider("Grounded Bomb Radius", 1, 10, { defaultValue: groundRadius }); // 14
        form.label("The Block Radius of the grounded bomb");

        let groundExplosionTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_explosion_time");
        form.slider("Grounded Bomb Explosion Time", 1, 10, { defaultValue: groundExplosionTime }); // 16
        form.label("The number of seconds before a grounded bomb explodes");
        
        let groundDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_damage");
        form.slider("Grounded Bomb Damage", 1, 20, { defaultValue: groundDamage }); // 18
        form.label("The flat amount of damage the grounded bomb will deal to players");
        
        let groundKnockback = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_knockback");
        form.slider("Grounded Bomb Knockback", 1, 5, { defaultValue: groundKnockback }); // 20
        form.label("A multiplier for the grounded bomb's knockback. 1 = 1x");
        
        // PLAYER BOMB
        form.divider();
        form.label("Player Bomb Settings\nThe Player bomb can be placed onto a player by right clicking them. This bomb will be attached to the player, and should deal less damage than the ground bomb.");
        
        let playerRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_radius");
        form.slider("Player Bomb Radius", 1, 10, { defaultValue: playerRadius }); // 24
        form.label("The Block Radius of the player bomb");
        
        let playerExplosionTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_explosion_time");
        form.slider("Player Bomb Explosion Time", 1, 20, { defaultValue: playerExplosionTime }); // 26
        form.label("The number of seconds before a player bomb explodes");
        
        let playerDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_damage");
        form.slider("Player Bomb Damage", 1, 20, { defaultValue: playerDamage }); // 28
        form.label("The flat amount of damage the player bomb will deal to players");

        let playerKnockback = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_knockback");
        form.slider("Player Bomb Knockback", 1, 10, { defaultValue: playerKnockback }); // 30
        form.label("A multiplier for the player bomb's knockback. 1 = 1x");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.bomber.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.bomber.initial_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.bomb_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.bomb_uses", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.takes_reduced_damage", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.bombs_hit_through_blocks", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.ground_bomb_radius", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.ground_bomb_explosion_time", r.formValues[18]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.ground_bomb_damage", r.formValues[20]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.ground_bomb_knockback", r.formValues[22]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.player_bomb_radius", r.formValues[26]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.player_bomb_explosion_time", r.formValues[28]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.player_bomb_damage", r.formValues[30]);
            ScoreboardManager.setTrackedObjective("role_settings.bomber.player_bomb_knockback", r.formValues[32]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.initial_cooldown");
        let bombCooldown = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_cooldown"); // 6
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.bomber.bomb_uses");
        let takeReducedDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.takes_reduced_damage") != 0;
        let hitThroughBlocks = ScoreboardManager.getTrackedObjective("role_settings.bomber.bombs_hit_through_blocks") != 0;
        let groundRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_radius");
        let groundExplosionTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_explosion_time");
        let groundDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_damage");
        let groundKnockback = ScoreboardManager.getTrackedObjective("role_settings.bomber.ground_bomb_knockback");
        let playerRadius = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_radius");
        let playerExplosionTime = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_explosion_time");
        let playerDamage = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_damage");
        let playerKnockback = ScoreboardManager.getTrackedObjective("role_settings.bomber.player_bomb_knockback");

        let description = "The Bomber is a murderer role that is able to place bombs on the ground and on players. Grounded bombs are typically bigger and deal more damage, while player bombs are attached to players and are smaller.";
        description += "\n\nInitial Cooldown: " + cooldownTime + " seconds";
        description += "\nPost-Bomb Cooldown: " + bombCooldown + " seconds";
        description += "\nBomb Uses: " + abilityUses;
        description += "\nTakes Reduced Damage (.25x): " + takeReducedDamage;
        description += "\nBombs Hit Through Blocks: " + hitThroughBlocks;
        description += "\nGround Bomb Radius: " + groundRadius;
        description += "\nGround Bomb Explosion Time: " + groundExplosionTime;
        description += "\nGround Bomb Damage: " + groundDamage;
        description += "\nGround Bomb Knockback: " + groundKnockback;
        description += "\nPlayer Bomb Radius: " + playerRadius;
        description += "\nPlayer Bomb Explosion Time: " + playerExplosionTime;
        description += "\nPlayer Bomb Damage: " + playerDamage;
        description += "\nPlayer Bomb Knockback: " + playerKnockback;
        return description;
    }
}
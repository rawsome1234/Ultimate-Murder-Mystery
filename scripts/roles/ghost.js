"use strict";

import { world, system, Player, EquipmentSlot, ItemStack, ItemLockMode } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { LogManager } from "../log_manager";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class GhostRole extends Role {

    static GHOST_RESPAWNED_PROPERTY = "onSecondLife";
    static SHOW_PLAYER_SCOREBOARD = "role_settings.ghost.first_death_invis_time";
    static HAUNT_EFFECT_SCOREBOARD = "role_settings.ghost.haunt_effect_time";
    static GHOST_TIMER_SCOREBOARD = "role_settings.ghost.timer_max_time";
    static ECTO_BLOCK_PROPERTY = "stickyBlocks";

    static GHOST_HAUNTED_COUNT = "timesHaunted";
    static GHOST_HAUNT_TARGETS = "hauntTargets";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        // if (!DeathHandler.onDeathSignal.isConnected(GhostRole.onPlayerDeath)) {
        //     DeathHandler.onDeathSignal.subscribe(GhostRole.onPlayerDeath)
        // }
        // second life, 1 damage, losing invis
        world.beforeEvents.entityHurt.subscribe(async (event) => {
            let damagingPlayer = event.damageSource.damagingEntity;
            if (damagingPlayer == null) {
                return;
            }
            else {
                let damagingRole = RoleManager.getPlayerRole(damagingPlayer);
                if (damagingRole != null && damagingRole.getRoleType() == RoleTypes.GHOST && damagingPlayer.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY)) {
                    event.damage = 1;
                    // return;
                }
            }


            let player = event.hurtEntity;
            let playerRole = RoleManager.getPlayerRole(player);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.GHOST && !DeathHandler.consideredDead(player)) {
                // is ghost
                let secondLife = player.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY)

                // respawn player
                if (!secondLife) { 
                    let healthComp = player.getComponent("minecraft:health");
                    if (healthComp.currentValue < 1) {
                        // player.sendMessage("Health: " + healthComp.currentValue + "; damage: " + event.damage);
                        event.cancel = true;
                        let invisTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.first_death_invis_time");
                        let initialTimerLength = ScoreboardManager.getTrackedObjective("role_settings.ghost.timer_initial_length");
                        system.run(() => {
                            ScoreboardManager.setScoreboardObjective(player, GhostRole.GHOST_TIMER_SCOREBOARD, initialTimerLength * 6 * 20);
                            player.setDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY, true);
                            healthComp.resetToMaxValue();
                            player.triggerEvent("umm:set_half_health");
                            player.applyDamage(1);
                            player.sendMessage("§w§oYou're on your second life! Run away and haunt players to survive!");
                            player.addEffect("minecraft:invisibility", (invisTime * 20) + 1, {showParticles: false});
                            player.triggerEvent("umm:set_half_health");
                        });
                    }
                }
                // block invis
                else {
                    system.run(() => {
                        ScoreboardManager.setScoreboardObjective(player, GhostRole.SHOW_PLAYER_SCOREBOARD, 60);
                        let invisEffect = player.getEffect("minecraft:invisibility");
                        if (invisEffect != null && invisEffect.duration <= 25) {
                            player.removeEffect(invisEffect.typeId);
                        }
                    });
                }
            }
        });
        // ecto block visuals, invisibility
        system.runInterval(() => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            let allPlayers = world.getAllPlayers();
            let ghostPlayers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.GHOST);
            ghostPlayers.forEach((ghost) => {
                let secondLife = ghost.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY);
                
                let invisEffect = ghost.getEffect("minecraft:invisibility");
                // ghost.sendMessage("Effect duration: " + invisEffect?.duration);
                if (secondLife) {
                    if ((invisEffect == null || invisEffect.duration < 20) && ScoreboardManager.getScoreboardObjective(ghost, GhostRole.SHOW_PLAYER_SCOREBOARD) <= 0) {
                        ghost.addEffect("minecraft:invisibility", 25);
                    }
                    let ghostTag = GhostRole._readEctoTag(ghost);
                    if (ghostTag.length > 0) {
                        ghostTag.forEach((block) => {
                            let location = PlayerHandler.addVectors(block, {x:0.5,y:0.0,z:0.5});
                            allPlayers.forEach((show) => {
                                show.spawnParticle("umm:ecto_block", location);
                            });
                        });
                    }
                    
                    let timerTime = ScoreboardManager.getScoreboardObjective(ghost, GhostRole.GHOST_TIMER_SCOREBOARD);
                    if (timerTime == 0) {
                        // draw lines
                        GhostRole.drawLinesToPlayer(ghost);
                    }
                }
            });
        }, 20);
        // ghost running out of time, haunt timer, interacting with ecto blocks
        system.runInterval(() => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            let allPlayers = world.getAllPlayers();
            let ghostPlayers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.GHOST);
            ghostPlayers.forEach((ghost) => {
                let secondLife = ghost.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY);
                
                if (!secondLife) {
                    return;
                }
                
                if (ScoreboardManager.getScoreboardObjective(ghost, GhostRole.SHOW_PLAYER_SCOREBOARD) >= 1) {
                    ScoreboardManager.addScoreboardObjective(ghost, GhostRole.SHOW_PLAYER_SCOREBOARD, -1);
                }
                
                let timerTime = ScoreboardManager.getScoreboardObjective(ghost, GhostRole.GHOST_TIMER_SCOREBOARD);
                
                if (timerTime > 0) {
                    ScoreboardManager.addScoreboardObjective(ghost, GhostRole.GHOST_TIMER_SCOREBOARD, -1);
                }
                if (timerTime == 1) {
                    let message = "§w§l§oA ghost has run out of time!";
                    world.sendMessage(message);
                    LogManager.addToLog(message, LogItemType.ABILITY_MESSAGE);
                }
                if (timerTime == 30 * 20) {
                    ghost.sendMessage("§w§oYou have 30 seconds to haunt before your location is revealed.");
                }
                if (timerTime == 60 * 20) {
                    ghost.sendMessage("§w§oYou have 60 seconds to haunt before your location is revealed.");
                }

                let ectoBlocks = GhostRole._readEctoTag(ghost);
                let stickyPlayers = PlayerHandler.sortPlayersWithoutRole(world.getAllPlayers(), [RoleTypes.GHOST]);
                for (let blockID = 0; blockID < ectoBlocks.length; blockID++) {
                    let block = ectoBlocks[blockID];
                    for (let playerIndex = 0; playerIndex < stickyPlayers.length; playerIndex++) {
                        let pl = stickyPlayers[playerIndex];
                        if (PlayerHandler.distanceBetweenLocations(block, pl.getHeadLocation()) < 1 || PlayerHandler.distanceBetweenLocations(block, pl.location) < 1) {
                            GhostRole.removeBlockFromEcto(ghost, blockID);
                            world.sendMessage("Removing block at " + PlayerHandler.vecToString(block));
                            GhostRole.slowPlayerFromEcto(pl);
                            ectoBlocks.splice(blockID, 1);
                            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Now " + ectoBlocks.length + " blocks"))
                            blockID--;
                            break;
                        }
                    }
                }
            });
            
            allPlayers.forEach((pl) => {
                let currentHauntTime = ScoreboardManager.getScoreboardObjective(pl, GhostRole.HAUNT_EFFECT_SCOREBOARD);
                if (currentHauntTime > 0) {
                    ScoreboardManager.addScoreboardObjective(pl, GhostRole.HAUNT_EFFECT_SCOREBOARD, -1);
                    if (DeathHandler.consideredDead(pl)) {
                        ScoreboardManager.setScoreboardObjective(pl, GhostRole.HAUNT_EFFECT_SCOREBOARD, 0);
                        currentHauntTime = 1;
                    }
                }

                if (currentHauntTime == 1) {
                    system.run(() => {
                        pl.sendMessage("§w§oThe curse has been lifted..");
                        GhostRole.updatePlayerHealth(pl);
                        // pl.triggerEvent("umm:set_ghost_health");
                        pl.getComponent("minecraft:equippable").getEquipmentSlot(EquipmentSlot.Head).setItem(null);
                    });
                }
            });
        }, 1);
        DeathHandler.onDeathSignal.subscribe((playerWhoDied, killer) => {
            playerWhoDied.getComponent("minecraft:equippable").getEquipmentSlot(EquipmentSlot.Head).setItem(null);
            playerWhoDied.triggerEvent("umm:set_full_health");
            // playerWhoDied.setDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT, 0);
            let playerRole = RoleManager.getPlayerRole(playerWhoDied);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.GHOST) {
                let playerIDs = JSON.parse(playerWhoDied.getDynamicProperty(GhostRole.GHOST_HAUNT_TARGETS));
                playerIDs.forEach((id) => {
                    let player = ScoreboardManager.getPlayerWithID(id);
                    if (player != null && !DeathHandler.consideredDead(player)) {
                        player.setDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT, player.getDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT)-1);
                        GhostRole.updatePlayerHealth(player);
                        SoundManager.playSoundEffect([player], SoundEffectType.GHOST_FREE_FROM_HAUNT);
                    } 
                });
            }
        });
        WinConditionManager.onGameEnd.subscribe(() => {
            world.getAllPlayers().forEach((pl) => {
                if (ScoreboardManager.getScoreboardObjective(pl, GhostRole.GHOST_TIMER_SCOREBOARD) > 0) {
                    pl.getComponent("minecraft:equippable").getEquipmentSlot(EquipmentSlot.Head).setItem(null);
                    pl.triggerEvent("umm:set_full_health");
                }
            });
        });
        super.initialize();
    }

    /**
     * 
     * @param {Player} player 
     */
    static updatePlayerHealth(player) {
        let hauntCount = player.getDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT);
        let playerRole = RoleManager.getPlayerRole(player);
        let isGhost = playerRole != null && playerRole.getRoleType() == RoleTypes.GHOST;
        let isDead = DeathHandler.consideredDead(player);
        if (isGhost) {
            player.triggerEvent("umm:set_half_health");
        }
        else if (hauntCount > 0) {
            player.triggerEvent("umm:set_ghost_health");
        }
        else {
            player.triggerEvent("umm:set_full_health");
        }
    }

    /**
     * 
     * @param {Player} ghost 
     */
    static drawLinesToPlayer(ghost) {
        let center = ghost.location;
        let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let deadPlayers = world.getAllPlayers().filter((pl) => DeathHandler.consideredDead(pl));
        let lineColor = {red:1,blue:1,green:1,alpha:1};
        livingPlayers.forEach((pl) => {
            if (pl.id != ghost.id) {
                let showPlayers = deadPlayers.concat([pl]);
                // pl.sendMessage("Drawing line to ghost");
                showPlayers.forEach((show) => {
                    PlayerHandler.spawnParticlesBetweenPoints(show, pl.location, center, lineColor, 20, true, true);
                });
            }
        });
    }

    /**
     * 
     * @param {Player} ghost
     * @param {number} time 
     */
    static boostGhostTimer(ghost, time) {
        let currentTime = ScoreboardManager.getScoreboardObjective(ghost, GhostRole.GHOST_TIMER_SCOREBOARD);
        let maxTimerLength = ScoreboardManager.getTrackedObjective("role_settings.ghost.timer_max_time");
        let newTime = Math.min(currentTime + (time * 20), maxTimerLength * 6 * 20);
        ScoreboardManager.setScoreboardObjective(ghost, GhostRole.GHOST_TIMER_SCOREBOARD, newTime);
    }

    // static onPlayerDeath(playerWhoDied, killer) {
    //     let playerWhoDiedRole = RoleManager.getPlayerRole(playerWhoDied);
    //     if (playerWhoDiedRole != null && playerWhoDiedRole.getRoleType() == RoleTypes.GHOST) {
    //         DeathHandler.onDeathSignal.cancel = true;
    //         DeathHandler.incrementBlockDeadCount(playerWhoDied);
    //     }
    // }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.ghost.ecto_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost.action_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY, false);
        player.setDynamicProperty(GhostRole.ECTO_BLOCK_PROPERTY, "[]");
        player.setDynamicProperty(GhostRole.GHOST_HAUNT_TARGETS, "[]");
        world.getAllPlayers().forEach((pl) => {
            pl.setDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT, 0);
        });
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.NEUTRAL_INDEPENDENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§wGhost";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Die and survive on a second life!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your initial goal is to die to a player. Once you've died once, you'll become a ghost, invisible and roaming. While a ghost, you'll have to haunt (interact) with players to prevent your location being revealed. You can use your ability to burst with ectoplasm, which will slow near players, or crouch and use your ability to get player locations.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.ghost.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return true;
    }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        return [];
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
        return RoleTypes.GHOST;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        let hasRespawned = guessedPlayer.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY);
        if (hasRespawned) {
            guesser.sendMessage("§wA respawned Ghost cannot be guessed!");
            return true;
        }
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
     * 
     * @param {Player} player 
     */
    static slowPlayerFromEcto(player) {
        if (RoleManager.getPlayerRole(player).getRoleType() == RoleTypes.GHOST) {
            return false;
        }
        player.addEffect("minecraft:slowness", 60, {amplifier: 2, showParticles: false});
        player.addEffect("minecraft:oozing", 60, {amplifier: 0, showParticles: true});
        return true;
    }

    /**
     * 
     * @param {Player} ghost 
     * @param {number} blockIndex 
     */
    static removeBlockFromEcto(ghost, blockIndex) {
        let tag = GhostRole._readEctoTag(ghost);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Tag is now " + tag.length + " blocks long"));
        tag.splice(blockIndex, 1);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Tag is now " + tag.length + " blocks long"));
        ghost.setDynamicProperty(GhostRole.ECTO_BLOCK_PROPERTY, JSON.stringify(tag));
    }

    /**
     * 
     * @param {Player} ghost 
     * @returns {Vector3[]}
     */
    static _readEctoTag(ghost) {
        return JSON.parse(ghost.getDynamicProperty(GhostRole.ECTO_BLOCK_PROPERTY));
    }

    /**
     * 
     * @param {Player} ghost 
     * @param {Player} player 
     */
    static addPlayerToHauntTag(ghost, player) {
        let hauntTag = JSON.parse(ghost.getDynamicProperty(GhostRole.GHOST_HAUNT_TARGETS));
        hauntTag.push(ScoreboardManager.getPlayerID(player));
        ghost.setDynamicProperty(GhostRole.GHOST_HAUNT_TARGETS, JSON.stringify(hauntTag));
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player 
     */
    activateAbility(player) {
        let secondLife = player.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY);
        if (!secondLife) {
            player.sendMessage("§w§oYou cannot use abilities until your second life!");
            ScoreboardManager.setPlayerActionCooldown(player, 3, false);
            return;
        }

        let canRevealLocations = ScoreboardManager.getTrackedObjective("role_settings.ghost.can_reveal_player_locations") != 0;
        if (player.isSneaking && canRevealLocations) {
            // detect players ability (free)
            let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
            let lineColor = {red:1,blue:1,green:1,alpha:1};
            livingPlayers.forEach((pl) => {
                if (pl.id != player.id) {
                    PlayerHandler.spawnParticlesBetweenPoints(player, pl.location, player.location, lineColor, 3);
                }
            });
            player.sendMessage("§w§oDetected players...");
            ChatManager.sendDeadPlayersMessage("§w§o" + player.name + " detected player locations.", LogItemType.ABILITY_MESSAGE);

            let revealCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost.reveal_locations_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, revealCooldown);
        }
        else {
            // ectoplasm burst
            let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");
    
            if (chargesRemaining == 0) {
                player.sendMessage("Out of ability uses!");
                return;
            }
    
            if (chargesRemaining != 0) {
                // activate ability 
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }
    
                // ability effect
                let allPlayers = world.getAllPlayers();
                let hitPlayers = [];
                allPlayers.forEach((pl) => {
                    pl.spawnParticle("umm:ecto_blast", player.location);
                    let ectoplasmRadius = ScoreboardManager.getTrackedObjective("role_settings.ghost.ectoplasm_radius");
                    
                    if (pl.id != player.id && !DeathHandler.consideredDead(pl) && ectoplasmRadius >= PlayerHandler.distanceBetweenLocations(pl.location, player.location) && PlayerHandler.hasLineOfSight(player, pl.getHeadLocation())) {
                        GhostRole.slowPlayerFromEcto(pl);
                        pl.sendMessage("§w§oYou were slowed down!");
                        hitPlayers.push(pl);
                    }
                });

                let blocksRetainEcto = ScoreboardManager.getTrackedObjective("role_settings.ghost.blocks_retain_ecto") != 0;
                if (blocksRetainEcto) {
                    let retainChance = ScoreboardManager.getTrackedObjective("role_settings.ghost.block_retain_chance");        
                    let ectoedBlocks = GhostRole._readEctoTag(player);
                    let playerLocation = player.location;
                    for (let x = -1; x < 2; x++) {
                        for (let y = -1; y < 3; y++) {
                            for (let z = -1; z < 2; z++) {
                                if (!(x == 0 && z == 0 && y <= 1)) {
                                    let blockLocation = PlayerHandler.addVectors(playerLocation, {x:x,y:y,z:z});
                                    if (!player.dimension.getBlock(blockLocation).isSolid && retainChance < ScoreboardManager.rollRandomNumber(0, 100)) {
                                        ectoedBlocks.push(blockLocation);
                                        // player.sendMessage("Adding block " + PlayerHandler.vecToString(blockLocation));
                                    }
                                }
                            }
                        }
                    }
                    player.setDynamicProperty(GhostRole.ECTO_BLOCK_PROPERTY, JSON.stringify(ectoedBlocks));
                }

                // ability activate message
                player.sendMessage("§wSlowed " + hitPlayers.length + " players!");
                let playerNamesMessage = hitPlayers.length > 0 ? Util.formatStringList(hitPlayers.map((pl) => pl.name), ", ", true) : "no one";
                ChatManager.sendDeadPlayersMessage("§w§o" + player.name + " used an ectoplasm burst and hit " + playerNamesMessage + ".", LogItemType.ABILITY_MESSAGE);
    
                // sets cooldown
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost.action_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            }
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Player} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let secondLife = player.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY);
        if (!secondLife) {
            player.sendMessage("§w§oYou cannot use abilities until your second life!");
            ScoreboardManager.setPlayerActionCooldown(player, 3, false);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
            return;
        }
        
        if (otherEntity.typeId == "minecraft:player") {
            if (!PlayerHandler.isPlaying(otherEntity) || DeathHandler.consideredDead(otherEntity)) {
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                player.sendMessage("That player is not a valid target.");
                return;
            }

            // activate ability 

            // ability effect
            let interactEffectTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_effect_time");
            otherEntity.triggerEvent("umm:set_half_health");        
            otherEntity.addEffect("minecraft:slowness", interactEffectTime * 20, {showParticles: true});
            let hauntGivesPumpkin = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_gives_pumpkin") != 0;
            if (hauntGivesPumpkin) {
                let pumpkin = new ItemStack("minecraft:carved_pumpkin", 1);
                pumpkin.lockMode = ItemLockMode.slot;
                otherEntity.getComponent("minecraft:equippable").getEquipmentSlot(EquipmentSlot.Head).setItem(pumpkin);
            }
            ScoreboardManager.setScoreboardObjective(otherEntity, GhostRole.HAUNT_EFFECT_SCOREBOARD, interactEffectTime * 20);

            let interactTimerBoost = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_timer_boost");
            GhostRole.boostGhostTimer(player, interactTimerBoost);
            player.sendMessage("§w§oYou have an additional " + interactTimerBoost + " seconds of invisibility.");
            let invisTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.first_death_invis_time");
            player.addEffect("minecraft:invisibility", (invisTime * 20) + 1, {showParticles: false});

            // ability activate message
            player.sendMessage("§wHaunted " + otherEntity.name);
            GhostRole.addPlayerToHauntTag(player, otherEntity);
            SoundManager.playSoundEffect([player, otherEntity], SoundEffectType.GHOST_HAUNT);
            player.setDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT, player.getDynamicProperty(GhostRole.GHOST_HAUNTED_COUNT+1));
            otherEntity.sendMessage("§w§oYou've been haunted! The effects will wear off in " + interactEffectTime + " seconds...");
            ChatManager.sendDeadPlayersMessage("§w§o" + player.name + " haunted " + otherEntity.name + "...", LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost.action_cooldown");
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return player.getDynamicProperty(GhostRole.GHOST_RESPAWNED_PROPERTY) && !player.hasTag("dead");
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Ghost Settings");

        form.divider();
        form.label("The Ghost is a neutral independent role that must win on their second life. After getting dealt lethal damage by another player, the ghost is fully healed and given invisibility. During the second life, they have invisibility and must interact with players to not have their location revealed. Haunting players gives them half health and a pumpkin on their head. They may also explode with ectoplasm to slow nearby players.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.ghost.enabled") != 0;
        form.toggle("Ghost Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.action_cooldown");
        form.slider("Ability Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of haunting (interacting) and ectoplasm bursts. Also initial cooldown.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.ghost.ecto_uses");
        form.slider("Ectoplasm Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times ectoplasm bursts can be used. -1 is infinite uses. Haunting and player location revealing are both free.");
        
        let invisTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.first_death_invis_time");
        form.slider("First Death Invis Time", 5, 30, { valueStep: 5, defaultValue: invisTime })
        form.label("The amount of time in seconds the complete invisibility from dying the first time lasts.");
        
        let initialTimerLength = ScoreboardManager.getTrackedObjective("role_settings.ghost.timer_initial_length");
        form.slider("Initial Timer Length", 5, 100, { valueStep: 5, defaultValue: initialTimerLength })
        form.label("The initial time the reveal location timer has upon entering second life, in minutes * 10. 45 -> 4.5 minutes");
        
        let maxTimerLength = ScoreboardManager.getTrackedObjective("role_settings.ghost.timer_max_time");
        form.slider("Max Timer Time", 10, 100, { valueStep: 5, defaultValue: maxTimerLength })
        form.label("The maximum amount of time the timer may reach, in minutes * 10. 45 -> 4.5 minutes");
        
        let interactTimerBoost = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_timer_boost");
        form.slider("Haunt Time Boost", 60, 120, { valueStep: 5, defaultValue: interactTimerBoost })
        form.label("The amount of extra time haunting someone gives. Recommended to be at least twice the cooldown of haunt.");
        
        let interactEffectTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_effect_time");
        form.slider("Haunt Effect Duration", 5, 60, { valueStep: 5, defaultValue: interactEffectTime })
        form.label("The amount of time the effects of Haunt last. The effects give the target weakness, a pumpkin, and half health.");
        
        let hauntGivesPumpkin = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_gives_pumpkin") != 0;
        form.toggle("Haunt Gives Pumpkin", { defaultValue: hauntGivesPumpkin })
        form.label("If true, haunt places a pumpkin onto the target's head. If false, gives them darkness instead.");
        
        let ectoplasmRadius = ScoreboardManager.getTrackedObjective("role_settings.ghost.ectoplasm_radius");
        form.slider("Ectoplasm Radius", 1, 10, { defaultValue: ectoplasmRadius })
        form.label("The radius in blocks of ectoplasm. Does not go through walls.");
        
        let ectoSlownessTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.ecto_slowness_time");
        form.slider("Ectoplasm Slowness Duration", 1, 15, { defaultValue: ectoSlownessTime })
        form.label("The duration the slowness from ectoplasm gives.");
        
        let blocksRetainEcto = ScoreboardManager.getTrackedObjective("role_settings.ghost.blocks_retain_ecto") != 0;
        form.toggle("Blocks Hold Ectoplasm", { defaultValue: blocksRetainEcto })
        form.label("If true, the air blocks around the ghost can hold ectoplasm. Running into these blocks will cause players to get slowed.");
        
        let retainChance = ScoreboardManager.getTrackedObjective("role_settings.ghost.block_retain_chance");
        form.slider("Block Retain Chance", 0, 100, { valueStep: 5, defaultValue: retainChance })
        form.label("The chance (as a percent) that a block directly adjacent to the ghost holds ectoplasm.");
        
        let canRevealLocations = ScoreboardManager.getTrackedObjective("role_settings.ghost.can_reveal_player_locations") != 0;
        form.toggle("Can Reveal Player Locations", { defaultValue: canRevealLocations })
        form.label("If true, the ghost can crouch + ability to reveal player locations. Has infinite uses.");
        
        let revealCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost.reveal_locations_cooldown");
        form.slider("Reveal Locations Cooldown ", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: revealCooldown })
        form.label("The ability cooldown of revealing locations.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.ghost.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.ghost.action_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.ecto_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.first_death_invis_time", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.timer_initial_length", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.timer_max_time", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.haunt_timer_boost", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.haunt_effect_time", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.haunt_gives_pumpkin", r.formValues[18] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.ectoplasm_radius", r.formValues[20]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.ecto_slowness_time", r.formValues[22]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.blocks_retain_ecto", r.formValues[24] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.block_retain_chance", r.formValues[26]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.can_reveal_player_locations", r.formValues[28] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.ghost.reveal_locations_cooldown", r.formValues[30]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.action_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.ghost.ecto_uses");
        let invisTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.first_death_invis_time");
        let initialTimerLength = ScoreboardManager.getTrackedObjective("role_settings.ghost.timer_initial_length");
        let maxTimerLength = ScoreboardManager.getTrackedObjective("role_settings.ghost.timer_max_time");
        let interactTimerBoost = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_timer_boost");
        let interactEffectTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_effect_time");
        let hauntGivesPumpkin = ScoreboardManager.getTrackedObjective("role_settings.ghost.haunt_gives_pumpkin") != 0;
        let ectoplasmRadius = ScoreboardManager.getTrackedObjective("role_settings.ghost.ectoplasm_radius");
        let ectoSlownessTime = ScoreboardManager.getTrackedObjective("role_settings.ghost.ecto_slowness_time");
        let blocksRetainEcto = ScoreboardManager.getTrackedObjective("role_settings.ghost.blocks_retain_ecto") != 0;
        let retainChance = ScoreboardManager.getTrackedObjective("role_settings.ghost.block_retain_chance");
        let canRevealLocations = ScoreboardManager.getTrackedObjective("role_settings.ghost.can_reveal_player_locations") != 0;
        let revealCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost.reveal_locations_cooldown");

        let description = "Ghost is a neutral independent role that needs to be alive on their second life to win. After dying to a player, they will be on their second life. Dying to other causes does not count. The Ghost must haunt players to stay hidden, and may use their ability to slow players or get player locations.";
        description += "\n\nHaunt/Ectoplasm Cooldown: " + cooldownTime + " seconds.";
        description += "\nEctoplasm Uses: " + abilityUses;
        description += "\nFull Invis Duration: " + invisTime + " seconds.";
        description += "\nStarting Timer Length: " + initialTimerLength + " minutes";
        description += "\nMax Timer Length: " + maxTimerLength + " minutes";
        description += "\nHaunt Timer Boost: " + interactTimerBoost + " seconds";
        description += "\nHaunt Duration: " + interactEffectTime + " seconds";
        description += "\nHaunt Gives Pumpkin: " + hauntGivesPumpkin;
        description += "\nEctoplasm Burst Radius: " + ectoplasmRadius;
        description += "\nEctoplasm Slowness Time: " + ectoSlownessTime + " seconds";
        description += "\nBlocks Retain Ecto: " + blocksRetainEcto;
        description += "\nRetain Ecto Chance: " + retainChance;
        description += "\nReveal Locations Ability Enabled: " + canRevealLocations;
        description += "\nReveal Locations Cooldown: " + revealCooldown;
        return description;
    }
}
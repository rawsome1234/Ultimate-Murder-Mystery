"use strict";

import { world, system, Player, ItemStack, ItemLockMode, MolangVariableMap, PlayerJoinAfterEvent, PlayerSpawnAfterEvent, Entity } from "@minecraft/server";
import { GameStates, ScoreboardManager } from "./scoreboard_manager";
import { RoleAlignment, RoleTypes } from "./role";
import { RoleManager } from "./role_manager";
import { AfterPlayerInteractSignal } from "./signals/after_player_interact_signal";
import { BeforePlayerInteractSignal } from "./signals/before_player_interact_signal";
import { OnActionUseSignal } from "./signals/on_action_use";
import { ModifierTypes } from "./modifier";
import { ModifierManager } from "./modifier_manager";
import { DeathHandler } from "./death_handler";
import { ChatManager } from "./chat_manager";
import { LogItemType } from "./logs/game_log";
import { SoundManager } from "./sound_manager";
import { RoleAssignment } from "./role_assignment";

export class PlayerHandler {
    /**
     * @type {OnActionUseSignal}
     */
    static onActionUse = new OnActionUseSignal();
    /**
     * @type {BeforePlayerInteractSignal}
     */
    static beforePlayerInteract = new BeforePlayerInteractSignal();
    /**
     * @type {AfterPlayerInteractSignal}
     */
    static afterPlayerInteract = new AfterPlayerInteractSignal();

    static UMM_DEOP_PROPERTY = "UMM_DEOPPED";
    static UMM_WORLD_OWNER_PROPERTY = "WORLD_OWNER";
    static INTERACTED_THIS_FRAME_PROPERTY = "interactedThisFrame";

    static BLOCK_ALL_INTERACTIONS_TAG = "blockInteractions";
    static BLOCK_ALL_INTERACTION_SCOREBOARD = "player.block_interaction_timer";
    static SUPER_ARMOR_USES_SCOREBOARD = "player.super_armor_uses";
    static DEAL_DOUBLE_DAMAGE_USES_SCOREBOARD = "player.deal_double_damage_uses";
    static RECEIVE_DOUBLE_DAMAGE_SCOREBOARD = "player.receive_double_damage_timer";

    static PLAYERS_PLAYING_DATA = [];
    static PLAYERS_PLAYING = [];

    static initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        if (!PlayerHandler.beforePlayerInteract.isConnected(PlayerHandler.beforeInteract)) {
            PlayerHandler.beforePlayerInteract.subscribe(PlayerHandler.beforeInteract);
        }
        world.beforeEvents.entityHurt.subscribe(async (event) => {
            let damagedPlayer = event.hurtEntity;
            let attackingEntity = event.damageSource.damagingEntity;
            if (event.damage > 2) {
                if (ScoreboardManager.getScoreboardObjective(damagedPlayer, PlayerHandler.SUPER_ARMOR_USES_SCOREBOARD) > 0) {
                    event.damage = 1;
                    damagedPlayer.sendMessage("§e§oBlocked an incoming hit with super armor!");
                    system.run(() => {
                        ScoreboardManager.addScoreboardObjective(damagedPlayer, PlayerHandler.SUPER_ARMOR_USES_SCOREBOARD, -1);
                    });
                    return;
                }
                if (attackingEntity != null && ScoreboardManager.getScoreboardObjective(attackingEntity, PlayerHandler.DEAL_DOUBLE_DAMAGE_USES_SCOREBOARD) > 0) {
                    attackingEntity.sendMessage("§c§oDealing double damage!");
                    event.damage *= 2;
                    system.run(() => {
                        ScoreboardManager.addScoreboardObjective(attackingEntity, PlayerHandler.DEAL_DOUBLE_DAMAGE_USES_SCOREBOARD, -1);
                    });
                }
                if (ScoreboardManager.getScoreboardObjective(damagedPlayer, PlayerHandler.RECEIVE_DOUBLE_DAMAGE_SCOREBOARD) > 0) {
                    damagedPlayer.sendMessage("§c§oReceived double damage!");
                    event.damage *= 2;
                }
            }
        });
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            allPlayers.forEach((pl) => {
                if (DeathHandler.consideredDead(pl)) {
                    return;
                }
                let currentBlockTime = ScoreboardManager.getScoreboardObjective(pl, PlayerHandler.BLOCK_ALL_INTERACTION_SCOREBOARD);
                let receiveDoubleDamageTime = ScoreboardManager.getScoreboardObjective(pl, PlayerHandler.RECEIVE_DOUBLE_DAMAGE_SCOREBOARD);
                if (currentBlockTime > 0) {
                    ScoreboardManager.addScoreboardObjective(pl, PlayerHandler.BLOCK_ALL_INTERACTION_SCOREBOARD, -1);
                }
                if (currentBlockTime == 1) {
                    // pl.sendMessage("§aYou can be interacted with again.");
                    ChatManager.sendDeadPlayersMessage("§a" + pl.name + " can be interacted with again.", LogItemType.ABILITY_MESSAGE);
                }

                if (receiveDoubleDamageTime > 0) {
                    ScoreboardManager.addScoreboardObjective(pl, PlayerHandler.RECEIVE_DOUBLE_DAMAGE_SCOREBOARD, -1);
                }
                if (receiveDoubleDamageTime == 1) {
                    pl.sendMessage("§aYou no longer take double damage.");
                    ChatManager.sendDeadPlayersMessage("§a" + pl.name + " receives a normal amount of damage again.", LogItemType.ABILITY_MESSAGE);
                }
            });
        }, 1);
        world.afterEvents.playerSpawn.subscribe(async (event) => {
            if (event.initialSpawn) {
                PlayerHandler.initializeJoiningPlayer(event.player);
            }
        });
        RoleAssignment.afterRolesAssigned.subscribe(() => {
            system.runTimeout(() => {
                let nonPlayingPlayers = world.getAllPlayers().filter((pl) => !PlayerHandler.isPlaying(pl));
                let rolesMessage = DeathHandler.createPlayerRoleMessage();
                nonPlayingPlayers.forEach((pl) => pl.sendMessage(rolesMessage));
            }, 5);
        });
        
        
        let stand = SoundManager.getSoundSaveStand();
        if (stand != null) {
            let dataToLoad = stand.getDynamicProperty("playingPlayerData");
            if (dataToLoad) {
                PlayerHandler.PLAYERS_PLAYING_DATA = JSON.parse(dataToLoad);
                world.getAllPlayers().forEach((pl) => {
                    PlayerHandler.initializeJoiningPlayer(pl);
                })
            }
            else {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Ending game"));
                ScoreboardManager.setGameState(GameStates.BEFORE_START);
            }
            
        }
    }

    static beforeInteract(playerWhoInteracts, playerWhoIsBeingInteracted) {
        let currentBlockTime = ScoreboardManager.getScoreboardObjective(playerWhoIsBeingInteracted, PlayerHandler.BLOCK_ALL_INTERACTION_SCOREBOARD);
        if (currentBlockTime > 0) {
            PlayerHandler.beforePlayerInteract.cancel = true;
            return true;
        }
        return false;
    }

    /**
     * Blocks interactions going towards a player for the time specified.
     * @param {Player} player 
     * @param {number} time 
     */
    static startBlockInteractTime(player, time) {
        let currentBlockTime = ScoreboardManager.getScoreboardObjective(player, PlayerHandler.BLOCK_ALL_INTERACTION_SCOREBOARD);
        let newBlockTime = time * 20;
        if (currentBlockTime < newBlockTime) {
            ScoreboardManager.setScoreboardObjective(player, PlayerHandler.BLOCK_ALL_INTERACTION_SCOREBOARD, newBlockTime);
        }
    }

    static _newGame() {
        PlayerHandler.PLAYERS_PLAYING_DATA = [];
    }

    /**
     * 
     * @param {Player} player 
     */
    static addNewPlayerToGame(player) {
        PlayerHandler.PLAYERS_PLAYING_DATA.push({uuid: player.id, player: player});
        PlayerHandler.PLAYERS_PLAYING = PlayerHandler.PLAYERS_PLAYING_DATA.map((data) => data.player).filter((pl) => pl != null);
    }

    static _savePlayersToStand() {
        let playerSaveData = PlayerHandler.PLAYERS_PLAYING_DATA;
        let dataToSave = JSON.stringify(playerSaveData);
        let stand = SoundManager.getSoundSaveStand();
        if (stand != null) {
            stand.setDynamicProperty("playingPlayerData", dataToSave);
        }
    }

    /**
     * 
     * @param {Player} player 
     */
    static initializeJoiningPlayer(player) {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("initializing player spawn " + player.name));
        let playerID = ScoreboardManager.getPlayerID(player);
        if (playerID != -1 && PlayerHandler.PLAYERS_PLAYING_DATA.length > playerID) {
            let slot = PlayerHandler.PLAYERS_PLAYING_DATA[playerID];
            // in game
            if (slot.uuid == player.id) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Found player for data " + player.name));
                slot.player = player;
                PlayerHandler.PLAYERS_PLAYING = PlayerHandler.PLAYERS_PLAYING_DATA.map((data) => data.player).filter((pl) => pl != null);
            }
            // not in game
            else {
                ScoreboardManager.setScoreboardObjective(player, "player.player_id", -1);
            }
        }
    }

    static setPlayerAsWorldOwner(sourcePlayer) {
        sourcePlayer.setDynamicProperty(PlayerHandler.UMM_WORLD_OWNER_PROPERTY, true);
        sourcePlayer.setDynamicProperty(PlayerHandler.UMM_DEOP_PROPERTY, false);
    }

    static getWorldOwner() {
        return world.getAllPlayers().filter((pl) => pl.getDynamicProperty(PlayerHandler.UMM_WORLD_OWNER_PROPERTY))[0];
    }

    /**
     * 
     * @param {Player} joiningPlayer 
     */
    static validateWorldOwner(joiningPlayer) {
        if (world.getAllPlayers().length > 1 && joiningPlayer.getDynamicProperty(PlayerHandler.UMM_WORLD_OWNER_PROPERTY)) {
            joiningPlayer.setDynamicProperty(PlayerHandler.UMM_WORLD_OWNER_PROPERTY, false);
        }
        if (joiningPlayer.getDynamicProperty(PlayerHandler.UMM_DEOP_PROPERTY) == null) {
            joiningPlayer.setDynamicProperty(PlayerHandler.UMM_DEOP_PROPERTY, false);
        }
    }

    /**
     * Ops a player if 
     * @param {Player} sourcePlayer 
     * @param {Player} toOp 
     */
    static opUMMPlayer(sourcePlayer, toOp) {
        if (!PlayerHandler.hasUMMOp(sourcePlayer)) {
            sourcePlayer.sendMessage("You do not have permission to OP!");
            return;
        }
        if (PlayerHandler.hasUMMOp(toOp)) {
            sourcePlayer.sendMessage(toOp.name + " already has operator permissions.");
            return;
        }

        toOp.setDynamicProperty(PlayerHandler.UMM_DEOP_PROPERTY, false);
        sourcePlayer.sendMessage("Op-ed " + toOp.name);
        toOp.sendMessage("You've been op-ed");
    }   

    /**
     * Deops a player if 
     * @param {Player} sourcePlayer 
     * @param {Player} deop 
     */
    static deopUMMPlayer(sourcePlayer, deop) {
        if (!PlayerHandler.hasUMMOp(sourcePlayer)) {
            sourcePlayer.sendMessage("You do not have permission to de-OP!");
            return;
        }
        if (!PlayerHandler.hasUMMOp(deop)) {
            sourcePlayer.sendMessage(deop.name + " doesn't have operator permissions.");
            return;
        }

        if (deop.getDynamicProperty(PlayerHandler.UMM_WORLD_OWNER_PROPERTY)) {
            sourcePlayer.sendMessage("Can't deop the world owner.");
            return;
        }

        deop.setDynamicProperty(PlayerHandler.UMM_DEOP_PROPERTY, true);
        sourcePlayer.sendMessage("De-oped " + deop.name);
    }   

    /**
     * Returns if the player has UMM Op
     * @param {Player} player 
     * @returns {boolean}
     */
    static hasUMMOp(player) {
        return !player.getDynamicProperty(PlayerHandler.UMM_DEOP_PROPERTY);
    }

    /**
     * Sorts a list of players if they have the given role.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {RoleTypes} roleID the roleTypes to search for.
     * @returns {Player[]}
     */
    static sortPlayersWithRole(players, roleID) {
        let validPlayers = [];
        players.forEach((p) => {
            if ((p.hasTag("dead") || p.hasTag("AFK") || !PlayerHandler.isPlaying(p)) && ScoreboardManager.isGameRunning()) {
                return;
            }

            let playerRole = RoleManager.getPlayerRole(p);
            if (playerRole != null && playerRole.getRoleType().id == roleID.id) {
                validPlayers.push(p);
            }
        });
        return validPlayers;
    }

    /**
     * Sorts a list of players if they have the given modifier.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {ModifierTypes} modifierID the modifierTypes to search for.
     * @returns {Player[]}
     */
    static sortPlayersWithModifier(players, modifierID) {
        let validPlayers = [];
        players.forEach((p) => {
            if (p.hasTag("dead") || p.hasTag("AFK")|| !PlayerHandler.isPlaying(p)) {
                return;
            }

            let playerMod = ModifierManager.getPlayerModifier(p);
            if (playerMod != null && playerMod.getModifierType().id == modifierID.id) {
                validPlayers.push(p);
            }
        });
        return validPlayers;
    }

    /**
     * Sorts a list of players if they don't have the given role.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {RoleTypes[]} roleIDs the roleTypes to skip.
     * @returns {Player[]}
     */
    static sortPlayersWithoutRole(players, roleIDs) {
        let validPlayers = [];
        players.forEach((p) => {
            if (p.hasTag("dead") || p.hasTag("AFK")|| !PlayerHandler.isPlaying(p)) {
                return;
            }

            let playerRole = RoleManager.getPlayerRole(p);
            if (playerRole != null && !roleIDs.includes(playerRole.getRoleType())) {
                validPlayers.push(p);
            }
        });
        return validPlayers;
    }

    /**
     * Sorts a list of players based if they have roles of the given alignment.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {RoleAlignment[]} alignments the list of RoleAlignments to sort by.
     * @returns {Player[]}
     */
    static sortPlayersWithAlignment(players, alignments) {
        let validPlayers = [];
        players.forEach((p) => {
            if (p.hasTag("dead") || p.hasTag("AFK")|| !PlayerHandler.isPlaying(p)) {
                return;
            }

            let playerRole = RoleManager.getPlayerRole(p);
            if (playerRole != null && alignments.includes(playerRole.getAlignment())) {
                validPlayers.push(p);
            }
        });
        return validPlayers;
    }
    
    static isPlaying(player) {
        return ScoreboardManager.getPlayerID(player) >= 0;
    }

    /**
     * Returns all players who are still alive
     * @param {Player[]} players 
     * @returns {Player[]}
     */
    static getLivingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (ScoreboardManager.getScoreboardObjective(player, "player.player_id") >= 0 && !player.hasTag("dead")) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Returns the players who are playing this round.
     * 
     * @param {Player[]} players the list of players to sort.
     * 
     * @returns {Player[]}
     */
    static getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (ScoreboardManager.getScoreboardObjective(player, "player.player_id") >= 0) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Sorts the given list of players by the given tag.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {String} tag the tag that players.
     * 
     * @returns {Player[]}
     */
    static sortPlayersByTag(players, tag) {
        let livePlayers = [];
        players.forEach((player) => {
            if (player.hasTag(tag)) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Gives a player the role guess item
     * @param {Player} player
     */
    static giveRoleGuessItem(player) {
        if (this._findItemInInventory(player, "umm:guessing_action") >= 0) {
            return;
        }

        let inv = player.getComponent("minecraft:inventory").container;
        let roleGuessItem = new ItemStack("umm:guessing_action", 1);
        roleGuessItem.lockMode = ItemLockMode.inventory;
        inv.addItem(roleGuessItem);
    }

    /**
     * Edits the name of the player's sword to have extra text in it
     * @param {Player} player
     * @param {string} tag spaces are not added.
     */
    static giveSwordExtraText(player, tag) {
        let inv = player.getComponent("minecraft:inventory").container;
        let index = player.selectedSlotIndex
        let swordItem = inv.getItem(index);
        if (swordItem == null || swordItem.typeId != "minecraft:iron_sword") {
            index = this._findItemInInventory(player, "minecraft:iron_sword");
            if (index == -1) {
                return;
            }

            swordItem = inv.getItem(index);
        }

        swordItem.nameTag = "§rIron Sword" + tag;
        system.run(() => {
            inv.setItem(index, swordItem);
        });

    }

    /**
     * Finds the first index of the role guess item in the player's inventory, or -1 if not found.
     * @param {Player} player
     * @param {string} itemID
     */
    static _findItemInInventory(player, itemID) {
        let inv = player.getComponent("minecraft:inventory").container;
        for (let i = 0; i < inv.size; i++) {
            let item = inv.getItem(i);
            if (item != null && item.typeId == itemID) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Gives a player an ability item
     * @param {Player} player
     */
    static giveRoleActionItem(player) {
        if (this._findItemInInventory(player, "umm:role_action") >= 0) {
            return;
        }

        let inv = player.getComponent("minecraft:inventory").container;

        let roleGuessItem = new ItemStack("umm:role_action", 1);
        roleGuessItem.lockMode = ItemLockMode.inventory;
        inv.addItem(roleGuessItem);
    }

    /**
     * Creates a line of particles between two points for a player.
     * 
     * @param {Player} player the player to send the particles to.
     * @param {Vector3} startLoc the start location to spawn particles
     * @param {Vector3} endLoc the end location to spawn particles
     * @param {RGBA} particleColor the color of the particles to spawn.
     * @param {number?} lifetime the amount of time in seconds the particles last
     * @param {boolean?} includeOffsets by default, the start and end locations are offset by 1 vertically. Setting this to false will disable this
     * @param {boolean?} halfAlphaIfClose if true, will half the alpha if the start and end location are within 8 blocks
     */
    static spawnParticlesBetweenPoints(player, startLoc, endLoc, particleColor, lifetime, includeOffsets, halfAlphaIfClose) {
        if (includeOffsets == null || includeOffsets) {
            startLoc = PlayerHandler.addVectors(startLoc,{x:0,y:1,z:0});
            endLoc = PlayerHandler.addVectors(endLoc,{x:0,y:1,z:0});
        }
        if (halfAlphaIfClose != null && halfAlphaIfClose) {
            particleColor.alpha = particleColor.alpha / 2;
        }
        // player.sendMessage("Spawning particles. Goal is " + this.vecToString(endLoc));
        let locationsToSpawnParticles = [];
        let particleDistance = .5;
        let directionToGoal = this.directionTo(startLoc, endLoc);
        let distanceToGoal = this.distanceBetweenLocations(startLoc, endLoc);
        let particleCount = Math.floor(distanceToGoal / particleDistance);
        let nextPosition = startLoc;
        let offset = { x: directionToGoal.x * particleDistance, y: directionToGoal.y * particleDistance, z: directionToGoal.z * particleDistance };
        // player.sendMessage("Direction to goal: " + this.vecToString(directionToGoal));
        for (let i = 0; i < particleCount; i++) {
            locationsToSpawnParticles.push(nextPosition);
            nextPosition = {
                x: nextPosition.x + offset.x,
                y: nextPosition.y + offset.y,
                z: nextPosition.z + offset.z
            };
            // player.sendMessage("After last vector, next vector is " + this.vecToString(nextPosition));
            // player.sendMessage("New direction to goal: " + this.vecToString(this.directionTo(nextPosition, endLoc)))
        }


        let settings = new MolangVariableMap();
        settings.setColorRGBA('variable.color', particleColor);
        if (lifetime == null) {
            lifetime = 1;
        }
        settings.setFloat('variable.dust_lifetime', lifetime);
        system.run(() => {
            locationsToSpawnParticles.forEach((particleLoc) => {
                try {
                    player.spawnParticle("umm:line_draw", particleLoc, settings);
                }
                catch (e) {
                }
                // player.sendMessage("Spawning particle at " + this.vecToString(particleLoc));
            });
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {Vector3} targetLocation 
     */
    static hasLineOfSight(player, targetLocation, maxDistance) {
        let playerLocation = player.getHeadLocation();
        let lookingDirection = PlayerHandler.subtractVectors(targetLocation, playerLocation);
        let currentSearchLocation = PlayerHandler.addVectors(playerLocation, lookingDirection);
        while (PlayerHandler.distanceBetweenLocations(currentSearchLocation, playerLocation) < maxDistance && PlayerHandler.distanceBetweenLocations(currentSearchLocation, targetLocation) > 1) {
            let blockAtLocation = player.dimension.getBlock({x:Math.round(currentSearchLocation.x),y:Math.round(currentSearchLocation.y),z:Math.round(currentSearchLocation.z)});
            if (blockAtLocation.isSolid) {
                // player.sendMessage("Stopped at block " + blockAtLocation.typeId + " at location " + PlayerHandler.vecToString(blockAtLocation.location));
                return false;
            }
            currentSearchLocation = PlayerHandler.addVectors(currentSearchLocation, lookingDirection);
        }
        return true;
    }

    /**
     * Adds two vectors together and returns the result.
     * @param {Vector3} vec1
     * @param {Vector3} vec2
     * @returns {Vector3} the result of the vectors
     */
    static addVectors(vec1, vec2) {
        return {x:vec1.x+vec2.x,y:vec1.y+vec2.y,z:vec1.z+vec2.z};
    }

    /**
     * Subtracts vec2 from vec1 and returns the result.
     * @param {Vector3} vec1 
     * @param {Vector3} vec2 
     * @returns {Vector3} the result of the vectors
     */
    static subtractVectors(vec1, vec2) {
        return PlayerHandler.addVectors(vec1, {x:-vec2.x,y:-vec2.y,z:-vec2.z});
    }

    /**
     * Returns the distance between two locations
     * @param {Vector3} loc1
     * @param {Vector3} loc2
     */
    static distanceBetweenLocations(loc1, loc2) {
        let x = Math.pow(loc2.x - loc1.x, 2);
        let y = Math.pow(loc2.y - loc1.y, 2);
        let z = Math.pow(loc2.z - loc1.z, 2);

        return Math.sqrt(x + y + z);
    }

    /**
     * 
     * @param {Vector3} vec 
     * @param {number} digitsRound 
     * @returns 
     */
    static vecToString(vec, digitsRound) {
        if (digitsRound == null) {
            digitsRound = 2;
        }
        return "(" + vec.x.toFixed(digitsRound) + ", " + vec.y.toFixed(digitsRound) + ", " + vec.z.toFixed(digitsRound) + ")";
    }

    /**
     * @param {Vector3} startLoc the start location to spawn particles
     * @param {Vector3} endLoc the end location to spawn particles
     * @returns {Vector3}
     */
    static directionTo(startLoc, endLoc) {
        return this._normalize({ x: endLoc.x - startLoc.x, y: endLoc.y - startLoc.y, z: endLoc.z - startLoc.z });
    }

    /**
     * @param {Vector3} vec1 the start location to spawn particles
     * @param {Vector3} vec2 the end location to spawn particles
     * @returns {Vector3}
     */
    static areEqual(vec1, vec2) {
        return vec1.x == vec2.x && vec1.y == vec2.y && vec1.z == vec2.z;
    }

    /**
     * Returns a normalized vector3
     * 
     * @param {Vector3} vec
     * @returns {Vector3}
     */
    static _normalize(vec) {
        let magnitude = PlayerHandler._magnitude(vec);
        if (magnitude == 0) {
            return vec;
        }
        return { x: vec.x / magnitude, y: vec.y / magnitude, z: vec.z / magnitude };
    }

    /**
     * Returns the magnitude of a vector
     * 
     * @param {Vector3} vec
     * @returns {number}
     */
    static _magnitude(vec) {
        return Math.sqrt(Math.pow(vec.x, 2) + Math.pow(vec.y, 2) + Math.pow(vec.z, 2));
    }

    /**
     * Returns the vector rounded to a number of decimals 
     */
    static _roundToDigits(vec, digits) {
        let alter = 10 * digits;
        return { x: Math.floor(vec.x * alter) / alter, y: Math.floor(vec.y / alter) * alter, z: Math.floor(vec.z / alter) * alter }
    }

    /**
     * 
     * @param {Vector3} vec 
     * @param {number} scale 
     * @returns {Vector3}
     */
    static scaleVector(vec, scale) {
        return {x: vec.x * scale, y: vec.y * scale, z: vec.z * scale};
    }

    /**
     * 
     * @param {Vector3} vec1 
     * @param {Vector3} vec2
     * @returns {Vector3} 
     */
    static crossProduct(vec1, vec2) {
        return {x:((vec1.y*vec2.z)-(vec1.z*vec2.y)), y:((vec1.z*vec2.x)-(vec1.x*vec2.z)), z:((vec1.x*vec2.y)-(vec1.y*vec2.x))};
    }

    /**
     * Updates the role action visual in a players inventory.
     * 
     * @param {Player} player
     */
    static updateRoleActionVisual(player) {
        let inv = player.getComponent("minecraft:inventory").container;
        let selectedSlot = player.selectedSlotIndex;
        let stack = inv.getItem(selectedSlot);
        // player.sendMessage("Currently hovered slot " + selectedSlot);

        if (stack == null || stack.typeId != "umm:role_action") {
            for (let i = 0; i < inv.size; i++) {
                let testStack = inv.getItem(i);
                if (testStack != null && testStack.typeId == "umm:role_action") {
                    selectedSlot = i;
                    stack = testStack;
                    break;
                }
            }
            if (stack == null || stack.typeId != "umm:role_action") {
                return;
            }
        }

        let visualChargesRemaining = Math.min(Math.max(ScoreboardManager.getScoreboardObjective(player, "player.action_charges"), 1), 64);
        stack.amount = visualChargesRemaining;
        // player.sendMessage("" + item.amount);
        system.run(() => {
            inv.setItem(selectedSlot, stack);
        });
    }

    /**
     * 
     * @param {Player[]} players 
     * @param {ParticleVisibilityType} visibilityType 
     */
    static getPlayersThatSee(players, visibilityType) {
        return players.filter((pl) => {
            let playerRole = RoleManager.getPlayerRole(pl);
            return DeathHandler.consideredDead(pl) || playerRole.canSeeParticles(pl, visibilityType); 
        });
    }

    // static f
}

export const InteractTypes = Object.freeze({
    APOTHOCARY_MARK: { id: 0, related_role: RoleTypes.APOTHOCARY, is_negative: true },
    MEDIC_MARK: { id: 1, related_role: RoleTypes.MEDIC, is_negative: false },
    REVEALER_MARK: { id: 2, related_role: RoleTypes.REVEALER, is_negative: false },
    TRACKER_MARK: { id: 3, related_role: RoleTypes.TRACKER, is_negative: false },
    TRANSPORTER_TELEPORT: { id: 4, related_role: RoleTypes.TRANSPORTER, is_negative: false },
    CLERIC_HEAL: { id: 5, related_role: RoleTypes.CLERIC, is_negative: false },
    BOMBER_PLACE_BOMB: { id: 6, related_role: RoleTypes.BOMBER, is_negative: true },
    SPY_PLACE_BUG: { id: 7, related_role: RoleTypes.SPY, is_negative: false },
    GLITCH_HACK: { id: 8, related_role: RoleTypes.GLITCH, is_negative: true },
    GLITCH_TELEPORT: { id: 9, related_role: RoleTypes.GLITCH, is_negative: true },
    JAILOR_MARK: { id: 10, related_role: RoleTypes.JAILOR, is_negative: false },
    CRYOMANCER_MARK: { id: 11, related_role: RoleTypes.CRYOMANCER, is_negative: true },
    WITCH_SPELL: { id: 12, related_role: RoleTypes.WITCH, is_negative: true },
    TRAPPER_CATCH: { id: 13, related_role: RoleTypes.TRAPPER, is_negative: false },
    OFFICER_CAMP: { id: 14, related_role: RoleTypes.OFFICER, is_negative: false },
    SHADOWMANCER_MARK: { id: 15, related_role: RoleTypes.SHADOWMANCER, is_negative: true },
    ARTEMIS_BRAND: { id: 16, related_role: RoleTypes.ARTEMIS, is_negative: false },
    JESTER_FAKE_INTERACT: { id: 17, related_role: RoleTypes.JESTER, is_negative: false },
    STALKER_TARGET_MARK: { id: 18, related_role: RoleTypes.STALKER, is_negative: true },
    STALKER_BEGIN_STALK: { id: 19, related_role: RoleTypes.STALKER, is_negative: true },
    PLAGUEBEARER_INFECT: { id: 20, related_role: RoleTypes.PLAGUE_BEARER, is_negative: true },
    DOPPELGANGER_COPY: { id: 21, related_role: RoleTypes.DOPPELGANGER, is_negative: false },
    CUSTOM_ROLE_INTERACT: { id: 22, related_role: RoleTypes.CUSTOM_ROLE, is_negative: false },
});

// everything that draws particles
export const ParticleVisibilityType = Object.freeze({
    APOTHOCARY_MARKED: { id: 0, related_role: RoleTypes.APOTHOCARY },
    ARTEMIS_HUNTERS: { id: 1, related_role: RoleTypes.ARTEMIS },
    BOMBER_GROUNDED_BOMB_RADIUS: { id: 2, related_role: RoleTypes.BOMBER },
    BOMBER_PLAYER_BOMB_PARTICLE: { id: 3, related_role: RoleTypes.BOMBER },
    CRYOMANCER_MARKED_PLAYERS: { id: 4, related_role: RoleTypes.CRYOMANCER },
    ESCAPIST_RECALL_PARTICLE: { id: 5, related_role: RoleTypes.ESCAPIST },
    SHADOWMANCER_MARKED_PLAYERS: { id: 6, related_role: RoleTypes.SHADOWMANCER },
    TRAPPER_TRAP_RADIUS: { id: 7, related_role: RoleTypes.TRAPPER },
    VAMPIRE_INFECTED_PLAYERS: { id: 8, related_role: RoleTypes.VAMPIRE },
    WITCH_SPELL_RADIUS: { id: 9, related_role: RoleTypes.WITCH },
    STALKER_MARK: { id: 10, related_role: RoleTypes.STALKER }
});
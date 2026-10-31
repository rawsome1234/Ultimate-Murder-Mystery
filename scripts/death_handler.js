"use strict";

import { world, system, Player, MolangVariableMap, EntityDieAfterEvent, InputPermissionCategory } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { Role, RoleAlignment, RoleTypes } from "./role";
import { RoleManager } from "./role_manager";
import { RoleAssignment, RoleStorageData } from "./role_assignment";
import { GhostManager } from "./ghost_manager";
import { WinConditionManager } from "./win_con_handler";
import { Signal } from "./signal";
import { OnDeathSignal } from "./signals/on_death_signal";
import { BuildPlayerHelpTagSignal } from "./signals/build_player_help_tag";
import { AltruistRole } from "./roles/altruist";
import { ChatManager } from "./chat_manager";
import { ModifierManager } from "./modifier_manager";
import { VampireRole } from "./roles/vampire";
import { PlayerHandler } from "./player_handler";
import { SerialKillerRole } from "./roles/serial_killer";
import { LogItemType } from "./logs/game_log";
import { ShadowmancerRole } from "./roles/shadowmancer";

export class DeathHandler {
    /**
     * @type {OnDeathSignal}
     */
    static onDeathSignal = new OnDeathSignal();
    /**
     * @type {Signal}
     */
    static onMurdererDeath = new Signal();

    /**
     * @type {BuildPlayerHelpTagSignal}
     */
    static buildPlayerTag = new BuildPlayerHelpTagSignal();


    /**
     * 
     * @param {EntityDieAfterEvent} event 
     * @returns 
     */
    static checkDeath(event) {
        let player = event.deadEntity;
        if (player == null || player.typeId != "minecraft:player") {
            return;
        }
        if (ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") == 0 || !ScoreboardManager.isGameRunning()) {
            return;
        }

        let source = event.damageSource;
        let killer = source.damagingEntity;
        let isActiveVamp = player.hasTag(VampireRole.VAMPIRE_INFECT_TAG) && player.hasTag(VampireRole.VAMPIRE_INFECT_TAG);
        if ((!DeathHandler.consideredDead(player) || isActiveVamp)) {
            ScoreboardManager.setScoreboardObjective(player, "entity.lifetime", 0);
            // player.sendMessage("Player died");

            if (world.gameRules.doImmediateRespawn) {
                DeathHandler.spawnDeathParticles(player.location);
            }
            
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);

            DeathHandler.onDeathSignal.emit(player, killer);

            if (DeathHandler.onDeathSignal.cancel) {
                return;
            }
            // actual death handling
            player.addTag("dead");
            player.removeEffect("minecraft:wither");
            player.runCommand("gamemode spectator");
            player.triggerEvent("umm:set_full_health");
            let hasRespawned = ScoreboardManager.getScoreboardObjective(player, "role_settings.soul.has_respawned");
            // this.onDeathSignal.ghostLocation = player.location;

            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            
            // ghost & tracker
            system.run(() => {
                player.removeEffect("minecraft:wither");
                if (DeathHandler.consideredDead(player)) {
                    ScoreboardManager.addScoreboardObjective("game_data", "tracking.dead_count", 1);
                }
                let loc = player.location;
                GhostManager.addGhost({ x: loc.x, y: loc.y, z: loc.z }, player.dimension.id, player, killer);
                DeathHandler.updateTrackers();
            });

            let playerRole = RoleManager.getPlayerRole(player);
            let isSoul = playerRole.getRoleType() == RoleTypes.SOUL && (!hasRespawned || player.hasTag("soulRespawning"));
            let altruistRemaining = AltruistRole.isWorkingAltruist(world.getAllPlayers());
            let sendMessages = !isSoul && !altruistRemaining && this.onDeathSignal.sendMessages;
            
            if (killer != null) {
                let killerID = ScoreboardManager.getPlayerID(killer);
                ScoreboardManager.setScoreboardObjective(player, "ghost.killer_player_id", killerID);
            }
            if (sendMessages && ScoreboardManager.isGameRunning()) {
                // telling killer info
                if (killer != null) {
                    let killerRole = RoleManager.getPlayerRole(killer);
                    let tellKiller = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_killer");
                    let tellKillerRole = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_killer_role");
                    let message = "You were killed by ";
                    let wasSummoned = killer.hasTag("necromancerSummon");
                    if (tellKiller) {
                        message += killer.name + (wasSummoned ? "(summoned by a necromancer)" : "") + ".";
                        if (tellKillerRole && !altruistRemaining) {
                            message += " Their role was " + killerRole.getDisplayName();
                        }
    
                        player.sendMessage(message);
                    }
                }
                else {
                    player.sendMessage("You died D: ");
                }
                
                // telling game info
                DeathHandler.sendPlayerRolesAliveMessages(player);

                // player has officially died
                player.sendMessage("You've died! You can talk with other dead players in the chat!");
            }

            // sends this to dead players
            let playerRoleName = playerRole.getDisplayName();
            let killerRole = killer != null ? RoleManager.getPlayerRole(killer).getDisplayName() : "";
            let killerIsSummon = killer != null && killer.hasTag("necromancerSummon") ? " §r§b(summoned by necromancer)" : "";
            let deadChatMessage = "§b§l" + player.name + " (" + playerRoleName + "§b§l) has died" + (killer != null ? " to " + killer.name + " (" + killerRole + "§b§l)" + killerIsSummon : "...");
            ChatManager.sendDeadPlayersMessage(deadChatMessage, LogItemType.DEATH_MESSAGE);
            
            ScoreboardManager.addScoreboardObjective("game_data", "tracking.has_anyone_died", 1);

            // detects murderer death
            let deadPlayerRole = RoleManager.getPlayerRole(player);
            if (deadPlayerRole != null && deadPlayerRole.getAlignment() == RoleAlignment.MURDERER) {
                ScoreboardManager.setTrackedObjective("tracking.has_murderer_died", 1);
                this.onMurdererDeath.emit();
            }

            
            if (isSoul) {
                player.sendMessage("You are the soul! You'll respawn soon");
            }
            if (altruistRemaining) {
                let timeUntilBlocked = ScoreboardManager.getTrackedObjective("role_settings.altruist.time_until_blocked");
                player.sendMessage("There is an altruist in the game. If you are not revived in " + timeUntilBlocked + " seconds, you will be permanantly dead.");
                system.run(() => player.addTag("altruistMightRevive"));
                DeathHandler.incrementBlockDeadCount(player);
            }
        }
    }

    static incrementBlockDeadCount(player) {
        ScoreboardManager.addScoreboardObjective(player, "player.considered_dead_count", 1);
    }
    
    static decrementBlockDeadCount(player) {
        ScoreboardManager.addScoreboardObjective(player, "player.considered_dead_count", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.considered_dead_count", Math.max(0, ScoreboardManager.getScoreboardObjective(player, "player.considered_dead_count")-1));
    }

    /**
     * Returns whether the player is considered dead;
     * @param {Player} pl 
     * @returns {boolean}
     */
    static consideredDead(pl) {
        let playerBlockDeadCount = ScoreboardManager.getScoreboardObjective(pl, "player.considered_dead_count");
        return (pl.hasTag("AFK") || pl.hasTag("dead") || ScoreboardManager.getPlayerID(pl) < 0) && playerBlockDeadCount == 0;
    }

    /**
     * Spawns death particles at the given location
     * @param {Vector3} location 
     */
    static spawnDeathParticles(location) {
        let map = new MolangVariableMap();
        map.setVector3("variable.aabb", {x:0, y:0, z:0});
        map.setFloat("max_lifetime", 5);
        // map.setVector3("direction", {x:0, y:0, z:0});
        // map.setVector3("offset", {x:0, y:0, z:0});
        
        let allPlayers = world.getAllPlayers();
        allPlayers.forEach((toShow) => {
            try {
                toShow.spawnParticle("minecraft:death_explosion_emitter",location, map);
            }
            catch (e) {
            }
        });
    }
    
    /**
     * Sends the messages for player roles and who is alive and not.
     * @param {Player} player 
     */
    static sendPlayerRolesAliveMessages(player) {
        player.sendMessage(DeathHandler.createPlayerRoleMessage());
    }

    static createPlayerRoleMessage() {
        let tellAllRoles = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_roles");
        let tellIfLiving = ScoreboardManager.getTrackedObjective("settings.death_handling.tell_who_is_living");

        if (tellAllRoles || tellIfLiving) {
            let allPlayers = this._getPlayingPlayers(world.getAllPlayers());
            allPlayers = allPlayers.sort((a, b) => {
                if (DeathHandler.consideredDead(b)) {
                    return -1;
                }
                else if (DeathHandler.consideredDead(a)) {
                    return 1;
                }
                return 0;
            });
            let fullMessage = "";
            for (let i = 0; i < allPlayers.length; i++) {
                let player = allPlayers[i];
                let playerRole = RoleManager.getPlayerRole(player);
                let playerModifier = ModifierManager.getPlayerModifier(player);
                let playerAlive = !player.hasTag("dead");
                let message = "§b" + player.name + " is ";
    
                let wasSummoned = player.hasTag("necromancerSummon");
    
                if (tellAllRoles) {
                    // murderer name color
                    let color = playerRole.getAlignment() == RoleAlignment.MURDERER ? "§c" : "§a";
                    message = "§b" + color + player.name + "§r§b is ";
                    // role
                    let playerRoleHistory = DeathHandler._getPlayerRoleString(player, "§r§b§l");
                    message += "§l" + playerRoleHistory + "§r§b ";
                    // modifier
                    if (playerModifier != null) {
                        message += "(" + playerModifier.getDisplayName() + "§r§b) "
                    }
                    DeathHandler.buildPlayerTag.emitBuild(player, false);
                    let roleTags = DeathHandler.buildPlayerTag.getTag();
                    message += roleTags + "§r§b";
                    // if alive
                    if (tellIfLiving) {
                        message += "(";
                        message += (playerAlive ? "§lalive" : "dead");
                        message += "§r§b)";
                    }
                    // if necro
                    if (wasSummoned) {
                        message += " (Necromancer summon)";
                    }
                    message += ".";
                }
                else {
                    message += (playerAlive ? "§lalive§r§b" : "dead") + ".";
                }
                fullMessage += message + "§r" + (allPlayers.length > i+1 ? "\n" : "");
            }
            return fullMessage;
        }
        return "";
    }

    static getSerialKillerTargets() {
        return PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SERIAL_KILLER).map((serial) => {
            return SerialKillerRole.getTargetID(serial);
        });
    }

    static getBodyguardTargets() {
        return PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.BODYGUARD).map((serial) => {
            return ScoreboardManager.getScoreboardObjective(serial, "player.target_id");
        });
    }

    static getShadowmancerMarks() {
        let shadowmancers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SHADOWMANCER);
        let marks = [];
        shadowmancers.forEach((shadow) => {
            marks.concat(ShadowmancerRole._readShadowTag(shadow));
        });
        return marks;
    }

    /**
     * Gets a player's role history as a string.
     * @param {Player} player 
     * @param {string} resetString 
     * @param {boolean} resetAtStart 
     */
    static _getPlayerRoleString(player, resetString, resetAtStart) {
        let roleHistory = RoleAssignment.getPlayerRoleHistory(player);
        let largeHistory = roleHistory.length > 1;
        // player.sendMessage("History length: " + roleHistory.length);
        let builtString = resetAtStart ? resetString : "";
        if (largeHistory) {
            builtString += resetString + "(";
        }
        for (let i = 0; i < roleHistory.length; i++) {
            try {
                let history = roleHistory[i];
                let role = RoleStorageData.getRole(history);
                builtString += role.getDisplayName() + "§r";
                if (i + 1 < roleHistory.length) {
                    builtString += resetString + " -> ";
                }
            }
            catch (e) {
            }
        }
        if (largeHistory) {
            builtString += resetString + ")";
        }
        return builtString;
    }

    static updateTrackers() {
        ScoreboardManager.setTrackedObjective("tracking.murderer_count", 0);
        ScoreboardManager.setTrackedObjective("tracking.neutral_killer_count", 0);
        ScoreboardManager.setTrackedObjective("tracking.neutral_innocent_count", 0);
        ScoreboardManager.setTrackedObjective("tracking.innocent_count", 0);

        let allPlayers = world.getAllPlayers();
        let playingPlayers = this._getPlayingPlayers(allPlayers);
        let alivePlayers = this.sortPlayersWithoutTag(playingPlayers, "dead");

        alivePlayers.forEach((player) => {

            // player.sendMessage("Updating tracker..");
            let playerRole = RoleManager.getPlayerRole(player);

            if (!playerRole.countsInTracking(player)) {
                return;
            }

            let alignment = playerRole.getAlignment(player);
            // player.sendMessage("Your role is a " + alignment.description + " role")
            let objRef = "tracking.innocent_count"
            switch (alignment) {
                case RoleAlignment.MURDERER:
                    objRef = "tracking.murderer_count";
                    break;
                case RoleAlignment.NEUTRAL_KILLER:
                    objRef = "tracking.neutral_killer_count";
                    break;
                case RoleAlignment.NEUTRAL_INDEPENDENT:
                    objRef = "tracking.neutral_innocent_count";
                    break;
                default:
                    break;
            }
            ScoreboardManager.addScoreboardObjective("game_data", objRef, 1);
        });

        WinConditionManager.checkForEndGame();
    }

    /**
    * @returns {Player[]}
    */
    static _getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (ScoreboardManager.getScoreboardObjective(player, "player.player_id") >= 0) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }


    /**
     * Sorts the given list of players to remove anyone with the inputted tag.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {String[]} tag the tag that players cannot have.
     * 
     * @returns {Player[]}
     */
    static sortPlayersWithoutTag(players, tag) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag(tag)) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

}
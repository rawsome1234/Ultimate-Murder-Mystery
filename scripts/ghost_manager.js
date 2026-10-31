"use strict";

import { world, system, Player, Entity, MolangVariableMap, Dimension } from "@minecraft/server";

import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager"
import { Role, RoleAlignment } from "./role"
import { ModifierManager } from "./modifier_manager";
import { OnGhostSpawnSignal } from "./signals/on_ghost_spawn_signal";
import { PlayerHandler } from "./player_handler";
import { OnGhostInteractSignal } from "./signals/on_ghost_interact_signal";

export class GhostManager {

    static GHOST_INTERACT_PROPERTY = "interacted_ghosts";
    static onGhostSpawn = new OnGhostSpawnSignal();

    static onGhostInteract = new OnGhostInteractSignal();
    

    static initialize() {
        system.runInterval(() => {
            let molang = new MolangVariableMap();
            // molang.setSpeedAndDirection('variable.direction', 0, { x: 0, y: 0, z: 0 });
            molang.setVector3('variable.direction', { x: 0, y: 0, z: 0 });
            // molang.setFloat('variable.direction.x', 0);
            // molang.setFloat('variable.direction.y', 0);
            // molang.setFloat('variable.direction.z', 0);
            let players = world.getAllPlayers();
            this.getAllGhosts(players.length > 0 ? players[0].dimension : null).forEach((ghost) => {
                if (!ghost.isValid) {
                    return;
                }
                this.getPlayersWhoCanSeeGhosts().forEach((player) => {
                    if (ghost.isValid && player.dimension.isChunkLoaded(ghost.location)) {
                        player.spawnParticle("minecraft:sculk_soul_particle", ghost.location, molang);
                    }
                });
            });
        }, 5);
        system.runInterval(() => {
            let players = world.getAllPlayers();
            GhostManager.getAllGhosts(players.length > 0 ? players[0].dimension : null).forEach((ghost) => {
                ScoreboardManager.addScoreboardObjective(ghost, "entity.lifetime", 1);
            });
        }, 1);
    }

    static resetGhosts() {
        let players = world.getAllPlayers();
        let ghosts = this.getAllGhosts(players.length > 0 ? players[0].dimension : null);
        // world.getAllPlayers()[0].sendMessage("Killing all ghosts " + ghosts.length + " in dim " + dim.id);
        ghosts.forEach((ghost) => {
            // ghost.kill();
            ghost.remove();
        });
        this.currentGhosts = [];

    }

    /**
     * Gets all the ghosts who exist in the dimension of the player
     * 
     * @param {Dimension} dimension
     * 
     * @returns {Entity[]}
     */
    static getAllGhosts(dimension) {
        let overworldGhosts = world.getDimension("overworld").getEntities({ type: "umm:ghost_body" });
        let netherGhosts = world.getDimension("nether").getEntities({ type: "umm:ghost_body" });
        let endGhosts = world.getDimension("the_end").getEntities({ type: "umm:ghost_body" });
        let inputGhosts = [];
        if (dimension != null && !["minecraft:overworld", "minecraft:nether", "minecraft:the_end"].includes(dimension.id)) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage(dimension.id));
            inputGhosts = dimension.getEntities({ type: "umm:ghost_body" });
        }
        return overworldGhosts.concat(netherGhosts, endGhosts, inputGhosts);
    }

    /**
     * Gets a list of players that can see ghosts.
     * 
     * @returns {Player[]}
     */
    static getPlayersWhoCanSeeGhosts() {
        let allPlayers = world.getAllPlayers();

        // allPlayers[0].sendMessage("Gettings players who can see ghosts...");

        let deadPlayersCanSee = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.dead_players_can_see") != 0;
        let visibilitySetting = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.visibility");
        let murderersCanSee = visibilitySetting > 0 && visibilitySetting != 2;
        let neutralKCanSee = visibilitySetting > 1;
        let allCanSee = visibilitySetting == 4;

        if (allCanSee || !ScoreboardManager.isGameRunning()) {
            return allPlayers;
        }

        let playersWhoCanSee = [];

        allPlayers.forEach((player) => {
            let playerRole = RoleManager.getPlayerRole(player);
            let playerMod = ModifierManager.getPlayerModifier(player);
            let alignment = playerRole.getAlignment();

            let murdererFlag = murderersCanSee && alignment == RoleAlignment.MURDERER;
            let neutralKFlag = neutralKCanSee && alignment == RoleAlignment.NEUTRAL_KILLER;
            let roleCanSee = playerRole.canSeeGhosts();
            let modifierCanSee = playerMod != null && playerMod.canSeeGhosts();

            let afkFlag = player.hasTag("AFK");
            let deadFlag = player.hasTag("dead") && deadPlayersCanSee;
            if ((roleCanSee || modifierCanSee) || afkFlag || deadFlag || murdererFlag || neutralKFlag) {
                // player.sendMessage("You can see ghosts..");
                playersWhoCanSee.push(player);
            }
        });

        // allPlayers[0].sendMessage("Updating who can see ghosts");
        return playersWhoCanSee;
    }

    /**
     * Spawns a ghost at the location, which will be handled.
     * 
     * @param {Vector3} location the location to spawn the ghost.
     * @param {String} dimensionName the dimension to spawn the ghost in.
     * @param {Player} player the player this ghost is associated with.
     * @param {Player} killer the optional killer of the player.
     * 
     */
    static addGhost(location, dimensionName, player, killer) {
        if (!this.canSpawnGhost()) {
            return;
        }

        let dim = world.getDimension(dimensionName);
        let ghost = null;
        try {
            ghost = dim.spawnEntity("umm:ghost_body", location);
        }
        catch (e) {
            return;
        }
        ghost.addEffect("invisibility", 20000000, { showParticles: false });
        let playerRole = RoleManager.getPlayerRole(player);

        ScoreboardManager.setScoreboardObjective(ghost, "ghost.ghost_player_id", ScoreboardManager.getPlayerID(player));
        ScoreboardManager.setScoreboardObjective(ghost, "ghost.ghost_player_role_id", playerRole.getRoleType().id);
        ScoreboardManager.setScoreboardObjective(ghost, "ghost.ghost_player_custom_role_id", Object.hasOwn(playerRole.getRoleType(), "custom_id") ? playerRole.getRoleType().custom_id : -1);

        let killerID = -1;
        let killerRoleID = -1;
        let killerCustomID = -1;
        if (killer) {
            killerID = ScoreboardManager.getPlayerID(killer);
            let killerRole = RoleManager.getPlayerRole(killer).getRoleType();
            killerRoleID = killerRole.id;
            killerCustomID = Object.hasOwn(killerRole, "custom_id") ?killerRole.custom_id : -1;
        }

        ScoreboardManager.setScoreboardObjective(ghost, "ghost.killer_player_id", killerID);
        ScoreboardManager.setScoreboardObjective(ghost, "ghost.killer_player_role_id", killerRoleID);
        ScoreboardManager.setScoreboardObjective(ghost, "ghost.killer_player_custom_role_id", killerCustomID);
        
        let nearbyRadius = ScoreboardManager.getTrackedObjective("role_settings.mortician.player_nearby_range");
        let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        livingPlayers = livingPlayers.filter((p) => p.id != player.id && PlayerHandler.distanceBetweenLocations(location, p.location) <= nearbyRadius);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Distance to death location: " + PlayerHandler.distanceBetweenLocations(location, pl.location)));
        ScoreboardManager.setScoreboardObjective(ghost, "ghost.players_nearby_at_death", livingPlayers.length);

        GhostManager.onGhostSpawn.emit(player, ghost);
    }

    /**
     * Gets the ghost associated with the inputted player, or null if none exists.
     * @param {Player | number} player 
     * @returns {Entity}
     */
    static getPlayerGhost(player) {
        if (player == null) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Player is null"));
            return null;
        }
        let playerID = player;
        if (typeof player != "number") {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage(player.name + " is a player, getting id"));
            playerID = ScoreboardManager.getPlayerID(player);
        }
        let players = world.getAllPlayers();
        let ghosts = GhostManager.getAllGhosts(players.length > 0 ? players[0].dimension : null);
        for (let i = 0; i < ghosts.length; i++) {
            let ghostID = ScoreboardManager.getScoreboardObjective(ghosts[i], "ghost.ghost_player_id");
            if (ghostID == playerID) {
                return ghosts[i];
            }
        }
        return null;
    }

    /**
     * 
     * @param {number} ghostID 
     * @returns {Entity}
     */
    static getGhostFromID(ghostID) {
        let allGhosts = GhostManager.getAllGhosts();
        for (let i = 0; i < allGhosts.length; i++) {
            let ghost = allGhosts[i];
            if (ghost != null && ghost.isValid && ghost.id == ghostID) {
                return ghost;
            }
        }
        return null;
    }

    /**
     * Returns if ghost bodies are enabled.
     * 
     * @returns {boolean}
     */
    static canSpawnGhost() {
        return ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
    }

    /**
     * Returns if the player can interact with the given ghost.
     * @param {Player} player 
     * @param {Entity} ghost
     */
    static canInteractWithGhosts(player, ghost) {
        let interactedString = player.getDynamicProperty(GhostManager.GHOST_INTERACT_PROPERTY);
        let interacted = JSON.parse(interactedString);
        return !interacted.includes(ghost.id);
    }
    
    /**
     * Marks the ghost as interacted for the player.
     * @param {Player} player 
     * @param {Entity} ghost 
     */
    static markAsInteracted(player, ghost) {
        let interactedString = player.getDynamicProperty(GhostManager.GHOST_INTERACT_PROPERTY);
        let interacted = JSON.parse(interactedString);
        if (!interacted.includes(ghost.id)) {
            interacted.push(ghost.id);
        }
        let finalString = JSON.stringify(interacted);
        player.setDynamicProperty(GhostManager.GHOST_INTERACT_PROPERTY, finalString);
    }

    static clearAllInteractions() {
        world.getAllPlayers().forEach((player) => {
            player.setDynamicProperty(GhostManager.GHOST_INTERACT_PROPERTY, "[]");
        });
    }






}
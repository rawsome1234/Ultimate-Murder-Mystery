"use strict";

import { world, system, Player, Entity, MolangVariableMap } from "@minecraft/server";

import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager"
import { RoleAlignment } from "./role"
import { PlayerHandler } from "./player_handler";
import { ChatManager } from "./chat_manager";
import { LogItemType } from "./logs/game_log";
import { SoundEffectType, SoundManager } from "./sound_manager";

export class PortalManager {

    static initialize() {
        system.runInterval(() => {
            let molang = new MolangVariableMap();
            // molang.setSpeedAndDirection('variable.direction', 0, { x: 0, y: 0, z: 0 });
            molang.setVector3('variable.direction', { x: 1, y: 1, z: 1 });
            // molang.setFloat('variable.direction.x', 0);
            // molang.setFloat('variable.direction.y', 0);
            // molang.setFloat('variable.direction.z', 0);
            this.getAllPortals(world.getAllPlayers()[0]).forEach((portal) => {
                if (!portal.isValid || !world.getAllPlayers()[0].dimension.isChunkLoaded(portal.location)) {
                    return;
                }
                // world.getAllPlayers()[0].sendMessage("Showing portals to players");
                let locationToSpawn = PlayerHandler.addVectors(portal.location, {x:0,y:.5,z:0});
                this.getPlayersWhoCanSeePortal(portal).forEach((player) => {
                    // player.sendMessage("Showing portal...");
                    player.spawnParticle("minecraft:crop_growth_emitter", locationToSpawn, molang);
                });
            });
        }, 40);
        system.runInterval(() => {
            this.getAllPortals(world.getAllPlayers()[0]).forEach((portal) => {
                ScoreboardManager.addScoreboardObjective(portal, "entity.lifetime", 1);
                portal.clearVelocity();
            });
            world.getAllPlayers().forEach((player) => {
                if (ScoreboardManager.getScoreboardObjective(player, "role_settings.technician.teleport_cooldown_time") > 0) {
                    ScoreboardManager.addScoreboardObjective(player, "role_settings.technician.teleport_cooldown_time", -1);
                }
            });
        }, 1);
    }

    static resetPortals() {
        let portals = this.getAllPortals(world.getAllPlayers()[0]);
        // world.getAllPlayers()[0].sendMessage("Killing all ghosts " + ghosts.length + " in dim " + dim.id);
        portals.forEach((portal) => {
            // ghost.kill();
            portal.remove();
        });
    }

    /**
     * Gets all the ghosts who exist in the dimension of the player
     * 
     * @param {Player} player
     * 
     * @returns {Entity[]}
     */
    static getAllPortals(player) {
        if (player != null) {
            // player.sendMessage("Getting portals");
            return player.dimension.getEntities({ type: "umm:technician_portal" });
        }
        return [];
    }

    /**
     * Gets a list of players that can see ghosts.
     * 
     * @param {Entity} portal 
     * @returns {Player[]}
     */
    static getPlayersWhoCanSeePortal(portal) {
        let allPlayers = world.getAllPlayers();

        // allPlayers[0].sendMessage("Gettings players who can see ghosts...");

        let deadPlayersCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.dead_players_see_portals") != 0;
        let whoCanSeeDef = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_default");
        let whoCanSeeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_overtime");
        let changeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.view_change_time");
        let timeNeededMet = ScoreboardManager.getScoreboardObjective(portal, "entity.lifetime") >= changeTime * 20 && changeTime >= 0;
        let murderersCanSee = true;
        let neutralKCanSee = whoCanSeeDef >= 1 || (timeNeededMet && whoCanSeeTime >= 1);
        let allCanSee = whoCanSeeDef == 2 || (timeNeededMet && whoCanSeeTime >= 2);
        
        if (allCanSee) {
            return allPlayers;
        }

        let playersWhoCanSee = [];

        allPlayers.forEach((player) => {
            let playerRole = RoleManager.getPlayerRole(player);
            let alignment = playerRole.getAlignment();

            let isMurderer = alignment == RoleAlignment.MURDERER;
            let isNeutralKiller = RoleAlignment.NEUTRAL_KILLER;

            let murdererFlag = murderersCanSee && alignment == RoleAlignment.MURDERER;
            let neutralKFlag = neutralKCanSee && alignment == RoleAlignment.NEUTRAL_KILLER;

            let afkFlag = player.hasTag("AFK");
            let deadFlag = player.hasTag("dead") && deadPlayersCanSee;
            if (afkFlag || deadFlag || murdererFlag || neutralKFlag) {
                // player.sendMessage("You can see ghosts..");
                playersWhoCanSee.push(player);
            }
        });

        // allPlayers[0].sendMessage("Updating who can see ghosts");
        return playersWhoCanSee;
    }

    static canSeePortals(player, portal) {
        let deadPlayersCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.dead_players_see_portals") != 0;
        let whoCanSeeDef = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_default");
        let whoCanSeeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_overtime");
        let changeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.view_change_time");
        let timeNeededMet = ScoreboardManager.getScoreboardObjective(portal, "entity.lifetime") >= changeTime * 20 && changeTime >= 0;
        
        let playerRole = RoleManager.getPlayerRole(player);
        let playerAlignment = playerRole.getAlignment();
        
        let isMurderer = playerAlignment == RoleAlignment.MURDERER;
        let canSeeKiller = playerAlignment == RoleAlignment.NEUTRAL_KILLER && (whoCanSeeDef > 0 || (timeNeededMet && whoCanSeeTime > 0));
        let allCanSee = whoCanSeeDef > 1 || (timeNeededMet && whoCanSeeTime > 1);
        return isMurderer || canSeeKiller || allCanSee || deadPlayersCanSee;
    }

    static canSeeAndUsePortals(player, portal) {
        let deadPlayersCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.dead_players_see_portals") != 0;
        let whoCanSeeDef = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_default");
        let whoCanSeeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_overtime");
        let changeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.view_change_time");
        let seeAllowsUse = ScoreboardManager.getTrackedObjective("role_settings.technician.seeing_allows_use") != 0;
        let timeNeededMet = ScoreboardManager.getScoreboardObjective(portal, "entity.lifetime") >= changeTime * 20 && changeTime >= 0;
        
        let playerRole = RoleManager.getPlayerRole(player);
        let playerAlignment = playerRole.getAlignment();
        
        let isMurderer = playerAlignment == RoleAlignment.MURDERER;
        let canSeeKiller = playerAlignment == RoleAlignment.NEUTRAL_KILLER && whoCanSeeDef > 0;
        let canSeeKillerTime = playerAlignment == RoleAlignment.NEUTRAL_KILLER && (timeNeededMet && whoCanSeeTime > 0);
        let allCanSee = whoCanSeeDef > 1;
        let allCanSeeTime = timeNeededMet && whoCanSeeTime > 1;
        // player.sendMessage("You can use portals: " + (isMurderer || canSeeKiller || allCanSee || (seeAllowsUse && (canSeeKillerTime || allCanSeeTime))));
        return isMurderer || canSeeKiller || allCanSee || (seeAllowsUse && (canSeeKillerTime || allCanSeeTime));
    }

    /**
     * Spawns a ghost at the location, which will be handled.
     * 
     * @param {Vector3} location the location to spawn the ghost.
     * @param {String} dimensionName the dimension to spawn the ghost in.
     * @param {Player} player the player this ghost is associated with.
     * 
     */
    static addPortal(location, dimensionName, player) {
        // if (!this.canSpawnGhost()) {
        //     return;
        // }

        let dim = world.getDimension(dimensionName);
        let portal = dim.spawnEntity("umm:technician_portal", location);
        // if (dim.getBlock(portal.location).typeId != "minecraft:air") {
        //     portal.teleport(PlayerHandler.addVectors(portal.location, {x:0,y:1,z:0}));
        // }
        // portal.addEffect("invisibility", 20000000, { showParticles: false });
        let playerRole = RoleManager.getPlayerRole(player);
    }

    /**
     * Handles a portal being clicked.
     * @param {Player} player 
     * @param {Entity} portalClicked 
     */
    static onPortalClick(player, portalClicked) {
        if (!PortalManager.canSeeAndUsePortals(player, portalClicked)) {
            return;
        }
        
        let cooldown = ScoreboardManager.getScoreboardObjective(player, "role_settings.technician.teleport_cooldown_time");
        if (cooldown > 0) {
            player.sendMessage("You cannot teleport for another " + Math.floor(cooldown / 20) + " seconds.");
            return;
        }

        let allPortals = PortalManager.getAllPortals(player);
        
        let filteredPortals = allPortals.filter((portal) => portal.id != portalClicked.id);
        if (filteredPortals.length == 0) {
            player.sendMessage("There's only one portal...");
            return;
        }

        let portalToTeleportIndex = ScoreboardManager.rollRandomNumber(0, filteredPortals.length);
        let portal = filteredPortals[portalToTeleportIndex];
        let teleportLocation = PlayerHandler.addVectors(portal.location, { x:0, y:.5, z:0 });
        let invisibilityTime = ScoreboardManager.getTrackedObjective("role_settings.technician.invisibility_duration");
        system.run(() => {
            player.teleport(teleportLocation);
            let cooldown = ScoreboardManager.getTrackedObjective("role_settings.technician.teleport_cooldown_time");
            ScoreboardManager.setScoreboardObjective(player, "role_settings.technician.teleport_cooldown_time", cooldown * 20);
            if (invisibilityTime > 0) {
                player.addEffect("minecraft:invisibility", invisibilityTime * 20, { showParticles: true });
            }
            player.sendMessage("Teleported to a random portal!");
            SoundManager.playSoundEffect([player], SoundEffectType.PORTAL_USE);
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " used a portal and teleported to " + PlayerHandler.vecToString(player.location), LogItemType.ABILITY_MESSAGE);
        });
    }
}
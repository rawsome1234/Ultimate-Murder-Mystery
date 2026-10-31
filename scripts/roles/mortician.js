"use strict";

import { world, system, Player } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class MorticianRole extends InnocentRole {
    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * 
     * @param {Player} player
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_cooldown");
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
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§cMortician";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Find ghost bodies and analyze how players died!";
    }

    getRoleHelpDescription() {
        return "Right click a ghost body to pick what type of information you want to learn about a ghost. You can only get one piece of information per ghost.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.mortician.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
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
     * @returns {Alignment[]}
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
        return RoleTypes.MORTICIAN;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} potentialGhost the entity the player clicked.
     */
    activateAbilityOnEntity(player, potentialGhost) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (potentialGhost.typeId == "umm:ghost_body" && chargesRemaining != 0) {
            let playerID = ScoreboardManager.getScoreboardObjective(potentialGhost, "ghost.ghost_player_id");
            let ghostPlayer = ScoreboardManager.getPlayerWithID(playerID);
            let ghostName = ghostPlayer != null && ghostPlayer.isValid ? ghostPlayer.name : "this player";

            if (!GhostManager.canInteractWithGhosts(player, potentialGhost)) {
                player.sendMessage("§c§oYou've already analyzed the ghost of " + ghostName + "...");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }

            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // create and show form
            let form = new ActionFormData();
            form.title("Autopsy Report");
            form.body("What information would you like to gather from the ghost?");
            form.button("Time Dead & Players Nearby During Death");
            form.button("Ghost and Killer Role");
            form.button("Killer's Current Distance");

            form.show(player).then((r) => MorticianRole.processFormData(player, potentialGhost, r));
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);

            // player.sendMessage("§e§oInvestigating ghost body... §r§ethis ghost belongs to §r§f" + ghostName + "§r§e and" + message);
            // ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " investigated " + ghostName + " and found out that they" + message);
        }
    }

    /**
     * 
     * @param {Player} player 
     * @param {Entity} ghost 
     * @param {ActionFormResponse} r 
     */
    static processFormData(player, ghost, r) {
        if (r.canceled) {
            return;
        }

        if (ghost == null || !ghost.isValid) {
            player.sendMessage("Something has happened. The body has disappeared.");
            ScoreboardManager.setPlayerActionCooldown(player, 3, false);
            return;
        }

        let button = r.selection;
        let distanceMinTime = ScoreboardManager.getTrackedObjective("role_settings.mortician.distance_min_time");
        let ghostTimeDead = ScoreboardManager.getScoreboardObjective(ghost, "entity.lifetime");

        if ((distanceMinTime * 20 > ghostTimeDead) && button == 2) {
            player.sendMessage("§cThe ghost has not been dead long enough for that information to be available... ");
            ScoreboardManager.setPlayerActionCooldown(player, 5, false);
            return;
        }

        let playerID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.ghost_player_id");
        let ghostPlayer = ScoreboardManager.getPlayerWithID(playerID);
        let ghostName = ghostPlayer != null ? ghostPlayer.name : "a player";
        
        // mark
        let message = "";
        let messageType = "";
        switch (button) {
            case 0: // time dead & players nearby
                let nearbyPlayers = ScoreboardManager.getScoreboardObjective(ghost, "ghost.players_nearby_at_death");
                message = "§cTime Dead: " + Math.ceil(ghostTimeDead / 20)  + " seconds\nPlayers Nearby at Death: " + nearbyPlayers;
                messageType = "got the time dead and the number of players nearby when the ghost died.";
                break;
            case 1: // player & killer roles
                let playerRoleID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.ghost_player_role_id");
                let playerRoleCustomID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.ghost_player_custom_role_id");
                let killerRoleID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.killer_player_role_id");
                let killerRoleCustomID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.killer_player_custom_role_id");
                let playerRole = RoleManager.getMatchingRole(playerRoleID, playerRoleCustomID);
                let killerRole = RoleManager.getMatchingRole(killerRoleID, killerRoleCustomID);
                message = "§cPlayer Role: " + playerRole.getDisplayName() + "§r§c\n" + "Killer Role: " + (killerRole != null ? killerRole.getDisplayName() : "unknown");
                messageType = "got the player role and killer role.";
                break;
            case 2: // distance to killer
                let killerID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.killer_player_id");
                let killer = ScoreboardManager.getPlayerWithID(killerID);
                if (killer == null || DeathHandler.consideredDead(killer)) {
                    ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                    message = "§cThe killer seems to no longer be alive...";
                    break;
                }

                let killerDistance = PlayerHandler.distanceBetweenLocations(ghost.location, killer.location);
                let closeThreshold = ScoreboardManager.getTrackedObjective("role_settings.mortician.close_distance_threshold");
                let nearbyThreshold = ScoreboardManager.getTrackedObjective("role_settings.mortician.nearby_distance_threshold");
                let rangeText = "";
                let distanceText = "";
                let distanceColor = "";

                if (killerDistance <= closeThreshold) {
                    distanceText = "close!!";
                    rangeText = "0-" + closeThreshold;
                    distanceColor = "q";
                }
                else if (killerDistance <= nearbyThreshold) {
                    distanceText = "nearby";
                    rangeText = closeThreshold + "-" + nearbyThreshold;
                    distanceColor = "p";
                }
                else {
                    distanceText = "far";
                    rangeText = nearbyThreshold + "+";
                    distanceColor = "v";
                }

                message = "§" + distanceColor + "The killer is " + distanceText + "§r§l" + distanceColor + " (" + rangeText + " blocks)"; 
                messageType = "got the distance of the killer.";
                break;
        }

        GhostManager.markAsInteracted(player, ghost);
        GhostManager.onGhostInteract.emit(player, ghost);
        player.sendMessage(message);
        ChatManager.sendDeadPlayersMessage("§c§o" + player.name + " did an autopsy of " + ghostName + " and " + messageType, LogItemType.ABILITY_MESSAGE);

        SoundManager.playSoundEffect([player], SoundEffectType.MORTICIAN_INFO);
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_cooldown");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
    }

    /**
     * @param {number[]} bannedIDs;
     * @returns {Player[]}
     */
    static _getPlayingPlayers(players, bannedIDs) {
        let livePlayers = [];
        players.forEach((player) => {
            let playerID = ScoreboardManager.getPlayerID(player);
            if (player != null && playerID >= 0 && !bannedIDs.includes(playerID) && !player.hasTag("dead")) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Mortician Settings");

        form.divider();
        form.label("The mortician is able to inspect ghost bodies to get one piece of information about the death, being the time dead & number of players nearby at death, the role of the killer and ghost, and the current distance of the killer.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.mortician.enabled") != 0;
        form.toggle("Mortician Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_cooldown");
        form.slider("Autopsy Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of autopsy, or inspecting a body.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_uses");
        form.slider("Autopsy Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times inspect can be used. -1 is infinite uses");
        
        let nearbyRadius = ScoreboardManager.getTrackedObjective("role_settings.mortician.player_nearby_range");
        form.slider("Radius for Nearby Players", 1, 30, { defaultValue: nearbyRadius }); // 8
        form.label("How big the radius is for tracking how many players were nearby when someone dies.");
        
        // distance stuff
        let distanceMinTime = ScoreboardManager.getTrackedObjective("role_settings.mortician.distance_min_time");
        form.slider("Minimum Time for Distance Info", 0, 90, { valueStep: 5, defaultValue: distanceMinTime }); // 10
        form.label("The minimum amount of time in seconds a ghost must be dead before a mortician can get the distance of the killer.");
        
        let closeThreshold = ScoreboardManager.getTrackedObjective("role_settings.mortician.close_distance_threshold");
        form.slider("Close Distance Threshold", 5, 25, { defaultValue: closeThreshold }); // 12
        form.label("If the killer is within this distance of the ghost, the mortician will be told the killer is close.");
        
        let nearbyThreshold = ScoreboardManager.getTrackedObjective("role_settings.mortician.nearby_distance_threshold");
        form.slider("Nearby Distance Threshold", 20, 60, { valueStep: 5, defaultValue: nearbyThreshold }); // 14
        form.label("If the killer is within this distance of the ghost, the mortician will be told the killer is nearby.");
        
        // player.sendMessage("not submitted " + callback);
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.mortician.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.mortician.autopsy_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.mortician.autopsy_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.mortician.player_nearby_range", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.mortician.distance_min_time", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.mortician.close_distance_threshold", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.mortician.nearby_distance_threshold", r.formValues[14]);
            
            // player.sendMessage("post-submit" + callback);
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.mortician.autopsy_uses");
        let nearbyRadius = ScoreboardManager.getTrackedObjective("role_settings.mortician.player_nearby_range");
        let distanceMinTime = ScoreboardManager.getTrackedObjective("role_settings.mortician.distance_min_time");
        let closeThreshold = ScoreboardManager.getTrackedObjective("role_settings.mortician.close_distance_threshold");
        let nearbyThreshold = ScoreboardManager.getTrackedObjective("role_settings.mortician.nearby_distance_threshold");

        let description = "The mortician is an innocent who can interact with ghost bodies to get various information about the player's death.";
        description += "\n\nAutopsy Cooldown: " + cooldownTime + " seconds.";
        description += "\nAutopsy Uses: " + abilityUses;
        description += "\nRadius for Nearby Players: " + nearbyRadius + " blocks";
        description += "\nMinimum Time for Killer Distance: " + distanceMinTime + " seconds";
        description += "\nClose Threshold: " + closeThreshold + " blocks";
        description += "\nNearby Threshold: " + nearbyThreshold + " blocks";
        return description;
    }
}
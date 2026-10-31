"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { Util } from "../util";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";

export class DetectiveRole extends InnocentRole {
    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * 
     * @param {Player} player
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.detective.action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
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
        return "§eDetective";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Find Ghost Bodies and investigate them for information on the killer's name!";
    }

    getRoleHelpDescription() {
        let nameCount = ScoreboardManager.getTrackedObjective("role_settings.detective.names_to_give");
        return "Right click a ghost body to receive " + nameCount + " names, one of which will be the killer of that ghost.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.detective.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
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
        return RoleTypes.DETECTIVE;
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
            player.startItemCooldown("role_action", 20);
            let playerID = ScoreboardManager.getScoreboardObjective(potentialGhost, "ghost.ghost_player_id");
            let killerID = ScoreboardManager.getScoreboardObjective(potentialGhost, "ghost.killer_player_id");
            let ghostPlayer = ScoreboardManager.getPlayerWithID(playerID);
            let ghostName = ghostPlayer != null ? ghostPlayer.name : "this player";
            
            let killerPlayer = ScoreboardManager.getPlayerWithID(killerID);
            if (killerID == -1 || killerPlayer == null) {
                player.sendMessage("§e§oIt seems " + ghostName + "'s death is mysterious.. no killer is associated with this ghost...");
                return;
            }

            if (!GhostManager.canInteractWithGhosts(player, potentialGhost)) {
                player.sendMessage("§e§oYou've already inspected the ghost of " + ghostName + "...");
                return;
            }

            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            GhostManager.markAsInteracted(player, potentialGhost);
            GhostManager.onGhostInteract.emit(player, potentialGhost);

            let detectiveID = ScoreboardManager.getPlayerID(player);
            let fakeKillers = DetectiveRole._getPlayingPlayers(world.getAllPlayers(), [playerID, killerID, detectiveID]);

            let killerNames = [killerPlayer.name];
            let extraNamesCount = ScoreboardManager.getTrackedObjective("role_settings.detective.names_to_give") - 1;

            while (extraNamesCount > 0 && fakeKillers.length > 0) {
                let index = ScoreboardManager.rollRandomNumber(0, killerNames.length);
                if (fakeKillers[index] != null) {
                    killerNames.push(fakeKillers[index].name);
                }

                fakeKillers.splice(index, 1);
                extraNamesCount--;
            }

            let killerNamesMessage = Util.formatStringList(killerNames, ", ", true);
            let message = " was killed by one of §r" + killerNamesMessage;
            player.sendMessage("§e§oInvestigating ghost body... §r§ethis ghost belongs to §r§f" + ghostName + "§r§e and" + message);
            ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " investigated " + ghostName + " and found out that they" + message, LogItemType.ABILITY_MESSAGE);
            
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
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
        form.title("Detective Settings");

        form.divider();
        form.label("The detective is able to inspect ghost bodies to get a list of names, one of which is the killer of that player and the others are random between the players who are alive.\nRequires: Ghost Bodies (on)");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.detective.enabled") != 0;
        form.toggle("Detective Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        form.slider("Inspect Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of inspect.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.detective.action_uses");
        form.slider("Inspect Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times inspect can be used. -1 is infinite uses");
        
        let namesToGive = ScoreboardManager.getTrackedObjective("role_settings.detective.names_to_give");
        form.slider("Names Gotten On Inspect", 2, 10, { defaultValue: namesToGive }); // 8
        form.label("The number of names gotten when given names.");
        
        // player.sendMessage("not submitted " + callback);
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.detective.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.detective.cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.detective.action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.detective.names_to_give", r.formValues[8]);
            
            // player.sendMessage("post-submit" + callback);
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.detective.action_uses");
        let namesToGive = ScoreboardManager.getTrackedObjective("role_settings.detective.names_to_give");

        let description = "The detective is an innocent who can interact with ghost bodies to get a number of names, one of which will be a murderer.";
        description += "\n\nInspect Cooldown: " + cooldownTime + " seconds.";
        description += "\nInspect Uses: " + abilityUses;
        description += "\nNames Given: " + namesToGive;
        return description;
    }
}
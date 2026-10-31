"use strict";

import { world, system, Player } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager";
import { PlayerHandler } from "./player_handler";
import { Role, RoleAlignment } from "./role";
import { ModifierManager } from "./modifier_manager";
import { Modifier, ModifierAlignment } from "./modifier";
import { Util } from "./util";

export class ModifierAssignment {

    static assignModifiers() {
        let modsOn = ScoreboardManager.getTrackedObjective("settings.modifiers.enabled");
        if (modsOn == 0) {
            return;
        }

        let auto = ScoreboardManager.getTrackedObjective("settings.role_assignment.enabled")
        let draft = ScoreboardManager.getTrackedObjective("settings.role_draft.enabled");

        if (auto == 2) {
            if (draft == 1) {
                // this._runRoleDraft();
                this._assignAutoMods();
            }
            else {
                this._assignAutoMods();
            }
        }
        else if (auto == 1) {
            this._assignAutoMods();
            // this._detectPlayerBooks();
        }
        return;
    }

    static _assignAutoMods() {
        let modifiers = ModifierManager.getRandomModifiers();
        let priorityModifiers = modifiers.filter((mod) => ScoreboardManager.getTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight") >= 101);
        let nonPriorityModifiers = modifiers.filter((mod) => ScoreboardManager.getTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight") <= 100);

        let maxCountMin = ScoreboardManager.getTrackedObjective("settings.modifiers.max_modifier_count_min");
        let maxCountMax = ScoreboardManager.getTrackedObjective("settings.modifiers.max_modifier_count_max");
        let maxModifierCount = ScoreboardManager.rollRandomNumber(maxCountMin, maxCountMax+1);

        let playingPlayers = this._getPlayingPlayers(world.getAllPlayers());
        Util.shuffle(playingPlayers);
        let playersRemaining = playingPlayers.length;
        playingPlayers.forEach((player) => {
            let modifiersToUse = priorityModifiers.length == 0 ? nonPriorityModifiers : priorityModifiers;
            let playerRole = RoleManager.getPlayerRole(player);
            if (priorityModifiers.length > 0 && ModifierManager.getRandomModifierForRole(modifiersToUse, playerRole) == -1) {
                modifiersToUse = nonPriorityModifiers;
            }
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Using priority mods: "))
            if (modifiersToUse.length <= 0 && maxModifierCount > 0) {
                player.sendMessage("There weren't enough modifiers to give you one.");
                return;
            }
            let roleAlignment = playerRole.getAlignment();
            let playerMod = ModifierManager.getPlayerModifier(player);
            let modChance = ModifierAssignment._getModifierChance(roleAlignment);
            let giveModifier = ScoreboardManager.rollRandomNumber(0, 100) < modChance;
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Chance was " + modChance + " modifiers, giving modifier: " + giveModifier));
            if (giveModifier && playerMod == null) {
                while (true) {
                    let modIndex = ModifierManager.getRandomModifierForRole(modifiersToUse, playerRole);
                    if (modIndex != -1) {
                        let modifier = modifiersToUse[modIndex];
                        modifiersToUse.splice(modIndex, 1);
                        if (modifier.getPlayersRequired() > playersRemaining) {
                            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Only one lover, rerolling for " + player.name));
                            continue;
                        }
                        ModifierAssignment.setPlayerModifier(player, modifier);
                        maxModifierCount--;
                        playersRemaining--;
                        // world.getAllPlayers().forEach((pl) => pl.sendMessage("giving player modifier " + modifier.getDisplayName()));
                        break;
                    }
                    else {
                        // world.getAllPlayers().forEach((pl) => pl.sendMessage("No modifiers remaining for " + player.name));
                        player.sendMessage("There were no modifiers remaining for you :[");
                        return;
                    }
                }
            }
        });
    }
    
    /**
     * Sets a player's modifier to be the inputted modifier.
     * 
     * @param {Player} player the player to be set.
     * @param {Modifier} modifier the role to set the player to.
     */
    static setPlayerModifier(player, modifier) {
        let modifierName = modifier.getDisplayName();
        let lineColor = ModifierAssignment._getModifierAlignmentColor(modifier.getModifierAlignment());
        player.sendMessage(lineColor + "Your modifier is " + modifierName + "§r" + lineColor + "! " + modifier.getModifierDescription());// + " If this is wrong please report it to a developer.");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_id", modifier.getModifierType().id);
        ModifierAssignment.updateModifierDisplay(player);
        // if (titleRole) {
        //     player.onScreenDisplay.setTitle(lineColor + roleName, {subtitle: lineColor + "is your role...", stayDuration: 20*3, fadeInDuration: 5, fadeOutDuration: 10});
        // }
        modifier.giveToPlayer(player);
        // PlayerHandler.giveRoleActionItem(player);
        // PlayerHandler.giveRoleGuessItem(player);
        // PlayerHandler.updateRoleActionVisual(player);
    }
    
    /**
     * 
     * @param {Player} player 
     */
    static updateModifierDisplay(player) {
        let playerMod = ModifierManager.getPlayerModifier(player);
        let displayName = "";
        if (playerMod != null) {
            displayName = " (" + playerMod.getDisplayName() + "§r)"
        }
        PlayerHandler.giveSwordExtraText(player, displayName)
    }
    

    /**
     * 
     * @param {ModifierAlignment} alignment 
     */
    static _getModifierAlignmentColor(alignment) {
        switch (alignment) {
            case ModifierAlignment.MURDERER:
                return "§a";
            case ModifierAlignment.ALL:
                return "§e";
            case ModifierAlignment.KILLERS:
                return "§d";
            case ModifierAlignment.NON_KILLER:
                return "§c";
        }
    }

    /**
     * Get the modifier chance for the specific role alignment.
     * @param {RoleAlignment} roleAlignment 
     */
    static _getModifierChance(roleAlignment) {
        let murdererModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.murderer_modifier_chance");
        let neutralKModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.neutral_killer_modifier_chance");
        let neutralIModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.neutral_independent_modifier_chance");
        let innocentModChance = ScoreboardManager.getTrackedObjective("settings.modifiers.innocent_modifier_chance");
        let modifierChance = ScoreboardManager.getTrackedObjective("settings.modifiers.modifier_chance");
        switch (roleAlignment) {
            case RoleAlignment.INNOCENT:
                return innocentModChance < 0 ? modifierChance : innocentModChance;
            case RoleAlignment.MURDERER:
                return murdererModChance < 0 ? modifierChance : murdererModChance;
            case RoleAlignment.NEUTRAL_KILLER:
                return neutralKModChance < 0 ? modifierChance : neutralKModChance;
            case RoleAlignment.NEUTRAL_INDEPENDENT:
                return neutralIModChance < 0 ? modifierChance : neutralIModChance;
            default:
                return modifierChance;
        }
    }

    /**
     * @returns {Player[]}
     */
    static _getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag("AFK") && ScoreboardManager.getPlayerID(player) >= 0) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }
}
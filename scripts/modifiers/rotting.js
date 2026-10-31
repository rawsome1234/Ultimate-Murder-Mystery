"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";
import { GhostManager } from "../ghost_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";

export class RottingModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!GhostManager.onGhostSpawn.isConnected(RottingModifier.onGhostSpawn)) {
            GhostManager.onGhostSpawn.subscribe(RottingModifier.onGhostSpawn);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Entity} ghost 
     */
    static onGhostSpawn(playerWhoDied, ghost) {
        let playerMod = ModifierManager.getPlayerModifier(playerWhoDied);
        if (playerMod != null && playerMod.getModifierType() == ModifierTypes.ROTTING) {
            let tickingAreaName = "rotting_area_" + ghost.id;
            let tickingAreaRadius = 5;
            world.tickingAreaManager.createTickingArea(tickingAreaName, {dimension: ghost.dimension, from: PlayerHandler.addVectors(ghost.location, {x:-tickingAreaRadius,y:-tickingAreaRadius,z:-tickingAreaRadius}), to: PlayerHandler.addVectors(ghost.location, {x:tickingAreaRadius,y:tickingAreaRadius,z:tickingAreaRadius})});
            if (ghost != null) {
                let rotTime = ScoreboardManager.getTrackedObjective("modifier_settings.rotting.rot_time");
                system.runTimeout(() => {
                    if (ghost != null && ghost.isValid) {
                        ghost.remove();
                        ChatManager.sendDeadPlayersMessage("§e§o" + playerWhoDied.name + "'s ghost has rotted...", LogItemType.ABILITY_MESSAGE);
                    }
                    world.tickingAreaManager.removeTickingArea(tickingAreaName);
                }, rotTime * 20);
            }
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.NON_KILLER;
    }

    /**
     * Gets the valid role types this modifier can be applied to.
     * 
     * @returns {RoleTypes[]}
     */
    getWhitelistedRoles() {
        return [];
    }

    /**
     * A list of role types that this modifier cannot apply to.
     * @returns {RoleTypes[]}
     */
    getBlacklistedRoles() {
        return [];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§jRotting";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        let rotTime = ScoreboardManager.getTrackedObjective("modifier_settings.rotting.rot_time");
        return "Your ghost body will disappear after " + rotTime + " seconds.";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let rotTime = ScoreboardManager.getTrackedObjective("modifier_settings.rotting.rot_time");
        return "After dying, your ghost body will be removed after " + rotTime + " seconds.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.rotting.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.ROTTING;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this modifier.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this modifier can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns if this modifier has met its win condition.
     * If this is true, the player will win, even if they did not win by their role.
     * @param {Player} player
     * @param {RoleAlignment} winningAlignment 
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this modifier and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
            let form = new ModalFormData();
            form.title("Rotting Settings");
    
            form.divider();
            form.label("Rotting is a non-killer modifier that will remove the player's ghost after some time.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.rotting.enabled") != 0;
            form.toggle("Rotting Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            // 4
            let slownessTime = ScoreboardManager.getTrackedObjective("modifier_settings.rotting.rot_time");
            form.slider("Rot Time", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: slownessTime })
            form.label("The amount of time in seconds that the killer is given slowness.");

            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.rotting.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
                ScoreboardManager.setTrackedObjective("modifier_settings.rotting.rot_time", r.formValues[4]);
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let slownessTime = ScoreboardManager.getTrackedObjective("modifier_settings.rotting.rot_time");
        let description = "Rotting is a modifier that will remove the ghost of a player after a time.";
        description += "\n\nRot Time: " + slownessTime + " seconds.";
        return description;
    }
}
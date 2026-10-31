"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";

export class JammerModifier extends Modifier {

    static JAM_TIMER_SCOREBOARD = "modifier_settings.jammer.jam_time";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(JammerModifier.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(JammerModifier.onPlayerDeath);
        }
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            let livingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
            livingPlayers.forEach((pl) => {
                let timeLeft = ScoreboardManager.getScoreboardObjective(pl, JammerModifier.JAM_TIMER_SCOREBOARD);
                if (timeLeft > 0) {
                    ScoreboardManager.addScoreboardObjective(pl, JammerModifier.JAM_TIMER_SCOREBOARD, -1);
                }
                if (timeLeft == 1) {
                    pl.removeTag(ChatManager.BLOCK_INCOMING_MESSAGE_TAG);
                    pl.removeTag(ChatManager.BLOCK_OUTGOING_MESSAGE_TAG);
                    pl.sendMessage("You can use chat again.");
                }
            });
        });
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let playerMod = ModifierManager.getPlayerModifier(playerWhoDied);
        if (playerMod != null && playerMod.getModifierType() == ModifierTypes.JAMMER) {
            if (killer != null) {
                let jamTime = ScoreboardManager.getTrackedObjective("modifier_settings.jammer.jam_time");
                killer.addTag(ChatManager.BLOCK_INCOMING_MESSAGE_TAG);
                killer.addTag(ChatManager.BLOCK_OUTGOING_MESSAGE_TAG);
                playerWhoDied.sendMessage("Your Jammer modifier blocked your killer's chat access!");
                killer.sendMessage("Your chat seems to be only picking up static...");
                ScoreboardManager.setScoreboardObjective(killer, JammerModifier.JAM_TIMER_SCOREBOARD, jamTime * 20);
            }
        }
        playerWhoDied.removeTag(ChatManager.BLOCK_INCOMING_MESSAGE_TAG);
        playerWhoDied.removeTag(ChatManager.BLOCK_OUTGOING_MESSAGE_TAG);
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
        return "§jJammer";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Your killer will not be able to use chat after your death!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let cooldownMultiplier = ScoreboardManager.getTrackedObjective("modifier_settings.diseased.cooldown_multiplier");
        return "After you die, your killer's next cooldown will be " + (cooldownMultiplier/100) + "x.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.jammer.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return ModifierTypes.JAMMER;
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
        form.title("Jammer Settings");

        form.divider();
        form.label("Jammer is a non-killer modifier that will block the player's killer from using chat for a short time.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.jammer.enabled") != 0;
        form.toggle("Jammer Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let jamTime = ScoreboardManager.getTrackedObjective("modifier_settings.jammer.jam_time");
        form.slider("Jam Time", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: jamTime })
        form.label("The amount of time in seconds that the killer is blocked from receiving and sending chat messages.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.jammer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.jammer.jam_time", r.formValues[4]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let jamTime = ScoreboardManager.getTrackedObjective("modifier_settings.jammer.jam_time");
        let description = "Jammer is a modifier that will block the player's killer from using chat for a time.";
        description += "\n\nBlock Chat Time: " + jamTime + " seconds.";
        return description;
    }
}
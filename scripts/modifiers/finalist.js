"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { PlayerHandler } from "../player_handler";

export class FinalistModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(FinalistModifier.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(FinalistModifier.onPlayerDeath);
        }
        super.initialize();
    }

    static onPlayerDeath(player, killer) {
        let allPlayers = world.getAllPlayers();
        let finalistPlayers = PlayerHandler.sortPlayersWithModifier(allPlayers, ModifierTypes.FINALIST);
        system.runTimeout(() => {
            finalistPlayers.forEach((pl) => FinalistModifier.refreshFinalistCooldown(pl));
        }, 1);
    }

    static refreshFinalistCooldown(player) {
        let ratio = FinalistModifier.getCurrentLivingPlayerRatio();
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Ratio is now " + ratio));
        ScoreboardManager.setScoreboardObjective(player, "player.default_cooldown_multiplier", ratio);
        // let currentMultiplier
        // ScoreboardManager.setScoreboardObjective(player, "")
    }
    
    static getCurrentLivingPlayerRatio() {
        let allPlayers = world.getAllPlayers();
        let playingPlayers = PlayerHandler.getPlayingPlayers(allPlayers);
        let livingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
        let ratio = livingPlayers.length * 1.0 / playingPlayers.length;
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Raw Ratio is now " + ratio));
        let cooldownRatio = Math.floor(ratio * 100);
        return cooldownRatio;
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        FinalistModifier.refreshFinalistCooldown(player);
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.ALL;
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
        return "§uFinalist";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Your cooldown gets shorter and shorter as players die!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "Your cooldown is reduced directly by the number of players dead. As more players die, your cooldown will be silently updated to be shorter.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.finalist.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    hasAbility(player) {
        return false;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.FINALIST;
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
     * Activates the ability of this modifier for the given player. Assumes
     * the player has this modifier.
     */
    activateAbility(player) {
    }

    /**
     * Activates the ability of this modifier for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
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
        form.title("Finalist Settings");

        form.divider();
        form.label("Finalist is a universal modifier that decreases the user's cooldown based on how many players have died.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.finalist.enabled") != 0;
        form.toggle("Finalist Enabled", { defaultValue: modifierEnabled }); // 2

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.finalist.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            // ScoreboardManager.setTrackedObjective("modifier_settings._.cooldown_time", r.formValues[4]);
            // ScoreboardManager.setTrackedObjective("modifier_settings._.action_uses", r.formValues[6]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let description = "Finalist is a universal modifier that will decrease the user's cooldown based on how many players are alive.";
        // description += "\n\nConfig Name";
        return description;
    }
}
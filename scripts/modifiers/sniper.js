"use strict";

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";

export class SniperModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        // if (!SignalOwner.signalName.isConnected(this.signalReceiver)) {
        //     SignalOwner.signalName.subscribe(this.signalReceiver);
        // }
        super.initialize();
    }

    // static signalReceiver(params) {

    // }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let guesses = ScoreboardManager.getTrackedObjective("modifier_settings.sniper.guess_count");
        if (ScoreboardManager.getScoreboardObjective(player, "player.guesses") < guesses) {
            ScoreboardManager.setScoreboardObjective(player, "player.guesses", guesses);
        }
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
        return "§eSniper";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "You can guess anyone!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "You have one use of a global guess!";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.sniper.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    getGuessAlignments() {
        return [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT, RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER];
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
        return ModifierTypes.SNIPER;
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
        form.title("Sniper Settings");

        form.divider();
        form.label("The sniper is a universal modifier that lets the player guess any role");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.sniper.enabled") != 0;
        form.toggle("Sniper Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let guessCount = ScoreboardManager.getTrackedObjective("modifier_settings.sniper.guess_count");
        form.slider("Guess Count", -1, 10, { defaultValue: guessCount })
        form.label("The number of guesses the sniper gets. -1 is infinite.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.sniper.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.sniper.guess_count", r.formValues[4]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let guessCount = ScoreboardManager.getTrackedObjective("modifier_settings.sniper.guess_count");

        let description = "The sniper is a universal modifier that grants lets the player guess all alignments";
        description += "\n\nGuess Count: " + guessCount;
        return description;
    }
}
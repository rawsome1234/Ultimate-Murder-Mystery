"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";

export class HackerModifier extends Modifier {
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
        super.giveToPlayer(player);
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.hacker.cooldown_reduction");
        // ScoreboardManager.setScoreboardObjective(player, "player.cooldown_multiplier", 100 - cooldownTime);
        ScoreboardManager.setScoreboardObjective(player, "player.default_cooldown_multiplier", 100 - cooldownTime);
        let currentCooldown = player.getItemCooldown("role_action");
        if (currentCooldown > 0) {
            let multiplier = (100 - cooldownTime) / 100
            system.run(() => {
                player.startItemCooldown("role_action", currentCooldown * multiplier);
            });
        }
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
        let allRoles = RoleManager.getRoles();
        let blackListed = allRoles.filter((r) => !r.canUseAbility());
        return blackListed.map((r) => r.getRoleType());
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§aHacker";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Your role cooldowns are reduced!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.hacker.cooldown_reduction");
        return "Your role cooldowns are reduced by " + (cooldownTime / 100) + "x";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.hacker.enabled") != 0;
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
        return ModifierTypes.HACKER;
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
        form.title("Hacker Settings");

        form.divider();
        form.label("Hacker is a modifier that reduces role ability cooldowns.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.hacker.enabled") != 0;
        form.toggle("Hacker Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.hacker.cooldown_reduction");
        form.slider("Cooldown Reduction", 5, 100, { valueStep: 5, defaultValue: cooldownTime })
        form.label("The percent reduction in cooldown granted by hacker.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.hacker.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.hacker.cooldown_reduction", r.formValues[4]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.hacker.cooldown_reduction");

        let description = "Hacker is a universal modifier that decreases the role ability cooldowns of a player.";
        description += "\n\nCooldown Reduction: -" + (cooldownTime / 100) + "x";
        return description;
    }
}
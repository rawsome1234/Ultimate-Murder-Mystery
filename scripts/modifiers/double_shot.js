"use strict";

import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";

export class DoubleShotModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        // if (!GuessingManager.onGuessSubmit.isConnected(DoubleShotModifier.onGuessSubmit)) {
        //     GuessingManager.onGuessSubmit.subscribe(DoubleShotModifier.onGuessSubmit);
        // }
        super.initialize();
    }

    static onGuessSubmit(guesser, guessed, guessedRole, wasCorrect) {
        let guesserMod = ModifierManager.getPlayerModifier(guesser);
        if (guesserMod != null && guesserMod.getModifierType() == ModifierTypes.DOUBLE_SHOT) {
            let consumed = ScoreboardManager.getScoreboardObjective(guesser, "player.modifier_used") != 0;
            if (!consumed && !wasCorrect) {
                ScoreboardManager.setScoreboardObjective(guesser, "player.modifier_used", 1);
                guesser.sendMessage("Double Shot saved you from an incorrect guess...");
                return true;
            }
        } 
        return false;
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // ScoreboardManager.setScoreboardObjective(player, "player.modifier_used", 0);
        ScoreboardManager.addScoreboardObjective(player, "player.safe_guesses", 1);
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.MURDERER;
    }

    /**
     * Gets the valid role types this modifier can be applied to.
     * 
     * @returns {RoleTypes[]}
     */
    getWhitelistedRoles() {
        return [RoleTypes.VIGILANTE];
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
        return "§cDouble Shot";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "If you incorrectly guess someone's role or modifier, you will get a second chance.";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "You get 1 safe guess, meaning if you guess a player's role or modifier incorrectly, instead of being killed you will receive a second chance.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.double_shot.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0;
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
        return ModifierTypes.DOUBLE_SHOT;
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
            form.title("Double Shot Settings");
    
            form.divider();
            form.label("Double Shot is a modifier that allows a player to survive an incorrect guess.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.double_shot.enabled") != 0;
            form.toggle("Double Shot Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();

    
            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.double_shot.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let description = "Double Shot is a modifier that allows a player to survive an incorrect guess.";
        return description;
    }
}
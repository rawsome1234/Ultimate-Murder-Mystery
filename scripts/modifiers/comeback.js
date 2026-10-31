"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { PlayerHandler } from "../player_handler";

export class ComebackModifier extends Modifier {
    
    static COMEBACK_USED_PROPERTY = "comebackConsumed";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            let comebackPlayers = PlayerHandler.sortPlayersWithModifier(allPlayers, ModifierTypes.COMEBACK);

            let strengthAmplifier = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_amplifier");
            let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_duration");
            let healthThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.health_threshold");

            comebackPlayers.forEach((pl) => {
                let healthComp = pl.getComponent("minecraft:health");
                
                let meetsThreshold = healthComp.currentValue <= healthThreshold;
                let consumed = pl.getDynamicProperty(ComebackModifier.COMEBACK_USED_PROPERTY);
                if (meetsThreshold && !consumed) {
                    // start strength
                    let duration = 20;
                    if (strengthDuration > 0) {
                        duration = strengthDuration * 20;
                        pl.setDynamicProperty(ComebackModifier.COMEBACK_USED_PROPERTY, true);
                    }

                    pl.addEffect("minecraft:strength", duration, {amplifier: strengthAmplifier, showParticles: false});
                }
                else if (!meetsThreshold && consumed) {
                    pl.setDynamicProperty(ComebackModifier.COMEBACK_USED_PROPERTY, false);
                }
            });
        }, 1);
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        player.setDynamicProperty(ComebackModifier.COMEBACK_USED_PROPERTY, false);
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
        return "§pComeback";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Gain strength on low health!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let healthThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.health_threshold");
        let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_duration");
        let durationText = strengthDuration == 0 ? "until you're above the threshold." : "for " + strengthDuration + " seconds.";
        return "When you are at or below " + (healthThreshold / 2) + " hearts, you will receive strength " + durationText;
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.comeback.enabled") != 0;
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
        return ModifierTypes.COMEBACK;
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
        form.title("Comeback Settings");

        form.divider();
        form.label("Comeback is a non-killer modifier that gives the player strength when on low health.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.enabled") != 0;
        form.toggle("Comeback Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let healthThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.health_threshold");
        form.slider("Health Threshold", 1, 20, { valueStep: 1, defaultValue: healthThreshold })
        form.label("If the player is under this number (in half-hearts), they will receive strength.");
        
        let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_duration");
        form.slider("Strength Duration", 0, 30, { defaultValue: strengthDuration }); // 6
        form.label("How long the strength lasts. 0 means it lasts as long as the player is under the health threshold.");
        
        let strengthAmplifier = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_amplifier");
        form.slider("Strength Amplifier", 0, 4, { defaultValue: strengthAmplifier }); // 8
        form.label("The amplifier of the strength given.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.comeback.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.comeback.health_threshold", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.comeback.strength_duration", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.comeback.strength_amplifier", r.formValues[8]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let healthThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.health_threshold");
        let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_duration");
        let strengthAmplifier = ScoreboardManager.getTrackedObjective("modifier_settings.comeback.strength_amplifier");

        let description = "Comeback is a non-killer modifier that gives strength when on low health.";
        description += "\n\nHealth Threshold: " + (healthThreshold / 2) + " hearts";
        description += "\nStrength Duration: " + (strengthDuration == 0 ? "while low" : (strengthDuration + " seconds"));
        description += "\nStrength Amplifier: " + strengthAmplifier;

        return description;
    }
}
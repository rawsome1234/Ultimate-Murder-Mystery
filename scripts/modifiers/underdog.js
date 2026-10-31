"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { PlayerHandler } from "../player_handler";
import { RoleAssignment } from "../role_assignment";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class UnderdogModifier extends Modifier {

    static UNDERDOG_ACTIVE_PROPERTY = "underdogActive";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(UnderdogModifier.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(UnderdogModifier.onPlayerDeath);
        }
        RoleAssignment.afterRolesAssigned.subscribe(() => {
            system.runTimeout(UnderdogModifier.afterRolesAssigned, 1);
        });
        super.initialize();
    }

    static onPlayerDeath(playerWhoDied, killer) {
        UnderdogModifier.afterRolesAssigned();
    }

    static afterRolesAssigned() {
        let allPlayers = world.getAllPlayers();
        let underdogPlayers = PlayerHandler.sortPlayersWithModifier(allPlayers, ModifierTypes.UNDERDOG);
        // allPlayers.forEach((pl) => pl.sendMessage("Checking underdog activation, found " + underdogPlayers.length + " underdogs"));
        underdogPlayers.forEach((pl) => UnderdogModifier.checkForActivation(pl));
    }

    /**
     * 
     * @param {Player} underdog 
     */
    static checkForActivation(underdog) {
        // underdog.sendMessage("Checking for activation, status: " + underdog.getDynamicProperty(UnderdogModifier.UNDERDOG_ACTIVE_PROPERTY));
        if (!underdog.getDynamicProperty(UnderdogModifier.UNDERDOG_ACTIVE_PROPERTY)) {
            let allPlayers = world.getAllPlayers();
            let killers = PlayerHandler.sortPlayersWithAlignment(allPlayers, [RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER]);
            // underdog.sendMessage(killers.length + " killers left");
            if (killers.length == 1 && killers[0].id == underdog.id) {
                underdog.setDynamicProperty(UnderdogModifier.UNDERDOG_ACTIVE_PROPERTY, true);
                let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.underdog.cooldown_reduction");
                ScoreboardManager.setScoreboardObjective(underdog, "player.default_cooldown_multiplier", 100 - cooldownTime);
                SoundManager.playSoundEffect([underdog], SoundEffectType.UNDERDOG_ACTIVATE);
                underdog.sendMessage("§v§oYour underdog boost is active! All future cooldowns will be reduced by " + cooldownTime + "\%");
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
        player.setDynamicProperty(UnderdogModifier.UNDERDOG_ACTIVE_PROPERTY, false);
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.KILLERS;
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
        return "§vUnderdog";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Reduced cooldown when you're the last killer remaining!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "Upon becoming the final killer remaining, your cooldown will be reduced for the rest of the game. If you start as the only killer, your first cooldown will not be different.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.underdog.enabled") != 0;
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
        return ModifierTypes.UNDERDOG;
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
        form.title("Underdog Settings");

        form.divider();
        form.label("The underdog is a killer modifier that halves the player's cooldown if they are the final killer remaining.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.underdog.enabled") != 0;
        form.toggle("Underdog Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.underdog.cooldown_reduction");
        form.slider("Cooldown Reduction", 5, 100, { valueStep: 5, defaultValue: cooldownTime })
        form.label("The reduction in percent of the base cooldown. Still subject to one-time use cooldown modifications.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.underdog.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.underdog.cooldown_reduction", r.formValues[4]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.underdog.cooldown_reduction");
        
        let description = "Underdog is a modifier that will reduce a killer's cooldown when they're the final killer.";
        description += "\n\nCooldown Reduction: -" + (cooldownTime / 100) + "x";
        return description;
    }
}
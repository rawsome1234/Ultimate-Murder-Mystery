"use strict";

import { system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";

export class NurseModifier extends Modifier {
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
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", cooldown * 20);
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_used", 0);
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
        return "§aNurse";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Heal yourself when in an emergency!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "After using your modifier ability, you will get healed after a small delay.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.nurse.enabled") != 0;
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
        return true;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.NURSE;
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
        let modifierUsed = ScoreboardManager.getScoreboardObjective(player, "player.modifier_used") != 0;
        if (modifierUsed) {
            player.sendMessage("Nurse has already been consumed.");
            return;
        }

        // ability effect
        let healStrength = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.health_strength");
        let healDelay = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.heal_delay");
        
        player.sendMessage("§a§oYou'll heal in " + healDelay + " seconds...");
        system.runTimeout(() => {
            player.addEffect("minecraft:instant_health", 1, {showParticles: false, amplifier: healStrength});
            SoundManager.playSoundEffect([player], SoundEffectType.NURSE_HEAL);
            player.sendMessage("§a§oYou've healed!");
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " healed using Nurse!", LogItemType.ABILITY_MESSAGE);
        }, healDelay * 20);
        
        // ability activate message
        
        // sets cooldown
        ScoreboardManager.addScoreboardObjective(player, "player.modifier_used", 1);
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
        form.title("Nurse Settings");

        form.divider();
        form.label("Nurse is a universal modifier where you can heal yourself after a small delay.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.tarot_reader.enabled") != 0;
        form.toggle("Nurse Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.cooldown");
        form.slider("Nurse Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The cooldown before you can use nurse the first time.");
        
        let healStrength = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.health_strength");
        form.slider("Instant Health Amplifier", 0, 5, { defaultValue: healStrength }); // 6
        form.label("The amplifier of the health gotten by nurse. Each level adds two hearts.");
        
        let healDelay = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.heal_delay");
        form.slider("Instant Health Amplifier", 0, 5, { defaultValue: healDelay }); // 8
        form.label("The amplifier of the health gotten by nurse. Each level adds two hearts.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.tarot_reader.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.nurse.cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.nurse.health_strength", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.nurse.heal_delay", r.formValues[8]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.cooldown");
        let healStrength = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.health_strength");
        let healDelay = ScoreboardManager.getTrackedObjective("modifier_settings.nurse.heal_delay");

        let description = "Nurse is a universal modifier that lets you heal yourself after a small delay.";
        description += "\n\nCooldown: " + cooldownTime + " seconds.";
        description += "\nInstant Health Amplifier: " + healStrength;
        description += "\nHeal Delay: " + healDelay + " seconds.";
        return description;
    }
}
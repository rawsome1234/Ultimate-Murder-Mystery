"use strict";

import { world, system, Player, EntityDieAfterEvent } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";

export class LifestealModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        world.afterEvents.entityDie.subscribe(LifestealModifier.onEntityDeath);
        // if (!SignalOwner.signalName.isConnected(this.signalReceiver)) {
        //     SignalOwner.signalName.subscribe(this.signalReceiver);
        // }
        super.initialize();
    }

    /**
     * 
     * @param {EntityDieAfterEvent} event 
     */
    static onEntityDeath(event) {
        let deadEntity = event.deadEntity;
        let killer = event.damageSource.damagingEntity;
        let killerIsPlayerFlag = killer != null && killer.typeId == "minecraft:player";
        let entityIsPlayerFlag = deadEntity != null && deadEntity.typeId == "minecraft:player";
        if (killerIsPlayerFlag && entityIsPlayerFlag) {
            let playerMod = ModifierManager.getPlayerModifier(killer);
            if (playerMod != null && playerMod.getModifierType() == ModifierTypes.LIFESTEAL) {
                // activate lifesteal
                let healAmount = ScoreboardManager.getTrackedObjective("modifier_settings.lifesteal.heal_amount");
                let healthComponent = killer.getComponent("minecraft:health");
                killer.sendMessage("You were healed by Lifesteal!");
                system.run(() => healthComponent.setCurrentValue(Math.min(healthComponent.effectiveMax, healthComponent.currentValue + healAmount)));
            }
        }
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
        return "§uLifesteal";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Heal when you get kills!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let healAmount = ScoreboardManager.getTrackedObjective("modifier_settings.lifesteal.heal_amount");
        return "When you kill someone, you will heal for " + (healAmount / 2) + " hearts";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.lifesteal.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return ModifierTypes.LIFESTEAL;
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
        form.title("Lifesteal Settings");

        form.divider();
        form.label("Lifesteal is a killer modifier that heals the player when they kill someone.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.lifesteal.enabled") != 0;
        form.toggle("Lifesteal Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let healAmount = ScoreboardManager.getTrackedObjective("modifier_settings.lifesteal.heal_amount");
        form.slider("Heal Amount", 1, 20, { defaultValue: healAmount })
        form.label("The amount that Lifesteal heals, in half-hearts.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.lifesteal.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.lifesteal.heal_amount", r.formValues[4]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let healAmount = ScoreboardManager.getTrackedObjective("modifier_settings.lifesteal.heal_amount");

        let description = "Lifesteal is a killer modifier that heals the player upon getting a kill.";
        description += "\n\nHeal Amount: " + (healAmount / 2) + " hearts";
        return description;
    }
}
"use strict";

import { world, Player, EntityDamageCause, EntityHurtAfterEvent } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";
import { PlayerHandler } from "../player_handler";

export class PricklyModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        world.afterEvents.entityHurt.subscribe(PricklyModifier.onEntityHitEntity);
        super.initialize();
    }

    /**
     * 
     * @param {EntityHurtAfterEvent} event 
     */
    static onEntityHitEntity(event) {
        let hitEntity = event.hurtEntity;
        let damagingEntity = event.damageSource.damagingEntity;
        if (damagingEntity != null && damagingEntity.typeId == "minecraft:player" && hitEntity.typeId == "minecraft:player") {
            let modifier = ModifierManager.getPlayerModifier(hitEntity);
            if (modifier != null && modifier.getModifierType() == ModifierTypes.PRICKLY) {
                // activate thorns
                let thornsChance = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_chance");
                let damageThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.damage_threshold_for_thorns");
                let thornsDamage = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_damage");

                if (ScoreboardManager.rollRandomNumber(0, 100) < thornsChance && event.damage >= damageThreshold) {
                    // thorns
                    damagingEntity.applyDamage(thornsDamage, {damagingEntity: hitEntity, cause: EntityDamageCause.thorns});
                    
                    let knockbackDirection = PlayerHandler._normalize(PlayerHandler.subtractVectors(damagingEntity.location, hitEntity.location));
                    let knockback = PlayerHandler.scaleVector(knockbackDirection, 2);
                    damagingEntity.applyKnockback({x: knockback.x, z: knockback.z}, .3);
                }
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
        return "§qPrickly";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "You have a small chance for thorns damage!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let thornsChance = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_chance");
        let damageThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.damage_threshold_for_thorns");
        return "When someone hits your for more than " + (damageThreshold / 2) + " hearts of damage, there is a " + thornsChance + "/100 chance they will receive thorns damage.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.prickly.enabled") != 0;
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
        return ModifierTypes.PRICKLY;
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
        form.title("Prickly Settings");

        form.divider();
        form.label("Prickly is a universal modifier that has a chance to deal thorns damage when the player is hit.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.enabled") != 0;
        form.toggle("Prickly Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let thornsChance = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_chance");
        form.slider("Thorns Chance", 0, 100, { valueStep: 5, defaultValue: thornsChance })
        form.label("The chance when someone hits this player to receive damage, as a percent.");
        
        let damageThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.damage_threshold_for_thorns");
        form.slider("Damage Threshold", 0, 20, { defaultValue: damageThreshold }); // 6
        form.label("The amount of damage that someone has to do to trigger Prickly, in half-hearts.");
        
        let thornsDamage = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_damage");
        form.slider("Prickly Damage", 1, 20, { defaultValue: thornsDamage }); // 6
        form.label("The amount of damage that the thorns does.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.prickly.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.prickly.thorns_chance", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.prickly.damage_threshold_for_thorns", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.prickly.thorns_damage", r.formValues[6]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let thornsChance = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_chance");
        let damageThreshold = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.damage_threshold_for_thorns");
        let thornsDamage = ScoreboardManager.getTrackedObjective("modifier_settings.prickly.thorns_damage");

        let description = "Prickly is a universal modifier that has a chance to deal thorns damage when the player is hit.";
        description += "\n\nThorns Chance: " + thornsChance;
        description += "\nDamage Threshold: " + (damageThreshold / 2) + " hearts";
        description += "\nThorns Damage: " + thornsDamage;
        return description;
    }
}
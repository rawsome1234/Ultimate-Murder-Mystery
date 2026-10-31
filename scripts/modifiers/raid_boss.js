"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";

export class RaidBossModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(RaidBossModifier.updateHealthBoost, 15);
        super.initialize();
    }

    static updateHealthBoost() {
        world.getAllPlayers().forEach((pl) => {
            if (ScoreboardManager.getPlayerID(pl) >= 0 && !pl.hasTag("dead")) {
                let modifier = ModifierManager.getPlayerModifier(pl);
                if (modifier != null && modifier.getModifierType() == ModifierTypes.RAID_BOSS) {
                    let healthAmp = ScoreboardManager.getTrackedObjective("modifier_settings.raid_boss.health_amp");
                    pl.addEffect("minecraft:health_boost", 20, {showParticles: false, amplifier: healthAmp});
                }
            }
        });
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
        return [RoleTypes.TEMPEST];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§mRaid Boss";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "You have extra health! You're a force to be reckoned with!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let healthAmp = ScoreboardManager.getTrackedObjective("modifier_settings.raid_boss.health_amp");
        return "For this round, you permanantly have " + ((healthAmp+1)*2) + " extra hearts." ;
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.raid_boss.enabled") != 0;
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
        return ModifierTypes.RAID_BOSS;
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
            form.title("Raid Boss Settings");
    
            form.divider();
            form.label("Raid Boss is a modifier for killing roles that gives a player more health.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.raid_boss.enabled") != 0;
            form.toggle("Raid Boss Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            // 4
            let healthAmp = ScoreboardManager.getTrackedObjective("modifier_settings.raid_boss.health_amp");
            form.slider("Extra Hearts", 2, 10, { valueStep: 2, defaultValue: (healthAmp+1)*2 });
            form.label("The number of extra hearts raid boss grants.");
    
            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.raid_boss.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
                ScoreboardManager.setTrackedObjective("modifier_settings.raid_boss.health_amp", (r.formValues[4]/2)-1);
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let healthAmp = ScoreboardManager.getTrackedObjective("modifier_settings.raid_boss.health_amp");
        let description = "Raid Boss is a modifier that gives killers extra health.";
        description += "\n\nExtra Health: " + ((healthAmp+1)*2) + " Hearts";
        return description;
    }
}
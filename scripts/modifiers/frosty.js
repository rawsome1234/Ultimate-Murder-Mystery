"use strict";

import { world, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";
import { DeathHandler } from "../death_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class FrostyModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(FrostyModifier.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(FrostyModifier.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let playerMod = ModifierManager.getPlayerModifier(playerWhoDied);
        if (playerMod != null && playerMod.getModifierType() == ModifierTypes.FROSTY) {
            if (killer != null) {
                playerWhoDied.sendMessage("Your Frosty modifier gave your killer slowness!");
                killer.sendMessage("You were slowed by that kill...");
                SoundManager.playSoundEffect([killer], SoundEffectType.CRYOMANCER_FREEZE);
                let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.show_particles") != 0;
                let slownessTime = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.slowness_time");
                let slownessAmplifier = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.slowness_amplifier");
                killer.addEffect("minecraft:slowness", slownessTime * 20, {amplifier:slownessAmplifier, showParticles: showParticles});
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
        return "§wFrosty";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Give your killer slowness!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "After you die, your killer will be given slowness.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.frosty.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return ModifierTypes.FROSTY;
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
            form.title("Frosty Settings");
    
            form.divider();
            form.label("Frosty is a non-killer modifier that slows down the player that kills this player.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.enabled") != 0;
            form.toggle("Frosty Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            // 4
            let slownessTime = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.slowness_time");
            form.slider("Slowness Time", 3, 30, { defaultValue: slownessTime })
            form.label("The amount of time in seconds that the killer is given slowness.");
            
            let slownessAmplifier = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.slowness_amplifier");
            form.slider("Slowness Amplifier", 0, 10, { defaultValue: slownessAmplifier }); // 6
            form.label("The amplifier of the slowness. The slowness level is thus amplifier + 1");

            let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.show_particles") != 0;
            form.toggle("Show Slowness Particles", {defaultValue: showParticles}); // 8
            form.label("Whether to have the particles on the slowed player show. May give away they killed the frosty player.");

            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.frosty.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
                ScoreboardManager.setTrackedObjective("modifier_settings.frosty.slowness_time", r.formValues[4]);
                ScoreboardManager.setTrackedObjective("modifier_settings.frosty.slowness_amplifier", r.formValues[6]);
                ScoreboardManager.setTrackedObjective("modifier_settings.frosty.show_particles", r.formValues[8] ? 1 : 0);
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let slownessTime = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.slowness_time");
        let slownessAmplifier = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.slowness_amplifier");
        let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.frosty.show_particles") != 0;

        let description = "Frosty is a modifier that slows your killer after dying.";
        description += "\n\nSlowness Time: " + slownessTime + " seconds.";
        description += "\nSlowness Amplifier: " + slownessAmplifier;
        description += "\nShow Particles: " + showParticles;
        return description;
    }
}
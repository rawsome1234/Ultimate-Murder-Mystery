"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class AddictModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            let addicts = PlayerHandler.sortPlayersWithModifier(allPlayers, ModifierTypes.ADDICT);
            let nauseaDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_duration");
            
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            
            addicts.forEach((add) => {
                let injectionUsed = ScoreboardManager.getScoreboardObjective(add, "player.modifier_used") != 0;
                let nauseaTime = ScoreboardManager.getScoreboardObjective(add, "modifier_settings.addict.nausea_separation_min");
                if (injectionUsed) {
                    if (nauseaTime > 0) {
                        ScoreboardManager.addScoreboardObjective(add, "modifier_settings.addict.nausea_separation_min", -1);
                    }
                    else {
                        add.addEffect("minecraft:nausea", nauseaDuration*20, {showParticles:false});
                        // add.sendMessage("Resetting nausea");
                        AddictModifier.resetNausea(add, nauseaDuration);
                    }
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
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.addict.cooldown");
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
        return "§2Addict";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Gain strength and resistance for a short time!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let effectDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.effect_duration");
        let nauseaSeparationMin = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_min");
        let nauseaSeparationMax = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_max");
        return "Right click your sword to inject yourself with strength and resistance for " + effectDuration + " seconds. After using it, you will receive nausea every " + nauseaSeparationMin + "-" + nauseaSeparationMax + " seconds.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.addict.enabled") != 0;
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
        return ModifierTypes.ADDICT;
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
     * 
     * @param {Player} player 
     * @param {number} offset in seconds, an extra amount of time
     */
    static resetNausea(player, offset) {
        let nauseaSeparationMin = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_min");
        let nauseaSeparationMax = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_max");
        let nauseaTime = ScoreboardManager.rollRandomNumber(nauseaSeparationMin, nauseaSeparationMax) + offset;
        ScoreboardManager.setScoreboardObjective(player, "modifier_settings.addict.nausea_separation_min", nauseaTime*20);
    }

    /**
     * Activates the ability of this modifier for the given player. Assumes
     * the player has this modifier.
     * @param {Player} player 
     */
    activateAbility(player) {
        let modifierUsed = ScoreboardManager.getScoreboardObjective(player, "player.modifier_used") != 0;
        if (modifierUsed) {
            player.sendMessage("Addict has already been consumed.");
            return;
        }

        // ability effect
        let effectDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.effect_duration");
        
        player.addEffect("minecraft:strength", effectDuration * 20, {showParticles: false});
        player.addEffect("minecraft:resistance", effectDuration * 20, {showParticles: false});
        SoundManager.playSoundEffect([player], SoundEffectType.ADDICT_INJECT);

        // ability activate message
        player.sendMessage("§2§oYou've injected yourself! You have " + effectDuration + " seconds!");
        ChatManager.sendDeadPlayersMessage("§2§o" + player.name + " injected themselves for " + effectDuration + " seconds!", LogItemType.ABILITY_MESSAGE);

        // sets cooldown
        ScoreboardManager.addScoreboardObjective(player, "player.modifier_used", 1);
        AddictModifier.resetNausea(player, effectDuration);
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        form.title("Addict Settings");

        form.divider();
        form.label("Addict is a non-killer modifier that lets a player gain strenght and resistance. After the effects wear off, the player will occasionally receive nausea.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.addict.enabled") != 0;
        form.toggle("Addict Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.addict.cooldown");
        form.slider("Addict Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of addict, in seconds. Only applies at the start of the game");
        
        let effectDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.effect_duration");
        form.slider("Effect Duration", 3, 30, { defaultValue: effectDuration }); // 6
        form.label("The number of seconds that the strength and resistance will last.");
        
        let nauseaSeparationMin = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_min");
        form.slider("Nausea Separation Time (Min)", 30, 300, { defaultValue: nauseaSeparationMin, valueStep: 5 }); // 8
        form.label("The minimum amount of time in seconds after a burst of nausea before another wave occurs.");
        
        let nauseaSeparationMax = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_max");
        form.slider("Nausea Separation Time (Max)", 30, 300, { defaultValue: nauseaSeparationMax, valueStep: 5 }); // 10
        form.label("The maximum amount of time in seconds after a burst of nausea before another wave occurs.");
        
        let nauseaDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_duration");
        form.slider("Nausea Duration", 0, 30, { defaultValue: nauseaDuration }); // 12
        form.label("The amount of time in seconds that the nausea lasts. Recommended to be at least 5 to get the actual effect.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.addict.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.addict.cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.addict.effect_duration", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.addict.nausea_separation_min", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("modifier_settings.addict.nausea_separation_max", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("modifier_settings.addict.nausea_duration", r.formValues[12]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.addict.cooldown");
        let effectDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.effect_duration");
        let nauseaSeparationMin = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_min");
        let nauseaSeparationMax = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_separation_max");
        let nauseaDuration = ScoreboardManager.getTrackedObjective("modifier_settings.addict.nausea_duration");
        
        let description = "Addict is a non-killer modifier that grants the player a one-time use ability that gives strength and nausea. After using it, they get nausea every so often.";
        description += "\n\nCooldown Time: " + cooldownTime;
        description += "\nEffect Duration: " + effectDuration;
        description += "\nNausea Time Separation: " + nauseaSeparationMin + "-" + nauseaSeparationMax + " seconds";
        description += "\nNausea Duration: " + nauseaDuration;
        return description;
    }
}
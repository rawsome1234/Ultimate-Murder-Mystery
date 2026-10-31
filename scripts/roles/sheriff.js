"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";

export class SheriffRole extends InnocentRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.sheriff.action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.sheriff.cooldown_time");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§6Sheriff";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Keep players in line by sacrificing health for strength!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let effectLength = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_duration");
        let damage = ScoreboardManager.getTrackedObjective("role_settings.sheriff.heart_loss");
        return ("You're a powerful threat to the killers. Sacrifice " + (damage / 2) + " health for " + effectLength + " seconds of strength.");
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.sheriff.enabled");
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        return [];
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.SHERIFF;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this role can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns whether this role counts towards win condition tracking.
     * @returns {boolean}
     */
    countsInTracking(player) {
        return true;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player
     */
    activateAbility(player) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            let effectLength = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_duration") * 20;

            let damage = ScoreboardManager.getTrackedObjective("role_settings.sheriff.heart_loss");
            let amp = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_amp");

            // ability effect
            let currentHealth = player.getComponent("minecraft:health").currentValue;
            let abilitySelfKills = ScoreboardManager.getTrackedObjective("role_settings.sheriff.ability_can_self_kill") != 0;
            damage = !abilitySelfKills && (damage >= currentHealth) ? currentHealth - 1 : damage;
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Setting health to " + (currentHealth - damage)));
            // player.getComponent("minecraft:health").setCurrentValue(currentHealth - damage);
            player.applyDamage(damage);

            // let goalDamage = damage;
            // let afterDamageHealth = currentHealth - damage;
            // if (abilityDamageSelf && afterDamageHealth - damage < 1) {
            //     goalDamage = currentHealth - 1;
            // }
            // player.applyDamage(goalDamage);
            player.addEffect("minecraft:strength", effectLength, { showParticles: false, amplifier: amp });
            // player.addEffect("minecraft:resistance", effectLength, {});
            player.sendMessage("§6Your attack is boosted!");
            ChatManager.sendDeadPlayersMessage("§6§o" + player.name + " used their Sheriff ability.", LogItemType.ABILITY_MESSAGE);

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.sheriff.cooldown_time");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Sheriff Settings");

        form.divider();
        form.label("The sheriff is an innocent role that can sacrifice some of their health for temporary strength.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.sheriff.enabled") != 0;
        form.toggle("Sheriff Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.sheriff.cooldown_time");
        form.slider("Strength Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of the Sheriff.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.sheriff.action_uses");
        form.slider("Strength Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the Sheriff can use their ability. -1 is infinite uses");
        
        let healthLoss = ScoreboardManager.getTrackedObjective("role_settings.sheriff.heart_loss");
        form.slider("Health Loss", 0, 20, { defaultValue: healthLoss }); // 8
        form.label("The amount of health (in half hearts) the sheriff will lose upon using their ability.");
        
        let abilityDamageSelf = ScoreboardManager.getTrackedObjective("role_settings.sheriff.ability_can_self_kill") != 0;
        form.toggle("Can Ability Self Kill", { defaultValue: abilityDamageSelf }); // 10
        form.label("If true, using the Sheriff's ability could kill the Sheriff if they don't have enough health. If false, their ability will never kill.");
        
        let effectTime = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_duration");
        form.slider("Effect time", 5, 30, { defaultValue: effectTime }); // 12
        form.label("The number of seconds strength lasts.");
        
        let strengthAmp = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_amp");
        form.slider("Strength Amp", 0, 4, { defaultValue: strengthAmp }); // 14
        form.label("The amplifier of the Sheriff's Strength.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.heart_loss", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.ability_can_self_kill", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.strength_duration", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.sheriff.strength_amp", r.formValues[14]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
       let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.sheriff.cooldown_time");
       let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.sheriff.action_uses");
       let healthLoss = ScoreboardManager.getTrackedObjective("role_settings.sheriff.heart_loss");
       let abilityDamageSelf = ScoreboardManager.getTrackedObjective("role_settings.sheriff.ability_can_self_kill") != 0;
       let effectTime = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_duration");
       let strengthAmp = ScoreboardManager.getTrackedObjective("role_settings.sheriff.strength_amp");

       let description = "The sheriff is an innocent who can sacrifice some health in exchange for strength.";
       description += "\n\nStrength Cooldown: " + cooldownTime + " seconds.";
       description += "\nStrength Uses: " + abilityUses;
       description += "\nHealth Lost: " + (healthLoss / 2) + " hearts.";
       description += "\nCan Self Kill: " + abilityDamageSelf;
       description += "\nStrength Duration: " + effectTime + " seconds.";
       description += "\nStrength Amplifier: " + strengthAmp;
       return description;
    }
}
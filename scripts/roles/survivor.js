"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { NeutralIndependentRole } from "./neutral_independent";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";

export class SurvivorRole extends NeutralIndependentRole {
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
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.survivor.action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.survivor.cooldown_time");
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
        return RoleAlignment.NEUTRAL_INDEPENDENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§eSurvivor";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Live until the end of the round to win!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "If you are alive at the end of the round, regardless of what alignment wins, you win. Your ability gives you resistance. You cannot be guessed.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.survivor.enabled") != 0;
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
        return RoleTypes.SURVIVOR;
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
        return false;
    }

    /**
     * Returns whether this role counts towards win condition tracking.
     * @returns {boolean}
     */
    countsInTracking(player) {
        return false;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * 
     * @param {Player} player
     * 
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

            // ability effect
            let guardDuration = ScoreboardManager.getTrackedObjective("role_settings.survivor.guard_time");
            player.addEffect("minecraft:resistance", guardDuration * 20, {showParticles: false});

            // ability activate message
            player.sendMessage("§eYour guard is now up!");
            ChatManager.sendDeadPlayersMessage("§e§o" + player.name + "'s guard is up.", LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.survivor.cooldown_time");
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
        return !player.hasTag("dead");
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Survivor Settings");

        form.divider();
        form.label("The survivor is a neutral independent role who must live until the end of the round to win. They cannot be guessed.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.survivor.enabled") != 0;
        form.toggle("Survivor Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.survivor.cooldown_time");
        form.slider("Guard Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of guard, which will give the survivor resistance.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.survivor.action_uses");
        form.slider("Guard Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times guard can be used. -1 is infinite uses");
        
        let guardDuration = ScoreboardManager.getTrackedObjective("role_settings.survivor.guard_time");
        form.slider("Guard Duration", 3, 30, { defaultValue: guardDuration }); // 8
        form.label("The duration of the resistance gained from guard.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.survivor.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.survivor.cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.survivor.action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.survivor.guard_time", r.formValues[8]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.survivor.cooldown_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.survivor.action_uses");
        let guardDuration = ScoreboardManager.getTrackedObjective("role_settings.survivor.guard_time");

        let description = "The survivor is a neutral role whose exclusive win condition is to live until the end of the round.";
        description += "\n\nGuard Cooldown: " + cooldownTime + " seconds.";
        description += "\nGuard Uses: " + abilityUses;
        description += "\nGuard Resistance Duration: " + guardDuration + " seconds.";
        return description;
    }
}
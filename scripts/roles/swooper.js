"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class SwooperRole extends MurdererRole {
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
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_cooldown");
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
        return RoleAlignment.MURDERER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§sSwooper";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Turn invisible and surprise players!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can turn invisible for " + ScoreboardManager.getTrackedObjective("role_settings.swooper.invisibility_time") + " seconds.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.swooper.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
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
        return RoleTypes.SWOOPER;
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
        let hasMark = ScoreboardManager.getScoreboardObjective(player, "player.mark_used");
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
            let invisTime = ScoreboardManager.getTrackedObjective("role_settings.swooper.invisibility_time");

            player.addEffect("minecraft:invisibility", invisTime*20, {showParticles: false});
            system.runTimeout(() => { 
                SoundManager.playSoundEffect([player], SoundEffectType.SWOOPER_REAPPEAR);
                ChatManager.sendDeadPlayersMessage("§4§o" + player.name + "'s invis has run out.", LogItemType.ABILITY_MESSAGE);
            }, invisTime * 20);

            // ability activate message
            player.sendMessage("§4You've turned invisible for §r§c" + invisTime + " §r§4seconds...");
            ChatManager.sendDeadPlayersMessage("§4§o" + player.name + " used their Swooper ability.", LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            let invisCooldown = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, invisCooldown);
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
        form.title("Swooper Settings");

        form.divider();
        form.label("The swooper is a murderer role that can turn invisible for an amount of time.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.swooper.enabled") != 0;
        form.toggle("Swooper Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_cooldown");
        form.slider("Invisibility Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The cooldown of the invisibility.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_uses");
        form.slider("Invisibility Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times invisibility can be used. -1 is infinite uses");
        
        let swooperCooldown = ScoreboardManager.getTrackedObjective("role_settings.swooper.invisibility_time");
        form.slider("Invisibility Duration (Seconds)", 3, 30, { valueStep:1, defaultValue: swooperCooldown })
        form.label("The amount of time invisibility will last."); // 6
        
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.swooper.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.swooper.ability_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.swooper.ability_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.swooper.invisibility_time", r.formValues[8]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_cooldown");
        let invisTime = ScoreboardManager.getTrackedObjective("role_settings.swooper.invisibility_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.swooper.ability_uses");

        let description = "The swooper is a murderer that is able to turn invisibile for a time.";
        description += "\n\nInvisibility Cooldown: " + markCooldown + " seconds.";
        description += "\nInvisibility Uses: " + abilityUses;
        description += "\nInvisibility Time: " + invisTime + " seconds.";
        return description;
    }
}
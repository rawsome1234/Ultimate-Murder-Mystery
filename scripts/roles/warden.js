"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role"
import { ScoreboardManager } from "../scoreboard_manager"
import { SettingsHandler } from "../settings_handler"
import { MurdererRole } from "./murderer"
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";

export class WardenRole extends MurdererRole {
    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        super.giveToPlayer(player);
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.warden.charges");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);

        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.warden.cooldown_time");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§tWarden";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Your ability gives all players darkness and gives you a burst of strength!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can cause confusion using your ability and take down many players at once.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.warden.enabled");
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
        return RoleTypes.WARDEN;
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
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * 
     * @param {Player} player the player who is activating their ability.
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
            let darknessTime = ScoreboardManager.getTrackedObjective("role_settings.warden.darkness_time");
            let strengthAmp = ScoreboardManager.getTrackedObjective("role_settings.warden.strength_amp");
            let wardenGetsDarkness = ScoreboardManager.getTrackedObjective("role_settings.warden.warden_gets_darkness") != 0;

            world.getAllPlayers().forEach((pl) => {
                if (!pl.hasTag("AFK") && !pl.hasTag("dead") && (wardenGetsDarkness || player.id != pl.id)) {
                    pl.addEffect("minecraft:darkness", darknessTime * 20, { showParticles: false });
                }
            });

            player.addEffect("minecraft:strength", darknessTime * 20, { amplifier: strengthAmp, showParticles: false });
            player.sendMessage("§1Your ability is active!");
            ChatManager.sendDeadPlayersMessage("§1§o" + player.name + " activated their warden ability...", LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.warden.cooldown_time");
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
        return super.meetsWinCondition(player, winningAlignment);
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Warden Settings");
        form.divider();

        form.label("A murderer role that can give darkness to all players and strength to themselves");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.warden.enabled") != 0;
        form.toggle("Warden Enabled", { defaultValue: roleEnabled }); // 2

        // 3
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.warden.cooldown_time");
        form.slider("Warden Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of inspect.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.warden.charges");
        form.slider("Warden Ability Uses", -1, 10, { defaultValue: abilityUses }); // 5
        form.label("The number of times inspect can be used. -1 is infinite uses");
        
        let darknessTime = ScoreboardManager.getTrackedObjective("role_settings.warden.darkness_time");
        form.slider("Darkness Time", 5, 20, { defaultValue: darknessTime }); // 7
        form.label("The number of seconds that players will get darkness.");
        
        let strengthAmp = ScoreboardManager.getTrackedObjective("role_settings.warden.strength_amp");
        form.slider("Strength Amplifier", 0, 4, { defaultValue: strengthAmp }); // 9
        form.label("The strength amplifier the warden receives.");
        
        let wardenGetsDarkness = ScoreboardManager.getTrackedObjective("role_settings.warden.warden_gets_darkness") != 0;
        form.toggle("Warden Gets Darkness", { defaultValue: wardenGetsDarkness }); // 11
        form.label("Whether or not the Warden gets darkness with everyone else.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.warden.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.warden.cooldown_time", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("role_settings.warden.charges", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("role_settings.warden.darkness_time", r.formValues[7]);
            ScoreboardManager.setTrackedObjective("role_settings.warden.strength_amp", r.formValues[9]);
            ScoreboardManager.setTrackedObjective("role_settings.warden.warden_gets_darkness", r.formValues[11] ? 1 : 0);
            // player.sendMessage("trying to open callback form...");
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.warden.cooldown_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.warden.charges");
        let darknessTime = ScoreboardManager.getTrackedObjective("role_settings.warden.darkness_time");
        let strengthAmp = ScoreboardManager.getTrackedObjective("role_settings.warden.strength_amp");
        let wardenGetsDarkness = ScoreboardManager.getTrackedObjective("role_settings.warden.warden_gets_darkness") != 0;

        let description = "The warden is a murderer who is able to give all players darkness and receive strength.";
        description += "\n\nWarden Cooldown: " + cooldownTime + " seconds.";
        description += "\nAbility Uses: " + abilityUses;
        description += "\nDarkness Time: " + darknessTime + " seconds.";
        description += "\nStrength Amplifier: " + strengthAmp;
        description += "\nWarden Gets Darkness: " + wardenGetsDarkness;
        return description;
    }
}
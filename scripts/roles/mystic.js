"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { PlayerHandler } from "../player_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class MysticRole extends Role {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(MysticRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(MysticRole.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * @param {Player} player
     */
    static onPlayerDeath(player, killer) {
        let tellMysticLocation = ScoreboardManager.getTrackedObjective("role_settings.mystic.message_on_player_death") != 0;
        let showMysticLocation = ScoreboardManager.getTrackedObjective("role_settings.mystic.draw_line_on_player_death") != 0;

        let isEnabled = ScoreboardManager.getTrackedObjective("role_settings.mystic.enabled") != 0;
        if (isEnabled && (tellMysticLocation || showMysticLocation)) {
            let mystics = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.MYSTIC);
            if (mystics.length > 0) {
                let message = "§b§oA player has died!";
                SoundManager.playSoundEffect([player], SoundEffectType.DEATH_NOTIFICATION);
                let pointTime = ScoreboardManager.getTrackedObjective("role_settings.mystic.point_time");

                mystics.forEach((p) => {
                    if (tellMysticLocation) {
                        p.sendMessage(message);
                    }
                    if (showMysticLocation) {
                        PlayerHandler.spawnParticlesBetweenPoints(p, p.location, player.location, { red: 0, blue: .8, green: 0, alpha: 1 }, pointTime);
                    }
                });
            }
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // let actionUses = ScoreboardManager.getTrackedObjective("role_settings.detective.action_uses");
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        // ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        return "§9Mystic";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Receive alerts when players die!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "When a player dies, a line will be drawn to their death location!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.mystic.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return true;
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
        return false;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.MYSTIC;
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
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
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
        form.title("Mystic Settings");

        form.divider();
        form.label("The mystic is a role that is alerted on player deaths and death locations");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.mystic.enabled") != 0;
        form.toggle("Mystic Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();
        
        let message = ScoreboardManager.getTrackedObjective("role_settings.mystic.message_on_player_death") != 0;
        form.toggle("Message Mystic on Player Death", { defaultValue: message }); // 4
        form.label("If true, will notify the mystic when a player dies.");
        
        let line = ScoreboardManager.getTrackedObjective("role_settings.mystic.draw_line_on_player_death") != 0;
        form.toggle("Draw Line on Player Death", { defaultValue: line }); // 6
        form.label("If true, will draw a line from the mystic to the ghost location when a player dies.");
        
        let pointTime = ScoreboardManager.getTrackedObjective("role_settings.mystic.point_time");
        form.slider("Line Draw Time", 1, 10, { defaultValue: pointTime }); // 8
        form.label("The amount of time in seconds that the line will be drawn for.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.mystic.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.mystic.message_on_player_death", r.formValues[4] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.mystic.draw_line_on_player_death", r.formValues[6] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.mystic.point_time", r.formValues[8]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let message = ScoreboardManager.getTrackedObjective("role_settings.mystic.message_on_player_death") != 0;
        let line = ScoreboardManager.getTrackedObjective("role_settings.mystic.draw_line_on_player_death") != 0;
        let pointTime = ScoreboardManager.getTrackedObjective("role_settings.mystic.point_time");

        let description = "The Mystic is an innocent role who gets alerts and sees particles when a player dies.";
        description += "\n\nMessaged On Death: " + message;
        description += "\nLine is Drawn to Death: " + line;
        description += "\nLine Lifetime: " + pointTime + " seconds.";
        return description;
    }
}
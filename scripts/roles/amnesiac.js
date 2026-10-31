"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { NeutralIndependentRole } from "./neutral_independent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { RoleAssignment } from "../role_assignment";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class AmnesiacRole extends NeutralIndependentRole {

    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(AmnesiacRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(AmnesiacRole.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * @param {Player} player
     */
    static onPlayerDeath(player, killer) {
        let tellAmnesiacLocation = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.message_on_player_death") != 0;
        let showAmnesiacLocation = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.line_on_player_death") != 0;

        let isEnabled = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
        if (isEnabled && (tellAmnesiacLocation || showAmnesiacLocation)) {
            let amnesiacs = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.AMNESIAC);
            if (amnesiacs.length > 0) {
                let message = "§3§oA player has died!";
                SoundManager.playSoundEffect([player], SoundEffectType.DEATH_NOTIFICATION);

                amnesiacs.forEach((p) => {
                    if (tellAmnesiacLocation) {
                        p.sendMessage(message);
                    }
                    if (showAmnesiacLocation) {
                        PlayerHandler.spawnParticlesBetweenPoints(p, p.location, player.location, { red: 0, blue: 1, green: 0, alpha: 1 });
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
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.cooldown_time");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        return "§3Amnesiac";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Find a body and take their role!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You have no win condition! In order to win, you must find the ghost of a dead player and steal their role! Your ability will detect ghost bodies, and once you find one, use your ability to take that role!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.amnesiac.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return true;
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
        return RoleTypes.AMNESIAC;
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

            // ability effect
            let ghosts = GhostManager.getAllGhosts(player.dimension);
            ghosts.forEach((ghost) => {
                PlayerHandler.spawnParticlesBetweenPoints(player, player.location, ghost.location, { red: 0, blue: 1, green: 0, alpha: 1 });
            });

            // ability activate message
            player.sendMessage("§3Detected " + ghosts.length + " ghosts!");
            SoundManager.playSoundEffect([player], SoundEffectType.BASIC_PLING);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.cooldown_time");
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
        // player.sendMessage("Checking a random entity...");
        if (otherEntity.typeId == "umm:ghost_body") {
            // player.sendMessage("Interacted with a ghost body");
            let newRoleID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.ghost_player_role_id");
            let newRoleCustomID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.killer_player_custom_role_id");
            let role = RoleManager.getMatchingRole(newRoleID, newRoleCustomID);
            if (role == null) {
                player.sendMessage("§oThere was an issue getting the role of that body.");
                return;
            }
            player.sendMessage("§3§oStole the role of that body!");
            GhostManager.onGhostInteract.emit(player, otherEntity);
            SoundManager.playSoundEffect([player], SoundEffectType.AMNESIAC_REMEMBER);

            ChatManager.sendDeadPlayersMessage("§3§o" + player.name + " has changed role to " + role.getDisplayName(), LogItemType.ABILITY_MESSAGE);

            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
            RoleAssignment.setPlayerRole(player, role);
            if (ScoreboardManager.getTrackedObjective("role_settings.amnesiac.steal_removes_ghost_body") != 0) {
                otherEntity.remove();
            }
        }
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
        form.title("Amnesiac Settings");

        form.divider();
        form.label("The amnesiac is a neutral independent role that has no win condition. It must take the role of a dead player in order to win.\nRequires: Ghost Bodies (on)");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.enabled") != 0;
        form.toggle("Amnesiac Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.cooldown_time");
        form.slider("Detect Ghosts Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of the amnesiac, which will draw a line from the amnesiac to all ghosts, if any.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.action_uses");
        form.slider("Detect Ghosts Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the amnesiac can detect ghosts. -1 is infinite uses");
        
        let message = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.message_on_player_death") != 0;
        form.toggle("Message Amnesiac on Player Death", { defaultValue: message }); // 8
        form.label("If true, will notify the amnesiac when a player dies.");
        
        let line = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.line_on_player_death") != 0;
        form.toggle("Draw Line on Player Death", { defaultValue: line }); // 10
        form.label("If true, will draw a line from the amnesiac to the ghost location when a player dies.");
        
        let killGhosts = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.steal_removes_ghost_body") != 0;
        form.toggle("Steal Removes Ghost", { defaultValue: killGhosts }); // 12
        form.label("If true, upon stealing the role of a ghost, will remove the ghost body.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.amnesiac.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.amnesiac.cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.amnesiac.action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.amnesiac.message_on_player_death", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.amnesiac.line_on_player_death", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.amnesiac.steal_removes_ghost_body", r.formValues[12] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} the full description of this role and its settings.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.cooldown_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.action_uses");
        let message = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.message_on_player_death") != 0;
        let line = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.line_on_player_death") != 0;
        let killGhosts = ScoreboardManager.getTrackedObjective("role_settings.amnesiac.steal_removes_ghost_body") != 0;
        
        let description = "With no win condition, the amnesiac is a neutral independent role that needs to find a ghost body to take the role of.";
        description += "\n\nAbility Cooldown Time: " + cooldownTime + " seconds.";
        description += "\nDetect Uses: " + abilityUses;
        description += "\nAmnesiac is Notified on Player Death: " + message;
        description += "\nDraw Line on Player Death: " + line;
        description += "\nRemoves Ghost Body: " + killGhosts;
        return description;
    }
}
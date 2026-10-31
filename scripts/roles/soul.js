"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class SoulRole extends InnocentRole {

    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        ScoreboardManager.setScoreboardObjective(player, "role_settings.soul.has_respawned", 0);
        super.giveToPlayer(player);
        let hideAndSeekOn = ScoreboardManager.getTrackedObjective("role_settings.tempest.hide_and_seek") == 1;
        if (hideAndSeekOn) {
            player.addTag("hiderFound");
        }
    }

    /**
     * @param {Player} player
     * @param {Player} killer
     */
    onPlayerDeath(player, killer) {
        if (player == null) {
            return;
        }

        let playerRole = RoleManager.getPlayerRole(player);
        if (playerRole.getRoleType() == RoleTypes.SOUL) {
            let hasRespawned = ScoreboardManager.getScoreboardObjective(player, "role_settings.soul.has_respawned");
            if (!hasRespawned) {
                player.addTag("soulRespawning");
                DeathHandler.incrementBlockDeadCount(player);
                ScoreboardManager.setScoreboardObjective(player, "role_settings.soul.has_respawned", 1);
                let soulTimerLength = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_time");
                let announceRespawn = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_is_announced") != 0;
                player.sendMessage("§1You are respawning in §r§3" + soulTimerLength + " §r§1seconds...");
                system.runTimeout(() => {
                    player.removeTag("soulRespawning");
                    DeathHandler.decrementBlockDeadCount(player);
                    if (!ScoreboardManager.isGameRunning()) {
                        return;
                    } 
                    WinConditionManager.teleportPlayerToSpawn(player);
                    player.runCommand("gamemode a");
                    player.removeTag("dead");
                    if (announceRespawn) {
                        world.sendMessage("§1The §lSoul§r§1 has respawned!");
                        SoundManager.playSoundEffect(world.getAllPlayers(), SoundEffectType.SOUL_RESPAWN);
                    }
                    player.sendMessage("§1You have respawned!");
                }, soulTimerLength * 20);
            }
        }
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
        return "§1Soul";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Even death cannot stop you, as you can revive yourself after dying to enact vengance!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let soulTimerLength = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_time");
        return "When dying, you'll get respawned after " + soulTimerLength + " seconds. While you can't talk, you can kill the person who killed you.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.soul.enabled") > 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.SOUL;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        let hasRespawned = ScoreboardManager.getScoreboardObjective(guessedPlayer, "role_settings.soul.has_respawned") == 1;
        if (hasRespawned) {
            guesser.sendMessage("§1A respawned Soul cannot be guessed!");
            return true;
        }
        let cancelRespawn = ScoreboardManager.getTrackedObjective("role_settings.soul.guessed_cancels_respawn") == 1;
        if (cancelRespawn) {
            ScoreboardManager.setScoreboardObjective(guessedPlayer, "role_settings.soul.has_respawned", 1);
        }
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
        return ScoreboardManager.getScoreboardObjective(player, "role_settings.soul.has_respawned") == 0 || ScoreboardManager.getTrackedObjective("role_settings.soul.respawned_counts_towards_tracker") != 0;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
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

        form.title("Soul Settings");

        form.divider();
        form.label("The Soul is an innocent role who can respawn to kill the player that killed them. After respawning the Soul cannot be guessed.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.soul.enabled") != 0;
        form.toggle("Soul Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        let cancelRespawn = ScoreboardManager.getTrackedObjective("role_settings.soul.guessed_cancels_respawn") != 0;
        form.toggle("Guessing Soul Cancels Ability", { defaultValue: cancelRespawn }); // 4
        form.label("If enabled and the soul is guessed before they die the first time, the soul will not respawn.");
        
        let respawnTime = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_time");
        form.slider("Respawn Time", 15, 60, { valueStep: 5, defaultValue: respawnTime }); // 6
        form.label("The amount of time after dying before the Soul respawns.");
        
        let announceRespawn = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_is_announced") != 0;
        form.toggle("Announce Soul Respawn", { defaultValue: announceRespawn }); // 8
        form.label("Whether or not the Soul's respawn will get announced in chat.");
        
        let countsTowardsTracker = ScoreboardManager.getTrackedObjective("role_settings.soul.respawned_counts_towards_tracker") != 0;
        form.toggle("Respawned Counts Towards Innocent Count", { defaultValue: countsTowardsTracker }); // 10
        form.label("Whether or not the Soul counts towards the innocent count after respawning.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.soul.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.soul.guessed_cancels_respawn", r.formValues[4] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.soul.respawn_time", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.soul.respawn_is_announced", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.soul.respawned_counts_towards_tracker", r.formValues[10] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cancelRespawn = ScoreboardManager.getTrackedObjective("role_settings.soul.guessed_cancels_respawn") != 0;
        let respawnTime = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_time");
        let announceRespawn = ScoreboardManager.getTrackedObjective("role_settings.soul.respawn_is_announced") != 0;
        let countsTowardsTracker = ScoreboardManager.getTrackedObjective("role_settings.soul.respawned_counts_towards_tracker") != 0;
        
        let description = "The soul is an innocent who is able to respawn after death.";
        description += "\n\nGetting Guessed Cancels Respawn: " + cancelRespawn;
        description += "\nTime to Respawn: " + respawnTime + " seconds.";
        description += "\nAnnounce Respawn: " + announceRespawn;
        description += "\nRespawn Soul Counts in Tracking: " + countsTowardsTracker;
        return description;
    }
}
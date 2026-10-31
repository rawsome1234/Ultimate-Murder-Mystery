"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { NeutralIndependentRole } from "./neutral_independent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { RoleAssignment } from "../role_assignment";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { LogItemType } from "../logs/game_log";

export class DoppelGangerRole extends NeutralIndependentRole {
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
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.copy_cooldown");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§eDoppelganger";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Copy another player's role!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let pickRandomPlayer = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.pick_random_player") != 0;
        return pickRandomPlayer ? "Use your ability to copy a player's role at random!" : "Use your ability on a player to copy their role!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.doppelganger.enabled") != 0;
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
        return RoleTypes.DOPPELGANGER;
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
        let pickRandomPlayer = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.pick_random_player") != 0;
        if (pickRandomPlayer) {
            let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers()).filter((pl) => pl.id != player.id);
            if (livingPlayers.length < 1) {
                player.sendMessage("No players to copy!");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            let playerToCopy = livingPlayers[ScoreboardManager.rollRandomNumber(0, livingPlayers.length)];
            DoppelGangerRole.copyPlayerRole(player, playerToCopy);
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let pickRandomPlayer = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.pick_random_player") != 0;
        if (!pickRandomPlayer && otherEntity.typeId == "minecraft:player" && PlayerHandler.isPlaying(otherEntity) && !DeathHandler.consideredDead(otherEntity)) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.DOPPELGANGER_COPY;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.copy_cooldown") / 2;
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                SoundManager.playSoundEffect([player], SoundEffectType.INTERACT_BLOCKED);
                player.sendMessage("§e§oYou were unable to copy " + otherEntity.name + "'s role...");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to copy " + otherEntity.name + "'s role but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }
            DoppelGangerRole.copyPlayerRole(player, otherEntity);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.DOPPELGANGER_COPY);
        }
    }

    /**
     * 
     * @param {Player} doppel 
     * @param {Player} target 
     */
    static copyPlayerRole(doppel, target) {
        let role = RoleManager.getPlayerRole(target);

        SoundManager.playSoundEffect([doppel], SoundEffectType.BASIC_MARK);
        doppel.sendMessage("§e§oCopied the role of " + target.name + "!");
        ChatManager.sendDeadPlayersMessage("§e§o" + doppel.name + " copied " + target.name + "'s role and has changed role to " + role.getDisplayName(), LogItemType.ABILITY_MESSAGE);
        let playerIsNotified = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.player_is_notified") != 0;
        if (playerIsNotified) {
            target.sendMessage("§e§oYour role has been copied...");
        }

        doppel.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        RoleAssignment.setPlayerRole(doppel, role);
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
        form.title("Doppelganger Settings");

        form.divider();
        form.label("The Doppelganger is a neutral role that can copy a player's role, either at random or by interacting with a specific player.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.enabled") != 0;
        form.toggle("Doppelganger Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.copy_cooldown");
        form.slider("Copy Cooldown", SettingsHandler.powerAbilityCooldownMin, 300, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of copying a role.");
        
        let pickRandomPlayer = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.pick_random_player") != 0;
        form.toggle("Pick Random Player", { defaultValue: pickRandomPlayer }); // 6
        form.label("If true, using copy will pick a random player to copy. If false, will have to right click a player.");
        
        let playerIsNotified = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.player_is_notified") != 0;
        form.toggle("Player is Notified", { defaultValue: playerIsNotified }); // 6
        form.label("If true, the player being copied will be notified when copied.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.doppelganger.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.doppelganger.copy_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.doppelganger.pick_random_player", r.formValues[6] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.doppelganger.player_is_notified", r.formValues[8] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.copy_cooldown");
        let pickRandomPlayer = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.pick_random_player") != 0;
        let playerIsNotified = ScoreboardManager.getTrackedObjective("role_settings.doppelganger.player_is_notified") != 0;

        let description = "Doppelganger is a neutral independent role with no win condition. They can copy a player's role by interacting with them, or at random.";
        description += "\n\nCopy Cooldown: " + cooldownTime;
        description += "\nPick Random Player: " + pickRandomPlayer;
        description += "\nCopied Player is Notified: " + playerIsNotified;
        return description;
    }
}
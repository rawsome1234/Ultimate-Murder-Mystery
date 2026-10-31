"use strict";

import { world, system, Player, InputPermissionCategory } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class MediumRole extends InnocentRole {
    
    static MEDIUM_DEAD_PLAYER_ID_PROPERTY = "toJail";
    static MEDIUM_CHAT_ID_PROPERTY = "jailChatID";
    static MEDITATION_TIME_SCOREBOARD = "player.mark_used";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(MediumRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(MediumRole.onPlayerDeath);
        }
        system.runInterval(() => {
            MediumRole.runMeditationTimers();
        }, 1);
        super.initialize();
    }

    /**
     * 
     * @param {Player} player
     * @param {Player?} killer
     */
    static onPlayerDeath(player, killer) {
        let deadRole = RoleManager.getPlayerRole(player);
        if (deadRole.getRoleType() == RoleTypes.MEDIUM && MediumRole.isMeditating(player)) {
            MediumRole.endMeditation(player, "", true);
        }
    }

    static runMeditationTimers() {
        let allPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let allMediums = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.MEDIUM);
        allMediums.forEach((medium) => {
            let discussionTimeRemaining = ScoreboardManager.getScoreboardObjective(medium, MediumRole.MEDITATION_TIME_SCOREBOARD);
            if (discussionTimeRemaining <= 0) {
                return;
            }

            if (discussionTimeRemaining == 1) {
                this.endMeditation(medium, "§sThat is all for this discussion. The dead has been released back to the afterlife.", true);
            }
            else {
                ScoreboardManager.addScoreboardObjective(medium, MediumRole.MEDITATION_TIME_SCOREBOARD, -1);
            }
        });
    }

    /**
     * Ends the chat session with the specified medium and their dead player.
     * @param {Player} medium 
     * @param {string} endDiscussionMessage 
     * @param {boolean} endingNaturally whether the medium timer expired or if it's being cut short.
     */
    static endMeditation(medium, endDiscussionMessage, endingNaturally) {
        if (MediumRole.isMeditating(medium)) {
            ScoreboardManager.setScoreboardObjective(medium, MediumRole.MEDITATION_TIME_SCOREBOARD, 0);
        }

        let targetID = MediumRole.getMediumID(medium);
        if (targetID == null) {
            return;
        }
        let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
        let mediumNameMessage = "";
        if (targetPlayer != null) {
            ChatManager.revertPlayerChannel(targetPlayer);
            DeathHandler.decrementBlockDeadCount(targetPlayer);
            targetPlayer.removeTag(ChatManager.BLOCK_SHOUT_TAG);
            
            let deadGainsBlindness = ScoreboardManager.getTrackedObjective("role_settings.medium.dead_gains_blindness") != 0;
            if (deadGainsBlindness) {
                targetPlayer.removeEffect("minecraft:blindness");
                targetPlayer.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
            }

            if (endingNaturally) {
                targetPlayer.sendMessage("§sYou've returned to dead chat.");
            }
            mediumNameMessage = "of " + targetPlayer.name + " ";
        }
        SoundManager.playSoundEffect([medium, targetPlayer], SoundEffectType.MEDIUM_END);
        
        medium.setDynamicProperty(MediumRole.MEDIUM_DEAD_PLAYER_ID_PROPERTY, null);
        ChatManager.revertPlayerChannel(medium);
        if (endDiscussionMessage != null && endDiscussionMessage != "") {
            medium.sendMessage(endDiscussionMessage);
        }
        ChatManager.sendDeadPlayersMessage("§s§o" + medium.name + "'s discussion with " + mediumNameMessage + " has ended.", LogItemType.ABILITY_MESSAGE);
        
        let meditateCooldown = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_cooldown");
        ScoreboardManager.setPlayerActionCooldown(medium, meditateCooldown);
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // this role uses player.mark_used as a timer for jail time
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(MediumRole.MEDIUM_DEAD_PLAYER_ID_PROPERTY, null);

        // makes jailor chat
        let chatID = ChatManager.requestChannelID();
        player.setDynamicProperty(MediumRole.MEDIUM_CHAT_ID_PROPERTY, chatID);
        // ChatManager.registerPlayerToChat(player, chatID);
        ChatManager.givePlayerChatIdentity(player, chatID, "Medium");
        ChatManager.setChannelColor(chatID, "s");
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
        return "§sMedium";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Speak to the dead to get information on their killer!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Right click a ghost body to talk to the player who placed that ghost. If they are still dead and in the world, you'll be able to talk to them in chat for a short period of time.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.medium.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
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
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.MEDIUM;
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
     * If the player has a medium started, returns the ID of the player being talked to.
     * @param {Player} player 
     * @returns {number}
     */
    static getMediumID(player) {
        return player.getDynamicProperty(MediumRole.MEDIUM_DEAD_PLAYER_ID_PROPERTY);
    }

    /**
     * Returns if the player, assumed to be a jailor, has someone in jail.
     * @param {Player} player 
     * @returns 
     */
    static isMeditating(player) {
        return ScoreboardManager.getScoreboardObjective(player, MediumRole.MEDITATION_TIME_SCOREBOARD) > 0;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player 
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
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");
        
        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }
        
        if (chargesRemaining != 0 && otherEntity.typeId == "umm:ghost_body" && player.getDynamicProperty(MediumRole.MEDIUM_DEAD_PLAYER_ID_PROPERTY) == null) {
            if (!GhostManager.canInteractWithGhosts(player, otherEntity)) {
                player.sendMessage("You've already meditated with that ghost...");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }
            
            // ability effect
            let otherID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.ghost_player_id");

            if (otherID == -1) {
                player.sendMessage("§sThat player is not in the game.");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }
            
            let ghostPlayer = ScoreboardManager.getPlayerWithID(otherID);
            if (ghostPlayer == null) {
                player.sendMessage("§sThis ghost cannot be connected with at this time...");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }

            if (!DeathHandler.consideredDead(ghostPlayer)) {
                player.sendMessage("§sThis ghost is disconnected from the afterlife...");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }
            
            player.setDynamicProperty(MediumRole.MEDIUM_DEAD_PLAYER_ID_PROPERTY, otherID);
            
            // ability activate message
            let speakingTime = ScoreboardManager.getTrackedObjective("role_settings.medium.discussion_time");
            let chatID = player.getDynamicProperty(MediumRole.MEDIUM_CHAT_ID_PROPERTY);
            ChatManager.pullPlayerToChat(player, chatID);
            ChatManager.pullPlayerToChat(ghostPlayer, chatID);
            ScoreboardManager.setScoreboardObjective(player, MediumRole.MEDITATION_TIME_SCOREBOARD, speakingTime * 20);
            ghostPlayer.addTag(ChatManager.BLOCK_SHOUT_TAG);
            DeathHandler.incrementBlockDeadCount(ghostPlayer);

            GhostManager.markAsInteracted(player, otherEntity);
            GhostManager.onGhostInteract.emit(player, otherEntity);
        
            let deadGainsBlindness = ScoreboardManager.getTrackedObjective("role_settings.medium.dead_gains_blindness") != 0;
            if (deadGainsBlindness) {
                ghostPlayer.addEffect("minecraft:blindness", 2000000, {showParticles: false});
                ghostPlayer.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
            }
            
            player.sendMessage("§sYou are now speaking to " + ghostPlayer.name + ".");
            ghostPlayer.sendMessage("§s" + player.name + " is communicating with you. Please give information that doesn't reveal information about who your killer is.");
            SoundManager.playSoundEffect([player, ghostPlayer], SoundEffectType.MEDIUM_START);
            ChatManager.sendDeadPlayersMessage("§s§o" + player.name + " pulled " + ghostPlayer.name + " into medium chat.", LogItemType.ABILITY_MESSAGE);
            
            ///////

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, speakingTime+1, false);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
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
        form.title("Medium Settings");

        form.divider();
        form.label("The medium is an innocent role that is able to speak to dead players in a private chat after interacting with their ghost.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.medium.enabled") != 0;
        form.toggle("Medium Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_cooldown");
        form.slider("Meditate Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of meditate at the start of the game and after exiting meditation.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_uses");
        form.slider("Meditate Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times meditate can be used. -1 is infinite uses");
        
        let meditationTime = ScoreboardManager.getTrackedObjective("role_settings.medium.discussion_time");
        form.slider("Meditation Time", 15, 90, { defaultValue: meditationTime, valueStep: 5 }); // 8
        form.label("The time in seconds that a dead player is in the medium's chat.");
        
        let deadGainsBlindness = ScoreboardManager.getTrackedObjective("role_settings.medium.dead_gains_blindness") != 0;
        form.toggle("Dead is Frozen", { defaultValue: deadGainsBlindness }); // 10
        form.label("If true, when a dead player is pulled into a medium's chat, they will gain blindness and be unable to move.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.medium.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.medium.meditate_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.medium.meditate_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.medium.discussion_time", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.medium.dead_gains_blindness", r.formValues[10] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.medium.meditate_uses");
        let meditationTime = ScoreboardManager.getTrackedObjective("role_settings.medium.discussion_time");
        let deadGainsBlindness = ScoreboardManager.getTrackedObjective("role_settings.medium.dead_gains_blindness") != 0;

        let description = "The medium is an innocent role who can interact with dead bodies to talk to dead player.";
        description += "\n\nMeditate Cooldown: " + cooldownTime + " seconds";
        description += "\nMeditate Uses: " + abilityUses;
        description += "\nDiscussion Time: " + meditationTime + " seconds";
        description += "\nDead Players Gain Blindness: " + deadGainsBlindness;
        return description;
    }
}
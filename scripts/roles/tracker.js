"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";

export class TrackerRole extends InnocentRole {

    /**
     * Meant for use on people who are tracked.
     */
    static trackerOwnerTag = "trackerOwner";
    /**
     * Meant for use on the tracker to note who is marked.
     */
    static trackingTag = "tracking";
    static validColorsTag = "validColors";


    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }

        system.runInterval(TrackerRole.sendTrackerLines, 20);
        super.initialize();
    }

    static sendTrackerLines() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }

        let trackerPlayers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.TRACKER); // HARD CODED
        trackerPlayers.forEach((tracker) => {
            let trackTags = TrackerRole.getTrackedTags(tracker);
            trackTags.forEach((tag) => {
                let data = tag.substring(TrackerRole.trackingTag.length).split("colored");
                let playerID = parseInt(data[0]);
                let colorID = parseInt(data[1]);
                let trackedPlayer = ScoreboardManager.getPlayerWithID(playerID);
                if (trackedPlayer == null || trackedPlayer.hasTag("dead")) {
                    return;
                }

                PlayerHandler.spawnParticlesBetweenPoints(tracker, tracker.location, trackedPlayer.location, TrackerRole._getColorForID(colorID));

            });
        });

    }

    /**
     * Gets the color respecting the id.
     * 
     * @param {number} colorID
     */
    static _getColorForID(colorID) {
        let red = 0;
        let blue = 0;
        let green = 0;
        let alpha = 1;

        switch (colorID) {
            case 0:
                red = 1;
                break;
            case 1:
                blue = 1;
                break;
            case 2:
                green = 1;
                break;
            case 3:
                red = 1;
                blue = 1;
                break;
            case 4:
                blue = 1;
                green = 1;
                break;
            case 5:
                red = 1;
                green = 1;
                break;
            case 6:
                red = 1;
                blue = 1;
                green = 1;
                break;
            case 7:
                red = .5;
                break;
            case 8:
                blue = .5;
                break;
            case 9:
                green = .5;
                break;
        }
        return { red: red, blue: blue, green: green, alpha: alpha };
    }


    /**
     * @param {Player} player
     */
    onPlayerDeath(player, killer) {
        let playerTags = player.getTags();
        // player.sendMessage("Checking tags..");
        playerTags.forEach((tag) => {
            if (tag.substring(0, TrackerRole.trackerOwnerTag.length) == TrackerRole.trackerOwnerTag) {
                let remaining = tag.substring(TrackerRole.trackerOwnerTag.length);
                let trackerPlayer = ScoreboardManager.getPlayerWithID(parseInt(remaining));
                TrackerRole.removeMarkFromPlayer(trackerPlayer, player);
                // player.sendMessage(remaining);

                if (ScoreboardManager.getTrackedObjective("role_settings.tracker.player_death_redeems_track") != 0) {
                    ScoreboardManager.addScoreboardObjective(trackerPlayer, "player.action_charges", 1);
                    PlayerHandler.updateRoleActionVisual(trackerPlayer);

                    if (ScoreboardManager.getTrackedObjective("role_settings.tracker.notify_tracker_on_track_redeem") != 0) {
                        trackerPlayer.sendMessage("§aA track of yours has been redeemed.");
                    }
                }
            }
        });
    }

    /**
     * Adds to track that the tracker is now tracking markedPlayer
     * @param {Player} tracker the player with the tracker role
     * @param {Player} markedPlayer the player to start tracking
     */
    static addMarkToPlayer(tracker, markedPlayer) {
        let trackerID = ScoreboardManager.getPlayerID(tracker);
        let trackedID = ScoreboardManager.getPlayerID(markedPlayer);
        tracker.addTag(TrackerRole.trackingTag + trackedID + "colored" + this.getNextValidColor(tracker));
        markedPlayer.addTag(TrackerRole.trackerOwnerTag + trackerID);
    }

    /**
     * Removes a tracked player from a tracker's list
     * @param {Player} tracker the player with the tracker role
     * @param {Player} markedPlayer the player to stop tracking
     */
    static removeMarkFromPlayer(tracker, markedPlayer) {
        if (tracker == null) {
            return;
        }
        let trackerID = ScoreboardManager.getPlayerID(tracker);
        let trackedID = ScoreboardManager.getPlayerID(markedPlayer);
        let trackerTags = tracker.getTags();
        for (let i = 0; i < trackerTags.length; i++) {
            let testTag = trackerTags[i];
            if (testTag.substring(0, TrackerRole.trackingTag.length + trackedID.toString().length) == (TrackerRole.trackingTag + trackedID)) {
                let colorID = testTag.split("colored")[1];
                tracker.removeTag(testTag);
                this._returnColorID(tracker, colorID);
                break;
            }
        }
        // tracker.removeTag(TrackerRole.trackingTag + trackedID);
        markedPlayer.removeTag(TrackerRole.trackerOwnerTag + trackerID);
    }

    /**
     * @param {Player} tracker
     * @param {string} id
     */
    static _returnColorID(tracker, id) {
        let tags = tracker.getTags();
        for (let i = 0; i < tags.length; i++) {
            let t = tags[i];
            if (t.substring(0, TrackerRole.validColorsTag.length) == (TrackerRole.validColorsTag)) {
                tracker.removeTag(t);
                tracker.addTag(t + "," + id);
                return;
            }
        }
    }

    /**
     * Gets a list of tracked players on the tracker.
     * 
     * @param {Player} tracker
     * @returns {string[]} the list of marked players
     */
    static getTrackedTags(tracker) {
        let trackerTags = tracker.getTags();
        let trackedPlayers = [];
        trackerTags.forEach((tag) => {
            if (tag.substring(0, TrackerRole.trackingTag.length) == TrackerRole.trackingTag) {
                trackedPlayers.push(tag);
            }
        });
        return trackedPlayers;
    }

    /**
     * Gets the next color ID for the tracker.
     * 
     * @param {Player} tracker
     */
    static getNextValidColor(tracker) {
        let allTags = tracker.getTags();
        for (let i = 0; i < allTags.length; i++) {
            let tag = allTags[i];
            if (tag.substring(0, TrackerRole.validColorsTag.length) == TrackerRole.validColorsTag) {
                tracker.removeTag(tag);
                let remaining = tag.substring(TrackerRole.validColorsTag.length);
                let validColors = remaining.split(",");
                let randomColorIndex = ScoreboardManager.rollRandomNumber(0, validColors.length);
                let colorID = validColors[randomColorIndex];
                validColors.splice(randomColorIndex, 1);
                tracker.addTag(this._addWithSeparator(TrackerRole.validColorsTag, validColors, ","));
                return parseInt(colorID);
            }
        }
        return -1;
    }

    /**
     * Builds a string with the start and with a split in between each object.
     * 
     * @param {String} start
     * @param {string[]} remaining
     * @param {string} split
     */
    static _addWithSeparator(start, remaining, split) {
        let builtString = start;
        for (let i = 0; i < remaining.length; i++) {
            builtString = builtString.concat(split);
            let next = remaining[i];
            builtString = builtString.concat(next);
        }
        return builtString;
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_count");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.addTag("validColors,0,1,2,3,4,5,6,7,8,9");
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
        return "§qTracker";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Mark players and keep track of their positions!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "By clicking a player with your ability, you can track their location. Use that information to your advantage!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.tracker.enabled") != 0;
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
        return RoleTypes.TRACKER;
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

        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player") {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.TRACKER_MARK;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§o§aYou were unable to track " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to track " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            // player.sendMessage("clicked a player");
            if (otherEntity.hasTag("dead")) {
                player.sendMessage("§o§aThat player could not be marked.");
                return;
            }
            
            let trackerID = ScoreboardManager.getPlayerID(player);
            let detectTag = TrackerRole.trackerOwnerTag + trackerID;

            if (otherEntity.hasTag(detectTag)) {
                player.sendMessage("You've already marked that player!");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }
            
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            TrackerRole.addMarkToPlayer(player, otherEntity);

            // ability activate message
            player.sendMessage("§a§oBegan tracking " + otherEntity.name + "...");
            // player.sendMessage(JSON.stringify(TrackerRole.getTrackedTags(player)));
            let trackedPlayers = TrackerRole.getTrackedTags(player).map((tag) => tag.substring(TrackerRole.trackingTag.length).split("colored")[0]);
            // player.sendMessage(JSON.stringify(trackedPlayers));
            trackedPlayers = trackedPlayers.map((id) => ScoreboardManager.getPlayerWithID(parseInt(id)).name);
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " started tracking " + otherEntity.name + " (now tracking " + trackedPlayers + ")", LogItemType.ABILITY_MESSAGE);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.TRACKER_MARK);
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
        form.title("Tracker Settings");

        form.divider();
        form.label("The tracker is an innocent that is able to mark players and track their movements.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.tracker.enabled") != 0;
        form.toggle("Tracker Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_cooldown");
        form.slider("Track Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of track. Every marked player will have a line drawn between them and the tracker.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_count");
        form.slider("Tracker Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times track can be used. -1 is infinite uses");
        
        let trackRedeem = ScoreboardManager.getTrackedObjective("role_settings.tracker.player_death_redeems_track") != 0;
        form.toggle("Tracked Death Redeems Mark", { defaultValue: trackRedeem }); // 8
        form.label("If enabled, when a tracked player dies, the tracker will get an ability use back.");
        
        let notifyTrackerOnReturn = ScoreboardManager.getTrackedObjective("role_settings.tracker.notify_tracker_on_track_redeem") != 0;
        form.toggle("Tell Tracker On Mark Redeem", { defaultValue: trackRedeem }); // 10
        form.label("If enabled, the tracker is told when they get a mark back.");
        
        
        // scoreboard objectives add  dummy
        // scoreboard objectives add  dummy
        // scoreboard objectives add  dummy
        // scoreboard objectives add  dummy
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.tracker.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.tracker.track_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.tracker.track_count", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.tracker.player_death_redeems_track", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tracker.notify_tracker_on_track_redeem", r.formValues[10] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.tracker.track_count");
        let trackRedeem = ScoreboardManager.getTrackedObjective("role_settings.tracker.player_death_redeems_track") != 0;
        let notifyTrackerOnReturn = ScoreboardManager.getTrackedObjective("role_settings.tracker.notify_tracker_on_track_redeem") != 0;
        
        let description = "The tracker is an innocent who can mark players and keep track of where they are.";
        description += "\n\nTrack Cooldown: " + cooldownTime + " seconds.";
        description += "\nTrack Uses: " + abilityUses;
        description += "\nDead Player Redeems Track: " + trackRedeem;
        description += "\nNotify on Track Redeem: " + notifyTrackerOnReturn;
        return description;
    }
}
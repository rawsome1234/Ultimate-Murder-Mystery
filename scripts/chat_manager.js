"use strict";

import { world, system, Player } from "@minecraft/server";

import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager";
import { RoleTypes } from "./role";
import { PlayerHandler } from "./player_handler";
import { DeathHandler } from "./death_handler";
import { SoundManager } from "./sound_manager";
import { VampireRole } from "./roles/vampire";
import { LogItemType } from "./logs/game_log";
import { LogManager } from "./log_manager";

export class ChatManager {
    static CHAT_IDENTITY_PROPERTY = "chat_identity";
    static BLOCK_DEAD_MESSAGES_TAG = "blockDeadMessages"; // blocks receiving dead chat messages
    static BLOCK_INCOMING_MESSAGE_TAG = "blockIncomingMessages"; // blocks receiving all messages
    static BLOCK_OUTGOING_MESSAGE_TAG = "blockOutgoingMessages"; // blocks sending all messages
    static BLOCK_SHOUT_TAG = "blockShout";
    static CHANNEL_COLORS_SAVE_KEY = "channelColors";
    static channelColors = new Object();

    static initialize() {
        if (this.initialized) {
            return;
        }

        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while loading the chat manager. Please notify a dev.");
            }
            return;
        }

        this.initialized = true;
        
        if (armorStand.getDynamicPropertyIds().includes(ChatManager.CHANNEL_COLORS_SAVE_KEY)) {
            let loadString = armorStand.getDynamicProperty(ChatManager.CHANNEL_COLORS_SAVE_KEY);
            if (loadString == "" || loadString == null) {
                return;
            }
            ChatManager.channelColors = JSON.parse(loadString);

            // this.currentPresets = loadArray.map((def) => {
            //     return this.parsePresetDefinition(def);
            // });
            return;
        }
        else {
            armorStand.setDynamicProperty(ChatManager.CHANNEL_COLORS_SAVE_KEY, "{}");
        }
    }

    static _saveChannelColors() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while loading the preset manager. Please notify a dev.");
            }
            return;
        }

        let saveString = JSON.stringify(ChatManager.channelColors);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving string " + saveString));
        armorStand.setDynamicProperty(ChatManager.CHANNEL_COLORS_SAVE_KEY, saveString);
    }

    /**
     * Handles a chat message sent by a player.
     * @param {Player} playerSource the player who sent the message.
     * @param {string} message the message the player sent in chat.
     */
    static handleChatMessage(playerSource, message) {
        if (playerSource.hasTag(ChatManager.BLOCK_OUTGOING_MESSAGE_TAG)) {
            return
        }

        let playerChannel = this.getPlayerChannel(playerSource);
        let murdererChannelAccess = ScoreboardManager.getScoreboardObjective(playerSource, "player.has_murderer_channel_access") == 1;
        // playerSource.sendMessage("Checking chat: player has channel access " + playerChannel);
        let isShout = message.startsWith("!shout ");
        let hideAndSeekOn = ScoreboardManager.getTrackedObjective("role_settings.tempest.hide_and_seek") == 1;

        if (isShout || !ScoreboardManager.isGameRunning() || hideAndSeekOn) {
            let isDead = playerSource.hasTag("dead");
            if (isDead || playerSource.hasTag(ChatManager.BLOCK_SHOUT_TAG)) {
                playerSource.sendMessage("You cannot shout " + (isDead ? "since you are dead" : "right now") + ".");
                return;
            }
            if (isShout) {
                message = message.substring("!shout ".length);
            }
            let toSend = this._makePlayerWrapper(playerSource) + " " + message; 
            world.sendMessage(toSend);
            return;
        }

        let color = " ";
        if (DeathHandler.consideredDead(playerSource) && !playerSource.hasTag(VampireRole.IN_VAMP_CHAT_TAG)) {
            playerChannel = -2;
            color = "i";
        }
        
        if (Object.hasOwn(this.channelColors, playerChannel.toString())) {
            color = this.channelColors[playerChannel.toString()];
        }

        let tricksterInGame = ChatManager.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.TRICKSTER).length > 0 && ScoreboardManager.getTrackedObjective("role_settings.trickster.disables_murderer_chat") == 1;
        let hasMurdererTag = ChatManager.isMurdererChatTag(message.split(" ")[0]);
        let isMurdererChannel = (hasMurdererTag || playerChannel == -1) && murdererChannelAccess;
        // playerSource.sendMessage("Sending message to murderer chat: " + isMurdererChannel);
        let forwardPlayers = [];
        
        let summonHasChat = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_has_chat_access") != 0;
        if (playerChannel != -1 && !isMurdererChannel) {
            forwardPlayers = this.findPlayersInChannel(world.getAllPlayers(), playerChannel, null);
            // playerSource.sendMessage("Got " + forwardPlayers.length + " players");
        }
        else if (isMurdererChannel && !tricksterInGame && (!playerSource.hasTag("necromancerSummon") || summonHasChat)) {
            color = "c";
            if (hasMurdererTag) {
                message = message.substring(10);
            }
            forwardPlayers = this.getPlayersInMurdererChannel(world.getAllPlayers(), null);
            // playerSource.sendMessage("" + forwardPlayers.length);
        }
        
        if (ScoreboardManager.getTrackedObjective("settings.death_handling.dead_players_receive_all_chat_messages") != 0 || playerChannel == -2) {
            world.getAllPlayers().forEach((player) => {
                if (!forwardPlayers.includes(player) && ChatManager.receivesDeadMessages(player)) {
                    forwardPlayers.push(player);
                }
            });
        }

        // if (playerSource.name == "rawsome1234") {
        //     playerSource.sendMessage("Recognized name");
        // }
        if (forwardPlayers.length > 0) {
            // if (playerSource.name == "rawsome1234") {
            //     playerSource.sendMessage("Players being forwarded: " + (Util.formatStringList(forwardPlayers.map((p) => p.name))));
            // }
            color = "§" + color;
            let deadMessage = color + this._makePlayerWrapper(playerSource, false, playerChannel, true) + " " + message;
            message = color + this._makePlayerWrapper(playerSource, true, playerChannel, false) + " " + message;
            message = message.replace("%", "\%");
            forwardPlayers.forEach((player) => {
                if (player.hasTag(ChatManager.BLOCK_INCOMING_MESSAGE_TAG)) {
                    return;
                }
                player.sendMessage(player.hasTag("dead") ? deadMessage : message);
            });
            LogManager.addToLog(deadMessage, LogItemType.CHAT_MESSAGE);
        }
    }

    /**
     * 
     * @param {string} tag 
     * @returns 
     */
    static isMurdererChatTag(tag) {
        return ["!murderer","!murd"].includes(tag.toLowerCase());
    }

    /**
     * Sorts a list of players if they have the given role, living or dead.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {RoleTypes} roleID the roleTypes to search for.
     * @returns {Player[]}
     */
    static sortPlayersWithRole(players, roleID) {
        let validPlayers = [];
        players.forEach((p) => {
            if (p.hasTag("AFK")) {
                return;
            }

            let playerRole = RoleManager.getPlayerRole(p);
            if (playerRole.getRoleType().id == roleID.id) {
                validPlayers.push(p);
            }
        });
        return validPlayers;
    }

    /**
     * Makes a player wrapper, formatted "<player_name>"
     * @param {Player} player the player being wrapped
     * @param {boolean} useIdentity whether to use the player's identity or not.
     * @param {number} chatID the id of the chat for the identity.
     * @param {boolean} showIdentity whether to show the identity as well in the name
     * @returns {string}
     */
    static _makePlayerWrapper(player, useIdentity, chatID, showIdentity) {
        let identity = ChatManager.getPlayerIdentity(player, chatID);
        showIdentity = showIdentity && player.name != identity;
        let name = useIdentity ? ChatManager.getPlayerIdentity(player, chatID) : player.name;
        let revealIdentity = showIdentity && !useIdentity ? " (" + identity + ")" : "";
        return "<" + (name) + (revealIdentity) + ">";
    }

    static resetChannels() {
        ScoreboardManager.setTrackedObjective("tracking.next_chat_channel", 0);
        ScoreboardManager.setTrackedObjective("role_settings.vampire.chat_id", -1);
        world.getAllPlayers().forEach((player) => {
            ScoreboardManager.setScoreboardObjective(player, "player.has_murderer_channel_access", 0);
            ScoreboardManager.setScoreboardObjective(player, "player.chat_channel.index", -1);
            ScoreboardManager.setScoreboardObjective(player, "player.saved_channel.index", -1);
        });
    }

    /**
     * Requests a channel ID to be registered.
     * @returns {number} the id of the new channel.
     */
    static requestChannelID() {
        let nextChannel = ScoreboardManager.getTrackedObjective("tracking.next_chat_channel");
        ScoreboardManager.setTrackedObjective("tracking.next_chat_channel", nextChannel + 1);
        return nextChannel;
    }

    /**
     * Sets a channel ID's color.
     * @param {number} channel the id of the channel
     * @param {string} colorString the string. The initial color code is handled.
     */
    static setChannelColor(channel, colorString) {
        if (channel >= 0) {
            ChatManager.channelColors[channel.toString()] = colorString;
            ChatManager._saveChannelColors();
        }
    }

    /**
     * Gets a list of all players who are in a channel.
     * @param {Player[]} players the list of players to sort.
     * @param {number} channel the channel to search.
     * @param {Player} excludePlayer if given, skips this player in the list.
     * @returns {Player[]} returns the list of players in the channel.
     */
    static getPlayersInMurdererChannel(players, excludePlayer) {
        let validPlayers = [];
        players.forEach((player) => {
            let hasMChatAccess = ScoreboardManager.getScoreboardObjective(player, "player.has_murderer_channel_access") == 1;
            if (hasMChatAccess && (excludePlayer == null || player.id != excludePlayer.id)) {
                // player.sendMessage("Has access to M chat");
                validPlayers.push(player);
            }
        });
        return validPlayers;
    }

    /**
     * Gets a list of all players who are in a channel.
     * @param {Player[]} players the list of players to sort.
     * @param {number} channel the channel to search.
     * @param {Player} excludePlayer if given, skips this player in the list.
     * @returns {Player[]} returns the list of players in the channel.
     */
    static findPlayersInChannel(players, channel, excludePlayer) {
        let validPlayers = [];
        players.forEach((player) => {
            let playerChannel = this.getPlayerChannel(player);
            if (playerChannel == channel && (excludePlayer == null || player.id != excludePlayer.id)) {
                validPlayers.push(player);
            }
        });
        return validPlayers;
    }

    /**
     * Registers a player to a chat room.
     * @param {Player} player the player who is to be added.
     * @param {number} chatChannelID the channel to set the player to.
     */
    static registerPlayerToChat(player, chatChannelID) {
        ScoreboardManager.setScoreboardObjective(player, "player.chat_channel.index", chatChannelID);
    }

    /**
     * Pulls a player to a chat room, temporarily disabling access to their original chat room.
     * @param {Player} player the player being taken.
     * @param {number} chatChannel the channel they're being pulled to.
     */
    static pullPlayerToChat(player, chatChannel) {
        let currentChannel = this.getPlayerChannel(player);
        ScoreboardManager.setScoreboardObjective(player, "player.saved_channel.index", currentChannel);
        ScoreboardManager.setScoreboardObjective(player, "player.chat_channel.index", chatChannel);
    }

    /**
     * Returns a player to their saved chatroom, if set.
     * @param {Player} player the player being reverted.
     */
    static revertPlayerChannel(player) {
        let savedChannel = this.getPlayerSavedChannel(player);
        if (savedChannel < -1) {
            return;
        }

        ScoreboardManager.setScoreboardObjective(player, "player.saved_channel.index", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.chat_channel.index", savedChannel);
    }

    /**
     * Gets the chatroom a player is in.
     */
    static getPlayerChannel(player) {
        return ScoreboardManager.getScoreboardObjective(player, "player.chat_channel.index");
    }

    /**
     * Gets the saved chatroom of a player.
     */
    static getPlayerSavedChannel(player) {
        return ScoreboardManager.getScoreboardObjective(player, "player.saved_channel.index");
    }

    /**
     * Gives a player a chat identity
     * @param {Player} player the player to give the identity
     * @param {number} chatID the id of the chat for it to be used
     * @param {string} identity the identity to be used
     */
    static givePlayerChatIdentity(player, chatID, identity) {
        let searchIdentity = ChatManager.CHAT_IDENTITY_PROPERTY + chatID;
        // player.sendMessage("search identity: " + searchIdentity);
        player.setDynamicProperty(searchIdentity, identity);
    }
    
    /**
     * Gets a player's identity, or their name if none found.
     * @param {Player} player 
     * @param {number} chatID the chat to get the identity of
     */
    static getPlayerIdentity(player, chatID) {
        let searchIdentity = ChatManager.CHAT_IDENTITY_PROPERTY + chatID;
        // player.sendMessage("search identity: " + searchIdentity);
        let identity = player.getDynamicProperty(searchIdentity);
        if (identity == null || identity == -1) {
            // player.sendMessage("Using normal name");
            return player.name;
        }
        return identity;
    }

    static clearPlayerIdentities() {
        world.getAllPlayers().forEach((player) => {
            player.getDynamicPropertyIds().forEach((property) => {
                if (property.startsWith(ChatManager.CHAT_IDENTITY_PROPERTY)) {
                    player.setDynamicProperty(property, -1);
                }
            });
        });
    }

    static receivesDeadMessages(player) {
        return DeathHandler.consideredDead(player) && !player.hasTag(ChatManager.BLOCK_DEAD_MESSAGES_TAG);
    }

    /**
     * Sends all dead players a message.
     * @param {string} message 
     * @param {LogItemType} logType saves this message as this type of log in the log. If null, does not save
     */
    static sendDeadPlayersMessage(message, logType) {
        if (logType != null) {
            LogManager.addToLog(message, logType);
        }
        else {
            world.getAllPlayers().filter((pl) => pl.getComponent(PlayerHandler.UMM_WORLD_OWNER_PROPERTY)).forEach((pl) => pl.sendMessage("Warning, message sent with no log type: " + message));
        }

        world.getAllPlayers().forEach((pl) => {
            if (ChatManager.receivesDeadMessages(pl)) {
                pl.sendMessage(message);
            }
        });
    }
}
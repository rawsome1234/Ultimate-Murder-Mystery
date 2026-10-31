"use strict";

import { world, system, Player } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { SoundManager } from "./sound_manager";
import { GameLog, LogItemType } from "./logs/game_log";
import { DeathHandler } from "./death_handler";
import { RoleAssignment } from "./role_assignment";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { SettingsHandler } from "./settings_handler";
import { WinConditionManager } from "./win_con_handler";
import { OnGameEndSignal } from "./signals/on_game_end";

export class LogManager {
    static ALL_LOG_DATA_KEY = "GAME_LOG_DATA";
    /**
     * @type {GameLog[]}
     */
    static gameLogs = [];

    static initialize() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while reloading the log manager. Please notify a dev.");
            }
            return;
        }

        if (this.initialized) {
            return;
        }


        this.initialized = true;

        if (!RoleAssignment.afterRolesAssigned.isConnected(LogManager.afterRolesAssigned)) {
            RoleAssignment.afterRolesAssigned.subscribe(LogManager.afterRolesAssigned);
        }
        if (!WinConditionManager.onGameEnd.isConnected(LogManager.onGameEnd)) {
            WinConditionManager.onGameEnd.subscribe(LogManager.onGameEnd);
        }
        // system.runInterval(this._incrementTimer, 1);
        // world.beforeEvents.itemUse.subscribe((event) => {
        //     let player = event.source;
        //     let item = event.itemStack;
        //     let playerIsChoosing = ScoreboardManager.getPlayerID(player) == ScoreboardManager.getTrackedObjective("role_draft.current_player_id");
        //     if (playerIsChoosing && RoleDraft.isRoleDraftItem(item)) {
        //         RoleDraft.onRoleItemClick(player, item);
        //     }
        // });

        // if (world.getAllPlayers().length == 1 && RoleDraft.isDraftRunning()) {
        //     ScoreboardManager.setTrackedObjective("role_draft.is_running", 0);
        //     world.getAllPlayers().forEach((pl) => pl.sendMessage("Role Draft was running last time, turning off."));
        //     return;
        // }

        this.gameLogs = [];
        if (armorStand.getDynamicPropertyIds().includes(LogManager.ALL_LOG_DATA_KEY)) {
            let loadString = armorStand.getDynamicProperty(LogManager.ALL_LOG_DATA_KEY);
            if (loadString == "" || loadString == null) {
                return;
            }
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Loading current log of " + loadString));
            let arrayToLoad = JSON.parse(loadString);
            arrayToLoad.forEach((logData) => {
                this.gameLogs.push(new GameLog(logData));
            });
            
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Now have " + this.gameLogs.length));
        }
    }

    static clearLogs() {
        this.gameLogs = [];
    }
    
    static _saveCurrentLog() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while saving log manager. Please notify a dev.");
            }
            return;
        }

        let arrayToSave = [];
        let minIndex = 0;
        if (LogManager.gameLogs.length > 0) {
            minIndex = LogManager.gameLogs.length - 4;
        }
        for (let i = minIndex; i < LogManager.gameLogs.length; i++) {
            let log = LogManager.gameLogs[i];
            if (log != null) {
                arrayToSave.push(JSON.stringify(log.logData));
            }
        }
        let logSaveString = JSON.stringify(arrayToSave);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving string " + logSaveString));
        try {
            armorStand.setDynamicProperty(LogManager.ALL_LOG_DATA_KEY, logSaveString);
        }
        catch (e) {
            return;
        }
    }

    static afterRolesAssigned() {
        LogManager.addToLog(DeathHandler.createPlayerRoleMessage(), LogItemType.GENERIC_MESSAGE);
    }

    /**
     * 
     * @param {OnGameEndSignal} onGameEndSignal 
     */
    static onGameEnd(onGameEndSignal) {
        let winningPlayers = onGameEndSignal.winningPlayers;
        let allPlayers = WinConditionManager._getPlayingPlayers(world.getAllPlayers());
        let winningMessage = "";
        allPlayers.forEach((player) => {
            let playerLine = WinConditionManager.assemblePlayerMessage(player, winningPlayers)
            winningMessage += playerLine;
        });

        let currentLog = LogManager._getCurrentLog();
        if (currentLog) {
            currentLog.addStringToLog(winningMessage, LogItemType.GENERIC_MESSAGE);
            LogManager._saveCurrentLog();
        }
    }

    static openLogForm(player) {
        let form = new ActionFormData();
        form.title("Select Log Form");
        form.body("Select one of the following logs to view");
        let allLogs = LogManager.gameLogs;
        let currentLogIndex = allLogs.length - 1;
        for (let i = currentLogIndex; i >= 0; i--) {
            let logName = "Game " + (i+1);
            if (i == currentLogIndex) {
                logName += " (current)";
            }
            form.button(logName);
        }

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let chosenIndex = r.selection;
            let logToShowIndex = allLogs.length - chosenIndex - 1;
            if (logToShowIndex == currentLogIndex && !DeathHandler.consideredDead(player) && ScoreboardManager.isGameRunning()) {
                player.sendMessage("You must be dead to view the current game's log.");
                return;
            }
            LogManager.openLogFilterForm(player, allLogs[logToShowIndex], false);
        });
    }

    static openLogFilterForm(player, log, startOff) {
        if (startOff == null) {
            startOff = false;
        }

        // player.sendMessage("Starting off: " + startOff);
        let form = new ModalFormData();
        form.title("Log Prep Form");
        form.label("Select the types of messages you'd like to see the history of.");

        form.toggle("Ability Messages", { defaultValue: !startOff, tooltip: "Messages from activating abilities." });
        form.toggle("Death Messages", { defaultValue: !startOff, tooltip: "Messages from players dying" });
        // form.toggle("Generic Messages", { defaultValue: !startOff, tooltip: "Messages that don't fall into a specific category" });
        form.toggle("Chat Messages", { defaultValue: !startOff, tooltip: "Messages that were sent in chat from various chatrooms" });
        // form.toggle("Guess Messages", { defaultValue: !startOff, tooltip: "Messages that report guess results" });
        // form.toggle("Command Messages", { defaultValue: !startOff, tooltip: "Messages that report role and modifier changes from commands" });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            let typesToShow = [];
            if (r.formValues[1]) {
                typesToShow.push(LogItemType.ABILITY_MESSAGE);
            }
            if (r.formValues[2]) {
                typesToShow.push(LogItemType.DEATH_MESSAGE);
            }
            // if (r.formValues[3]) {
            typesToShow.push(LogItemType.GENERIC_MESSAGE);
            // }
            // if (r.formValues[4]) {
            typesToShow.push(LogItemType.CHAT_MESSAGE);
            // }
            if (r.formValues[3]) {
                typesToShow.push(LogItemType.GUESS_MESSAGE);
            }
            // if (r.formValues[6]) {
            typesToShow.push(LogItemType.COMMAND_MESSAGE);
            // }

            LogManager.showLogWithTypes(player, log, typesToShow);
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {GameLog} player 
     * @param {LogItemType[]} logTypes 
     */
    static showLogWithTypes(player, log, logTypes) {
        let message = LogManager.assembleLogMessage(log, logTypes);
        let form = new ModalFormData();
        form.title("Game Log");

        form.label(message);
        form.submitButton("Close");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            SettingsHandler.openPlayerSettings(player);
        });
    }

    static assembleLogMessage(log, logTypes) {
        return log.getLogData(logTypes);
    } 

    static startNewLog() {
        LogManager.gameLogs.push(new GameLog());
    }

    static addToLog(string, logType) {
        if (ScoreboardManager.isGameRunning()) {
            let currentLog = LogManager._getCurrentLog();
            if (currentLog) {
                currentLog.addStringToLog(string, logType);
                LogManager._saveCurrentLog();
            }
        }
    }

    /**
     * @returns {GameLog}
     */
    static _getCurrentLog() {
        return this.gameLogs[this.gameLogs.length-1]
    }
}
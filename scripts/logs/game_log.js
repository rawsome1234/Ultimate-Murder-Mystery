"use strict";

import { world } from "@minecraft/server";

export class GameLog {
    
    /**
     * @type {Object[]}
     */
    logData = [];

    /**
     * Creates a new Game Log, imported from given data.
     * @param {string} data 
     */
    constructor(data) {
        if (data == null) {
            this.logData = [];
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(data);
        }
        catch (e) {
            this.logData = [];
            return;
        }
        this.logData = parsedData;
    }

    /**
     * Adds a new string with a log type to this log
     * @param {String} string 
     * @param {LogItemType} logType 
     */
    addStringToLog(string, logType) {
        this.logData.push({ data: string, type: logType.id });
    }

    /**
     * Gets this log's data as a string.
     * @param {LogItemType[]?} logTypes if given, will sort for only these types of log items. If null will return all strings.
     * @returns {string} a string of the log.
     */
    getLogData(logTypes) {
        let dataToShow = this.logData;
        if (logTypes != null && logTypes.length > 0) {
            let logTypeIds = logTypes.map((type) => type.id);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Filtering from " + dataToShow.length));
            dataToShow = this.logData.filter((d) => logTypeIds.includes(d.type));
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("to " + dataToShow.length));
        }
        let message = "";
        dataToShow.forEach((d) => {
            message += d.data + "§r\n";
        });
        return message;
    }

}

export const LogItemType = Object.freeze({
    ABILITY_MESSAGE: { id: 0 },
    DEATH_MESSAGE: { id: 1 },
    COMMAND_MESSAGE: { id: 2 },
    GENERIC_MESSAGE: { id: 3 },
    CHAT_MESSAGE: { id: 4 },
    GUESS_MESSAGE: { id: 5 },
});
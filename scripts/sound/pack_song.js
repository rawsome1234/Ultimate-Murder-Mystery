"use strict";

import { world, system, Player } from "@minecraft/server";

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ConditionType, SongCondition } from "./song_condition";

export class PackSong {
    /**
     * 
     * @param {string} songPath 
     * @param {number} songLength the length of this song in seconds
     */
    constructor(songPath, songLength) {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Creating song with path " + songPath));
        this.conditions = [];
        this.weight = 1;
        this.canRepeat = false;
        if (songPath == null) {
            this.path = "none.set";
            this.songLength = 0;
            return;
        }
        this.path = songPath;
        this.songLength = songLength;
        this.weight = 1;
    }

    /**
     * 
     * @param {SongCondition[]} conditions 
     */
    setConditions(conditions) {
        this.conditions = conditions;
    }
    
    /**
     * 
     */
    setCanRepeat() {
        this.canRepeat = true;
    }

    /**
     * @param {PackSong} previousSong
     * @returns {boolean} returns if all of this song's conditions are met.
     */
    conditionsAreMet(murdererCount, playerAlignment, totalPlayers, currentPlayers, previousSong) {
        // if (previousSong != null) {
        //     world.getAllPlayers().forEach((pl) => pl.sendMessage("Previous song type " + typeof(previousSong)));
        // }
        if (previousSong != null && previousSong != "" && previousSong.getPath() == this.getPath() && !this.canRepeat) {
            return false;
        }

        if (this.conditions.length == 0) {
            return true;
        }
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Checking conditions"));

        for (let i = 0; i < this.conditions.length; i++) {
            let testCond = this.conditions[i];
            if (!testCond.isMet(murdererCount, playerAlignment, totalPlayers, currentPlayers)) {
                return false;
            }
        }
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Conditions are true"));
        return true;
    }

    /**
     * @returns {boolean} returns whether or not this song has a condition that depends on the player's alignment.
     */
    hasAlignmentCondition() {
        if (this.conditions.length == 0) {
            return false;
        }

        for (let i = 0; i < this.conditions.length; i++) {
            let testCond = this.conditions[i];
            if (testCond.conditionType == ConditionType.ALIGNMENT) {
                return true;
            }
        }
        return false;
    }

    /**
     * 
     * @returns {Object} an object for use in saving
     */
    convertToSave() {
        let data = {};
        data.path = this.path;
        data.song_duration = this.songLength;
        let conditionsToSave = [];
        this.conditions.forEach((c) => {
            conditionsToSave.push(c.convertToSave());
        });
        data.conditions = conditionsToSave;
        data.weight = this.weight;
        data.can_repeat = this.canRepeat;
        // system.run(() => world.getAllPlayers()[0].sendMessage("" + JSON.stringify(data)));
        return data;
    }

    getPath() {
        return this.path;
    }

    getSongLength() {
        return this.songLength;
    }

    getWeight() {
        return this.weight;
    }
}
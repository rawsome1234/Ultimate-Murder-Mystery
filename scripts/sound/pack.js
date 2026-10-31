"use strict";

import { world, system, Player } from "@minecraft/server";

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { PackLoader } from "./pack_loader";
import { Util } from "../util";

export class SoundPack {
    /**
     * Creates a new pack settings
     * @param {string} packSettings
     * @param {PackTypes} packType
     */
    constructor(packSettings, packType) {
        this.setup = false;
        if (packType != null) {
            this.packType = packType;
        }
        else {
            this.packType = PackTypes.CUSTOM;
        }

        this.packSongs = [];
        this.packName = "";
        if (packSettings == "" || packSettings == null) {
            return;
        }

        let packJson = JSON.parse(packSettings);
        if (!Object.hasOwn(packJson, 'pack_name')) {
            world.sendMessage("Error loading pack, no pack name found");
            return;
        }

        this.packSongs = PackLoader.getSongList(packSettings);
        // system.run(() => {
        //     world.getAllPlayers()[0].sendMessage("Parsing pack definition, song count: " + this.packSongs.length);
        // });
        this.packName = packJson.pack_name;
        this.setup = true;
    }


    /**
     * Gets a random song string from this pack.
     * @param {number} murdererCount the current number of murderers
     * @param {RoleAlignment} playerAlignment the alignment of the player's role. If it is a bool, will refer to if you should ignore this part of the condition.
     * @param {number} totalPlayers the number of total players who are playing this round
     * @param {number} currentPlayers the current number of living players
     * @returns {PackSong} a random song from this pack, or null if none found.
     */
    getSong(murdererCount, playerAlignment, totalPlayers, currentPlayers, previousSong) {
        if (this.packSongs.length > 0) {
            let validSongs = this.packSongs.filter((v) => v.conditionsAreMet(murdererCount, playerAlignment, totalPlayers, currentPlayers, previousSong));

            if (validSongs.length == 0) {
                validSongs = this.packSongs.filter((v) => v.conditionsAreMet(murdererCount, playerAlignment, totalPlayers, currentPlayers, null));
                // world.sendMessage("Found no songs, rerolling, now have " + validSongs.length + " songs.");
            }
            
            let weights = validSongs.map((song) => song.weight);
            let songIndex = Util.rollWeights(weights);
            // world.getAllPlayers()[0].sendMessage("Weights: " + JSON.stringify(weights) + ", song index: " + songIndex);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Valid Songs: " + validSongs.length + ", rolled song index " + songIndex));
            return validSongs[songIndex];
        }
        else {
            world.getAllPlayers()[0].sendMessage("Conditions not met");
        }
        return null;
    }

    /**
     * 
     * @returns {PackSong[]}
     */
    getAllSongs() {
        return this.packSongs;
    }

    /**
     * Returns a string that can be used to reload the pack
     */
    convertToSave() {
        let convert = {};
        let songData = [];
        this.packSongs.forEach((song) => {
            songData.push(song.convertToSave());
        });
        // system.run(() => world.getAllPlayers()[0].sendMessage("Song Count: " + this.packSongs.length));
        // system.run(() => world.getAllPlayers()[0].sendMessage("" + JSON.stringify(songData)));
        convert.pack_content = songData;
        convert.pack_name = this.packName;
        return JSON.stringify(convert);
    }
}

export const PackTypes = Object.freeze({
    BUILTIN: {name: "Built-in", id:0},
    MAP: {name: "Map", id:1},
    CUSTOM: {name: "Custom", id:2}
});
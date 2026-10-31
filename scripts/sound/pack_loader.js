"use strict";

import { world, system, Player } from "@minecraft/server";

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { PackSong } from "./pack_song";
import { SongCondition } from "./song_condition";

export class PackLoader {
    /**
     * @param {string} packSettings
     * @returns {PackSong[]}
     */
    static getSongList(packSettings) {
        let json = JSON.parse(packSettings);
        let songs = [];
        if (Object.hasOwn(json, 'pack_content')) {
            json.pack_content.forEach((songDef) => {
                // system.run(() => {
                //     world.getAllPlayers()[0].sendMessage("generating song with def " + songDef);
                // });
                let s = PackLoader._parseSongDefinition(songDef);
                if (s != null) {
                    songs.push(s);
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage(s.getPath()));
                }
            });
        }
        return songs;
    }

    /**
     * Parses a dict that represents a single song definition.
     * @param {Object} songObj the object definition for a song.
     * @returns {PackSong} the parsed packed song, or null if not valid.
     */
    static _parseSongDefinition(songObj) {
        if (Object.hasOwn(songObj, 'path') && Object.hasOwn(songObj, 'song_duration')) {
            let newSong = new PackSong(songObj.path, songObj.song_duration);
            let conditions = [];
            
            if (Object.hasOwn(songObj, 'conditions')) {
                let allConditions = songObj.conditions;
                allConditions.forEach((cond) => {
                    let createdCondition = new SongCondition(cond);
                    if (createdCondition.setup) {
                        conditions.push(createdCondition);
                    }
                });
            }

            if (Object.hasOwn(songObj, 'weight')) {
                let weight = songObj.weight;
                newSong.weight = weight;
            }

            if (Object.hasOwn(songObj, 'can_repeat')) {
                newSong.canRepeat = songObj.can_repeat;
            }

            newSong.setConditions(conditions);
            return newSong;
        }
        return null;
    }


}
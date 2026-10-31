"use strict";

import { world, system } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { SoundManager } from "./sound_manager";
import { Preset } from "./presets/preset";

export class PresetManager {


    static PRESET_NAMES_PROPERTY = "presetNames";

    static PRESET_STORAGE_NAME = "preset_"

    /**
     * @type {Preset[]}
     */
    static currentPresets = [];

    static ALL_PRESET_SCOREBOARD_DATA = new Map();
    static _CREATED_OBJECT_MAP = false;
    
    static initialize() {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Initializing Preset Manager."));
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while loading the preset manager. Please notify a dev.");
            }
            return;
        }

        this.initialized = true;
        
        if (armorStand.getDynamicPropertyIds().includes(PresetManager.PRESET_NAMES_PROPERTY)) {
            let loadString = armorStand.getDynamicProperty(PresetManager.PRESET_NAMES_PROPERTY);
            if (loadString == "" || loadString == null) {
                return;
            }
            let loadArray = JSON.parse(loadString);
            this.currentPresets = loadArray.map((presetName) => {
                return this.parsePresetDefinition(armorStand.getDynamicProperty(PresetManager.PRESET_STORAGE_NAME + presetName));
            });
            // world.getAllPlayers().forEach((p) => p.sendMessage("Loading packs"));
            // let builtinPackString = '{"pack_content":[{"conditions":[],"path":"umm.builtin.music_lovers","weight":5,"song_duration":107},{"conditions":[],"path":"umm.builtin.music_eight_regret","weight":3,"song_duration":124},{"conditions":[],"path":"umm.builtin.music_resting_grounds","weight":3,"song_duration":132},{"conditions":[],"path":"umm.builtin.music_reflection","weight":3,"song_duration":99},{"conditions":["l<=50"],"path":"umm.builtin.music_dream","weight":3,"song_duration":121},{"conditions":[],"path":"umm.builtin.music_white_lady","weight":1,"song_duration":79},{"conditions":[],"path":"umm.builtin.music_catch_us_now","weight":3,"song_duration":114},{"conditions":[],"path":"umm.builtin.music_genetic_code","weight":2,"song_duration":147}],"pack_name":"Builtin Pack"}';
            // let defaultMapPack = '{"pack_content":[],"pack_name":"Map Pack"}';
            // // world.getAllPlayers().forEach((pl) => pl.sendMessage("Creating armor stand"));
            // armorStand.setDynamicProperty(SoundManager.BUILTIN_PACK_TAG, builtinPackString);
            // // armorStand.setDynamicProperty(SoundManager.BUILTIN_PACK_TAG + builtinPackString);
            // armorStand.setDynamicProperty(SoundManager.MAP_PACK_TAG, defaultMapPack);
            // SoundManager.builtinPack = new SoundPack(builtinPackString, PackTypes.BUILTIN);
            // SoundManager.mapPack = new SoundPack(defaultMapPack, PackTypes.MAP);
            return;
        }
        else {
            armorStand.setDynamicProperty(PresetManager.PRESET_NAMES_PROPERTY, JSON.stringify("[]"));
            PresetManager.importPreset({"presetName":"Introduction to Roles","presetDescription":"A role preset to ease you into roles.","presetType":3,"presetDefinition":"{\"role_settings\": {\"soul\": {\"enabled\": false},\"medium\": {\"enabled\": false},\"altruist\": {\"enabled\": false},\"detective\": {\"enabled\": true},\"revealer\": {\"enabled\": true},\"assassin\": {\"enabled\": false},\"bodyguard\": {\"enabled\": false},\"serial_killer\": {\"enabled\": false},\"necromancer\": {\"enabled\": false},\"investigator\": {\"enabled\": true},\"vampire\": {\"enabled\": false},\"hex\": {\"enabled\": false},\"warden\": {\"enabled\": true},\"trickster\": {\"enabled\": false},\"double_agent\": {\"enabled\": false},\"sheriff\": {\"enabled\": true},\"vigilante\": {\"enabled\": true},\"amnesiac\": {\"enabled\": true},\"trapper\": {\"enabled\": false},\"tracker\": {\"enabled\": true},\"transporter\": {\"enabled\": true},\"survivor\": {\"enabled\": false},\"escapist\": {\"enabled\": true},\"swooper\": {\"enabled\": true},\"medic\": {\"enabled\": false},\"janitor\": {\"enabled\": true},\"apothocary\": {\"enabled\": true},\"tempest\": {\"enabled\": false},\"technician\": {\"enabled\": true},\"mystic\": {\"enabled\": true},\"cleric\": {\"enabled\": false},\"bomber\": {\"enabled\": false},\"warlock\": {\"enabled\": false},\"spy\": {\"enabled\": false},\"ghost_writer\": {\"enabled\": false},\"glitch\": {\"enabled\": false},\"jailor\": {\"enabled\": false},\"cryomancer\": {\"enabled\": false},\"officer\": {\"enabled\": false},\"witch\": {\"enabled\": false},\"tycoon\": {\"enabled\": false},\"mortician\": {\"enabled\": false},\"shadowmancer\": {\"enabled\": false},\"artemis\": {\"enabled\": false},\"stalker\": {\"enabled\": false},\"plague_bearer\": {\"enabled\": false},\"jester\": {\"enabled\": false},\"doppelganger\": {\"enabled\": false},\"gravewalker\": {\"enabled\": false},\"veteran\": {\"enabled\": false},\"murderer\": {\"enabled\": false},\"innocent\": {\"enabled\": false}}}"});
            PresetManager.importPreset({"presetName":"Introduction to Killers","presetDescription":"Includes some more complex roles and neutral killers. There are plenty of roles that were not used in presets, so please explore.","presetType":3,"presetDefinition":"{\"role_settings\": {\"soul\": {\"enabled\": true},\"medium\": {\"enabled\": true},\"altruist\": {\"enabled\": false},\"detective\": {\"enabled\": true},\"revealer\": {\"enabled\": true},\"assassin\": {\"enabled\": true},\"bodyguard\": {\"enabled\": false},\"serial_killer\": {\"enabled\": true},\"necromancer\": {\"enabled\": true},\"investigator\": {\"enabled\": false},\"vampire\": {\"enabled\": false},\"hex\": {\"enabled\": false},\"warden\": {\"enabled\": false},\"trickster\": {\"enabled\": false},\"double_agent\": {\"enabled\": false},\"sheriff\": {\"enabled\": true},\"vigilante\": {\"enabled\": true},\"amnesiac\": {\"enabled\": true},\"trapper\": {\"enabled\": false},\"tracker\": {\"enabled\": true},\"transporter\": {\"enabled\": true},\"survivor\": {\"enabled\": false},\"escapist\": {\"enabled\": true},\"swooper\": {\"enabled\": false},\"medic\": {\"enabled\": true},\"janitor\": {\"enabled\": false},\"apothocary\": {\"enabled\": false},\"tempest\": {\"enabled\": true},\"technician\": {\"enabled\": false},\"mystic\": {\"enabled\": false},\"cleric\": {\"enabled\": true},\"bomber\": {\"enabled\": true},\"warlock\": {\"enabled\": true},\"spy\": {\"enabled\": false},\"ghost_writer\": {\"enabled\": false},\"glitch\": {\"enabled\": false},\"jailor\": {\"enabled\": true},\"cryomancer\": {\"enabled\": true},\"officer\": {\"enabled\": false},\"witch\": {\"enabled\": false},\"tycoon\": {\"enabled\": false},\"mortician\": {\"enabled\": false},\"shadowmancer\": {\"enabled\": false},\"artemis\": {\"enabled\": false},\"stalker\": {\"enabled\": false},\"plague_bearer\": {\"enabled\": true},\"jester\": {\"enabled\": false},\"doppelganger\": {\"enabled\": false},\"gravewalker\": {\"enabled\": false},\"veteran\": {\"enabled\": true},\"murderer\": {\"enabled\": false},\"innocent\": {\"enabled\": false}}}"})
        }
    }

    /**
     * Imports a definition of a preset and returns the created preset.
     * @param {string} def 
     * @returns 
     */
    static parsePresetDefinition(def) {
        let defObj = JSON.parse(def);
        if (Object.hasOwn(defObj, "presetName") && Object.hasOwn(defObj, "presetDefinition") && Object.hasOwn(defObj, "presetType")) {
            return new Preset(defObj.presetName, defObj.presetDefinition, defObj.presetType);
        }
        return new Preset("Unable to Load", "", "", 0);
    }

    static _savePresetsToArmorStand() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while loading the preset manager. Please notify a dev.");
            }
            return;
        }

        let names = [];
        this.currentPresets.forEach((preset) => {
            names.push(preset.presetName);
            armorStand.setDynamicProperty(PresetManager.PRESET_STORAGE_NAME + preset.presetName, JSON.stringify(preset));
        });
        armorStand.setDynamicProperty(PresetManager.PRESET_NAMES_PROPERTY, JSON.stringify(names));
        // let saveArray = this.currentPresets.map((preset) => JSON.stringify(preset));
        // let saveString = JSON.stringify(saveArray);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving string " + saveString));
    }

    static getObjectiveMap() {
        this._loadObjectivesIntoMap();
        return PresetManager.ALL_PRESET_SCOREBOARD_DATA;
    }

    static _loadObjectivesIntoMap() {
        if (PresetManager._CREATED_OBJECT_MAP) {
            return;
        }

        PresetManager._CREATED_OBJECT_MAP = true;

        let blacklistedIDs = ["player_stats", "tracking", "player", "ghost", "entity", "world_state", "role_draft", "sound"];
        let scoreboardsToTest = ["start_lever", "respawn_pos", "weapons_chest", "player_spectate", "player_play_block", "reset_dispenser_button", "book_dispenser", "book_hopper"];
        blacklistedIDs = blacklistedIDs.concat(scoreboardsToTest);
        let allScoreboardIDs = world.scoreboard.getObjectives().map((obj) => obj.id).filter((id) => {
            for (let i = 0; i < blacklistedIDs.length; i++) {
                let nextScoreboard = blacklistedIDs[i];
                if (id.startsWith(nextScoreboard)) {
                    return false;
                }
            }
            return true;
            // return id.startsWith(blacklistedIDs)
        });
        let builtMap = new Map();
        for (let objectiveID = 0; objectiveID < allScoreboardIDs.length; objectiveID++) {
            let objective = allScoreboardIDs[objectiveID];

            PresetManager._loadObjectIntoMap(builtMap, objective);
            // break;
        }

        PresetManager.ALL_PRESET_SCOREBOARD_DATA = builtMap;
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Went through " + allScoreboardIDs.length + " ids"));
        
        // world.getAllPlayers().forEach((pl) => pl.sendMessage(JSON.stringify(builtMap)));
    }
    
    /**
     * 
     * @param {Map} map 
     * @param {string} currentObjective 
     */
    static _loadObjectIntoMap(map, currentObjective) {
        let objectivePieces = currentObjective.split(".");
        
        // map is map of maps ending in a list
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("\nObject being added: "+ currentObjective));
        let nextSegment = map;
        for (let pieceID = 0; pieceID < objectivePieces.length; pieceID++) {
            let piece = objectivePieces[pieceID];
            let lastPiece = pieceID + 1 >= objectivePieces.length;
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Next piece: " + piece + ", last piece: " + lastPiece + ", piece total: " + objectivePieces.length));
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Next Segment: " + JSON.stringify(nextSegment)));
            if (Object.hasOwn(nextSegment, piece)) {
                // next piece is object
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Next Segment does exist, adding to segment"));
                // get next piece
                let nextPiece = nextSegment[piece];
                nextSegment = nextPiece;
                // if (lastPiece) {
                //     // is object and there is one piece left, must be map
                //     // nextSegment[piece]
                // }
                // if (typeof nextPiece == "object") {
                //     if (lastPiece) {
                //     }
                //     else {
                //     }
                //     // is map
                //     // world.getAllPlayers().forEach((pl) => pl.sendMessage("Found piece's location, drilling"));
                // }
                // else {
                //     // is array and there is more pieces
                //     world.getAllPlayers().forEach((pl) => pl.sendMessage("More pieces to add: " + piece));
                //     let newMap = {};
                //     nextPiece.forEach((part) => {
                //         newMap[part] = [];
                //     });
                //     nextSegment = nextPiece;
                // }
            }
            else {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Next Segment does not exist, creating"));
                if (pieceID + 2 == objectivePieces.length) {
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Adding ending map"));
                    // let nextPiece = {};
                    // nextPiece[piece] = objectivePieces[objectivePieces.length-1];
                    nextSegment[piece] = [objectivePieces[objectivePieces.length-1]];
                    // nextSegment[piece] = nextPiece;
                    // nextSegment = nextPiece;
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Next segment is now " + JSON.stringify(nextSegment)));
                    return;
                }
                else if (!lastPiece) {
                    // new map
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Adding new map"));
                    let nextPiece = {};
                    nextSegment[piece] = nextPiece;
                    nextSegment = nextPiece;
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Next segment is now " + JSON.stringify(nextSegment)));
                }
                else {
                    // is array last piece
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Found piece's location, adding to array"));
                    nextSegment.push(piece);
                }
                // else {
                //     // new array
                //     world.getAllPlayers().forEach((pl) => pl.sendMessage("Ending with array"));
                //     let nextPiece = [piece];
                //     nextSegment[piece] = nextPiece;
                //     nextSegment = nextPiece;
                //     world.getAllPlayers().forEach((pl) => pl.sendMessage("Next segment is now " + JSON.stringify(nextSegment)));
                //     // return;
                // }
            }
            
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("New map is now " + JSON.stringify(map)));
        }
    }

    /**
     * Loads the preset's scoreboard data into the scoreboard
     * @param {Preset} preset 
     */
    static loadPreset(preset) {
        this.loadObjectiveData(JSON.parse(preset.presetDefinition));
    }

    static importPreset(jsonObj) {
        let presetName = "No Preset Name Found";
        let presetDescription = "You can type a description for your preset to appear here.";
        let presetDef = "{}";
        let presetType = 0;

        if (Object.hasOwn(jsonObj, "presetName")) {
            presetName = jsonObj.presetName;
        }
        if (Object.hasOwn(jsonObj, "presetDescription")) {
            presetDescription = jsonObj.presetDescription;
        }
        if (Object.hasOwn(jsonObj, "presetDefinition")) {
            presetDef = jsonObj.presetDefinition;
        }
        if (Object.hasOwn(jsonObj, "presetType")) {
            presetType = jsonObj.presetType;
        }

        let preset = new Preset(presetName, presetDescription, presetDef, presetType);
        PresetManager.currentPresets.push(preset);
        PresetManager._savePresetsToArmorStand();
    }

    /**
     * Saves to the preset, based on its preset type.
     * @param {Preset} preset 
     */
    static saveToPreset(preset) {
        let allObjects = world.scoreboard.getObjectives().map((obj) => obj.id);

        let whitelistedObjectives = [];
        // let blacklistedObjectives = ["settings.sound", "settings.map_settings"];
        let presetType = preset.presetType;
        // game settings only
        if ([0, 2].includes(presetType)) {
            whitelistedObjectives = whitelistedObjectives.concat(["settings.role_assignment", "settings.book_pass", "settings.role_management", "settings.win_con_management", "settings.death_handling", "settings.role_draft", "settings.role_guessing", "settings.ghost_bodies"]);
        }
        if ([1, 2].includes(presetType)) {
            whitelistedObjectives = whitelistedObjectives.concat(["settings.modifiers", "role_settings", "modifier_settings"]);
        }
        if ([3].includes(presetType)) {
            whitelistedObjectives = whitelistedObjectives.concat(["role_settings"]);
        }
        if ([4].includes(presetType)) {
            whitelistedObjectives = whitelistedObjectives.concat(["modifier_settings"]);
        }

        // world.getAllPlayers().forEach((pl) => pl.sendMessage("There are " + allObjects.length + " objectives"));
        allObjects = allObjects.filter((obj) => {
            let mustHaveEnabled = [3, 4].includes(presetType);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Checking objective " + obj + " against " + whitelistedObjectives.length + " whitelisted starts"));
            for (let i = 0; i < whitelistedObjectives.length; i++) {
                // world.sendMessage("ends with enabled: " + whitelistedObjectives[i].endsWith(".enabled"));
                if (obj.startsWith(whitelistedObjectives[i]) && (!mustHaveEnabled || obj.endsWith(".enabled"))) {
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Objective " + obj + " contains " + whitelistedObjectives[i]));
                    return true;
                }
            }
            return false;
        });

        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving " + allObjects.length + " objectives"));

        preset.presetDefinition = JSON.stringify(this.saveObjectives(allObjects));
        this._savePresetsToArmorStand();
    }

    /**
     * Saves a list of objectives into JSON.
     * @param {string} objectiveNames 
     * @returns {JSON} a json object of save data
     */
    static saveObjectives(objectiveNames) {
        return this.savePaths(objectiveNames, "");
    }

    /**
     *  
     * @param {string[]} objectives a list of objectives, that start with the running path
     * @param {string} runningPath 
     */
    static savePaths(objectives, runningPath) {
        let json = new Object();
        // let traversedPaths = [];
        let pathCut = runningPath.length;
        for (let i = 0; i < objectives.length; i++) {
            let nextObj = objectives[i];
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Checking objective " + nextObj));
            let objPaths = nextObj.substring(pathCut).split(".");
            if (objPaths.length == 1) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving objective " + nextObj));
                
                json[objPaths[0]] = ScoreboardManager.getTrackedObjective(nextObj);
                continue;
            }
            else if (Object.hasOwn(json, objPaths[0])) {
                continue;
            }

            let nextPath = objPaths[0];
            let newPath = runningPath + nextPath;
            let otherObjectives = objectives.filter((obj) => {
                return obj.startsWith(newPath);
            });
            

            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Objectives with the path " + nextPath + ": " + JSON.stringify(otherObjectives)));

            json[nextPath] = this.savePaths(otherObjectives, newPath + ".");
        }
        return json;
    }

    /**
     * Loads a json as a form of scoreboard data.
     * @param {JSON} jsonData 
     */
    static loadObjectiveData(jsonData) {
        this.loadPaths(jsonData, "");
    }

    /**
     * 
     * @param {JSON} jsonData 
     * @param {string} runningPath 
     */
    static loadPaths(jsonData, runningPath) {
        let keys = Object.keys(jsonData);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Loading keys " + JSON.stringify(keys) + " of " + runningPath));
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = jsonData[key];
            let keyPath = runningPath + key
            if (typeof(value) == typeof({})) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Loading json data " + JSON.stringify(value)));
                this.loadPaths(value, keyPath + ".");
            }
            else {
                let objectiveName = keyPath;
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Setting objective " + objectiveName + " to " + JSON.stringify(value)));
                ScoreboardManager.setTrackedObjective(objectiveName, value);
            }
        }
    }

}
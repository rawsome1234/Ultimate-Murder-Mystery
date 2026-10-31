"use strict";

import { world, system, Player } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { RoleAlignment } from "./role";
import { RoleManager } from "./role_manager";
import { SettingsHandler } from "./settings_handler";
import { PlayerHandler } from "./player_handler";
import { PackTypes, SoundPack } from "./sound/pack";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { PackSong } from "./sound/pack_song";
import { AlignmentTypes, ComparisonTypes, ConditionType, SongCondition } from "./sound/song_condition";
import { PackLoader } from "./sound/pack_loader";
import { RoleDraft } from "./role_draft";

export class SoundManager {
    static builtinPack = new SoundPack('', PackTypes.BUILTIN);
    static mapPack;
    static soundDynamicPropertyKey = "customSoundPacks";
    static initialized = false;
    static previousSong;

    static SOUND_PACK_DEFINITION_TAG = "customSoundPack";
    static BUILTIN_PACK_TAG = "BUILTIN_PACK,";
    static MAP_PACK_TAG = "MAP_PACK,";

    static playerSoundPacks = new Object();

    static initialize() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while loading the sound manager. Please notify a dev.");
            }
            return;
        }
        
        this.initialized = true;
        
        if (!armorStand.getDynamicPropertyIds().includes(SoundManager.BUILTIN_PACK_TAG)) {
            // world.getAllPlayers().forEach((p) => p.sendMessage("Creating initial definitions of save stand"));
            let builtinPackString = '{"pack_content":[{"conditions":["l<=50"],"path":"umm.builtin.music_tension","weight":2,"song_duration":132},{"conditions":[],"path":"umm.builtin.music_main_theme","weight":5,"song_duration":93}],"pack_name":"Builtin Pack"}';
            let defaultMapPack = '{"pack_content":[],"pack_name":"Map Pack"}';
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Creating armor stand"));
            armorStand.setDynamicProperty(SoundManager.BUILTIN_PACK_TAG, builtinPackString);
            // armorStand.setDynamicProperty(SoundManager.BUILTIN_PACK_TAG + builtinPackString);
            armorStand.setDynamicProperty(SoundManager.MAP_PACK_TAG, defaultMapPack);
            SoundManager.builtinPack = new SoundPack(builtinPackString, PackTypes.BUILTIN);
            SoundManager.mapPack = new SoundPack(defaultMapPack, PackTypes.MAP);
            return;
        }
        else {
            // world.getAllPlayers().forEach((p) => p.sendMessage("Getting definitions from sound stand"));
            // let tags = armorStand.getTags();
            let builtinPack = "";
            let mapPack = "";
            let builtinString = armorStand.getDynamicProperty(SoundManager.BUILTIN_PACK_TAG);
            let mapPackString = armorStand.getDynamicProperty(SoundManager.MAP_PACK_TAG);
            SoundManager.builtinPack = new SoundPack(builtinString, PackTypes.BUILTIN);
            SoundManager.mapPack = new SoundPack(mapPackString, PackTypes.MAP);
        }
    }

    static runQueueLoop() {
        system.runInterval(() => {
            // return;
            // game is not running
            if (!ScoreboardManager.isGameRunning() || RoleDraft.isDraftRunning() || ScoreboardManager.getTrackedObjective("player.sound.sound_settings") == 0) {
                return;
            }

            let allPlayers = world.getAllPlayers();
            allPlayers.forEach((player) => {
                // this is for desynced players, so skip otherwise
                if (ScoreboardManager.getScoreboardObjective(player, "player.sound.sound_settings") == 1) {
                    return;
                }

                ScoreboardManager.addScoreboardObjective(player, "sound.current_song_time", 1);

                let plannedDelay = ScoreboardManager.getScoreboardObjective(player, "sound.post_song_delay");
                let songLength = ScoreboardManager.getScoreboardObjective(player, "sound.current_song_length");
                let timeSinceStart = ScoreboardManager.getScoreboardObjective(player, "sound.current_song_time");

                if (timeSinceStart > songLength + plannedDelay) {
                    SoundManager.queueSongForDesyncedPlayer(player);
                }
            });

            ScoreboardManager.addScoreboardObjective("game_data", "sound.current_song_time", 1);
            let plannedDelay = ScoreboardManager.getTrackedObjective("sound.post_song_delay");
            let songLength = ScoreboardManager.getTrackedObjective("sound.current_song_length");
            let timeSinceStart = ScoreboardManager.getTrackedObjective("sound.current_song_time");
            if (timeSinceStart > songLength + plannedDelay) {
                SoundManager.queueSoundForSyncedPlayers();
            }

            // tracked objective

        }, 1);
    }

    /**
     * Rolls for a music type to be played.
     * @param {boolean} canBeMap whether map can be chosen
     * @param {boolean} canBeCustom whether custom can be chosen
     * @returns {MusicTypes} the type that was rolled
     */
    static rollMusicType(canBeMap, canBeCustom) {
        let builtin = ScoreboardManager.getTrackedObjective("settings.sound.builtin_chance");
        let map = ScoreboardManager.getTrackedObjective("settings.sound.map_chance");
        let custom = ScoreboardManager.getTrackedObjective("settings.sound.custom_chance");
        if (map + custom <= 0) {
            return MusicTypes.BUILTIN;
        }

        let total = builtin + map + custom;
        let rand = ScoreboardManager.rollRandomNumber(0, total);
        if (rand < custom && canBeCustom) {
            return MusicTypes.CUSTOM;
        }
        else if (rand < (custom + map) && canBeMap) {
            return MusicTypes.MAP;
        }
        else {
            return MusicTypes.BUILTIN;
        }
    }

    static queueSoundForSyncedPlayers() {
        let allPlayers = world.getAllPlayers();
        let desynchronizedIDs = SoundManager.getDesynchronizedPlayerIDs();

        let musicType = SoundManager.rollMusicType(SoundManager.mapPack != null && SoundManager.mapPack.getAllSongs().length > 0, false);
        
        let murdererCount = PlayerHandler.sortPlayersWithAlignment(allPlayers, [RoleAlignment.MURDERER]).length;
        let livingPlayersCount = PlayerHandler.getLivingPlayers(allPlayers).length;
        let totalPlayersCount = PlayerHandler.getPlayingPlayers(allPlayers).length;
        // world.getAllPlayers().forEach((pl) => {
        //     pl.sendMessage("Previous song is null: " + (SoundManager.previousSong != null));
        //     if (SoundManager.previousSong != null) {
        //         // pl.sendMessage("Previous song is " + SoundManager.previousSong.getPath());
        //     }
        // });
        let pack;
        let song;
        let unalignedSong;
        let longestSong = 0;
        if (musicType != MusicTypes.CUSTOM) {
            pack = SoundManager._getPackToPlay(null, musicType);
            song = pack.getSong(murdererCount, true, totalPlayersCount, livingPlayersCount, SoundManager.previousSong);
            longestSong = song.songLength;
            // world.getAllPlayers().forEach((p) => p.sendMessage("Song rolled " + song.path));
            if (song.hasAlignmentCondition()) {
                unalignedSong = pack.getSong(murdererCount, false, totalPlayersCount, livingPlayersCount);
            }
            // world.getAllPlayers()[0].sendMessage("Rolled song from builtin, which is " + song);
        }
        allPlayers.forEach((player) => {
            let songToAssign = song;
            // world.getAllPlayers().forEach((p) => p.sendMessage("Song rolled " + song.path));
            // player.sendMessage("Playing builtin pack");
            // player.playSound("umm.builtin.music");
            let playerIsSynced = ScoreboardManager.getScoreboardObjective(player, "player.sound.sound_settings");
            if (playerIsSynced != 0) {
                return;
            }

            let playerRole = RoleManager.getPlayerRole(player);
            if (musicType == MusicTypes.CUSTOM) {
                let pack = SoundManager._getPackToPlay(player, musicType);
                let song = pack.getSong(murdererCount, playerRole.getAlignment(), totalPlayersCount, livingPlayersCount, SoundManager.previousSong);
                songToAssign = song;
            }
            else if (playerRole == null || !song.conditionsAreMet(murdererCount, playerRole.getAlignment(), totalPlayersCount, livingPlayersCount, null)) {
                songToAssign = unalignedSong;
            }

            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Assigning song " + songToAssign.path));
            longestSong = Math.max(longestSong, songToAssign.songLength);

            if (songToAssign != null) {
                let playerSound = ScoreboardManager.getScoreboardObjective(player, "player.sound.volume");
                player.playSound(songToAssign.getPath(), {volume:playerSound/100});
                // player.sendMessage("Queued a song with length " + longestSong);
                player.onScreenDisplay.setActionBar([{text:"Now playing: "}, {translate:songToAssign.getPath()}]);
            }
        });
        SoundManager.previousSong = song;
        ScoreboardManager.setTrackedObjective("sound.current_song_length", longestSong * 20);
        let delay = ScoreboardManager.rollRandomNumber(ScoreboardManager.getTrackedObjective("settings.sound.song_delay_min"), ScoreboardManager.getTrackedObjective("settings.sound.song_delay_max"));
        ScoreboardManager.setTrackedObjective("sound.post_song_delay", delay * 20);
        ScoreboardManager.setTrackedObjective("sound.current_song_time", 0);
    }

    static queueSongForDesyncedPlayer(player) {
        let playerIsSynced = ScoreboardManager.getScoreboardObjective(player, "player.sound.sound_settings");
        if (playerIsSynced != 1) {
            return;
        }

        // rolls music type
        let musicType = SoundManager.rollMusicType(SoundManager.mapPack != null && SoundManager.mapPack.getAllSongs().length > 0, true);
        
        // gets the counts for condition checking
        let murdererCount = PlayerHandler.sortPlayersWithAlignment(allPlayers, [RoleAlignment.MURDERER]).length;
        let livingPlayersCount = PlayerHandler.getLivingPlayers(allPlayers).length;
        let totalPlayersCount = PlayerHandler.getPlayingPlayers(allPlayers).length;// player.sendMessage("Playing builtin pack");
        // player.playSound("umm.builtin.music");

        let playerRole = RoleManager.getPlayerRole(player);
        let pack = SoundManager._getPackToPlay(player, musicType);
        let song = pack.getSong(murdererCount, playerRole.getAlignment(), totalPlayersCount, livingPlayersCount);

        let delay = ScoreboardManager.rollRandomNumber(ScoreboardManager.getScoreboardObjective(player, "settings.sound.song_delay_min"), ScoreboardManager.getScoreboardObjective(player, "settings.sound.song_delay_max"));
        
        if (song != null) {
            let songLength = song.songLength;
            player.playSound(song.getPath(), {volume:.2});
            ScoreboardManager.setScoreboardObjective(player, "sound.current_song_length", songLength * 20);
            ScoreboardManager.setScoreboardObjective(player, "sound.current_song_time", 0);
            ScoreboardManager.setScoreboardObjective(player, "sound.post_song_delay", delay * 20);
        }
    }

    static getSoundSaveStand() {
        let armorStand = world.getDimension("overworld").getEntities({tags:["soundSaveStand"],type:"minecraft:armor_stand"});
        
        if (armorStand.length > 0) {
            return armorStand[0];
        }

        try {
            let dim = world.getDimension("overworld");
            if (!world.tickingAreaManager.hasTickingArea("sound_stand")) {
                world.tickingAreaManager.createTickingArea("sound_stand", {dimension:dim, from:{x:-16,y:-64,z:-16}, to:{x:16,y:320,z:16}})
            }
            dim.setBlockType({x:0,y:310,z:0}, "minecraft:glass");
            armorStand = dim.spawnEntity("minecraft:armor_stand", {x:0,y:312,z:0}, {initialPersistence: true});
            armorStand.addTag("soundSaveStand");
            armorStand.addEffect("resistance", 20000000, {showParticles:false});
            return armorStand;
        }
        catch (error) {
            return null;
        }
    }

    /**
     * 
     * @param {Player} player
     * @returns {SoundPack[]} a list of sound packs on the player
     */
    static getSoundPacksFromPlayer(player) {
        let soundPackDefinitions = SoundManager.getSoundPackDefinitions(player);
        // player.sendMessage("Found sound packs " + JSON.stringify(soundPackDefinitions));
        // player.sendMessage("That means there are " + soundPackDefinitions.length + " sound packs");
        if (Object.hasOwn(SoundManager.playerSoundPacks, player.id)) {
            let playerData = SoundManager.playerSoundPacks[player.id];
            if (playerData.length == soundPackDefinitions.length) {
                player.sendMessage("Data doesn't need to be updated.");
                return playerData;
            }
            player.sendMessage("Data found but needs to be updated.");
        }
        else {   
            player.sendMessage("Data not found, creating data.");
        }
        
        let parsedPacks = [];
        soundPackDefinitions.forEach((packDef) => {
            try {
                let soundPack = new SoundPack(packDef, PackTypes.CUSTOM);
                parsedPacks.push(soundPack);
            }
            catch (e) {
                return;
            }
        });

        // player.sendMessage("Sound Pack count " + parsedPacks.length);
        
        SoundManager.playerSoundPacks[player.id] = parsedPacks;
        
        return parsedPacks;
    }

    /**
     * 
     * @param {Player} player 
     * @returns {string[]}
     */
    static getSoundPackDefinitions(player) {
        let properties = player.getDynamicProperty(SoundManager.soundDynamicPropertyKey);
        let soundPackDefinitions = [];
        if (properties != null && properties != "") {
            soundPackDefinitions = properties.split("|");
        }
        else if (properties != "") {
            soundPackDefinitions = [properties];
        }
        return soundPackDefinitions;
    }

    static recombineDefinition(player, soundPackDefinitions) {
        let combinedDefinition = "";
        for(let i = 0; i < soundPackDefinitions.length; i++) {
            // player.sendMessage(i + "");
            combinedDefinition += soundPackDefinitions[i];
            if (i+1 != soundPackDefinitions.length) {
                combinedDefinition += "|";
            }
        }
        // player.sendMessage("Combined definition is " + combinedDefinition);
        return combinedDefinition;
    }

    /**
     * 
     * @param {Player} player 
     * @param {SoundPack} packDefinition 
     */
    static registerPackToPlayer(player, packDefinition) {
        let soundPackDefinitions = SoundManager.getSoundPackDefinitions(player);

        soundPackDefinitions.push(packDefinition.convertToSave());
        
        let combinedDefinition = SoundManager.recombineDefinition(player, soundPackDefinitions);
        // player.sendMessage("Registered a pack, there's now " + soundPackDefinitions.length + " packs");
        // player.sendMessage("Combined definition is " + combinedDefinition);
        player.setDynamicProperty(SoundManager.soundDynamicPropertyKey, combinedDefinition);
        SoundManager.getSoundPacksFromPlayer(player);
    }

    /**
     * 
     * @param {Player} player 
     * @param {number} packIndex 
     * @param {SoundPack} packDef
     */
    static setPackOnPlayer(player, packIndex, packDef) {
        SoundManager.getSoundPacksFromPlayer(player);
        let soundPackDefinitions = SoundManager.getSoundPackDefinitions(player);
        // player.sendMessage(JSON.stringify(soundPackDefinitions) + " - " + soundPackDefinitions.length + " packs");
        if (packIndex >= soundPackDefinitions.length) {
            // player.sendMessage("pack index not found");
            return;
        }

        soundPackDefinitions[packIndex] = packDef.convertToSave();
        let playerData = SoundManager.playerSoundPacks[player.id];
        playerData[packIndex] = packDef;
        SoundManager.playerSoundPacks[player.id] = playerData;
        // player.sendMessage("Updating the index");

        let combinedDefinition = SoundManager.recombineDefinition(player, soundPackDefinitions);
        player.setDynamicProperty(SoundManager.soundDynamicPropertyKey, combinedDefinition);
    }
    
    /**
     * If possible, will remove the pack at the given index.
     * @param {Player} player 
     * @param {number} packIndex 
     */
    static removePackFromPlayer(player, packIndex) {
        let soundPackDefinitions = SoundManager.getSoundPackDefinitions(player);

        if (packIndex >= soundPackDefinitions.length) {
            return;
        }
        soundPackDefinitions.splice(packIndex, 1);
        let playerData = SoundManager.playerSoundPacks[player.id];
        playerData.splice(packIndex, 1);
        SoundManager.playerSoundPacks[player.id] = playerData;

        let combinedDefinition = SoundManager.recombineDefinition(player, soundPackDefinitions);
        // player.sendMessage(soundPackDefinitions.length + "");
        player.setDynamicProperty(SoundManager.soundDynamicPropertyKey, combinedDefinition);
    }

    /**
     * 
     * @param {Player} player 
     * @param {MusicTypes} musicType 
     */
    static _getPackToPlay(player, musicType) {
        switch (musicType) {
            case MusicTypes.MAP:
                return this.mapPack;
            case MusicTypes.CUSTOM:
                if (player != null) {
                    let playerPacks = SoundManager.getSoundPacksFromPlayer(player);
                    if (playerPacks.length > 0) {
                        let randomPack = ScoreboardManager.rollRandomNumber(0, playerPacks.length);
                        return playerPacks[randomPack];
                    }
                }
                return this.builtinPack;
            default:
                return this.builtinPack;
        }
    }

    static getDesynchronizedPlayerIDs() {
        let players = [];
        world.getAllPlayers().forEach((p) => {
            if (ScoreboardManager.getScoreboardObjective(p, "player.sound.sound_settings") == 1) {
                players.push(p.id);
            }
        });
        return players;
    }


    /// SOUND EFFECTS
    /**
     * 
     * @param {Player[]} players the players to hear the sound effect.
     * @param {SoundEffectType} soundType Sound effect type.
     * @param {Vector3} soundLocation where the play. Leave blank for on each player
     * @param {number} volume Default 1
     * @param {number} pitch Overrides the sound effect's pitch
     */
    static playSoundEffect(players, soundType, soundLocation, volume, pitch) {
        if (pitch == null) {
            pitch = soundType.pitch;
        }
        if (volume == null) {
            volume = 1;
        }
        
        players.forEach((pl) => {
            let playerSound = ScoreboardManager.getScoreboardObjective(pl, "player.sound.sfx_volume");
            let playerVolume = playerSound / 100 * volume;
            // pl.sendMessage("Playing sound at volume " + playerVolume);
            try {
                let loc = soundLocation == null ? pl.location : soundLocation;
                pl.playSound(soundType.sound_name, {location: loc, pitch: pitch, volume: playerVolume});
            }
            catch (e) {
            }
        });
    }



    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     */
    static openPackSettings(playerToShow, packToEdit) {
        let form = new ActionFormData();

        form.title(packToEdit.packName + " Settings");
        let songNames = packToEdit.getAllSongs().map((song) => song.getPath());
        // playerToShow.sendMessage(packToEdit.getAllSongs()[0].getPath());
        let rawText = [{text:"Songs in this Pack: "}];
        songNames.forEach((songAddress) => {
            rawText.push({text:"\n"});
            rawText.push({translate:songAddress});
        });

        // playerToShow.sendMessage(rawText);
        form.body({rawtext:rawText});

        form.button("Edit Pack");
        form.button("Edit Songs");
        form.button("Export Pack");
        form.button("Delete Pack");
        form.button("Save");

        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0: // edit pack
                    SoundManager.editPackInfo(playerToShow, packToEdit);
                    break;
                case 1: // edit songs
                    SoundManager.editPackSettings(playerToShow, packToEdit);
                    break;
                case 2: // export
                    SoundManager.exportPackBox(playerToShow, packToEdit);
                    break;
                case 3: // delete
                    let indexToRemove = packToEdit.packIndex;
                    SoundManager.removePackFromPlayer(playerToShow, indexToRemove);
                    SettingsHandler._showPlayerSoundPacks(playerToShow);
                    break;
                case 4: // save
                    let armorStand = SoundManager.getSoundSaveStand();
                    let tags = armorStand.getTags();
                    switch (packToEdit.packType) {
                        case PackTypes.CUSTOM:
                            if (Object.hasOwn(packToEdit, "packIndex")) {
                                let indexToRemove = packToEdit.packIndex;
                                // playerToShow.sendMessage("got pack index " + indexToRemove);
                                // SoundManager.removePackFromPlayer(playerToShow, indexToRemove);
                                SoundManager.setPackOnPlayer(playerToShow, indexToRemove, packToEdit);
                            }
                            break;
                        case PackTypes.BUILTIN:
                            let exportPack = packToEdit.convertToSave();
                            armorStand.setDynamicProperty(SoundManager.BUILTIN_PACK_TAG, exportPack);
                            SettingsHandler.openSoundSettings(playerToShow);
                            return;
                        case PackTypes.MAP:
                            let mapPack = packToEdit.convertToSave();
                            armorStand.setDynamicProperty(SoundManager.MAP_PACK_TAG, mapPack);
                            SettingsHandler.openSoundSettings(playerToShow);
                            return;
                    }
                    SettingsHandler._showPlayerSoundPacks(playerToShow);
                    break;
            }
        });
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     */
    static editPackInfo(playerToShow, packToEdit) {
        let form = new ModalFormData();
        form.title(packToEdit.packName + " Info Settings");
        
        form.divider();
        form.textField("Pack Name", "", {defaultValue: packToEdit.packName});
        form.slider("Pack Weight", 0, 20, {defaultValue: packToEdit.weight});

        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            packToEdit.packName = r.formValues[1];
            packToEdit.weight = r.formValues[2];

            SoundManager.openPackSettings(playerToShow, packToEdit);
        });
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     */
    static editPackSettings(playerToShow, packToEdit) {
        let form = new ActionFormData();
        form.title("Edit " + packToEdit.packName);
        let songNames = packToEdit.getAllSongs().map((song) => song.getPath());

        songNames.forEach((song) => {
            form.button({translate: song});
        });

        form.button("Add New Song");
        form.button("Import New Song(s)");
        // form.button("Export");
        form.button("Back");
        let songCount = songNames.length;

        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            let songIndex = r.selection;
            if (songIndex < songCount) {
                let songToEdit = packToEdit.getAllSongs()[songIndex];
                SoundManager.editSongSettings(playerToShow, packToEdit, songToEdit, songIndex);
                return;
            }
            else if (songIndex == songCount) { // new song
                let newSong = new PackSong();
                packToEdit.packSongs.push(newSong);
                SoundManager.editSongSettings(playerToShow, packToEdit, newSong, songCount);
                return;
            }
            else if (songIndex == songCount + 1) { // import song
                SoundManager.importNewSongForm(playerToShow, packToEdit);
                return;
            }
            
            SoundManager.openPackSettings(playerToShow, packToEdit);
        });
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     */
    static importNewSongForm(playerToShow, packToEdit) {
        let form = new ModalFormData();
        form.title("Import New Song(s)");
        form.divider();
        form.textField("New Song JSON", "Your new song's json goes here! If you have multiple songs, format them as a list!", {defaultValue:'{"conditions":[],"path":"","weight":1,"song_duration":60}'});
    
        form.submitButton("Create New Songs");

        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            let input = r.formValues[1];
            let songList = [];
            if (input[0] == "[") {
                songList = JSON.parse(input);
            }
            else {
                songList.push(JSON.parse(input));
            }

            let newSongAdded = SoundManager._importSongList(packToEdit, songList);

            if (newSongAdded) {
                let allSongs = packToEdit.getAllSongs();
                let finalIndex = allSongs.length-1;
                SoundManager.editSongSettings(playerToShow, packToEdit, allSongs[finalIndex], finalIndex);
                return;
            }

            let failForm = new MessageFormData();
            failForm.title("Song Error");
            failForm.body("There was an error parsing the song definition");
            failForm.button1("Try Again");
            failForm.button2("Back");

            failForm.show(playerToShow).then((r2) => {
                if (r2.canceled) {
                    return;
                }

                switch (r2.selection) {
                    case 0: // reopen
                        SoundManager.importNewSongForm(playerToShow, packToEdit);
                        break;
                    case 1: // back
                        SoundManager.editPackSettings(playerToShow, packToEdit);
                        break;
                }
            });
        });
    }

    /**
     * 
     * @param {SoundPack} packToEdit 
     * @param {Object[]} newSongs 
     * @returns {boolean} if a new song was added.
     */
    static _importSongList(packToEdit, newSongs) {
        let newSongAdded = false;
        newSongs.forEach((songDef) => {
            let song = PackLoader._parseSongDefinition(songDef);

            if (song != null) {
                newSongAdded = true;
                packToEdit.packSongs.push(song);
                return;
            }
        });
        return newSongAdded;
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     */
    static exportPackBox(playerToShow, packToEdit) {
        // let form = new ModalFormData();
        let form = new ModalFormData();
        form.title("Export " + packToEdit.packName);
        let exportValue = packToEdit.convertToSave();
        form.divider();
        form.textField("Export String", "", {defaultValue: exportValue, tooltip:"Copy this and paste it when importing this song pack into a different world or when sharing!"});
        form.submitButton("Back");

        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            SoundManager.openPackSettings(playerToShow, packToEdit);
        });
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     * @param {PackSong} song 
     * @param {number} songIndex 
     */
    static editSongSettings(playerToShow, packToEdit, song, songIndex) {
        // need to edit path, conditions, weight, delete
        let form = new ModalFormData();
        form.title({rawtext:[{translate:song.getPath()},{text:" Settings"}]});
        form.divider(); // 0
        form.textField("Song Path", "path", {defaultValue: song.getPath()}); // 1
        form.textField("Song Length (seconds)", "3", {defaultValue: song.songLength.toString()}); // 2
        form.slider("Weight", 0, 20, {defaultValue: song.weight}); // 3
        form.toggle("Can Repeat", {defaultValue: song.canRepeat, tooltip:"If true, this song can play twice in a row."}); // 4
        form.toggle("Modify Conditions", {defaultValue: false, tooltip:"If true when submitting this form, will open condition editing."});
        form.toggle("Delete", {defaultValue: false, tooltip:"If true when submitting, will delete this song."}); // 6
        
        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            if (r.formValues[6]) {
                // delete
                packToEdit.packSongs.splice(songIndex, 1);
                // playerToShow.sendMessage("Song count: " + song.conditions.length);
                SoundManager.editPackSettings(playerToShow, packToEdit);
                return;
            }

            if (r.formValues[5]) {
                // modify conditions
                SoundManager.editConditionsSettings(playerToShow, packToEdit, song, songIndex);
                return;
            }

            // path & weight
            song.path = r.formValues[1];
            song.songLength = parseInt(r.formValues[2])
            song.weight = r.formValues[3];
            song.canRepeat = r.formValues[4];
            SoundManager.editPackSettings(playerToShow, packToEdit);
        });
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     * @param {PackSong} song 
     * @param {number} songIndex 
     */
    static editConditionsSettings(playerToShow, packToEdit, song, songIndex) {
        // pick condition to edit?
        let form = new ActionFormData();
        form.title({rawtext:[{text:"Edit "},{translate:song.getPath()}]});
        let conditions = song.conditions.map((cond) => cond.toString());

        conditions.forEach((cond) => {
            form.button({text: cond});
        });

        form.button("Add New Condition");
        form.button("Back");
        let conditionCount = conditions.length;
        
        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            let conditionIndex = r.selection;
            if (conditionIndex < conditionCount) {
                let conditionToEdit = song.conditions[conditionIndex];
                SoundManager.editSingleConditionSettings(playerToShow, packToEdit, song, songIndex, conditionToEdit, conditionIndex);
                // SoundManager.editSongSettings(playerToShow, packToEdit, songToEdit, conditionIndex);
                return;
            }
            else if (conditionIndex == conditionCount) { // new condition
                let newCondition = new SongCondition();
                song.conditions.push(newCondition);
                SoundManager.editSingleConditionSettings(playerToShow, packToEdit, song, songIndex, newCondition, conditionCount);
                return;
            }

            SoundManager.editSongSettings(playerToShow, packToEdit, song, songIndex);
        });
    }

    /**
     * 
     * @param {Player} playerToShow 
     * @param {SoundPack} packToEdit 
     * @param {PackSong} song 
     * @param {number} songIndex
     * @param {SongCondition} condition
     * @param {number} conditionIndex
     */
    static editSingleConditionSettings(playerToShow, packToEdit, song, songIndex, condition, conditionIndex) {
        // condition type, comparison, number/alignment
        let form = new ModalFormData();
        form.title({rawtext:[{text:"Condition"},{text:" Settings"}]});
        form.divider();
        // form.textField("Song Path", "path", {defaultValue: song.getPath()}); // 0
        // 1
        let conditionTypes = [ConditionType.MURDERER_COUNT, ConditionType.ALIGNMENT, ConditionType.LIVING_PLAYER_COUNT, ConditionType.TOTAL_PLAYER_COUNT, ConditionType.PERCENT_PLAYERS_LEFT];
        form.dropdown("Condition Type", conditionTypes.map((v) => v.string), {defaultValueIndex: conditionTypes.indexOf(condition.conditionType)});
        // 2
        let comparisonTypes = [ComparisonTypes.EQUALS, ComparisonTypes.LESS_THAN, ComparisonTypes.GREATER_THAN, ComparisonTypes.NOT_EQUAL, ComparisonTypes.AT_MOST, ComparisonTypes.AT_LEAST];
        form.dropdown("Comparison Type", comparisonTypes.map((v) => v.symbol), {defaultValueIndex: comparisonTypes.indexOf(condition.comparisonType)});
        // 3
        let alignmentTypes = [AlignmentTypes.INNOCENT, AlignmentTypes.MURDERER, AlignmentTypes.NEUTRAL_INDEPENDENT, AlignmentTypes.NEUTRAL_KILLER];
        form.dropdown("Alignment Type", alignmentTypes.map((v) => v.string), {defaultValueIndex: alignmentTypes.indexOf(condition.alignmentType)});
        // 4
        form.textField("Number to Compare", "5", {defaultValue: condition.number.toString()});

        // 5
        form.toggle("Delete", {defaultValue: false, tooltip:"If true when submitting, will delete this song."}); // 3
        
        form.show(playerToShow).then((r) => {
            if (r.canceled) {
                return;
            }

            if (r.formValues[5]) {
                song.conditions.splice(conditionIndex, 1);
                // playerToShow.sendMessage("Condition count: " + song.conditions.length);
                SoundManager.editConditionsSettings(playerToShow, packToEdit, song, songIndex);
                // delete
                return;
            }
            
            // condition type, comparison type, alignment type, number
            condition.conditionType = conditionTypes[r.formValues[1]];
            condition.comparisonType = comparisonTypes[r.formValues[2]];
            condition.alignmentType = alignmentTypes[r.formValues[3]];
            condition.number = parseInt(r.formValues[4]);
            SoundManager.editConditionsSettings(playerToShow, packToEdit, song, songIndex);
        });
    }

}

export const MusicTypes = Object.freeze({
    BUILTIN: {name: "Built-in"},
    MAP: {name: "Map"},
    CUSTOM: {name: "Custom"}
});

export const SoundEffectType = Object.freeze({
    BASIC_PLING: { id: 0, sound_name: "note.pling", pitch: 1.5 },
    BASIC_MARK: { id: 1, sound_name: "note.chime", pitch: 0.8 }, 
    INTERACT_BLOCKED: { id: 2, sound_name: "note.bd", pitch: 0.8 },
    DEATH_NOTIFICATION: { id: 3, sound_name: "particle.soul_escape", pitch: 0.3 },
    ABILITY_READY: { id: 4, sound_name: "note.pling", pitch: 1 },
    // GUESSED_PLAYER: { id: 5, sound_name: "dig.chain", pitch: 0.3 },
    GUESSED_PLAYER: { id: 6, sound_name: "random.splash", pitch: 0.2 }, 
    CORRECT_GUESS: { id: 7, sound_name: "random.levelup", pitch: 0.3 }, 
    INCORRECT_GUESS: { id: 8, sound_name: "resonate.amethyst_block", pitch: 0.5 }, // .5 + custom
    AMNESIAC_REMEMBER: { id: 9, sound_name: "note.iron_xylophone", pitch: 0.1 }, //  + assassin kill
    APOTHOCARY_MARK: { id: 10, sound_name: "random.potion.brewed", pitch: 1 },
    APOTHOCARY_POISON_TARGET: { id: 11, sound_name: "portal.trigger", pitch: 1 },
    TARGET_LOSS: { id: 12, sound_name: "umm.sfx.eerie_tone", pitch: 1 }, // custom low hit sfx
    BOMBER_PLACE_BOMB: { id: 13, sound_name: "random.fuse", pitch: 0.3 }, // .3
    CLERIC_HEAL: { id: 14, sound_name: "random.potion.brewed", pitch: 1 },
    CRYOMANCER_FREEZE: { id: 15, sound_name: "mob.player.hurt_freeze", pitch: 0.2 }, // .2 pitch
    ESCAPIST_RECALL: { id: 16, sound_name: "mob.endermen.portal", pitch: 1 },
    GHOST_WRITER_WRITE: { id: 17, sound_name: "block.cartography_table.use", pitch: 0.9 }, // .9
    PLAYER_RECEIVE_TASK: { id: 18, sound_name: "umm.sfx.eerie_tone", pitch: 1 }, // custom low hit sfx
    PLAYER_COMPLETE_TASK: { id: 19, sound_name: "random.levelup", pitch: 0.3 }, // .3 pitch
    PLAYER_TRANSPORT: { id: 20, sound_name: "mob.endermen.portal", pitch: 0.5 }, // .5 pitch
    BLOCK_ABILITY: { id: 21, sound_name: "mob.witch.ambient", pitch: 0.5 }, // .5 pitch
    HEX_ACTIVATE: { id: 22, sound_name: "mob.witch.celebrate", pitch: 2 }, // 2 pitch
    JAILOR_START_JAILING: { id: 23, sound_name: "dig.chain", pitch: 0.7 }, // 0.7 pitch
    JAIL_ACTIVATE: { id: 24, sound_name: "umm.sfx.eerie_tone", pitch: 1 }, // custom low hit sfx
    JAIL_END: { id: 25, sound_name: "armor.equip_chain", pitch: 0.4 }, // .4
    JANITOR_CLEAN: { id: 26, sound_name: "tilt_down.big_dripleaf", pitch: 0.3 }, // .3
    MEDIC_CONSUME: { id: 27, sound_name: "beacon.deactivate", pitch: 0.3 }, // .3
    MEDIUM_START: { id: 28, sound_name: "note.chime", pitch: 0.3 }, // start .3, end .2
    MEDIUM_END: { id: 29, sound_name: "note.chime", pitch: 0.2 }, // start .3, end .2
    MORTICIAN_INFO: { id: 30 , sound_name: "block.cartography_table.use", pitch: 0.9 }, // .9
    NECROMANCER_SUMMON: { id: 31, sound_name: "note.enderdragon", pitch: 1 }, // 1
    SHADOWMANCER_PULSE: { id: 32, sound_name: "umm.sfx.eerie_tone" }, // custom low hit sfx
    SOUL_RESPAWN: { id: 33, sound_name: "random.totem", pitch: 0.5 }, // .5
    SHADOWMANCER_PULSE: { id: 34, sound_name: "note.enderdragon", pitch: 1 },
    SPY_INFO_RETURN: { id: 35, sound_name: "note.bell", pitch: 0.2 }, // .2
    STALKER_AMBIENCE: { id: 36, sound_name: "portal.trigger", pitch: 0.1 }, // .3
    SWOOPER_REAPPEAR: { id: 37, sound_name: "note.chime", pitch: 0.4 }, // .4
    PORTAL_USE: { id: 38, sound_name: "mob.endermen.portal", pitch: 0.3 }, // .3
    TEMPEST_KILL: { id: 39, sound_name: "ambient.weather.thunder", pitch: 0.7 }, // .7
    TEMPEST_ZAP: { id: 40, sound_name: "item.trident.hit", pitch: 1.2 }, // 1.2
    DETECT_RUN: { id: 41, sound_name: "note.harp", pitch: 0.5 }, // .5, .3
    VAMPIRE_BITE: { id: 42, sound_name: "mob.fox.bite", pitch: 0.3 }, // .3
    WARLOCK_START_CAST: { id: 43, sound_name: "mob.evocation_illager.cast_spell", pitch: 0.5 }, // .5, 8
    WITCH_PLACE_SPELL: { id: 44, sound_name: "block.creaking_heart.step", pitch: 0.5 }, // .5
    WITCH_USE_SPELL: { id: 45, sound_name: "block.creaking_heart.step", pitch: 0.4 }, // .4
    ADDICT_INJECT: { id: 46, sound_name: "random.glass", pitch: 1.2 }, // 1.2
    DISPERSER_WARP: { id: 47, sound_name: "umm.sfx.eerie_tone" }, // low hit
    GAMBLER_ROLL: { id: 48, sound_name: "umm.sfx.dice_roll" }, // roll dice sfx
    REPEL_BURST: { id: 49, sound_name: "wind_charge.burst", pitch: 0.5 }, //.5
    SENTRY_LASER: { id: 50, sound_name: "mob.elderguardian.curse", pitch: 0.7 }, //.7
    STALKER_START: { id: 51, sound_name: "record.13", pitch: 0.5 }, // .5
    STALKER_BEGIN_STALK: { id: 52, sound_name: "mob.elderguardian.curse", pitch: 0.5 }, // .5
    INFECTION_COUGH: { id: 53, sound_name: "note.zombie", pitch: 0.7 }, //.7
    INFECTION_RATTLE: { id: 54, sound_name: "note.skeleton", pitch: 0.3 }, //.3
    INFECTION_EERIE: { id: 55, sound_name: "note.chime", pitch: 0.01 }, //.01
    INFECTION_WITHER: { id: 56, sound_name: "note.chime", pitch: 0.1 }, //.1
    PLAGUEBEARER_MARK: { id: 57, sound_name: "mob.evocation_fangs.attack", pitch: 0.7 }, //.7
    VETERAN_START_ALERT: { id: 58, sound_name: "trial_spawner.spawn_mob", pitch: 0.5 }, //.7
    VETERAN_ALERT_ACTIVATE: { id: 59, sound_name: "note.iron_xylophone", pitch: 0.8 }, //.8
    VETERAN_ALERT_END: { id: 60, sound_name: "note.guitar", pitch: 0.2 }, //.7
    TYCOON_COIN_COLLECT: { id: 61, sound_name: "note.chime", pitch: 1.5 }, //.1.5
    TYCOON_ITEM_PURCHASE: { id: 62, sound_name: "note.harp", pitch: 1.5 }, //.1.5
    TYCOON_COIN_SPAWN: { id: 63, sound_name: "note.chime", pitch: 0.5 }, //.1.5
    GHOST_HAUNT: { id: 64, sound_name: "note.bell", pitch: 0.05 }, //.1.5
    GHOST_FREE_FROM_HAUNT: { id: 65, sound_name: "note.harp", pitch: 0.4 }, //.1.5
    COOLDOWN_DECREASE: { id: 66, sound_name: "note.guitar", pitch: 0.5 }, //.1.5
    NURSE_HEAL: { id: 67, sound_name: "random.potion.brewed", pitch: 1.5 }, //.1.5
    UNDERDOG_ACTIVATE: { id: 68, sound_name: "beacon.power", pitch: 0.5 }, //.1.5
    WIN_CLAP: { id: 69, sound_name: "firework.blast", pitch: 1 }, //.1.5
    WIN_CRACKLE: { id: 70, sound_name: "firework.twinkle", pitch: 1 }, //.1.5
    
    // TARGET_LOSS: { id: 0, sound_name: "portal.trigger" }, // 
    // SPOOKIE: { id: 0, sound_name: "random.levelup" }, // .3
    // EATING_SOUND: { id: 0, sound_name: "random.drink" }, // .4
    
});
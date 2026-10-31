"use strict";

import { world, ScoreboardIdentity, Player } from "@minecraft/server"
import { Role } from "./role";
import { Modifier } from "./modifier";
import { PlayerHandler } from "./player_handler";

export class ScoreboardManager {
    // static scoreboard;
    constructor() {
    }

    static clearScoreboard() {
        world.scoreboard.getObjectives().forEach(obj => world.scoreboard.removeObjective(obj));
    }

    /**
     * Returns the value of a scoreboard objective for the given
     * playerIdentity of the given scoreboard objective name.
     * 
     * @param {ScoreboardIdentity|string} playerIdentity the raw identity or name of the scoreboard owner.
     * @param {string} scoreboardID the name of the scoreboard.
     * @returns {number} the value of the scoreboard, or 0 if none defined.
     */
    static getScoreboardObjective(playerIdentity, scoreboardID) {
        let objective = world.scoreboard.getObjective(scoreboardID);

        if (!objective) {
            return 0;
        }

        const playerScore = objective.hasParticipant(playerIdentity) ? objective.getScore(playerIdentity) : 0;

        return playerScore;
    }

    /**
     * Sets the player's scoreboard for the given objective with the
     * value given.
     * 
     * @param {Entity|ScoreboardIdentity|string} playerIdentity the raw identity or name of the scoreboard owner.
     * @param {string} scoreboardID the name of the scoreboard to be set.
     * @param {number} value the value to set the scoreboard to.
     */
    static setScoreboardObjective(playerIdentity, scoreboardID, value) {
        let objective = world.scoreboard.getObjective(scoreboardID);
        if (!objective) {
            return;
        }

        // world.getAllPlayers()[0].sendMessage("" + typeof (value));
        objective.setScore(playerIdentity, value);
    }

    /**
     * Adds to the player's scoreboard for the given objective with the
     * value given.
     * 
     * @param {Entity|ScoreboardIdentity|string} playerIdentity the raw identity or name of the scoreboard owner.
     * @param {string} scoreboardID the name of the scoreboard to be set.
     * @param {number} value the value to add to the scoreboard.
     */
    static addScoreboardObjective(playerIdentity, scoreboardID, value) {
        let objective = world.scoreboard.getObjective(scoreboardID);
        if (!objective) {
            return;
        }

        // world.getAllPlayers()[0].sendMessage("" + typeof (value));
        objective.addScore(playerIdentity, value);
    }

    /**
     * Tries to create an objective, if it doesn't already exist.
     * @param {string} scoreboardID the name of the scoreboard identity
     * @returns {boolean} if the scoreboard was successfully created
     */
    static createScoreboardObjective(scoreboardID) {
        let objective = world.scoreboard.getObjective(scoreboardID);
        if (objective == null) {
            world.scoreboard.addObjective(scoreboardID);
            return true;
        }
        return false;
    }

    /**
     * 
     * @param {Role} role 
     */
    static setRoleAsEnabled(role) {
        ScoreboardManager.setTrackedObjective("role_settings." + role.getRoleType().name + ".enabled", 1);
        ScoreboardManager.createScoreboardObjective("role_settings." + role.getRoleType().name + ".role_count");
        ScoreboardManager.setTrackedObjective("role_settings." + role.getRoleType().name + ".role_count", 1);
        world.sendMessage("§oEnabled " + role.getDisplayName());
    }

    /**
     * 
     * @param {Modifier} mod 
     */
    static setModifierAsEnabled(mod) {
        ScoreboardManager.setTrackedObjective("modifier_settings." + mod.getModifierType().name + ".enabled", 1);
        ScoreboardManager.createScoreboardObjective("modifier_settings." + mod.getModifierType().name + ".mod_count");
        ScoreboardManager.setTrackedObjective("modifier_settings." + mod.getModifierType().name + ".mod_count", 1);
        world.sendMessage("§oEnabled " + mod.getDisplayName());
    }

    /**
     * Gets the game data of the given scoreboard ID.
     * 
     * @param {string} scoreboardID the name of the scoreboard to be set.
     * @returns {number} the value of the scoreboard, or 0 if none defined.
     */
    static getTrackedObjective(scoreboardID) {
        return this.getScoreboardObjective("game_data", scoreboardID);
    }

    /**
     * Sets the game data for the given objective with the
     * value given.
     * 
     * @param {string} scoreboardID the name of the scoreboard to be set.
     * @param {number} value the value to set the scoreboard to.
     */
    static setTrackedObjective(scoreboardID, value) {
        this.setScoreboardObjective("game_data", scoreboardID, value);
    }

    /**
     * Finds the player with the specified ID.
     * 
     * @param {number} searchID the player's search iID.
     * @returns {Player} the player to return.
     */
    static getPlayerWithID(searchID) {
        let players = PlayerHandler.PLAYERS_PLAYING_DATA;

        if (players.length <= searchID || searchID == -1 || !players[searchID].player.isValid) {
            return null;
        }

        return players[searchID].player;
        // let foundPlayer = null;
        // let i = 0;
        // while (i < players.length) {
        //     let player = players[i];
        //     i++;
        //     // player.sendMessage("Checking your id");
        //     if (player == null) {
        //         continue;
        //     }
        //     let id = this.getPlayerID(player);
        //     if (id == searchID) {
        //         foundPlayer = player;
        //         break;
        //     }
        // }
        // return foundPlayer;
    }

    /**
     * Gets a player's player ID for the round.
     * 
     * @param {Player} player the player to get the id for.
     * @returns {number} the id of the player.
     */
    static getPlayerID(player) {
        return this.getScoreboardObjective(player, "player.player_id");
    }

    /**
     * Sets the cooldown time of the player to be at least the cooldown time.
     * @param {Player} player
     * @param {number} cooldownTime in seconds
     * @param {boolean} useMultiplier if false, will skip using the multiplier the player has
     */
    static setPlayerActionCooldown(player, cooldownTime, useMultiplier) {
        let currentCooldown = player.getItemCooldown("role_action");
        let multiplier = 1;
        if (useMultiplier == null || useMultiplier) {
            let defaultMult = ScoreboardManager.getScoreboardObjective(player, "player.default_cooldown_multiplier") / 100;
            multiplier = ScoreboardManager.getScoreboardObjective(player, "player.cooldown_multiplier") * defaultMult / 100;
        }
        let newCooldown = cooldownTime * 20 * multiplier;
        if (currentCooldown < newCooldown) {
            player.startItemCooldown("role_action", newCooldown);
            if (multiplier != 1) {
                player.sendMessage("Your cooldown was multiplied by " + multiplier + "x");
            }
            
            // if (useMultiplier == null || useMultiplier) {
            //     ScoreboardManager.setScoreboardObjective(player, "player.cooldown_multiplier", defaultMult);
            // }
        }
    }

    /**
     * Sets the gamestate
     * @param {GameStates} newGameState 
     */
    static setGameState(newGameState) {
        ScoreboardManager.setTrackedObjective("tracking.game_state", newGameState.id);

        // let controlNametags = ScoreboardManager.getTrackedObjective("settings.map_settings.control_nametags") == 1;
        // let stateToSet = controlNametags ? newGameState.nametag_state : "umm:show_nametag";
        // world.getAllPlayers().forEach((player) => {
        //     player.runCommand("event entity @s " + stateToSet);
        // });
    }

    static getGameState() {
        let state = ScoreboardManager.getTrackedObjective("tracking.game_state");
        let allStates = [GameStates.BEFORE_START, GameStates.RUNNING, GameStates.FINISHED];
        allStates = allStates.filter((st) => st.id == state);
        return allStates[0];
    }

    static isGameRunning() {
        return this.getGameState() == GameStates.RUNNING;
    }

    /**
     * Rolls a random number between min and max.
     * @param {number} min the lowest number.
     * @param {number} max the largest number, exclusive.
     */
    static rollRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min)) + min
    }
}

export const GameStates = Object.freeze({
    BEFORE_START: { id: 0, nametag_state: "umm:show_nametag", name: "before_start" },
    RUNNING: { id: 1, nametag_state: "umm:hide_nametag", name: "running" },
    FINISHED: { id: 2, nametag_state: "umm:show_nametag", name: "finished" }
});

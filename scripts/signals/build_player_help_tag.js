"use strict";

import { RoleManager } from "../role_manager";
import { Signal } from "../signal";

// import { world, system, Player } from "@minecraft/server";
// import { ScoreboardManager } from "./scoreboard_manager";
// import { Role, RoleAlignment } from "./role";
// import { RoleManager } from "./role_manager";
// import { RoleAssignment } from "./role_assignment";
// import { SettingsHandler } from "./settings_handler";
// import { GuessingManager } from "./guessing_manager";
// import { GhostManager } from "./ghost_manager";
// import { WinConditionManager } from "./win_con_handler";

export class BuildPlayerHelpTagSignal extends Signal {

    /**
     * If true, is for win condition handling. If false, is for dead help messages.
     */
    isEndgame = false;

    /**
     * Emits this signal, calling all subscribed methods.
     * @param {Player} player the player to build the tag for
     */
    emitBuild(player, isEndgame) {
        this.playerToBuild = player;
        this.playerRole = RoleManager.getPlayerRole(player);
        this.isEndgame = isEndgame;
        this.tag = "";
        this._callables.forEach((call) => {
            call(this);
        });
    }

    getTag() {
        return this.tag.length > 0 ? this.tag + " " : "";
    }

    /**
     * Adds the given string to the tag. Spaces are handled.
     * @param {string} string 
     */
    addStringToTag(string) {
        if (this.tag.length > 0) {
            string = " " + string;
        }
        this.tag += string + "§r";
    }

    /**
     * Accepts a callable that has a parameter for this signal.
     * @param {(signal: BuildPlayerHelpTagSignal)} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
"use strict";

import { InteractTypes } from "../player_handler";
// import { world, system, Player } from "@minecraft/server";
// import { ScoreboardManager } from "./scoreboard_manager";
// import { Role, RoleAlignment } from "./role";
// import { RoleManager } from "./role_manager";
// import { RoleAssignment } from "./role_assignment";
// import { SettingsHandler } from "./settings_handler";
// import { GuessingManager } from "./guessing_manager";
// import { GhostManager } from "./ghost_manager";
// import { WinConditionManager } from "./win_con_handler";
import { Signal } from "../signal"

export class OnGameEndSignal extends Signal {
    /**
     * Emits this signal, calling all subscribed methods.
     * @param {RoleAlignment} winningAlignment 
     * @param {Player[]} winningPlayers 
     */
    emitEndGame(winningAlignment, winningPlayers) {
        this.winningAlignment = winningAlignment;
        this.winningPlayers = winningPlayers;
        this._callables.forEach((call) => {
            if (!this.cancel) {
                call(this);
            }
        });
        return this.cancel;
    }

    /**
     * Accepts a callable with one parameter for this signal. Information can be gotten from the event.
     * @param {()} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
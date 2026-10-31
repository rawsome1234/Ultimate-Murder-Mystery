"use strict";

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

export class OnDeathSignal extends Signal {

    cancel = false;

    /**
     * Emits this signal, calling all subscribed methods.
     */
    emit(playerWhoDied, killer) {
        this.cancel = false;
        this.sendMessages = true;
        this._callables.forEach((call) => {
            call(playerWhoDied, killer);
        });
    }

    /**
     * Accepts a callable that has two parameters for players, one for the guessed role, and a boolean for if it was correct.
     * @param {(playerWhoDied: Player, killer?: Player)} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
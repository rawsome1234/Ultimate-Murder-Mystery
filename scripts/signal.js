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

export class Signal {
    constructor() {
        this._callables = [];
    }

    /**
     * Emits this signal, calling all subscribed methods.
     */
    emit() {
        this._callables.forEach((call) => {
            call();
        });
    }


    subscribe(callable) {
        this._callables.push(callable);
    }

    unsubscribe(callable) {
        if (this._callables.includes(callable)) {
            let index = this._callables.indexOf(callable);
            this._callables.splice(index, 1);
        }
    }

    /**
     * Returns if this signal has already been connected to by this callable.
     */
    isConnected(callable) {
        return this._callables.includes(callable);
    }
}
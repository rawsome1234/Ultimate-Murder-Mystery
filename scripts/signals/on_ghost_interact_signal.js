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

export class OnGhostInteractSignal extends Signal {
    /**
     * Emits this signal, calling all subscribed methods.
     */
    emit(playerInteracting, ghost) {
        this._callables.forEach((call) => {
            call(playerInteracting, ghost);
        });
    }

    /**
     * Accepts a callable that has two parameters for players, one for the guessed role, and a boolean for if it was correct.
     * @param {(playerInteracting: Player, ghost: Entity)} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
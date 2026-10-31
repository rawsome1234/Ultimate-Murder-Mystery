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

export class AfterPlayerInteractSignal extends Signal {
    /**
     * Emits this signal, calling all subscribed methods.
     * @param {InteractType} interactType The type of interaction this interaction was
     */
    emitInteract(playerWhoInteracts, playerWhoIsBeingInteracted, interactType) {
        this._callables.forEach((call) => {
            call(playerWhoInteracts, playerWhoIsBeingInteracted, interactType);
        });
    }

    /**
     * Accepts a callable that has two parameters for players.
     * @param {(playerWhoInteracts: Player, playerWhoIsBeingInteracted: Player, interactType: InteractTypes) boolean} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
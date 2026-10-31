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

export class BeforePlayerInteractSignal extends Signal {
    cancel = false;
    failCooldown = -1;

    resetSignal() {
        this.cancel = false;
        this.interactType = InteractTypes.APOTHOCARY_MARK;
        this.failCooldown = -1;
    }

    /**
     * Emits this signal, calling all subscribed methods.
     * @param {InteractType} interactType The type of interaction this interaction was
     * @returns {boolean} Whether the interact should be cancelled.
     */
    emitInteract(playerWhoInteracts, playerWhoIsBeingInteracted, interactType) {
        this._callables.forEach((call) => {
            if (!this.cancel) {
                call(playerWhoInteracts, playerWhoIsBeingInteracted, interactType);
            }
        });
        return this.cancel;
    }

    /**
     * Accepts a callable that has two parameters for players. Callable can return true to cancel the event.
     * @param {(playerWhoInteracts: Player, playerWhoIsBeingInteracted: Player, interactType: InteractTypes) boolean} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
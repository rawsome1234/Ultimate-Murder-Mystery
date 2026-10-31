"use strict";

import { ModifierTypes } from "../modifier";
import { RoleTypes } from "../role";
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

export class OnGuessSignal extends Signal {
    cancel = false;
    usesSafeGuess = false;
    guessedRole = RoleTypes.INNOCENT;
    guessWasCorrect = false;
    guessedModifier = ModifierTypes.LOVERS;
    isGuessingModifier = false;


    resetSignal() {
        this.cancel = false;
        this.usesSafeGuess = false;
        this.guessedRole = RoleTypes.INNOCENT;
        this.guessWasCorrect = false;
        this.guessedModifier = ModifierTypes.LOVERS;
        this.isGuessingModifier = false;
        this.forceOppositeResult = false;
    }

    /**
     * Emits this signal, calling all subscribed methods.
     */
    emitGuess(playerWhoGuessed, playerWhoWasGuessed, guessedRole, wasCorrect) {
        this._callables.forEach((call) => {
            call(playerWhoGuessed, playerWhoWasGuessed, guessedRole, wasCorrect);
        });
    }

    /**
     * Accepts a callable that has two parameters for players, one for the guessed role, and a boolean for if it was correct.
     * @param {(playerGuessing: Player, playerGuessed: Player, roleGuessed: Role, wasCorrectGuess: boolean) boolean} callable
     */
    subscribe(callable) {
        this._callables.push(callable);
    }
}
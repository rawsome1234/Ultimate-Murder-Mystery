"use strict";

import { system, world } from "@minecraft/server";
import { DeathHandler } from "./death_handler";
import { RoleAssignment } from "./role_assignment";
import { ScoreboardManager } from "./scoreboard_manager";
import { WinConditionManager } from "./win_con_handler";
import { PlayerHandler } from "./player_handler";
import { RoleManager } from "./role_manager";
import { ModifierManager } from "./modifier_manager";
import { Util } from "./util";

// this class handles disabling roles and modifers from previous games, as well as the opening protection mechanic
export class ExtraMechanics {

    static KNOCKOUT_MODE_SCOREBOARD = "settings.extra_mechanics.knockout_mode";
    static MAX_PROTECTION_TIME = "settings.extra_mechanics.protection_time";
    static GIVE_PROTECTION_SCOREBOARD = "settings.extra_mechanics.protection_time";

    static initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        system.runInterval(this._incrementGameTimer, 1)

        if (!DeathHandler.onDeathSignal.isConnected(ExtraMechanics.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(ExtraMechanics.onPlayerDeath);
        }
        if (!RoleAssignment.afterRolesAssigned.isConnected(ExtraMechanics.afterRolesAssigned)) {
            RoleAssignment.afterRolesAssigned.subscribe(ExtraMechanics.afterRolesAssigned);
        }
        if (!WinConditionManager.onGameEnd.isConnected(ExtraMechanics.onGameEnd)) {
            WinConditionManager.onGameEnd.subscribe(ExtraMechanics.onGameEnd);
        }
    }

    static _incrementGameTimer() {
        ScoreboardManager.addScoreboardObjective("game_data", "tracking.game_length", 1);
    }

    static onPlayerDeath(player, killer) {
        // player.sendMessage("Detected death");
        let protectionEnabled = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_enabled") != 0;
        if (!protectionEnabled) {
            return;
        }
        let maxProtectionTime = ScoreboardManager.getTrackedObjective(ExtraMechanics.MAX_PROTECTION_TIME);
        let endsEarly = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_ends_early");
        if (endsEarly != 0) {
            world.getAllPlayers().forEach((pl) => {
                if (ScoreboardManager.getScoreboardObjective(pl, ExtraMechanics.GIVE_PROTECTION_SCOREBOARD) == 2) {
                    ScoreboardManager.setScoreboardObjective(pl, ExtraMechanics.GIVE_PROTECTION_SCOREBOARD, 0);
                    pl.removeEffect("minecraft:health_boost");
                }
            });
        }
        if (ScoreboardManager.getTrackedObjective("tracking.game_length") <= (maxProtectionTime * 6 * 20)) {
            ScoreboardManager.setScoreboardObjective(player, ExtraMechanics.GIVE_PROTECTION_SCOREBOARD, 1);
            player.sendMessage("§oBecause you died early into the game, you'll get extra health at the start of next game.");
        }
    }
    
    static afterRolesAssigned() {
        let allPlayers = world.getAllPlayers();
        let playingPlayers = PlayerHandler.getPlayingPlayers(allPlayers);
        playingPlayers.forEach((pl) => {
            if (pl != null && pl.isValid && ScoreboardManager.getScoreboardObjective(pl, ExtraMechanics.GIVE_PROTECTION_SCOREBOARD) == 1) {
                ScoreboardManager.setScoreboardObjective(pl, ExtraMechanics.GIVE_PROTECTION_SCOREBOARD, 2);
                let protectionDuration = ScoreboardManager.getTrackedObjective("settings.extra_mechanics.protection_duration");
                pl.addEffect("minecraft:health_boost", protectionDuration * 120, {showParticles: true});
                pl.sendMessage("§oYou got health boost to start the game.");
            }
        });
    }

    static onGameEnd(winningAlignment, winningPlayers) {
        let knockoutMode = ScoreboardManager.getTrackedObjective(ExtraMechanics.KNOCKOUT_MODE_SCOREBOARD);
        if (knockoutMode == 0) {
            return;
        }

        let playingPlayers = PlayerHandler.getPlayingPlayers(world.getAllPlayers());
        let message = "Disabling the following: ";
        let roleNames = [];
        let modifierNames = [];
        playingPlayers.forEach((pl) => {
            let playerRole = RoleManager.getPlayerRole(pl);
            let playerMod = ModifierManager.getPlayerModifier(pl);
            if (knockoutMode == 1 || knockoutMode == 3) {
                ScoreboardManager.setTrackedObjective("role_settings." + playerRole.getRoleType().name + ".enabled", 0);
                roleNames.push(playerRole.getDisplayName());
            }
            if (knockoutMode >= 2 && playerMod != null) {
                ScoreboardManager.setTrackedObjective("modifier_settings." + playerMod.getModifierType().name + ".enabled", 0);
                modifierNames.push(playerMod.getDisplayName());
            }
        });
        let owner = PlayerHandler.getWorldOwner();
        if (roleNames.length > 0) {
            message += "\n" + Util.formatStringList(roleNames, ", ", false);
        }
        if (modifierNames.length > 0) {
            message += "\n" + Util.formatStringList(modifierNames, ", ", false);
        }
        owner.sendMessage(message);
    }
}
"use strict";

import { world, system, Player } from "@minecraft/server";

import { GameStates, ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager"
import { Role, RoleAlignment } from "./role"
import { ModifierManager } from "./modifier_manager";
import { Util } from "./util";
import { DeathHandler } from "./death_handler";
import { OnGameEndSignal } from "./signals/on_game_end";
import { PlayerHandler } from "./player_handler";
import { SoundEffectType, SoundManager } from "./sound_manager";

export class WinConditionManager {

    static onGameEnd = new OnGameEndSignal();

    static checkForEndGame() {
        if (!this.isWinConditionManagementEnabled() || !this.canEndGame()) {
            return;
        }

        let murderersLeft = ScoreboardManager.getTrackedObjective("tracking.murderer_count");
        let neutralKLeft = ScoreboardManager.getTrackedObjective("tracking.neutral_killer_count");
        let neutralILeft = ScoreboardManager.getTrackedObjective("tracking.neutral_innocent_count");
        let innocentsLeft = ScoreboardManager.getTrackedObjective("tracking.innocent_count");

        // innocent win
        if (murderersLeft == 0 && neutralKLeft == 0) {
            let innocents = this.getPlayersOfAlignment(RoleAlignment.INNOCENT);
            innocents = innocents.concat(this.getWinningNeutralIndependentRoles(RoleAlignment.INNOCENT), this.getWinningModifierPlayers(RoleAlignment.INNOCENT, innocents));
            this.endTheGame(innocents, RoleAlignment.INNOCENT);
            return;
        }

        // murderer win
        if (neutralKLeft + innocentsLeft == 0) {
            let murderers = this.getPlayersOfAlignment(RoleAlignment.MURDERER);
            murderers = murderers.concat(this.getWinningNeutralIndependentRoles(RoleAlignment.MURDERER), this.getWinningModifierPlayers(RoleAlignment.MURDERER, murderers));
            this.endTheGame(murderers, RoleAlignment.MURDERER);
            return;
        }

        // check for neutral killer win
        if (murderersLeft + neutralKLeft + innocentsLeft == 1) {
            let neutralKiller = this.getLivingPlayersOfAlignment(RoleAlignment.NEUTRAL_KILLER);
            // world.sendMessage("Neutral killers have one, ending")
            if (neutralKiller.length > 1) {
                world.sendMessage("ERROR: Supposedly a neutral killer has won but there are multiple of them??");
                return;
            }

            neutralKiller = neutralKiller.concat(this.getWinningNeutralIndependentRoles(RoleAlignment.NEUTRAL_KILLER), this.getWinningModifierPlayers(RoleAlignment.NEUTRAL_KILLER, neutralKiller));
            this.endTheGame(neutralKiller, RoleAlignment.NEUTRAL_KILLER);
        }
    }

    /**
     * Gets a list of alive players who are part of the specified alignment.
     * 
     * @param {RoleAlignment} playerAlignment the alignment players must be part of.
     * @returns {Player[]} the list of players.
     */
    static getLivingPlayersOfAlignment(playerAlignment) {
        let players = world.getAllPlayers();

        let alignedPlayers = [];
        players.forEach((player) => {
            let playerID = ScoreboardManager.getPlayerID(player);
            if (playerID >= 0 && !player.hasTag("dead")) {
                let playerRole = RoleManager.getPlayerRole(player);
                if (playerRole.getAlignment() == playerAlignment) {
                    alignedPlayers.push(player);
                }
            }
        });
        return alignedPlayers;
    }

    /**
     * Gets the list of winning neutral independent players.
     * 
     * @returns {Player[]} the list of winning independent players.
     */
    static getWinningNeutralIndependentRoles(winningAlignment) {
        let players = WinConditionManager.getPlayersOfAlignment(RoleAlignment.NEUTRAL_INDEPENDENT);

        let winningPlayers = [];
        players.forEach((player) => {
            let playerRole = RoleManager.getPlayerRole(player);
            if (playerRole.meetsWinCondition(player, winningAlignment)) {
                winningPlayers.push(player);
            }
        });
        return winningPlayers;
    }

    /**
     * 
     * @param {RoleAlignment} winningAlignment 
     * @param {Player[]} winningPlayers 
     * @returns 
     */
    static getWinningModifierPlayers(winningAlignment, winningPlayers) {
        let modPlayers = [];
        world.getAllPlayers().forEach((player) => {
            if (ScoreboardManager.getPlayerID(player) != 0) {
                let playerMod = ModifierManager.getPlayerModifier(player);
                if (playerMod != null && playerMod.meetsWinCondition(player, winningAlignment) && !winningPlayers.includes(player)) {
                    modPlayers.push(player);
                }
            }
        });
        return modPlayers;
    }

    /**
     * Gets a list of players who are part of the specified alignment.
     * 
     * @param {RoleAlignment} playerAlignment the alignment players must be part of.
     * @returns {Player[]} the list of players.
     */
    static getPlayersOfAlignment(playerAlignment) {
        let players = world.getAllPlayers();

        let alignedPlayers = [];
        players.forEach((player) => {
            let playerID = ScoreboardManager.getPlayerID(player);
            if (playerID >= 0) {
                let playerRole = RoleManager.getPlayerRole(player);
                if (playerRole.getAlignment(player) == playerAlignment) {
                    alignedPlayers.push(player);
                }
            }
        });
        return alignedPlayers;
    }

    /**
     * Requests a win by a role. Expects the proper role win condition requirements
     * to have been checked.
     * 
     * @param {Player[]} players the player(s) who is/are requesting the win.
     * @param {Role} playerRole the role, presumably of that player, who won.
     * @param {string} specialMessage An additional message to add to the end
     * @param {RoleAlignment} alignment The alignment to win
     */
    static requestWin(players, playerRole, specialMessage, alignment) {
        if (alignment == null) {
            alignment = playerRole.getAlignment(null);
        }
        let winningPlayers = players;
        winningPlayers = winningPlayers.concat(this.getWinningNeutralIndependentRoles());
        WinConditionManager.endTheGame(winningPlayers, alignment, specialMessage);
    }

    /**
     * Ends the game, teleporting people back to spawn.
     * 
     * @param {Player[]} winningPlayers the list of players who won.
     * @param {RoleAlignment} mainWinAlignment the main alignment of who won (murderer/innocent/neutralK)
     */
    static endTheGame(winningPlayers, mainWinAlignment, additionalMessage) {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Accepting request"));
        if (!WinConditionManager.isWinConditionManagementEnabled()) {
            return;
        }
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Ending game"));

        if (additionalMessage == null) {
            additionalMessage = "The winning players: ";
        }
        ScoreboardManager.setGameState(GameStates.FINISHED);
        let playersMessage = additionalMessage;
        winningPlayers = winningPlayers.filter((pl) => pl != null);
        let winningPlayersName = winningPlayers.map((pl) => pl.name);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Winning player names: " + JSON.stringify(winningPlayersName)));
        playersMessage = playersMessage.concat(Util.formatStringList(winningPlayersName, ", ", true));

        WinConditionManager.onGameEnd.emitEndGame(mainWinAlignment, winningPlayers);
        
        let tellRoles = ScoreboardManager.getTrackedObjective("settings.win_con_management.tell_roles_after") != 0;

        let message = "\nThe game is over! " + playersMessage + ". The winning alignment: " + mainWinAlignment.description;
        if (tellRoles) {
            let allPlayers = this._getPlayingPlayers(world.getAllPlayers());
            allPlayers.forEach((player) => {
                message += WinConditionManager.assemblePlayerMessage(player, winningPlayers);
            });
        }

        let titleMessage = "The §r§" + mainWinAlignment.color_code + mainWinAlignment.description + "s";
        let titleSubtext = "§rwon the game!";

        let respawnX = ScoreboardManager.getTrackedObjective("respawn_pos.x");
        let respawnY = ScoreboardManager.getTrackedObjective("respawn_pos.y");
        let respawnZ = ScoreboardManager.getTrackedObjective("respawn_pos.z");
        let respawnDim = ScoreboardManager.getTrackedObjective("respawn_pos.dim");
        let respawnLoc = { x: respawnX+.5, y: respawnY, z: respawnZ+.5 };
        let teleportSettings = { dimension: world.getDimension(this.dimensionIDToString(respawnDim)), keepVelocity: false };
        world.getAllPlayers().forEach((player) => {
            player.stopAllSounds();
            player.removeEffect("minecraft:wither");
            // player.teleport(PlayerHandler.addVectors(respawnLoc, {x:100*i, y:1000, z:0}, teleportSettings));
            system.runTimeout(() => {
                this.teleportPlayerToSpawn(player);
                SoundManager.playSoundEffect([player], SoundEffectType.WIN_CLAP);
                SoundManager.playSoundEffect([player], SoundEffectType.WIN_CRACKLE);
            }, 5);
            player.runCommand("gamemode a");
            player.sendMessage(message);
            // player.onScreenDisplay.updateSubtitle(titleSubtext);
            player.onScreenDisplay.setTitle(titleMessage, {subtitle: titleSubtext, stayDuration: 100, fadeInDuration: 6, fadeOutDuration: 30});
            player.removeTag("dead");
            return;
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {Player[]} winningPlayers 
     * @returns {string}
     */
    static assemblePlayerMessage(player, winningPlayers) {
        let playerAlive = !player.hasTag("dead");
        let playerWon = winningPlayers.includes(player);
        let playerRole = RoleManager.getPlayerRole(player);
        let playerMod = ModifierManager.getPlayerModifier(player);

        let winnerText = (playerWon ? "> " : "");
        let color = "§" + (playerRole.getAlignment() == RoleAlignment.MURDERER ? "c" : (playerRole.getAlignment() == RoleAlignment.NEUTRAL_KILLER ? "d" : "b"));
        let roleMessage = "\n§b" + winnerText + color + player.name + "§r§b was ";
        let roleHistoryString = DeathHandler._getPlayerRoleString(player, "§r§b§l", true);
        let modifierMessage = "";
        if (playerMod != null) {
            modifierMessage = "(" + playerMod.getDisplayName() + "§r§b) ";
        }
        let dead = "(" + (playerAlive ? "§lalive" : "dead") + "§r§b)";
        DeathHandler.buildPlayerTag.emitBuild(player, true);
        let playerTags = DeathHandler.buildPlayerTag.getTag() + "§r§b";
        roleMessage += roleHistoryString + "§r§b! " + modifierMessage + playerTags + dead;
        return roleMessage;
    }

    static teleportPlayerToSpawn(player) {
        let respawnX = ScoreboardManager.getTrackedObjective("respawn_pos.x");
        let respawnY = ScoreboardManager.getTrackedObjective("respawn_pos.y");
        let respawnZ = ScoreboardManager.getTrackedObjective("respawn_pos.z");
        let respawnDim = ScoreboardManager.getTrackedObjective("respawn_pos.dim");
        let respawnLoc = { x: respawnX+.5, y: respawnY, z: respawnZ+.5 };
        let teleportSettings = { dimension: world.getDimension(this.dimensionIDToString(respawnDim)), keepVelocity: false };

        player.tryTeleport(respawnLoc, teleportSettings);
    }

    /**
     * @returns {Player[]}
     */
    static _getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (ScoreboardManager.getScoreboardObjective(player, "player.player_id") >= 0) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Converts a dimension's number id to its string ID. 
     * 
     * @param {number} dimID the numerical id associated with the dimension.
     * @return {string} the identifier for the dimension.
     */
    static dimensionIDToString(dimID) {
        switch (dimID) {
            case 0:
                return "minecraft:overworld"
            case 1:
                return "minecraft:nether"
            case 2:
                return "minecraft:the_end"
            default:
                return "null"
        }
    }

    static canEndGame() {
        return ScoreboardManager.isGameRunning();
    }

    static isWinConditionManagementEnabled() {
        return ScoreboardManager.getTrackedObjective("settings.win_con_management.enabled") != 0;
    }
}
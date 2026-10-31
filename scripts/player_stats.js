"use strict";

import { world, system, Player, EntityHurtAfterEvent, EntityDamageCause } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { DeathHandler } from "./death_handler";
import { RoleAssignment } from "./role_assignment";
import { PlayerHandler } from "./player_handler";
import { RoleManager } from "./role_manager";
import { WinConditionManager } from "./win_con_handler";
import { OnGameEndSignal } from "./signals/on_game_end";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment } from "./role";
import { GuessingManager } from "./guessing_manager";

export class PlayerStatsHandler {
    static initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(PlayerStatsHandler.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(PlayerStatsHandler.onPlayerDeath);
        }
        if (!RoleAssignment.afterRolesAssigned.isConnected(PlayerStatsHandler.afterRolesAssigned)) {
            RoleAssignment.afterRolesAssigned.subscribe(PlayerStatsHandler.afterRolesAssigned);
        }
        if (!WinConditionManager.onGameEnd.isConnected(PlayerStatsHandler.onGameEnd)) {
            WinConditionManager.onGameEnd.subscribe(PlayerStatsHandler.onGameEnd);
        }
        if (!GuessingManager.onGuessSubmit.isConnected(PlayerStatsHandler.onGuessSubmit)) {
            GuessingManager.onGuessSubmit.subscribe(PlayerStatsHandler.onGuessSubmit);
        }
        world.afterEvents.entityHurt.subscribe(PlayerStatsHandler.onEntityHurt);
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        // STAT - player deaths 
        ScoreboardManager.addScoreboardObjective(playerWhoDied, "player_stats.deaths.session", 1);
        ScoreboardManager.addScoreboardObjective(playerWhoDied, "player_stats.deaths.total", 1);

        if (killer != null) {
            let diedRole = RoleManager.getPlayerRole(playerWhoDied);
            let diedAlignment = diedRole.getAlignment();
            if (diedAlignment == RoleAlignment.MURDERER || diedAlignment == RoleAlignment.NEUTRAL_KILLER) {
                // STAT - kills on killer 
                ScoreboardManager.addScoreboardObjective(killer, "player_stats.kills_on_killer.session", 1);
                ScoreboardManager.addScoreboardObjective(killer, "player_stats.kills_on_killer.total", 1);
            }
            let killerRole = RoleManager.getPlayerRole(killer);
            let killerAlignment = killerRole.getAlignment();
            if (killerAlignment == RoleAlignment.MURDERER || killerAlignment == RoleAlignment.NEUTRAL_KILLER) {
                // STAT - kills as killer 
                ScoreboardManager.addScoreboardObjective(killer, "player_stats.kills_as_killer.session", 1);
                ScoreboardManager.addScoreboardObjective(killer, "player_stats.kills_as_killer.total", 1);
            }
        }
    }

    /**
     * 
     * @param {EntityHurtAfterEvent} event 
     */
    static onEntityHurt(event) {
        let hurtEntity = event.hurtEntity;
        let damageEarned = event.damage;
        let damagingEntity = event.damageSource.damagingEntity;
        let cause = event.damageSource.cause;
        
        let isPunch = cause == EntityDamageCause.entityAttack;
        let isBow = cause == EntityDamageCause.projectile;
        
        // hurtEntity.sendMessage("Damage cause: " + cause);
        // hurtEntity.sendMessage("Is punch: " + isPunch + "\nIs bow: " + isBow);

        
        if (hurtEntity.typeId == "minecraft:player") {
            let damagingEntityValid = damagingEntity != null && damagingEntity.typeId == "minecraft:player";
            if (damagingEntityValid && hurtEntity.id == damagingEntity.id) {
                // if player dealt self-damage, ignore
                return;
            }

            // STAT - damaged received
            ScoreboardManager.addScoreboardObjective(hurtEntity, "player_stats.damage_received.total", damageEarned);
            ScoreboardManager.addScoreboardObjective(hurtEntity, "player_stats.damage_received.session", damageEarned);
            if (isBow) {
                // STAT - bow shots taken
                ScoreboardManager.addScoreboardObjective(hurtEntity, "player_stats.bow_shots_taken.total", 1);
                ScoreboardManager.addScoreboardObjective(hurtEntity, "player_stats.bow_shots_taken.session", 1);
            }

            if (damagingEntityValid) {
                // STAT - damage dealt 
                ScoreboardManager.addScoreboardObjective(damagingEntity, "player_stats.damage_dealt.total", damageEarned);
                ScoreboardManager.addScoreboardObjective(damagingEntity, "player_stats.damage_dealt.session", damageEarned);
                if (isPunch) {
                    // STAT - punches 
                    ScoreboardManager.addScoreboardObjective(damagingEntity, "player_stats.punches.total", 1);
                    ScoreboardManager.addScoreboardObjective(damagingEntity, "player_stats.punches.session", 1);
                }
                if (isBow) {
                    // STAT - bow shots landed 
                    ScoreboardManager.addScoreboardObjective(damagingEntity, "player_stats.bow_shots_landed.total", 1);
                    ScoreboardManager.addScoreboardObjective(damagingEntity, "player_stats.bow_shots_landed.session", 1);
                }
            }
        }
    }

    static afterRolesAssigned() {
        let allPlayers = world.getAllPlayers();
        let playingPlayers = PlayerHandler.getPlayingPlayers(allPlayers);
        playingPlayers.forEach((pl) => {
            // STAT - rounds played
            ScoreboardManager.addScoreboardObjective(pl, "player_stats.rounds_played.session", 1);
            ScoreboardManager.addScoreboardObjective(pl, "player_stats.rounds_played.total", 1);
            let playerRole = RoleManager.getPlayerRole(pl);
            let alignment = playerRole.getAlignment();
            switch (alignment) {
                case RoleAlignment.INNOCENT:
                    // STAT - innocent games
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.innocent_rounds.session", 1);
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.innocent_rounds.total", 1);
                    break;
                case RoleAlignment.NEUTRAL_INDEPENDENT:
                    // STAT - neutral independent games
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.neutral_independent_rounds.session", 1);
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.neutral_independent_rounds.total", 1);
                    break;
                case RoleAlignment.NEUTRAL_KILLER:
                    // STAT - neutral killer games
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.neutral_killer_rounds.session", 1);
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.neutral_killer_rounds.total", 1);
                    break;
                case RoleAlignment.MURDERER:
                    // STAT - murderer games
                    // pl.sendMessage("updating rounds played stats");
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.murderer_rounds.session", 1);
                    ScoreboardManager.addScoreboardObjective(pl, "player_stats.murderer_rounds.total", 1);
                    break;
                default:
                    pl.sendMessage("Alignment is " + alignment.description);
                    break;
            }
        });
    }

    /**
     * 
     * @param {OnGameEndSignal} signal 
     */
    static onGameEnd(signal) {
        let winningPlayers = signal.winningPlayers;

        PlayerHandler.getPlayingPlayers(world.getAllPlayers()).forEach((pl) => {
            // STAT - rounds finished
            ScoreboardManager.addScoreboardObjective(pl, "player_stats.rounds_finished.session", 1);
            ScoreboardManager.addScoreboardObjective(pl, "player_stats.rounds_finished.total", 1);
        });

        winningPlayers.forEach((pl) => {
            // STAT - rounds won
            ScoreboardManager.addScoreboardObjective(pl, "player_stats.rounds_won.session", 1);
            ScoreboardManager.addScoreboardObjective(pl, "player_stats.rounds_won.total", 1);
        });
    }

    static onGuessSubmit(playerWhoGuessed, playerWhoWasGuessed, guessedRole, wasCorrect) {
        if (!wasCorrect) {
            // STAT - failed guesses
            ScoreboardManager.addScoreboardObjective(playerWhoGuessed, "player_stats.times_guessed_failed.session", 1);
            ScoreboardManager.addScoreboardObjective(playerWhoGuessed, "player_stats.times_guessed_failed.total", 1);
            return;
        }

        // STAT - successful guesses
        ScoreboardManager.addScoreboardObjective(playerWhoGuessed, "player_stats.times_guessed_successfully.session", 1);
        ScoreboardManager.addScoreboardObjective(playerWhoGuessed, "player_stats.times_guessed_successfully.total", 1);

        // STAT - times guessed
        ScoreboardManager.addScoreboardObjective(playerWhoWasGuessed, "player_stats.times_been_guessed.session", 1);
        ScoreboardManager.addScoreboardObjective(playerWhoWasGuessed, "player_stats.times_been_guessed.total", 1);
    }

    /**
     * Runs when a player joins. Resets current session data.
     * @param {Player} player 
     */
    static onPlayerJoin(player) {
        if (world.getAllPlayers().length == 1) {
            ScoreboardManager.addScoreboardObjective("game_data", "player_stats.current_session", 1);
        }
        let currentSession = ScoreboardManager.getTrackedObjective("player_stats.current_session");
        let playerSession = ScoreboardManager.getScoreboardObjective(player, "player_stats.current_session");
        if (currentSession != playerSession) {
            PlayerStatsHandler.resetSessionStats(player);
            ScoreboardManager.setScoreboardObjective(player, "player_stats.current_session", currentSession);
        }
    }

    static resetSessionStats(player) {
        ScoreboardManager.setScoreboardObjective(player, "player_stats.deaths.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.kills_on_killer.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.kills_as_killer.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.times_guessed_successfully.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.times_guessed_failed.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.times_been_guessed.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.punches.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.bow_shots_taken.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.bow_shots_landed.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.damage_dealt.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.damage_received.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.murderer_rounds.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.neutral_killer_rounds.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.neutral_independent_rounds.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.innocent_rounds.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.rounds_won.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.rounds_played.session", 0);
        ScoreboardManager.setScoreboardObjective(player, "player_stats.rounds_finished.session", 0);
    }

    /**
     * 
     * @param {Player} player 
     * @param {*} callback 
     */
    static openPlayerStatsForm(player, callback) {
        let form = new ActionFormData();
        form.title("Player Game Stats");
        form.body("Here you can see the stats for the current session and current world.");

        form.button("Open Session Stats");
        form.button("Open World Stats");

        form.button("Back");

        form.show(player).then((r) => { 
            if (r.canceled) {
                return;
            }

            let button = r.selection;
            switch (button) {
                case 0:
                    // session stats
                    PlayerStatsHandler._openStatForm(player, "Session", callback);
                    return;
                case 1:
                    // world stats
                    PlayerStatsHandler._openStatForm(player, "Total", callback);
                    return;
                default:
                    // back
                    break;
            }
            
            if (callback != null) {
                callback(player);
            }
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {string} statType 
     */
    static _openStatForm(player, statType, callback) {
        let statInfoType = statType.toLowerCase();
        let form = new ModalFormData();
        form.title(statType + " Stats");
        form.label("The following are your " + statInfoType + " stats");
        form.label(PlayerStatsHandler._getStatsString(player, statInfoType));

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            PlayerStatsHandler.openPlayerStatsForm(player, callback);
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {string} statEnding 
     */
    static _getStatsString(player, statEnding) {
        let deaths = ScoreboardManager.getScoreboardObjective(player, "player_stats.deaths." + statEnding);
        let killsOnKiller = ScoreboardManager.getScoreboardObjective(player, "player_stats.kills_on_killer." + statEnding);
        let killsAsKiller = ScoreboardManager.getScoreboardObjective(player, "player_stats.kills_as_killer." + statEnding);
        let successfulGuesses = ScoreboardManager.getScoreboardObjective(player, "player_stats.times_guessed_successfully." + statEnding);
        let failedGuesses = ScoreboardManager.getScoreboardObjective(player, "player_stats.times_guessed_failed." + statEnding);
        let timesGuessed = ScoreboardManager.getScoreboardObjective(player, "player_stats.times_been_guessed." + statEnding);
        let punches = ScoreboardManager.getScoreboardObjective(player, "player_stats.punches." + statEnding);
        let shotsTaken = ScoreboardManager.getScoreboardObjective(player, "player_stats.bow_shots_taken." + statEnding);
        let shotsGiven = ScoreboardManager.getScoreboardObjective(player, "player_stats.bow_shots_landed." + statEnding);
        let damageDealt = ScoreboardManager.getScoreboardObjective(player, "player_stats.damage_dealt." + statEnding);
        let damageReceived = ScoreboardManager.getScoreboardObjective(player, "player_stats.damage_received." + statEnding);
        let murdererRounds = ScoreboardManager.getScoreboardObjective(player, "player_stats.murderer_rounds." + statEnding);
        let nKRounds = ScoreboardManager.getScoreboardObjective(player, "player_stats.neutral_killer_rounds." + statEnding);
        let nIRounds = ScoreboardManager.getScoreboardObjective(player, "player_stats.neutral_independent_rounds." + statEnding);
        let innoRounds = ScoreboardManager.getScoreboardObjective(player, "player_stats.innocent_rounds." + statEnding);
        let roundsWon = ScoreboardManager.getScoreboardObjective(player, "player_stats.rounds_won." + statEnding);
        let roundsplayed = ScoreboardManager.getScoreboardObjective(player, "player_stats.rounds_played." + statEnding);
        let roundsFinished = ScoreboardManager.getScoreboardObjective(player, "player_stats.rounds_finished." + statEnding);
        
        let message = "";
        message += "Deaths: " + deaths;
        message += "\nKills on Killer: " + killsOnKiller;
        message += "\nKills as Killer: " + killsAsKiller;
        message += "\nCorrect Guesses: " + successfulGuesses;
        message += "\nIncorrect Guesses: " + failedGuesses;
        message += "\nGuess Success Rate: " + (successfulGuesses / (successfulGuesses + failedGuesses) * 100).toFixed(2);
        message += "\nTimes Guessed: " + timesGuessed;
        message += "\n\nPunches Landed: " + punches;
        message += "\nBow Shots Taken: " + shotsTaken;
        message += "\nBow Shots Landed: " + shotsGiven;
        message += "\nDamage Dealt: " + damageDealt;
        message += "\nDamage Taken: " + damageReceived;
        message += "\n\nMurderer Rounds: " + murdererRounds;
        message += "\nNeutral Killer Rounds: " + nKRounds;
        message += "\nNeutral Independent Rounds: " + nIRounds;
        message += "\nInnocent Rounds: " + innoRounds;
        message += "\n\nRounds Played: " + roundsplayed;
        message += "\nRounds Finished: " + roundsFinished;
        message += "\nRounds Won: " + roundsWon;
        message += "\nWin Rate: " + (roundsWon / roundsFinished * 100).toFixed(2);

        return message;
    }
}
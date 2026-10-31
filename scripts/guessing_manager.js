"use strict";

import { world, system, Player } from "@minecraft/server";

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager"
import { Role } from "./role"
import { OnGuessSignal } from "./signals/guess_signal"
import { ChatManager } from "./chat_manager";
import { ModifierManager } from "./modifier_manager";
import { LogItemType } from "./logs/game_log";
import { SoundEffectType, SoundManager } from "./sound_manager";
import { DeathHandler } from "./death_handler";

export class GuessingManager {
    /**
     * @type {OnGuessSignal}
     */
    static onGuessSubmit = new OnGuessSignal();

    static isGuessingEnabled() {
        let enabled = ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled");
        return enabled == 1;
    }

    /**
     * Returns if the player can guess, based on their role.
     * 
     * @param {Player} player the player that is being checked.
     * @param {Role} playerRole that player's role.
     * @returns {boolean} whether the player can guess or not.
     */
    static canPlayerGuess(player, playerRole) {
        let playerMod = ModifierManager.getPlayerModifier(player);
        let canGuessMod = playerMod != null && playerMod.getGuessAlignments().length > 0;
        return (playerRole.getGuessAlignments().length > 0 || canGuessMod) && ScoreboardManager.getScoreboardObjective(player, "player.guesses") != 0 && !player.hasTag("dead");
    }

    /**
     * Opens the voting menu for the player to vote, if their role is valid.
     * 
     * @param {Player} player the player to open the menu on.
     */
    static openVotingMenu(player) {
        if (DeathHandler.consideredDead(player)) {
            return;
        }

        let playerRole = RoleManager.getPlayerRole(player);
        // player.sendMessage("Alignments you can guess: ");
        // playerRole.getGuessAlignments().forEach((alignment) => {
        //     player.sendMessage("" + alignment.description);
        // });
        let guessingCooldown = player.getItemCooldown("guessing_action");
        if (guessingCooldown > 0) {
            player.sendMessage("Guessing is on cooldown for " + Math.ceil(guessingCooldown / 20) + " seconds.");
            return;
        }

        if (!(this.isGuessingEnabled() && this.canPlayerGuess(player, playerRole))) {
            let hasGuessAlignments = playerRole.getGuessAlignments().length > 0;
            if (hasGuessAlignments) {
                player.sendMessage("You're out of guesses.");
            }
            else {
                player.sendMessage("You can't guess.");
            }
            return;
        }

        let guessableRoles = playerRole.getGuessAlignments();
        let playerMod = ModifierManager.getPlayerModifier(player);
        // let modRoleTypes = [];
        if (playerMod != null) {
            guessableRoles = guessableRoles.concat(playerMod.getGuessAlignments());
            // modRoleTypes = playerMod.getWhitelistedRoles();
        }
        // player.sendMessage("" + guessableRoles[0].description);
        let form = new ModalFormData();

        form.title("Role Guessing Menu");
        form.label("Select a player and a role. If you are correct, they will die. If you are incorrect, you will.");

        let players = this.sortPlayersWithoutTag(this._getPlayingPlayers(world.getAllPlayers(), player), "dead");
        if (players.length <= 0) {
            player.sendMessage("There aren't any players to guess!");
            return;
        }
        let playerNames = players.map((p) => p.name).sort((a, b) => a.localeCompare(b));

        let roles = RoleManager.getEnabledRoles();
        roles = RoleManager.sortByTypes(roles, guessableRoles);
        
        let modifiers = ModifierManager.getEnabledModifiers();
        modifiers = ModifierManager.sortByTypes(modifiers, guessableRoles);
        modifiers = modifiers.filter((m) => m.canBeGuessed());
        let canGuessModifiers = ScoreboardManager.getTrackedObjective("settings.role_guessing.can_guess_modifiers") != 0 && modifiers.length > 0;
        if (roles.length <= 0 && (!canGuessModifiers || modifiers.length <= 0)) {
            player.sendMessage("No possible roles to guess, sorry!");
            return;
        }
        let roleNames = roles.map((r) => r.getDisplayName());
        let modifierNames = modifiers.map((m) => m.getDisplayName());

        form.dropdown("Player to Guess", playerNames);
        // form.divider();
        form.dropdown("Player's Role", roleNames);

        if (canGuessModifiers) {
            form.toggle("Guessing Modifier", {defaultValue: false, tooltip: "If on, will guess the modifier. Otherwise is guessing the role."});
            form.dropdown("Player's Modifier", modifierNames, {tooltip: "Requires you to toggle Guessing Modifier to use"});
        }

        form.show(player).then(r => {
            if (r.canceled) {
                return true;
            }

            this.onGuessSubmit.resetSignal();

            let guessesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.guesses");
            if (guessesRemaining != -1) {
                guessesRemaining--;
                ScoreboardManager.addScoreboardObjective(player, "player.guesses", -1);
            }

            let guessedPlayer = players[r.formValues[1]];
            let playerRole = RoleManager.getPlayerRole(guessedPlayer);
            let roleGuessed = roles[r.formValues[2]];
            let isGuessingModifier = canGuessModifiers ? r.formValues[3] : false;
            let modifierGuessed = canGuessModifiers ? modifiers[r.formValues[4]] : null;
            let playerModifier = ModifierManager.getPlayerModifier(guessedPlayer);

            // player.sendMessage("Guessed player as role " + roleGuessed.getRoleType().id + ", where they were actually " + playerRole.getRoleType().id);
            let correct = (!isGuessingModifier && playerRole.getRoleType().id == roleGuessed.getRoleType().id) ||
                (isGuessingModifier && playerModifier != null && modifierGuessed != null && playerModifier.getModifierType().id == modifierGuessed.getModifierType().id);

            GuessingManager.onGuessSubmit.emitGuess(player, guessedPlayer, roleGuessed, correct);
            
            if (GuessingManager.onGuessSubmit.forceOppositeResult) {
                correct = !correct;
            }
            // player.sendMessage("That was correct: " + correct);
            player.startItemCooldown("guessing_action", ScoreboardManager.getTrackedObjective("settings.role_guessing.guess_cooldown") * 20);
            if (GuessingManager.onGuessSubmit.cancel) {
                player.sendMessage("The guess was cancelled.");
                ChatManager.sendDeadPlayersMessage("§c§o" + player.name + "'s guess on " + guessedPlayer.name + " as " + roleGuessed.getDisplayName() + "§r§c§o was cancelled.", LogItemType.GUESS_MESSAGE);
                return;
            }

            let messageEnd = guessedPlayer.name + (isGuessingModifier ? " as having " + modifierGuessed.getDisplayName() : "§r§c as " + roleGuessed.getDisplayName() + "§r");

            if (correct) {
                player.sendMessage("§a§lCorrect Guess: §r§aGuessed " + messageEnd.replace("§c", "§a"));
                SoundManager.playSoundEffect([player], SoundEffectType.CORRECT_GUESS);
            }
            else {
                player.sendMessage("§c§lIncorrect Guess: §r§cGuessed " + messageEnd);
                SoundManager.playSoundEffect([player], SoundEffectType.INCORRECT_GUESS);
                SoundManager.playSoundEffect([player], SoundEffectType.PLAYER_RECEIVE_TASK);
            }
            
            let deadChatMessage = "§c§o" + player.name + (correct ? " correctly " : " incorrectly ") + "guessed " + messageEnd;
            
            // safe guesses
            let safeGuesses = ScoreboardManager.getScoreboardObjective(player, "player.safe_guesses");
            if (!correct && safeGuesses > 0) {
                safeGuesses--;
                ScoreboardManager.setScoreboardObjective(player, "player.safe_guesses", safeGuesses);
                this.onGuessSubmit.usesSafeGuess = true;
                this.onGuessSubmit.cancel = true;
                player.sendMessage("§c§lYou were saved by a safe guess...");
                deadChatMessage += " and used a safe guess.";
            }
            
            if (GuessingManager.onGuessSubmit.cancel) {
                player.sendMessage("The guess was cancelled.");
                ChatManager.sendDeadPlayersMessage("§c§o" + player.name + "'s guess on " + guessedPlayer.name + " as " + roleGuessed.getDisplayName() + "§r§c§o was cancelled.", LogItemType.GUESS_MESSAGE);
                return;
            }
            
            ChatManager.sendDeadPlayersMessage(deadChatMessage, LogItemType.GUESS_MESSAGE);
            player.sendMessage((guessesRemaining != -1 ? guessesRemaining : "Infinite") + " role guesses remaining.");

            // player.sendMessage("Form being processed");
            GuessingManager.handleGuessResult(player, guessedPlayer, correct);
            return true;
        })
        .catch((err) => {
            player.sendMessage("Failed to show form due to error " + err);
            return false;
        });
        // form.show(player)
    }

    /**
     * Handles guessing a player. If the player was correct, will kill the target.
     * 
     * @param {Player} playerGuessing the player that guessed.
     * @param {Player} target the player that was guessed.
     * @param {boolean} wasCorrect if the guess was correct or not.
     */
    static handleGuessResult(playerGuessing, target, wasCorrect) {
        if (wasCorrect) {
            let targetRole = RoleManager.getPlayerRole(target);
            let cancel = targetRole.onGuess(playerGuessing, target);
            if (cancel) {
                return;
            }
            this.killGuessedPlayer(target);
            SoundManager.playSoundEffect([target], SoundEffectType.GUESSED_PLAYER);
        }
        else if (ScoreboardManager.getTrackedObjective("settings.role_guessing.death_on_guess") > 0 && !playerGuessing.hasTag("dead")) {
            this.killGuessedPlayer(playerGuessing);
        }
    }

    /**
     * Kills the guessed player.
     * 
     * @param {Player} player the player who should die.
     */
    static killGuessedPlayer(player) {
        let damageToHalf = player.getComponent("minecraft:health").currentValue - 10;
        if (damageToHalf > 0) {
            player.applyDamage(damageToHalf);
        }
        player.addEffect("minecraft:wither", 1000000, { amplifier: 49 })
    }


    /**
     * Sorts the given list of players to remove anyone with the inputted tag.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {String[]} tag the tag that players cannot have.
     * 
     * @returns {Player[]}
     */
    static sortPlayersWithoutTag(players, tag) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag(tag)) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * @param {Player} excludePlayer a player to exclude from the list
     * @returns {Player[]}
     */
    static _getPlayingPlayers(players, excludePlayer) {
        let livePlayers = [];
        players.forEach((player) => {
            let playerID = ScoreboardManager.getScoreboardObjective(player, "player.player_id");
            if (playerID >= 0 && (excludePlayer == null || playerID != ScoreboardManager.getScoreboardObjective(excludePlayer, "player.player_id"))) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }
}
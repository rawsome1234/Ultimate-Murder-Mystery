"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";

export class TransporterRole extends InnocentRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.transporter.action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.transporter.ability_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§bTransporter";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Teleport people between each other!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your ability brings up a menu that allows you to pick two people. Upon submitting that menu, the two people's locations get swapped.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.transporter.enabled");
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        return [];
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.TRANSPORTER;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this role can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns whether this role counts towards win condition tracking.
     * @returns {boolean}
     */
    countsInTracking(player) {
        return true;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * 
     * @param {Player} player
     */
    activateAbility(player) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            let form = new ModalFormData();
            form.title("Transporter form");
            form.label("Choose two people to transport.");
            let players = TransporterRole.getTeleportablePlayers(world.getAllPlayers(), true);
            Util.shuffle(players);
            let playerNames = players.map((pl) => pl.name);
            form.dropdown("Player 1", playerNames);
            form.dropdown("Player 2", playerNames);

            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }

                let playerOne = players[r.formValues[1]];
                let playerTwo = players[r.formValues[2]];

                if (playerOne != null && playerTwo != null && playerOne.id == playerTwo.id) {
                    player.sendMessage("§bThat's the same player!");
                    // return;
                }
                
                TransporterRole.attemptTransport(player, playerOne, playerTwo, true, true);
            });
        }
    }

    /**
     * 
     * @param {Player} player the transporter
     * @param {Player} playerOne The first player being transported
     * @param {Player} playerTwo The second player being transported
     * @param {boolean} takeRoleCharge Whether to charge a role
     * @param {boolean} resetCooldown If true, resets the role cooldown for the transporter
     */
    static attemptTransport(player, playerOne, playerTwo, takeRoleCharge, resetCooldown) {
        let ghostOne = GhostManager.getPlayerGhost(playerOne);
        let ghostTwo = GhostManager.getPlayerGhost(playerTwo);

        let timer = ScoreboardManager.getTrackedObjective("role_settings.transporter.transport_delay");
        if (timer > 0) {
            player.sendMessage("§o§bTransporting in " + timer + " seconds...");
            ChatManager.sendDeadPlayersMessage("§b§o" + player.name + " is transporting " + playerOne.name + " and " + playerTwo.name + " in " + timer + " seconds...", LogItemType.ABILITY_MESSAGE);
        }
        ScoreboardManager.setPlayerActionCooldown(player, timer+1, false);

        system.runTimeout(() => {
            if (playerOne == null || playerTwo == null || player.hasTag("dead")) {
                player.sendMessage("§b§oTransport failed.");
                return;
            }

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.TRANSPORTER_TELEPORT;
            PlayerHandler.beforePlayerInteract.emitInteract(player, playerOne);
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.transporter.ability_cooldown");
            let cancelInteraction = PlayerHandler.beforePlayerInteract.emitInteract(player, playerTwo);
            if (cancelInteraction) {
                player.sendMessage("§b§oTransport Failed.");
                ChatManager.sendDeadPlayersMessage("§b§o" + player.name + " tried to transport " + playerOne.name + " and " + playerTwo.name + " but it was cancelled.", LogItemType.ABILITY_MESSAGE);
                
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            let playerOneDead = playerOne.hasTag("dead");
            let playerTwoDead = playerTwo.hasTag("dead");

            player.sendMessage("§bTransported §l" + playerOne.name + " §r§band §l" + playerTwo.name);
            ChatManager.sendDeadPlayersMessage("§b§o" + player.name + " transported " + playerOne.name + (playerOneDead ? "'s ghost" : "") + " and " + playerTwo.name + (playerTwoDead ? "'s ghost" : "") + "", LogItemType.ABILITY_MESSAGE);

            // activate ability
            if (takeRoleCharge) {
                let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }
            }
            
            let toTransportOne = playerOneDead ? ghostOne : playerOne;
            let toTransportTwo = playerTwoDead ? ghostTwo : playerTwo;

            // ability effect
            
            TransporterRole.swapEntities(toTransportOne, toTransportTwo, true, true);
            if (!playerOneDead) {
                PlayerHandler.afterPlayerInteract.emitInteract(player, playerOne, InteractTypes.TRANSPORTER_TELEPORT);
            }
            if (!playerTwoDead) {
                PlayerHandler.afterPlayerInteract.emitInteract(player, playerTwo, InteractTypes.TRANSPORTER_TELEPORT);
            }

            // sets cooldown
            if (resetCooldown) {
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
                PlayerHandler.updateRoleActionVisual(player);
            }
        }, timer * 20);
    }

    /**
     * 
     * @param {Entity} entityOne 
     * @param {Entity} entityTwo 
     */
    static swapEntities(entityOne, entityTwo, sendPlayer1Message, sendPlayer2Message) {
        let positionOne = entityOne.location;
        let positionTwo = entityTwo.location;
        let dimOne = entityOne.dimension;
        let dimTwo = entityTwo.dimension;
        entityOne.teleport(positionTwo, { dimension: dimTwo });
        entityTwo.teleport(positionOne, { dimension: dimOne });

        // ability activate message
        if (entityOne.typeId == "minecraft:player") {
            entityOne.addEffect("minecraft:slow_falling", 20*10);
            if (sendPlayer1Message) {
                entityOne.sendMessage("§bYou've been transported!");
            }
        }
        if (entityTwo.typeId == "minecraft:player") {
            entityTwo.addEffect("minecraft:slow_falling", 20*10);
            if (sendPlayer2Message) {
                entityTwo.sendMessage("§bYou've been transported!");
            }
        }
    }


    /**
     * @param {Player[]} players 
     * @param {boolean} includeGhosts 
     * @returns {Player[]}
     */
    static getTeleportablePlayers(players, includeGhosts) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!DeathHandler.consideredDead(player)) {
                livePlayers.push(player);
            }
            else if (includeGhosts && player.hasTag("dead")) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Getting " + player.name + "'s ghost"));
                if (GhostManager.getPlayerGhost(player) != null) {
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage(player.name + " is dead and has a ghost"));
                    livePlayers.push(player);
                }
            }
        });
        return livePlayers;
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Transporter Settings");

        form.divider();
        form.label("The Transporter is an innocent role that is able to swap the positions of two people.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.transporter.enabled") != 0;
        form.toggle("Transporter Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.transporter.ability_cooldown");
        form.slider("Transport Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of transporter.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.transporter.action_uses");
        form.slider("Transport Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times transport can be used. -1 is infinite uses");
        
        let delay = ScoreboardManager.getTrackedObjective("role_settings.transporter.transport_delay");
        form.slider("Transport Delay", 0, 30, { defaultValue: delay }); // 6
        form.label("The number of seconds of delay on the transport ability. Recommended to be low but not 0 to prevent teleporting away from a fight.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.transporter.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.transporter.ability_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.transporter.action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.transporter.transport_delay", r.formValues[8]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.transporter.ability_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.transporter.action_uses");
        let delay = ScoreboardManager.getTrackedObjective("role_settings.transporter.transport_delay");

        let description = "The transporter is an innocent who can swap the positions of players.";
        description += "\n\nTransport Cooldown: " + cooldownTime + " seconds.";
        description += "\nTransport Uses: " + abilityUses;
        description += "\nTransport Delay: " + delay + " seconds.";
        return description;
    }
}
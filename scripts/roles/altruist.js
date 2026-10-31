"use strict";

import { world, system, Player, GameMode } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";

export class AltruistRole extends InnocentRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(() => {
            let timeUntilBlocked = ScoreboardManager.getTrackedObjective("role_settings.altruist.time_until_blocked") * 20;
            let altruistRemaining = AltruistRole.isWorkingAltruist(world.getAllPlayers());
            // if a player respawns, tracks lifetime for if they are revived in time
            world.getAllPlayers().forEach((player) => {
                if (player.hasTag("dead")) {
                    ScoreboardManager.addScoreboardObjective(player, "entity.lifetime", 1);
                    // let timer = ScoreboardManager.getScoreboardObjective(player, "entity.lifetime");
                    // if (timer % 20 == 0) {
                    //     player.sendMessage("Time remaining: " + ((timeUntilBlocked - timer) / 20));
                    // }
                    if ((!altruistRemaining || ScoreboardManager.getScoreboardObjective(player, "entity.lifetime") == timeUntilBlocked) && player.hasTag("altruistMightRevive") && !player.hasTag("altruistReviving")) {
                        // player is fully dead
                        player.removeTag("altruistMightRevive");
                        DeathHandler.decrementBlockDeadCount(player);
                        player.sendMessage("You weren't revived in time...");
                        DeathHandler.sendPlayerRolesAliveMessages(player);
                    }
                }
            });
        }, 1);
        super.initialize();
    }

    /**
     * Returns if there is at least one altruist who can revive players.
     * @param {Player[]} players 
     */
    static isWorkingAltruist(players) {
        for (let i = 0; i < players.length; i++) {
            let player = players[i];
            let playerRole = RoleManager.getPlayerRole(player);
            if (!player.hasTag("dead") && playerRole != null && playerRole.getRoleType() == RoleTypes.ALTRUIST && ScoreboardManager.getScoreboardObjective(player, "player.action_charges") > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_count");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.altruist.initial_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        return "§cAltruist";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Sacrifice yourself to revive a player!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let usesGhosts = ScoreboardManager.getTrackedObjective("role_settings.altruist.revives_ghost_bodies") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled");
        let resDelay = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_delay");
        let reviveKills = ScoreboardManager.getTrackedObjective("role_settings.altruist.reviving_kills_altruist") != 0;
        let reviveMessage = (reviveKills ? "will die" : "will be set to 1 health");
        if (usesGhosts) {
            return "Find a ghost body after someone has died to revive that player. Upon reviving them you " + reviveMessage + ". There is a revive delay of " + resDelay + " seconds.";
        } 
        else {
            return "When you want to revive someone, use your ability. If there is a valid player to revive, you " + reviveMessage + " as soon as the menu closes. The chosen player will be revived after " + resDelay + " seconds.";
        }
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.altruist.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return ScoreboardManager.getTrackedObjective("role_settings.altruist.revives_ghost_bodies") != 0;
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
        return RoleTypes.ALTRUIST;
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
     */
    activateAbility(player) {
        let usesGhostBodies = ScoreboardManager.getTrackedObjective("role_settings.altruist.revives_ghost_bodies") != 0;
        let ghostBodiesEnabled = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
        if (usesGhostBodies && ghostBodiesEnabled) {
            return;
        }

        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            let canResKillers = ScoreboardManager.getTrackedObjective("role_settings.altruist.can_revive_killers") != 0;
            let deadPlayers = AltruistRole.getDeadPlayers(world.getAllPlayers(), canResKillers);

            if (deadPlayers.length == 0) {
                player.sendMessage("There's no one to revive right now.");
                return;
            }

            let form = new ModalFormData();
            form.title("Choose a Player to Revive");

            let reviveKills = ScoreboardManager.getTrackedObjective("role_settings.altruist.reviving_kills_altruist") != 0;
            let reviveMessage = (reviveKills ? "will die" : "will be set to 1 health");
            form.label("Upon closing this menu, submission or cancel, you " + reviveMessage + ".");

            let playerNames = deadPlayers.map((pl) => pl.name);
            form.dropdown("Player to Revive", playerNames);

            form.show(player).then((r) => {
                let reviveIndex = r.formValues[1];
                let playerToRevive = deadPlayers[reviveIndex];
                let playerToReviveRole = RoleManager.getPlayerRole(playerToRevive);

                let couldRevive = AltruistRole.revivePlayer(playerToRevive, playerToReviveRole, player, {}, true);

                if (!couldRevive) {
                    return;
                }
                
                // activate ability 
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }
    
                // ability effect
    
                // ability activate message
    
                // sets cooldown
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.altruist.initial_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            });

        }
    }

    /**
     * Sorts a list of players by those who have the dead tag.
     * @param {Player[]} playerList 
     * @param {boolean} includeKillers whether to include evil aligned roles
     * @returns {Player[]} the sorted list of players
     */
    static getDeadPlayers(playerList, includeKillers) {
        let evilRoles = [RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER];
        let deadPlayers = [];
        playerList.forEach((player) => {
            let playerRole = RoleManager.getPlayerRole(player);
            if (player.hasTag("dead") && (!includeKillers || !evilRoles.includes(playerRole.getAlignment(player)))) {
                deadPlayers.push(player);
            }
        });
        return deadPlayers;
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let usesGhostBodies = ScoreboardManager.getTrackedObjective("role_settings.altruist.revives_ghost_bodies") != 0;
        let ghostBodiesEnabled = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
        if (!usesGhostBodies || !ghostBodiesEnabled) {
            return;
        }

        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (otherEntity.typeId == "umm:ghost_body" && chargesRemaining != 0) {
            // ability effect
            let playersGhostID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.ghost_player_id");
            let playerWhoDied = ScoreboardManager.getPlayerWithID(playersGhostID);
            let reviveRoleID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.ghost_player_role_id");
            let customReviveRoleID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.ghost_player_custom_id");
            let reviveRole = RoleManager.getMatchingRole(reviveRoleID, customReviveRoleID);

            if (playerWhoDied == null) {
                player.sendMessage("§oIt seems the player has left our plane of existence..");
                return;
            }
            
            if (!playerWhoDied.hasTag("dead")) {
                player.sendMessage("§oIt seems the player has already returned..");
                return;
            }
            
            let resAtDeathLocation = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_at_death_location") != 0;
            let reviveLocation = otherEntity.location;
            let couldRevive = AltruistRole.revivePlayer(playerWhoDied, reviveRole, player, reviveLocation, !resAtDeathLocation);
            
            if (!couldRevive) {
                return;
            }

            GhostManager.onGhostInteract.emit(player, otherEntity);
            otherEntity.remove();

            system.run(() => {

                // activate ability 
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }
            });

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.altruist.initial_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    /**
     * Revives the player while damaging the altruist
     * 
     * @param {Player} playerToRevive 
     * @param {Role} reviveRole the role of the player to revive
     * @param {Player} altruist the player who is reviving
     * @param {Vector3} teleportLocation the location to teleport to
     * @param {boolean} teleportToSpawn if true, will ignore teleportLocation and will teleport the revived player to spawn.
     * @returns {boolean} whether the revive occurred or not.
     */
    static revivePlayer(playerToRevive, reviveRole, altruist, teleportLocation, teleportToSpawn) {
        let canResKillers = ScoreboardManager.getTrackedObjective("role_settings.altruist.can_revive_killers") != 0;
        let evilRoles = [RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER];
        let roleIsEvil = evilRoles.includes(reviveRole.getAlignment(playerToRevive));
        if (!canResKillers && roleIsEvil) {
            altruist.sendMessage("§cSomething tells you that you don't want to revive that player...");
            return false;
        }

        let reviveKills = ScoreboardManager.getTrackedObjective("role_settings.altruist.reviving_kills_altruist") != 0;
        let resDelay = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_delay");
        
        if (playerToRevive == null) {
            altruist.sendMessage("§cYour revive failed!");
            return;
        }
        
        let timeUntilBlocked = ScoreboardManager.getTrackedObjective("role_settings.altruist.time_until_blocked") * 20;
        if (ScoreboardManager.getScoreboardObjective(playerToRevive, "entity.lifetime") > timeUntilBlocked) {
            altruist.sendMessage("§cThat player can no longer be revived...");
            return;
        }

        // START REVIVE

        // deal damage
        if (reviveKills) {
            altruist.kill();
        }
        else {
            system.run(() => {
                let currentHealth = altruist.getComponent("minecraft:health").currentValue;
                altruist.applyDamage(currentHealth - 1);
            });
        }
        
        altruist.sendMessage("§cBeginning to revive §r§l" + playerToRevive.name);
        playerToRevive.sendMessage("§oAn altruist is beginning to revive you...");

        system.run(() => {
            playerToRevive.addTag("altruistReviving");
            playerToRevive.removeTag("altruistMightRevive");
        });
        
        system.runTimeout(() => {
            playerToRevive.setGameMode(GameMode.Adventure);
            playerToRevive.removeTag("dead");
            if (teleportToSpawn) {
                // playerToRevive.sendMessage("Respawning at spawn");
                WinConditionManager.teleportPlayerToSpawn(playerToRevive);
            }
            else {
                playerToRevive.teleport(teleportLocation);
            }
            altruist.sendMessage("§aRevived " + playerToRevive.name + "!");
            playerToRevive.sendMessage("§aYou have been revived!");
            playerToRevive.removeTag("altruistReviving");
            DeathHandler.decrementBlockDeadCount(playerToRevive);
            ChatManager.sendDeadPlayersMessage("§4§o" + altruist.name + " altruisted " + playerToRevive.name, LogItemType.ABILITY_MESSAGE);
        }, resDelay * 20);
        return true;
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
        form.title("Altruist Settings");

        form.divider();
        form.label("The altruist is an innocent that can sacrifice their life to respawn a player");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.altruist.enabled") != 0;
        form.toggle("Altruist Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.altruist.initial_cooldown");
        form.slider("Revive Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The revive cooldown of the altruist. If they die on revive, this is just the initial cooldown.");
        
        let reviveCount = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_count");
        form.slider("Revive Count", -1, 10, { defaultValue: reviveCount }); // 6
        form.label("The number of times the altruist can revive players. Effectively 1 if reviving kills the altruist. -1 is infinite uses");
        
        let resDelay = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_delay");
        form.slider("Revive Delay", 0, 20, { defaultValue: resDelay }); // 8
        form.label("The number of seconds before a revived player will actually respawn.");

        let timeUntilBlocked = ScoreboardManager.getTrackedObjective("role_settings.altruist.time_until_blocked");
        form.slider("Time Until Perma-Death", 30, 300, { defaultValue: timeUntilBlocked, valueStep: 5 }); // 10
        form.label("After a player has been dead for this number of seconds, the altruist can no longer revive them.");
        
        let canResKillers = ScoreboardManager.getTrackedObjective("role_settings.altruist.can_revive_killers") != 0;
        form.toggle("Can Revive Killing Roles", { defaultValue: canResKillers }); // 12
        form.label("If false, the game will prevent the altruist from revive a murderer or neutral killer.");
        
        let usesGhostBodies = ScoreboardManager.getTrackedObjective("role_settings.altruist.revives_ghost_bodies") != 0;
        form.toggle("Uses Ghost Bodies", { defaultValue: usesGhostBodies }); // 14
        form.label("If true, the altruist will need to interact with a ghost body to revive the respective player. If false, they get a menu to pick a dead player. If ghost bodies are disabled, this will be considered false.");
        
        let resAtDeathLocation = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_at_death_location") != 0;
        form.toggle("Revive At Death Location", { defaultValue: resAtDeathLocation }); // 16
        form.label("If true, will revive the player at their ghost's location. If altruist doesn't use ghost bodies or this is false, players will be respawned at the normal respawn location.");
        
        let reviveKills = ScoreboardManager.getTrackedObjective("role_settings.altruist.reviving_kills_altruist") != 0;
        form.toggle("Kill Altruist on Revive", { defaultValue: reviveKills }); // 18
        form.label("If true, the altruist will be killed upon reviving a player. If false, the altruist will be set to 1 Health.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.altruist.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.altruist.initial_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.revive_count", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.revive_delay", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.time_until_blocked", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.can_revive_killers", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.revives_ghost_bodies", r.formValues[14] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.revive_at_death_location", r.formValues[16] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.altruist.reviving_kills_altruist", r.formValues[18] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} the full description of this role and its settings.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.altruist.initial_cooldown");
        let reviveCount = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_count");
        let resDelay = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_delay");
        let canResKillers = ScoreboardManager.getTrackedObjective("role_settings.altruist.can_revive_killers") != 0;
        let usesGhostBodies = ScoreboardManager.getTrackedObjective("role_settings.altruist.revives_ghost_bodies") != 0;
        let resAtDeathLocation = ScoreboardManager.getTrackedObjective("role_settings.altruist.revive_at_death_location") != 0;
        let reviveKills = ScoreboardManager.getTrackedObjective("role_settings.altruist.reviving_kills_altruist") != 0;

        let description = "An innocent that can revive other players.";
        description += "\n\nRevive Cooldown: " + cooldownTime + " seconds.";
        description += "\nRevive Uses: " + reviveCount + "";
        description += "\nRevive Delay: " + resDelay + " seconds.";
        description += "\nCan Revive Killing Roles: " + canResKillers;
        description += "\nRevives Using Ghost Bodies: " + usesGhostBodies;
        description += "\nIf Ghosts, Revives at Ghost Location: " + resAtDeathLocation;
        description += "\nRevive Kills Altruist: " + reviveKills;
        return description;
    }
}
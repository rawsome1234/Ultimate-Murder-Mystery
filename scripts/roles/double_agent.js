"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { RoleAssignment } from "../role_assignment";
import { PlayerHandler } from "../player_handler";

export class DoubleAgentRole extends Role {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!RoleAssignment.afterRolesAssigned.isConnected(this.setDoubleAgentAlignment)) {
            RoleAssignment.afterRolesAssigned.subscribe(this.setDoubleAgentAlignment);
        }
        super.initialize();
    }

    setDoubleAgentAlignment() {
        let players = world.getAllPlayers();
        let doubleAgents = PlayerHandler.sortPlayersWithRole(players, RoleTypes.DOUBLE_AGENT);
        let evilChance = ScoreboardManager.getTrackedObjective("role_settings.double_agent.murderer_aligned_chance");
        let murdererPlayers = PlayerHandler.sortPlayersWithAlignment(players, [RoleAlignment.MURDERER]); 
        let innocentPlayers = PlayerHandler.sortPlayersWithAlignment(players, [RoleAlignment.INNOCENT]); 
        let innoRoleCount = ScoreboardManager.getTrackedObjective("role_settings.double_agent.innocent_role_count");
        let murdererRoleCount = ScoreboardManager.getTrackedObjective("role_settings.double_agent.murderer_role_count");
        
        doubleAgents.forEach((agent) => {
            let rolledChange = ScoreboardManager.rollRandomNumber(0, 100);
            let alignment = RoleAlignment.INNOCENT;
            let alignmentValue = 1;
            let playersToNotif = innocentPlayers;
            let roleCountToGive = innoRoleCount;
            if (rolledChange < evilChance) {
                alignment = RoleAlignment.MURDERER;
                alignmentValue = -1;
                playersToNotif = murdererPlayers;
                roleCountToGive = murdererRoleCount;
                if (MurdererRole.murdererChatEnabled()) {
                    ScoreboardManager.setScoreboardObjective(agent, "player.has_murderer_channel_access", 1);
                }
            }

            ScoreboardManager.setScoreboardObjective(agent, "player.set_alignment", alignmentValue);
            agent.sendMessage("§eYou have been assigned to the §r" + alignment.description + "§es.");

            let roleRevealedPlayers = [];

            for (let i = 0; i < roleCountToGive && playersToNotif.length > 0; i++) {
                let randomIndex = ScoreboardManager.rollRandomNumber(0, playersToNotif.length);
                roleRevealedPlayers.push(playersToNotif[randomIndex]);
                playersToNotif.splice(randomIndex, 1);
            }

            let message = "§eYou know the following roles:";
            roleRevealedPlayers.forEach((pl) => {
                let playerRole = RoleManager.getPlayerRole(pl);
                message += "\n§f" + pl.name + ": " + playerRole.getDisplayName();
            });

            if (roleRevealedPlayers.length > 0) {
                agent.sendMessage(message);
            }
            else {
                agent.sendMessage("§e§oIt seems there are no other known members of your team...");
            }

        });
        
    }
    
    /**
     * Whether the murderer chat is enabled for this murderer role.
     */
    hasMurdererChatAccess() {
        return true;
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        ScoreboardManager.setScoreboardObjective(player, "player.set_alignment", 0);
        super.giveToPlayer(player);
        // let actionUses = ScoreboardManager.getTrackedObjective("role_settings.detective.action_uses");
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        // ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        if (player == null) {
            return RoleAlignment.NEUTRAL_KILLER;
        }
        let setAlignment = ScoreboardManager.getScoreboardObjective(player, "player.set_alignment");
        switch (setAlignment) {
            case -1:
                return RoleAlignment.MURDERER;
            case 1:
                return RoleAlignment.INNOCENT;
            default:
                return RoleAlignment.NEUTRAL_KILLER;
        }
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§eDouble Agent";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Fight for a side that you've been assigned to!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You've been randomly assigned to be on the murderer or the innocent team. Act in that role and win with your team.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.double_agent.enabled") != 0;
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
        return false;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.DOUBLE_AGENT;
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
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
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
        form.title("Double Agent Settings");

        form.divider();
        form.label("The double agent is a role whose alignment is set at the start of the game. When the game begins, the double agent will be assigned to either the murderers or innocents team, and will be told a configurable number of roles on that team. It is considered a neutral killer for the purposes of assignment.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.double_agent.enabled") != 0;
        form.toggle("Double Agent Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let alignChance = ScoreboardManager.getTrackedObjective("role_settings.double_agent.murderer_aligned_chance");
        form.slider("Evil Aligned Chance", 0, 100, { defaultValue: alignChance })
        form.label("The chance for the double agent to be a murderer. Thus the chance to be innocent would be 100-<chance>.");
        
        let innoRoleCount = ScoreboardManager.getTrackedObjective("role_settings.double_agent.innocent_role_count");
        form.slider("Max Innocent Role Information Count", 0, 5, { defaultValue: innoRoleCount }); // 6
        form.label("The max number of roles the double agent will be informed of if they are innocent.");
        
        let murdererRoleCount = ScoreboardManager.getTrackedObjective("role_settings.double_agent.murderer_role_count");
        form.slider("Max Murderer Role Information Count", 0, 5, { defaultValue: murdererRoleCount }); // 6
        form.label("The max number of roles the double agent will be informed of if they are murderer.");
        
        let chatAccess = ScoreboardManager.getTrackedObjective("role_settings.double_agent.gets_murderer_chat_access") != 0;
        form.toggle("Has Murderer Chat Access", { defaultValue: chatAccess }); // 6
        form.label("Whether the double agent gets access to the murderer chat when murderer aligned.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.double_agent.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.double_agent.murderer_aligned_chance", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.double_agent.innocent_role_count", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.double_agent.murderer_role_count", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.double_agent.gets_murderer_chat_access", r.formValues[10] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let alignChance = ScoreboardManager.getTrackedObjective("role_settings.double_agent.murderer_aligned_chance");
        let innoRoleCount = ScoreboardManager.getTrackedObjective("role_settings.double_agent.innocent_role_count");
        let murdererRoleCount = ScoreboardManager.getTrackedObjective("role_settings.double_agent.murderer_role_count");
        let chatAccess = ScoreboardManager.getTrackedObjective("role_settings.double_agent.gets_murderer_chat_access") != 0;
        
        let description = "The double agent is a role that changes its alignment every game and is informed of some of the roles on their team.";
        description += "\n\nEvil Chance: " + alignChance + "%";
        description += "\nInnocent Role Info Count: " + innoRoleCount;
        description += "\nMurderer Role Info Count: " + murdererRoleCount;
        description += "\nHas Murderer Chat Access: " + chatAccess;
        return description;
    }
}
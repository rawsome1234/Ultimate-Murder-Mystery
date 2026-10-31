"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleAssignment } from "../role_assignment";
import { PlayerHandler } from "../player_handler";
import { Util } from "../util";
// import { Signal } from "../signal";

export class MurdererRole extends Role {
    initialize() {
        if (!RoleAssignment.afterRolesAssigned.isConnected(MurdererRole.addPlayersToMurdererChat)) {
            RoleAssignment.afterRolesAssigned.subscribe(MurdererRole.addPlayersToMurdererChat);
        }
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let guesses = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_count");
        ScoreboardManager.setScoreboardObjective(player, "player.guesses", guesses);
        player.startItemCooldown("guessing_action", ScoreboardManager.getTrackedObjective("settings.role_guessing.guess_cooldown") * 10);
        ScoreboardManager.setScoreboardObjective(player, "player.has_murderer_channel_access", 1);
        super.giveToPlayer(player);
    }

    static addPlayersToMurdererChat() {
        let allPlayers = world.getAllPlayers();
        let murderers = PlayerHandler.sortPlayersWithAlignment(allPlayers, [RoleAlignment.MURDERER]);
        let tricksters = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TRICKSTER);
        if (MurdererRole.murdererChatEnabled()) {
            murderers.forEach((mur) => {
                // let playerRole = RoleManager.getPlayerRole(mur);
                ScoreboardManager.setScoreboardObjective(mur, "player.has_murderer_channel_access", 1);
            });
        }
        if (murderers.length == 1) {
            murderers.forEach((pl) => pl.sendMessage("§cYou are the only murderer."));
            return;
        }
        let playersInList = murderers.concat(tricksters);
        Util.shuffle(playersInList);
        let murdererPlayersList = Util.formatStringList(playersInList.map((pl) => pl.name), ", ", true);
        let message = "§cYour fellow murderers are " + murdererPlayersList;
        murderers.forEach((pl) => pl.sendMessage(message));
    }

    static getMurderers() {
        return PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), [RoleAlignment.MURDERER]);
    }

    /**
     * Whether the murderer chat is enabled for this murderer role.
     */
    hasMurdererChatAccess() {
        return true;
    }

    static murdererChatEnabled() {
        let isBlockedFlag = ScoreboardManager.getTrackedObjective("role_settings.trickster.enabled") != 0;
        return ScoreboardManager.getTrackedObjective("role_settings.murderer.murderer_chat") != 0 && !isBlockedFlag;
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.MURDERER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§cMurderer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Kill everyone else until you're the last team remaining!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Kill every innocent and neutral killer in order to win!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        // basic role so it's forced
        return false;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    // /**
    //  * Returns an array of alignments this role can guess.
    //  * 
    //  * @returns {RoleAlignment[]}
    //  */
    // getGuessAlignments() {
    //     return [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT];
    // }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        let guessable = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_type");
        let values = [];
        values.push(RoleAlignment.INNOCENT);
        if (guessable > 0) {
            values.push(RoleAlignment.NEUTRAL_INDEPENDENT);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("NI is a guessable alignment"));
        }
        if (guessable > 1) {
            values.push(RoleAlignment.NEUTRAL_KILLER);
        }
        return values;
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
        return RoleTypes.MURDERER;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
        player.sendMessage("§4Murderers have no special abilities.");
        return;
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return super.meetsWinCondition(player, winningAlignment);
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();

        form.title("Murderer Settings");

        form.divider();

        let chatEnabled = ScoreboardManager.getTrackedObjective("role_settings.murderer.murderer_chat") != 0;
        form.toggle("Murderer Chat Enabled", { defaultValue: chatEnabled }); // 1
        form.label("Whether a private chat (accessed with !murderer) is enabled for use by the murderers or not.");
        
        let settings = ["Innocents", "Neutral Independents & Innocents", "Non-Murderers"];
        let guessSettings = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_type");
        form.dropdown("Murderer Guessing Alignments", settings, {defaultValueIndex: guessSettings}); // 3
        form.label("The alignments that the murderers can guess. By default is just innocents.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.murderer.murderer_chat", r.formValues[1] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("settings.role_guessing.murderer_guess_type", r.formValues[3]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let chatEnabled = ScoreboardManager.getTrackedObjective("role_settings.murderer.murderer_chat") != 0;
        let description = "The murderer needs to kill all the innocents and neutral killers in order to win.";
        
        description += "\n\nThis being enabled means that it's possible for a player's role to be Murderer.";
        description += "\nMurderer Chat Enabled: " + chatEnabled;
        return description;
    }
}
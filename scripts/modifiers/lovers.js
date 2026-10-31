"use strict";

import { world, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { ModifierManager } from "../modifier_manager";
import { PlayerHandler } from "../player_handler";
import { RoleManager } from "../role_manager";
import { ModifierAssignment } from "../modifier_assignment";
import { WinConditionManager } from "../win_con_handler";
import { ChatManager } from "../chat_manager";

export class LoversModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(LoversModifier.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(LoversModifier.onPlayerDeath);
        }
        super.initialize();
    }

    static onPlayerDeath(playerWhoDied, killer) {
        let deadModifier = ModifierManager.getPlayerModifier(playerWhoDied);
        if (deadModifier != null && deadModifier.getModifierType() == ModifierTypes.LOVERS) {
            let otherLoverID = ScoreboardManager.getScoreboardObjective(playerWhoDied, "player.lover_id");
            let loverPlayer = ScoreboardManager.getPlayerWithID(otherLoverID);
            if (loverPlayer != null && !loverPlayer.hasTag("dead")) {
                loverPlayer.sendMessage("Your lover died!");
                loverPlayer.applyDamage(30);
            }
        }

        let playersRemaining = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        if (playersRemaining.length <= 3) {
            // lovers win
            let loversPlayers = [];
            let thirdPlayers = [];
            let loverIsMurderer = false;
            let winningAlignmentRole;
            playersRemaining.forEach((pl) => {
                let modifier = ModifierManager.getPlayerModifier(pl);
                if (modifier != null && modifier.getModifierType() == ModifierTypes.LOVERS) {
                    let role = RoleManager.getPlayerRole(pl);
                    if (role.getAlignment() == RoleAlignment.MURDERER) {
                        loverIsMurderer = true;
                    }
                    winningAlignmentRole = role;
                    loversPlayers.push(pl);
                }
                else {
                    thirdPlayers.push(pl);
                }
            });
            if (loversPlayers.length == 2) {
                let winningPlayers = loversPlayers;
                if (thirdPlayers.length > 0) {

                    let thirdRole = RoleManager.getPlayerRole(thirdPlayers[0]);
                    let thirdPlayerMurderer = thirdRole.getAlignment() == RoleAlignment.MURDERER;
                    if (thirdPlayerMurderer && loverIsMurderer) {
                        winningAlignmentRole = thirdRole;
                        winningPlayers.push(thirdPlayers[0]);
                    }
                }
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Requesting a lovers win"));
                WinConditionManager.requestWin(winningPlayers, winningAlignmentRole, "§dIt was a lovers win! ");
            }
        }
    }
    

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // player.sendMessage("Assigning lover");
        let partnerID = ScoreboardManager.getScoreboardObjective(player, "player.lover_id");
        if (partnerID == -1) {
            let remainingPlayersWithoutMods = ModifierManager.getPlayersWithoutModifier(world.getAllPlayers());
            if (remainingPlayersWithoutMods.length == 0) {
                world.sendMessage("ERROR: Lovers being assigned with only 1 player left");
                return;
            }
            let randomPartner = remainingPlayersWithoutMods[ScoreboardManager.rollRandomNumber(0, remainingPlayersWithoutMods.length)];
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Random lovers partner: " + randomPartner.name));
            partnerID = ScoreboardManager.getPlayerID(randomPartner);
            let playerID = ScoreboardManager.getPlayerID(player);
            ScoreboardManager.setScoreboardObjective(player, "player.lover_id", partnerID);
            ScoreboardManager.setScoreboardObjective(randomPartner, "player.lover_id", playerID);
            ModifierAssignment.setPlayerModifier(randomPartner, this);

            let loversChatID = ChatManager.requestChannelID();
            ChatManager.setChannelColor(loversChatID, "d");
            ChatManager.registerPlayerToChat(player, loversChatID);
            ChatManager.registerPlayerToChat(randomPartner, loversChatID);

            player.sendMessage("§dYour lover is " + randomPartner.name);
            randomPartner.sendMessage("§dYour lover is " + player.name);
        }
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.ALL;
    }

    /**
     * Returns the number of players required to be remaining without a modifier for this to be set.
     * @returns {number}
     */
    getPlayersRequired() {
        return 2;
    }

    /**
     * Gets the valid role types this modifier can be applied to.
     * 
     * @returns {RoleTypes[]}
     */
    getWhitelistedRoles() {
        return [];
    }

    /**
     * A list of role types that this modifier cannot apply to.
     * @returns {RoleTypes[]}
     */
    getBlacklistedRoles() {
        return [];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§dLovers";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "You are soulbound to another player.";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "If either of the two lovers dies, the other will get instantly killed as well. If you and your lover are in the last 3 players alive, you will win instead of the normally winning team. If one of the lovers is a murderer and the third party is also a murderer, all 3 players will win.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.lovers.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.LOVERS;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this modifier.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this modifier can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * If has lovers, returns the ID of the player. Otherwise returns -1
     * @param {Player} player 
     */
    static getLoverID(player) {
        let playerMod = ModifierManager.getPlayerModifier(player);
        if (playerMod != null && playerMod.getModifierType() == ModifierTypes.LOVERS) {
            return ScoreboardManager.getScoreboardObjective(player, "player.lover_id");
        }
        return -1;
    }

    /**
     * Returns if this modifier has met its win condition.
     * If this is true, the player will win, even if they did not win by their role.
     * @param {Player} player
     * @param {RoleAlignment} winningAlignment 
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        // let playersRemaining = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        // let loversWin = playersRemaining.length <= 3;
        // let otherLoverID = ScoreboardManager.getScoreboardObjective(player, "player.lover_id");
        // let loverPlayer = ScoreboardManager.getPlayerWithID(otherLoverID);
        // let loverRole = RoleManager.getPlayerRole(loverPlayer);
        // let loverAlignment = loverRole.getAlignment();
        // let loverAlignmentWins = loverAlignment == winningAlignment || (winningAlignment != RoleAlignment.NEUTRAL_KILLER && !loverPlayer.hasTag("dead"));
        return false;
    }

    /**
     * Creates the config for this modifier and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
            let form = new ModalFormData();
            form.title("Lover Settings");
    
            form.divider();
            form.label("Lovers is a modifier that two players receive. They become soulbound, meaning if one dies the other dies. However, if one lover wins, so does the other.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.lovers.enabled") != 0;
            form.toggle("Lovers Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.lovers.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let description = "Lovers is a modifier that two players receive. They become soulbound, meaning if one dies the other dies. However, if one lover wins, so does the other.";
        return description;
    }
}
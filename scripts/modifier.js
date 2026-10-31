"use strict";

import { world, system, Player } from "@minecraft/server";
import { Role, RoleAlignment } from "./role";
import { ScoreboardManager } from "./scoreboard_manager";

export class Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        if (!this.hasAbility(player)) {
            ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", 0);
        }
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
        return 1;
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
     * Returns if this modifier can be applied to the player with the given role.
     * @param {Role} role
     * @returns {boolean} 
     */
    canApplyToRole(role) {
        let roleAlignment = role.getAlignment();
        let roleType = role.getRoleType();

        return (this.getModifierAlignment().alignments.includes(roleAlignment) || this.getWhitelistedRoles().includes(roleType)) && !this.getBlacklistedRoles().includes(roleType);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return false;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    getGuessAlignments() {
        return [];
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    hasAbility(player) {
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
     * Activates the ability of this modifier for the given player. Assumes
     * the player has this modifier.
     */
    activateAbility(player) {
    }

    /**
     * Activates the ability of this modifier for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
    }

    /**
     * Returns if this modifier has met its win condition.
     * If this is true, the player will win, even if they did not win by their role.
     * @param {Player} player
     * @param {RoleAlignment} winningAlignment 
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this modifier and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        return "";
    }
}

export const ModifierAlignment = Object.freeze({
    ALL: { display_name: "General", alignments: [RoleAlignment.INNOCENT, RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_INDEPENDENT, RoleAlignment.NEUTRAL_KILLER] },
    NON_KILLER: { display_name: "Non-Killer", alignments: [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT] },
    KILLERS: { display_name: "Killer", alignments: [RoleAlignment.MURDERER, RoleAlignment.KILLERS] },
    MURDERER: { display_name: "Murderer", alignments: [RoleAlignment.MURDERER] }
});

export const ModifierTypes = Object.freeze({
    LOVERS: { id: 0, name: "lovers"},
    DOUBLE_SHOT: { id: 1, name: "double_shot" },
    SIXTH_SENSE: { id: 2, name: "sixth_sense" },
    CELEBRITY: { id: 3, name: "celebrity" },
    FLASH: { id: 4, name: "flash" },
    TAROT_READER: { id: 5, name: "tarot_reader" },
    SHY: { id: 6, name: "shy" },
    RAID_BOSS: { id: 7, name: "raid_boss" },
    SHOUT: { id: 8, name: "shout" },
    DISEASED: { id: 9, name: "diseased" },
    FROSTY: { id: 10, name: "frosty" },
    ROTTING: { id: 11, name: "rotting" },
    DISPERSER: { id: 12, name: "disperser" },
    TELEPATH: { id: 13, name: "telepath" },
    RADAR: { id: 14, name: "radar" },
    ADDICT: { id: 15, name: "addict" },
    HACKER: { id: 16, name: "hacker" },
    LIFESTEAL: { id: 17, name: "lifesteal" },
    PRICKLY: { id: 18, name: "prickly" },
    COMEBACK: { id: 19, name: "comeback" },
    SNIPER: { id: 20, name: "sniper" },
    REPEL: { id: 21, name: "repel" },
    SENTRY: { id: 22, name: "sentry" },
    GAMBLER: { id: 23, name: "gambler" },
    JAMMER: { id: 24, name: "jammer" },
    AGENT: { id: 25, name: "agent" },
    TRAITOR: { id: 26, name: "traitor" },
    PARTY_ANIMAL: { id: 27, name: "party_animal" },
    LONE_WOLF: { id: 28, name: "lone_wolf" },
    UNDERDOG: { id: 29, name: "underdog" },
    NURSE: { id: 30, name: "nurse" },
    FINALIST: { id: 31, name: "finalist" },
});
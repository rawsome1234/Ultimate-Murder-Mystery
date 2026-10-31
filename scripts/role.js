"use strict";

import { world, system, Player } from "@minecraft/server";

export class Role {
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
        return "";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return false;
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
     * Whether the player can see particles of the specified type.
     * @param {Player} player 
     * @param {ParticleVisibilityType} particleType 
     */
    canSeeParticles(player, particleType) {
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
        return RoleTypes.INNOCENT;
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
    }

    /**
     * Gets the role information for this role.
     * @returns {String} the full description of this role and its settings.
     */
    getRoleInformation() {
        return "";
    }
}

export const RoleAlignment = Object.freeze({
    INNOCENT: {description: "innocent", color_code:"a", display_name: "Innocent", is_killer: false },
    MURDERER: {description: "murderer", color_code:"c", display_name: "Murderer", is_killer: true},
    NEUTRAL_INDEPENDENT: {description: "neutral_independent", color_code:"s", display_name: "Neutral Independent", is_killer: false},
    NEUTRAL_KILLER: {description: "neutral_killer", color_code:"7", display_name: "Neutral Killer", is_killer: true},
    NEUTRAL: {description: "neutral"}
});

export const RoleTypes = Object.freeze({
    INNOCENT: { id: 0, name: "innocent"},
    MURDERER: { id: 1, name: "murderer" },
    SOUL: { id: 2, name: "soul" },
    ALTRUIST: { id: 3, name: "altruist" },
    TRICKSTER: { id: 4, name: "trickster" },
    DETECTIVE: { id: 5, name: "detective" },
    JESTER: { id: 6, name: "jester" },
    WARDEN: { id: 7, name: "warden" },
    ASSASSIN: { id: 8, name: "assassin" },
    BODYGUARD: { id: 9, name: "bodyguard" },
    NECROMANCER: { id: 10, name: "necromancer" },
    VAMPIRE: { id: 11, name: "vampire" },
    HEX: { id: 12, name: "hex" },
    DOUBLE_AGENT: { id: 13, name: "double_agent" },
    SHERIFF: { id: 14, name: "sheriff" },
    VIGILANTE: { id: 15, name: "vigilante" },
    AMNESIAC: { id: 16, name: "amnesiac" },
    TRAPPER: { id: 17, name: "trapper" },
    REVEALER: { id: 18, name: "revealer" },
    TRACKER: { id: 19, name: "tracker" },
    TRANSPORTER: { id: 20, name: "transporter" },
    INVESTIGATOR: { id: 21, name: "investigator" },
    SURVIVOR: { id: 22, name: "survivor" },
    ESCAPIST: { id: 23, name: "escapist" },
    SWOOPER: { id: 24, name: "swooper" },
    JANITOR: { id: 25, name: "janitor" },
    APOTHOCARY: { id: 26, name: "apothocary" },
    TEMPEST: { id: 27, name: "tempest" },
    TECHNICIAN: { id: 28, name: "technician" },
    MEDIC: { id: 29, name: "medic" },
    MYSTIC: { id: 30, name: "mystic" },
    CLERIC: { id: 31, name: "cleric" },
    BOMBER: { id: 32, name: "bomber" },
    WARLOCK: { id: 33, name: "warlock" },
    SPY: { id: 34, name: "spy" },
    SERIAL_KILLER: { id: 35, name: "serial_killer" },
    GLITCH: { id: 36, name: "glitch" },
    JAILOR: { id: 37, name: "jailor" },
    GHOST: { id: 38, name: "ghost" },
    CRYOMANCER: { id: 39, name: "cryomancer" },
    GHOST_WRITER: {id: 40, name: "ghost_writer" },
    MEDIUM: {id: 41, name: "medium" },
    WITCH: {id: 42, name: "witch" },
    OFFICER: {id: 43, name: "officer" },
    MORTICIAN: {id: 44, name: "mortician" },
    SHADOWMANCER: {id: 45, name: "shadowmancer" },
    ARTEMIS: {id: 46, name: "artemis" },
    STALKER: {id: 47, name: "stalker" },
    PLAGUE_BEARER: {id: 48, name: "plague_bearer" },
    DOPPELGANGER: {id: 49, name: "doppelganger" },
    GRAVEWALKER: {id: 50, name: "gravewalker" },
    VETERAN: {id: 51, name: "veteran" },
    TYCOON: {id: 52, name: "tycoon" },
    CUSTOM_ROLE: {id: 53, name: "custom_role" },
});
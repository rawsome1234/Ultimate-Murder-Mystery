"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { RoleManager } from "../role_manager";
import { SettingsHandler } from "../settings_handler";

export class VigilanteRole extends Role {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!GuessingManager.onGuessSubmit.isConnected(this.onGuess)) {
            GuessingManager.onGuessSubmit.subscribe(this.onGuess);
        }
        super.initialize();
    }

    /**
     * @param {Player} playerWhoGuessed
     */
    onGuess(playerWhoGuessed, playerWhoWasGuessed, guessedRole, wasCorrect) {
        let guesseeRole = RoleManager.getPlayerRole(playerWhoGuessed);
        if (guesseeRole.getRoleType() == RoleTypes.VIGILANTE) {
            let guessCooldown = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_cooldown");
            player.startItemCooldown("guessing_action", guessCooldown * 20);
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player
     */
    giveToPlayer(player) {
        let guesses = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_count");
        ScoreboardManager.setScoreboardObjective(player, "player.guesses", guesses);
        let guessCooldown = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_cooldown");
        player.startItemCooldown("guessing_action", guessCooldown * 20);
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
        return "§pVigilante";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Use the murderer's role guessing ability against them and guess the killers!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can guess murderer and neutral killer roles!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.vigilante.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0;
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
        return [RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER];
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
        return RoleTypes.VIGILANTE;
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
        let form = new ModalFormData();
        form.title("Vigilante Settings");

        form.divider();
        form.label("The vigilante is able to guess murderer and neutral killing role using Role Guessing.\nRequires Role Guessing (on)");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.vigilante.enabled") != 0;
        form.toggle("Vigilante Enabled", { defaultValue: roleEnabled }); // 2

        // 3
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_cooldown");
        form.slider("Guess Cooldown", 0, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The cooldown between guesses for the vigilante.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_count");
        form.slider("Guess Uses", -1, 10, { defaultValue: abilityUses }); // 5
        form.label("The number of times the vigilante can guess. A failed guess will result in the vigilante dying, if enabled in Role Guessing settings. -1 is infinite uses");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.vigilante.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.vigilante.guess_cooldown", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("role_settings.vigilante.guess_count", r.formValues[5]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.vigilante.guess_count");
        
        let description = "An innocent who is able to guess murderer and neutral killer roles.";
        description += "\n\nGuess Cooldown: " + cooldownTime + " seconds.";
        description += "\nGuess Count: " + abilityUses;
        return description;
    }
}
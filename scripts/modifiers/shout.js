"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { ModifierManager } from "../modifier_manager";
import { PlayerHandler } from "../player_handler";

export class ShoutModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(ShoutModifier.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(ShoutModifier.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player?} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let diedMod = ModifierManager.getPlayerModifier(playerWhoDied);
        if (diedMod != null && diedMod.getModifierType() == ModifierTypes.SHOUT) {
            let lineDelayTime = ScoreboardManager.getTrackedObjective("modifier_settings.shout.line_delay");
            let deathLocation = playerWhoDied.location;
            system.runTimeout(() => {
                if (!ScoreboardManager.isGameRunning()) {
                    return;
                }
                
                let allPlayers = world.getAllPlayers();
                let allLivingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
                let lineColor = { red: (77/255), blue: (230/255), green: (155/255), alpha: 1 };
                allPlayers.forEach((seer) => {
                    // seer.sendMessage("Activating shout");
                    allLivingPlayers.forEach((sourceLocation) => {
                        PlayerHandler.spawnParticlesBetweenPoints(seer, deathLocation, sourceLocation.location, lineColor, 5);
                    });
                    seer.playSound("note.enderdragon", {location: seer.location, volume: .5});
                });
            }, lineDelayTime * 20);
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.NON_KILLER;
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
        return "§3Shout";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "When you die, a line will be drawn to your death location!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let lineDelayTime = ScoreboardManager.getTrackedObjective("modifier_settings.shout.line_delay");
        return lineDelayTime + " seconds after dying, a line will be drawn from your death location to all other players that everyone can see.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.shout.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
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
        return ModifierTypes.SHOUT;
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
        let form = new ModalFormData();
        form.title("Shout Settings");

        form.divider();
        form.label("Shout is a non-killer modifier that will draw a line from every player to this player's death location after dying.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.shout.enabled") != 0;
        form.toggle("Shout Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let lineDelayTime = ScoreboardManager.getTrackedObjective("modifier_settings.shout.line_delay");
        form.slider("Effect Delay", 0, 20, { defaultValue: lineDelayTime })
        form.label("The amount of time in seconds after the player dies before lines are drawn.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.shout.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.shout.line_delay", r.formValues[4]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let lineDelayTime = ScoreboardManager.getTrackedObjective("modifier_settings.shout.line_delay");

        let description = "Shout is a non-killer modifier that draws a line from all players to this player when this player dies.";
        description += "\n\nLine Delay: " + lineDelayTime + " seconds.";
        return description;
    }
}
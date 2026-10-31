"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { PlayerHandler } from "../player_handler";

export class RadarModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        let currentTick = 0;
        system.runInterval(() => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            let updateFrequency = ScoreboardManager.getTrackedObjective("modifier_settings.radar.update_frequency");
            let changeColors = ScoreboardManager.getTrackedObjective("modifier_settings.radar.changes_colors") != 0;
            let shrinksWhenClose = ScoreboardManager.getTrackedObjective("modifier_settings.radar.shrinks_very_close") != 0;
            
            let hideLineIfClose = ScoreboardManager.getTrackedObjective("modifier_settings.radar.hide_if_close") != 0;
            let alphaStartDistance = ScoreboardManager.getTrackedObjective("modifier_settings.radar.line_alpha_start_distance");
            let alphaRequiresLineOfSight = ScoreboardManager.getTrackedObjective("modifier_settings.radar.alpha_requires_line_of_sight") != 0;

            if (currentTick == 0) {
                // draw line again
                let allPlayers = world.getAllPlayers();
                let radarPlayeres = PlayerHandler.sortPlayersWithModifier(allPlayers, ModifierTypes.RADAR);
                let livingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
                let hideAndSeekOn = ScoreboardManager.getTrackedObjective("role_settings.tempest.hide_and_seek") == 1;
                if (hideAndSeekOn) {
                    livingPlayers = livingPlayers.filter((p) => !p.hasTag("hiderFound"));
                }
                
                radarPlayeres.forEach((radarPlayer) => {
                    let targetPlayer = RadarModifier.getClosestPlayer(livingPlayers, radarPlayer);

                    if (targetPlayer == null) {
                        // radarPlayer.sendMessage("No player found");
                        return;
                    }
                    let hasLineOfSight = PlayerHandler.hasLineOfSight(radarPlayer, targetPlayer.location, 10);

                    let alpha = 1;
                    let distance = PlayerHandler.distanceBetweenLocations(targetPlayer.location, radarPlayer.location);
                    if (alphaStartDistance > 0 && (!alphaRequiresLineOfSight || hasLineOfSight)) {
                        alpha = Math.min(1, distance / alphaStartDistance);
                    }

                    let color = { red: 0, blue: 0, green: 1, alpha: alpha };

                    if (distance <= 5 && hideLineIfClose && hasLineOfSight) {
                        return;
                    }

                    if (changeColors) {
                        if (distance < 12) {
                            color = { red: 0, blue: 0, green: 1, alpha: 1 }; // green
                        }
                        else if (distance < 25) {
                            color = { red: 1, blue: 0, green: .86, alpha: 1 }; // yellow
                        }
                        else {
                            color = { red: 1, blue: 0, green: 0, alpha: 1 }; // red
                        }
                    }
                    PlayerHandler.spawnParticlesBetweenPoints(radarPlayer, radarPlayer.location, targetPlayer.location, color, updateFrequency / 20);
                });
            }

            currentTick = (currentTick + 1) % updateFrequency
        }, 1);
        super.initialize();
    }

    /**
     * 
     * @param {Player[]} playersToTest 
     * @param {Player} origin 
     * @returns {Player}
     */
    static getClosestPlayer(playersToTest, origin) {
        let closestPlayer = null;
        let distance = 0;
        playersToTest.forEach((pl) => {
            let distanceToOrigin = PlayerHandler.distanceBetweenLocations(pl.location, origin.location);
            if (pl.id != origin.id && (distanceToOrigin < distance || closestPlayer == null)) {
                closestPlayer = pl;
                distance = distanceToOrigin;
            }
        });
        return closestPlayer;
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
        return ModifierAlignment.ALL;
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
        return [RoleTypes.TYCOON];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§qRadar";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "A line is drawn between you and the closest player!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let changeColors = ScoreboardManager.getTrackedObjective("modifier_settings.radar.changes_colors") != 0;
        let chanceColorsText = changeColors ? " The color of the line will change based on their distance." : "";
        return "You have a line drawn between you and the closest player at all times." + chanceColorsText;
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.radar.enabled") != 0;
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
        return ModifierTypes.RADAR;
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
            form.title("Radar Settings");
    
            form.divider();
            form.label("Radar is a modifier that draws a line from the player to the nearest player.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.radar.enabled") != 0;
            form.toggle("Radar Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            // 4
            let updateFrequency = ScoreboardManager.getTrackedObjective("modifier_settings.radar.update_frequency");
            form.slider("Update Frequency", 1, 20, { valueStep: 1, defaultValue: updateFrequency })
            form.label("The number of ticks for the line to update.");
            
            let changeColors = ScoreboardManager.getTrackedObjective("modifier_settings.radar.changes_colors") != 0;
            form.toggle("Line Changes Colors", { defaultValue: changeColors })
            form.label("If true, the line will change colors based on the distance of the nearest player.");
            
            let hideLineIfClose = ScoreboardManager.getTrackedObjective("modifier_settings.radar.hide_if_close") != 0;
            form.toggle("Hide Line If Close", { defaultValue: hideLineIfClose })
            form.label("If true, the line will hide within 5 blocks of the target, if there's line of sight.");
        
            let alphaStartDistance = ScoreboardManager.getTrackedObjective("modifier_settings.radar.line_alpha_start_distance");
            form.slider("Alpha Distance", 0, 30, { defaultValue: alphaStartDistance }); // 6
            form.label("The distance the line will start becoming transparent. Gets more transparent the closer to the nearest player you are.");

            let alphaRequiresLineOfSight = ScoreboardManager.getTrackedObjective("modifier_settings.radar.alpha_requires_line_of_sight") != 0;
            form.toggle("Alpha Requires Line of Sight", { defaultValue: alphaRequiresLineOfSight }); // 8
            form.label("If true, the line will only become transparent if the player has line of sight to the nearest player.");
            
            // let shrinksWhenClose = ScoreboardManager.getTrackedObjective("modifier_settings.radar.shrinks_very_close") != 0;
            // form.toggle("Line Shrinks When Close", { defaultValue: shrinksWhenClose })
            // form.label("If true, the line will be smaller when the nearest player is extremely close.");

            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.radar.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
                ScoreboardManager.setTrackedObjective("modifier_settings.radar.update_frequency", r.formValues[4]);
                ScoreboardManager.setTrackedObjective("modifier_settings.radar.changes_colors", r.formValues[6] ? 1 : 0);
                ScoreboardManager.setTrackedObjective("modifier_settings.radar.hide_if_close", r.formValues[8] ? 1 : 0);
                ScoreboardManager.setTrackedObjective("modifier_settings.radar.line_alpha_start_distance", r.formValues[10]);
                ScoreboardManager.setTrackedObjective("modifier_settings.radar.alpha_requires_line_of_sight", r.formValues[12] ? 1 : 0);
                // ScoreboardManager.setTrackedObjective("modifier_settings.radar.shrinks_very_close", r.formValues[8] ? 1 : 0);
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let updateFrequency = ScoreboardManager.getTrackedObjective("modifier_settings.radar.update_frequency");
        let changeColors = ScoreboardManager.getTrackedObjective("modifier_settings.radar.changes_colors") != 0;
        let hideLineIfClose = ScoreboardManager.getTrackedObjective("modifier_settings.radar.hide_if_close") != 0;
        // let shrinksWhenClose = ScoreboardManager.getTrackedObjective("modifier_settings.radar.shrinks_very_close") != 0;

        let description = "Radar is a modifier that draws a line between the player and the nearest player";
        description += "\n\nUpdate Frequency: " + updateFrequency + " ticks.";
        description += "\nLine Changes Colors: " + changeColors;
        description += "\nHide Line When Close: " + hideLineIfClose;
        // description += "\nLine Shrinks When Close: " + shrinksWhenClose;
        return description;
    }
}
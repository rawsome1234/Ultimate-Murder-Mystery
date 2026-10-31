"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { ModifierManager } from "../modifier_manager";
import { PlayerHandler } from "../player_handler";

export class ShyModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(ShyModifier.onTick, 1);
        super.initialize();
    }

    static onTick() {
        let minShyTime = ScoreboardManager.getTrackedObjective("modifier_settings.shy.shy_time");
        let detectY = ScoreboardManager.getTrackedObjective("modifier_settings.shy.detect_y_velocity") != 0;
        let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.shy.show_particles") != 0;
        world.getAllPlayers().forEach((pl) => {
            if (ScoreboardManager.getPlayerID(pl) >= 0 && !pl.hasTag("dead")) {
                let playerMod = ModifierManager.getPlayerModifier(pl);
                if (playerMod != null && playerMod.getModifierType() == ModifierTypes.SHY) {
                    // ticks
                    let playerVelocity = pl.getVelocity();
                    if (!detectY) {
                        playerVelocity.y = 0;
                    }
                    let velocityMag = PlayerHandler._magnitude(playerVelocity);

                    if (velocityMag < .02) {
                        // pl.sendMessage("Shy counting");
                        ScoreboardManager.addScoreboardObjective(pl, "modifier_settings.shy.shy_time", 1);
                    }
                    else {
                        // pl.sendMessage("Moving too fast - speed of " + velocityMag);
                        ScoreboardManager.setScoreboardObjective(pl, "modifier_settings.shy.shy_time", 0);
                        let effect = pl.getEffect("minecraft:invisibility");
                        if (effect) {
                            if (effect.duration <= 5) {
                                pl.removeEffect(effect.typeId);
                            }
                        }
                        return;
                    }

                    let shyTime = ScoreboardManager.getScoreboardObjective(pl, "modifier_settings.shy.shy_time");
                    if (shyTime >= minShyTime * 20) {
                        if (shyTime == minShyTime * 20) {
                            pl.sendMessage("Shy has made you invisible...");
                        }
                        pl.addEffect("minecraft:invisibility", 5, {showParticles: showParticles});
                    }

                }
            }
        });

    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        ScoreboardManager.setScoreboardObjective(player, "modifier_settings.shy.shy_time", 0);
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
        return [];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§hShy";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        let minShyTime = ScoreboardManager.getTrackedObjective("modifier_settings.shy.shy_time");
        return "After " + minShyTime + " seconds you will turn invisible!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let detectY = ScoreboardManager.getTrackedObjective("modifier_settings.shy.detect_y_velocity") != 0;
        let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.shy.show_particles") != 0;
        let minShyTime = ScoreboardManager.getTrackedObjective("modifier_settings.shy.shy_time");
        let particlesVisibleText = showParticles ? "visible" : "hidden";
        let detectYText = detectY ? "" : "not ";
        return "After " + minShyTime + " seconds you will turn invisible, with particles " + particlesVisibleText + ". While you are still, you will remain invisible. Jumping will " + detectYText + "cancel the invisibility.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.shy.enabled") != 0;
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
        return ModifierTypes.SHY;
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
        return false;
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
            form.title("Shy Settings");
    
            form.divider();
            form.label("Shy is a modifier that lets a player turn invisible after standing still for a time.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.shy.enabled") != 0;
            form.toggle("Shy Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            // 4
            let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.shy.shy_time");
            form.slider("Time Standing Still", 0, 10, { defaultValue: cooldownTime })
            form.label("The amount of time a player must stand still for shy to activate.");
            
            let detectY = ScoreboardManager.getTrackedObjective("modifier_settings.shy.detect_y_velocity") != 0;
            form.toggle("Detect Y Velocity", { defaultValue: detectY }); // 6
            form.label("Whether or not shy will count jumping/falling as moving. If true, jumping while invisible will cancel shy.");
            
            let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.shy.show_particles") != 0;
            form.toggle("Show Invis Particles", { defaultValue: showParticles }); // 6
            form.label("Whether or not shy will show particle effects. Gets overriden if something applies a stronger invisibility.");

            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.shy.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
                ScoreboardManager.setTrackedObjective("modifier_settings.shy.shy_time", r.formValues[4]);
                ScoreboardManager.setTrackedObjective("modifier_settings.shy.detect_y_velocity", r.formValues[6] ? 1 : 0);
                ScoreboardManager.setTrackedObjective("modifier_settings.shy.show_particles", r.formValues[8] ? 1 : 0);
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.shy.shy_time");
        let detectY = ScoreboardManager.getTrackedObjective("modifier_settings.shy.detect_y_velocity") != 0;
        let showParticles = ScoreboardManager.getTrackedObjective("modifier_settings.shy.show_particles") != 0;
        let description = "Shy is a modifier that lets a player turn invisible after standing still for a time.";
        description += "\n\nTime to Turn Invisible: " + cooldownTime + " seconds.";
        description += "\nShy Detects Height Changes: " + detectY;
        description += "\nShy has Particles: " + showParticles;
        return description;
    }
}
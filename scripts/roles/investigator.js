"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { PlayerHandler } from "../player_handler";

export class InvestigatorRole extends InnocentRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(InvestigatorRole.drawFootsteps, 5);
        super.initialize();
    }

    static drawFootsteps() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let investigators = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.INVESTIGATOR);
        let lifetime = ScoreboardManager.getTrackedObjective("role_settings.investigator.footprint_lifetime");
        let sizeMult = ScoreboardManager.getTrackedObjective("role_settings.investigator.footprint_size") / 100;
        allPlayers.forEach((drawing) => {
            let id = ScoreboardManager.getPlayerID(drawing);
            if (drawing.hasTag("dead") || drawing.hasTag("AFK") || id < 0) {
                return;
            }
            let drawLocation = drawing.location;
            let map = new MolangVariableMap();
            map.setColorRGBA('variable.color', InvestigatorRole.getPlayerFootprintColor(drawing));
            map.setFloat('variable.dust_lifetime', lifetime);
            map.setFloat('variable.particle_random', Math.random());
            map.setFloat('variable.size_multiplier', sizeMult);
            // map.setFloat('variable.particle_lifetime', 100);

            investigators.forEach((invest) => {
                invest.spawnParticle("umm:footprints", drawLocation, map);
            });
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
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
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§sInvestigator";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Follow people's footprints and catch people running away!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "People will leave colored footsteps behind. You can use this to track people's movements for longer than a normal player.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.investigator.enabled") != 0;
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
        return RoleTypes.INVESTIGATOR;
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
     * Returns the color of the player based on their id
     * @param {Player} player 
     */
    static getPlayerFootprintColor(player) {
        let id = ScoreboardManager.getPlayerID(player);
        let red = 0;
        let blue = 0;
        let green = 0;
        let alpha = .5;

        switch (id % 15) {
            case 0:
                break;
            case 1:
                red = 1;
                break;
            case 2:
                blue = 1;
                break;
            case 3:
                green = 1;
                break;
            case 4:
                red = 1;
                blue = 1;
                break;
            case 5:
                red = 1;
                green = 1;
                break;
            case 6:
                blue = 1;
                green = 1;
                break;
            case 7:
                red = 1;
                blue = 1;
                green = 1;
                break;
            case 8:
                red = .5;
                break;
            case 9:
                blue = .5;
                break;
            case 10:
                green = .5;
                break;
            case 11:
                red = .2;
                green = .5;
                break;
            case 12:
                red = .5;
                blue = .2;
                break;
            case 13:
                green = 1;
                blue = .5;
                break;
            case 14:
                red = .5;
                green = .5;
                blue = .5;
                break;
        }
        return {red:red,blue:blue,green:green,alpha:alpha};
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
        // let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        // if (chargesRemaining == 0) {
        //     player.sendMessage("Out of ability uses!");
        //     return;
        // }

        // if (chargesRemaining != 0) {
        //     // activate ability 
        //     if (chargesRemaining > 0) {
        //         ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
        //     }

        //     // ability effect

        //     // ability activate message

        //     // sets cooldown
        //     let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        //     ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        // }
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
        form.title("Investigator Settings");

        form.divider();
        form.label("The investigator is an innocent player that is able to see other player's footprints.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.investigator.enabled") != 0;
        form.toggle("Investigator Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let footprintLifetime = ScoreboardManager.getTrackedObjective("role_settings.investigator.footprint_lifetime");
        form.slider("Footprint Lifetime", 1, 5, { defaultValue: footprintLifetime })
        form.label("The number of seconds footprints linger behind a player.");
        
        let footprintSize = ScoreboardManager.getTrackedObjective("role_settings.investigator.footprint_size");
        form.slider("Footprint Size", 0, 300, { valueStep: 10, defaultValue: footprintSize }); // 6
        form.label("A multiplier of the footprint size (10 = 10%).");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.investigator.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.investigator.footprint_lifetime", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.investigator.footprint_size", r.formValues[6]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let footprintLifetime = ScoreboardManager.getTrackedObjective("role_settings.investigator.footprint_lifetime");
        let footprintSize = ScoreboardManager.getTrackedObjective("role_settings.investigator.footprint_size");

        let description = "The investigator is an innocent that can see footprints of other players.";
        description += "\n\nFootprint Lifetime: " + footprintLifetime + " seconds.";
        description += "\nFootprint Size: " + footprintSize + "%";
        return description;
    }
}
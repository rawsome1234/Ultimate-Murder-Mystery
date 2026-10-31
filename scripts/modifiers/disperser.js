"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class DisperserModifier extends Modifier {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        // if (!SignalOwner.signalName.isConnected(this.signalReceiver)) {
        //     SignalOwner.signalName.subscribe(this.signalReceiver);
        // }
        super.initialize();
    }

    // static signalReceiver(params) {

    // }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.disperser_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", cooldown * 20);
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_used", 0);
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.MURDERER;
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
        return "§sDisperser";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Shuffle everyone's positions!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let allowDuplicateLocations = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.allow_duplicate_locations") != 0;
        let removeDisperserLocation = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.remove_disperser_location") != 0;
        let removeDisperserText = (allowDuplicateLocations && removeDisperserLocation) ? "excluding yours" : "including yours";
        return "Right click your sword to shuffle everyone's positions, " + removeDisperserText + ".";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.disperser.enabled") != 0;
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
        return true;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.DISPERSER;
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
     * @param {Player} player 
     */
    activateAbility(player) {
        let modifierUsed = ScoreboardManager.getScoreboardObjective(player, "player.modifier_used") != 0;
        if (modifierUsed) {
            player.sendMessage("Disperser has already been consumed.");
            return;
        }

        // ability effect
        let allPlayers = world.getAllPlayers();
        allPlayers = allPlayers.filter((pl) => !DeathHandler.consideredDead(pl));
        
        let allowDuplicateLocations = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.allow_duplicate_locations") != 0;
        let removeDisperserLocation = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.remove_disperser_location") != 0;
        
        if (allowDuplicateLocations && removeDisperserLocation) {
            allPlayers.filter((pl) => pl.id != player.id);
        }
        let playerLocations = allPlayers.map((pl) => pl.location);

        allPlayers.forEach((transport) => {
            let newLocationIndex = ScoreboardManager.rollRandomNumber(0, playerLocations.length);
            let newLocation = playerLocations[newLocationIndex];

            if (!allowDuplicateLocations) {
                playerLocations.splice(newLocationIndex, 1);
            }

            transport.teleport(newLocation);
            // ability activate message
            transport.sendMessage("§cYou've been dispersed!");
        });
        SoundManager.playSoundEffect(allPlayers, SoundEffectType.DISPERSER_WARP);

        // ability activate message
        ChatManager.sendDeadPlayersMessage("§s§o" + player.name + " dispersed everyone!", LogItemType.ABILITY_MESSAGE);

        // sets cooldown
        ScoreboardManager.addScoreboardObjective(player, "player.modifier_used", 1);
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
            form.title("Disperser Settings");
    
            form.divider();
            form.label("Disperser is a murderer modifier that lets them shuffle all players one time.");
    
            let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.enabled") != 0;
            form.toggle("Disperser Enabled", { defaultValue: modifierEnabled }); // 2
    
            form.divider();
    
            // 4
            let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.disperser_cooldown");
            form.slider("Disperser Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
            form.label("The ability cooldown of dispersing, in seconds. Only applies at the start of the game");
    
            let allowDuplicateLocations = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.allow_duplicate_locations") != 0;
            form.toggle("Allow Duplicate Locations", { defaultValue: allowDuplicateLocations }); // 6
            form.label("If true, multiple players can appear at the same lcoation.");
            
            let removeDisperserLocation = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.remove_disperser_location") != 0;
            form.toggle("Remove Disperser's Location", { defaultValue: removeDisperserLocation }); // 6
            form.label("If true and duplicate locations is true, the disperser's location will be removed from the location pool.");
    
            form.show(player).then((r) => {
                if (r.canceled) {
                    return;
                }
    
                ScoreboardManager.setTrackedObjective("modifier_settings.disperser.enabled", r.formValues[2] ? 1 : 0);
                if (r.formValues[2] && !modifierEnabled) {
                    ScoreboardManager.setModifierAsEnabled(this);
                }
                ScoreboardManager.setTrackedObjective("modifier_settings.disperser.disperser_cooldown", r.formValues[4]);
                ScoreboardManager.setTrackedObjective("modifier_settings.disperser.allow_duplicate_locations", r.formValues[6] ? 1 : 0);
                ScoreboardManager.setTrackedObjective("modifier_settings.disperser.remove_disperser_location", r.formValues[8] ? 1 : 0);
    
                callback(player);
            });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let allowDuplicateLocations = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.allow_duplicate_locations") != 0;
        let removeDisperserLocation = ScoreboardManager.getTrackedObjective("modifier_settings.disperser.remove_disperser_location") != 0;
            
        let description = "Disperser is a murderer modifier with a one-time use ability to swap all player locations.";
        description += "\n\nAllow Duplicate Locations: " + allowDuplicateLocations;
        description += "\nRemove Disperser's Location: " + removeDisperserLocation;
        return description;
    }
}
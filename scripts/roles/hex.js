	"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { PlayerHandler } from "../player_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class HexRole extends InnocentRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_charges");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.hex.cooldown_time");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        return "§5Hex";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Use your spells to confuse players!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your ability allows you to escape dangerous situations by giving people around you blindness and weakness!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.hex.enabled");
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
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.HEX;
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
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            let effectLength = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_effect_time") * 20;
            let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_radius");

            // ability effect
            world.getAllPlayers().forEach((p) => {
                p.sendMessage("§5The §lHex§r§5 has activated their ability!");
                let distance = PlayerHandler.distanceBetweenLocations(player.location, p.location);
                if (p.hasTag("AFK") || p.hasTag("dead") || p.id == player.id || ((distance > spellRadius && spellRadius > 0))) {
                    return;
                }

                p.addEffect("minecraft:blindness", effectLength, { showParticles: false });
                p.addEffect("minecraft:speed", effectLength, { showParticles: false });
                p.addEffect("minecraft:weakness", effectLength, { showParticles: false });
            });
            SoundManager.playSoundEffect(world.getAllPlayers(), SoundEffectType.HEX_ACTIVATE);
            // player.addEffect("minecraft:resistance", effectLength, { showParticles: false });

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.hex.cooldown_time");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
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
        form.title("Hex Settings");

        form.divider();
        form.label("The hex is an innocent role that can cast a spell to give everyone blindness and weakness.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.hex.enabled") != 0;
        form.toggle("Hex Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.hex.cooldown_time");
        form.slider("Spell Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of the hex's spell.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_charges");
        form.slider("Spell Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the hex's spell can be used. -1 is infinite uses");
        
        let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_radius");
        form.slider("Spell Radius", 0, 50, { defaultValue: spellRadius }); // 8
        form.label("The radius the hex's spell affects. If 0, will affect all players.");
        
        let effectTime = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_effect_time");
        form.slider("Effect time", 5, 30, { defaultValue: effectTime }); // 8
        form.label("The number of seconds the effects of the spell last.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.hex.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.hex.cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.hex.spell_charges", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.hex.spell_radius", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.hex.spell_effect_time", r.formValues[10]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
       let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.hex.cooldown_time");
       let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_charges");
       let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_radius");
       let effectTime = ScoreboardManager.getTrackedObjective("role_settings.hex.spell_effect_time");

       let description = "The hex is an innocent who can give players weakness and blindness to escape bad situations.";
        description += "\n\nSpell Cooldown: " + cooldownTime + " seconds.";
        description += "\nSpell Uses: " + abilityUses;
        description += "\nEffect Radius: " + spellRadius;
        description += "\nEffect Duration: " + effectTime + " seconds.";
        return description;
    }
}
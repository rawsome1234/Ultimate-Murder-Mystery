"use strict";

import { world, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { Util } from "../util";
import { PlayerHandler } from "../player_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class LoneWolfModifier extends Modifier {
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
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", cooldown * 20);
        let abilityUses = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.uses");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_used", abilityUses);
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
        return "§jLone Wolf";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Get your role cooldown decreased if you're by yourself!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown_reduction");
        return "When your modifier ability is ready, you can use it to decrease your role cooldown by " + cooldownReduction + "% if there is no one nearby.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.enabled") != 0;
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
        return ModifierTypes.LONE_WOLF;
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
     * 
     * @param {Player} player 
     * @returns 
     */
    static getNearbyPlayers(player) {
        let playerRadius = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.player_radius");
        return Util.getPlayersInRadius(PlayerHandler.getLivingPlayers(world.getAllPlayers()), player.location, playerRadius, player.dimension.id);
    }

    /**
     * Activates the ability of this modifier for the given player. Assumes
     * the player has this modifier.
     * @param {Player} player 
     */
    activateAbility(player) {
        let modifierUses = ScoreboardManager.getScoreboardObjective(player, "player.modifier_used");
        if (modifierUses == 0) {
            player.sendMessage("You're out of modifier uses!");
            return;
        }

        let nearbyPlayers = LoneWolfModifier.getNearbyPlayers(player);
        // player.sendMessage("There are " + nearbyPlayers.length + " nearby players");
        if (nearbyPlayers.length > 1) {
            player.sendMessage("§j§oThere's too many people around to use Lone Wolf!");
            return;
        }
        
        let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown_reduction");

        if (modifierUses != 1) {
            ScoreboardManager.addScoreboardObjective(player, "player.modifier_used", -1);
            player.sendMessage("You have " + modifierUses - 1 + " uses remaining!");
        }

        let currentCooldown = player.getItemCooldown("role_action");
        let newCooldown = currentCooldown * cooldownReduction / 100;
        let cooldownDifference = Math.floor((currentCooldown - newCooldown) / 20)
        player.startItemCooldown("role_action", newCooldown);

        player.sendMessage("§j§oDecreased your role cooldown by " + cooldownDifference + " seconds!");
        SoundManager.playSoundEffect([player], SoundEffectType.COOLDOWN_DECREASE);
        ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " decreased their cooldown with Lone Wolf!", LogItemType.ABILITY_MESSAGE);
        
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", cooldown * 20);
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
        form.title("Lone Wolf Settings");

        form.divider();
        form.label("Lone Wolf is a universal modifier that lets you decrease the cooldown of your role when near other players.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.enabled") != 0;
        form.toggle("Lone Wolf Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown");
        form.slider("Reduce Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of lone wolf.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.uses");
        form.slider("Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times you can decrease your role cooldown can be used. -1 is infinite uses");
        
        let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown_reduction");
        form.slider("Cooldown Reduction", 5, 100, { valueStep: 5, defaultValue: cooldownReduction }); // 8
        form.label("The cooldown reduction in percent when lone wolf is used");
        
        let playerRadius = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.player_radius");
        form.slider("Detect Radius", 3, 15, { defaultValue: playerRadius }); // 10
        form.label("The radius that lone wolf detects players for.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.lone_wolf.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.lone_wolf.cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.lone_wolf.uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.lone_wolf.cooldown_reduction", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("modifier_settings.lone_wolf.player_radius", r.formValues[10]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.uses");
        let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.cooldown_reduction");
        let playerRadius = ScoreboardManager.getTrackedObjective("modifier_settings.lone_wolf.player_radius");

        let description = "Lone Wolf is a universal modifier that lets you decrease your cooldown when by yourself.";
        description += "\n\nCooldown: " + cooldownTime + " seconds";
        description += "\nAbility Uses: " + abilityUses;
        description += "\nCooldown Reduction: " + cooldownReduction + "\%";
        description += "\nDetect Radius: " + playerRadius;
        return description;
    }
}
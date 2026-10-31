"use strict";

import { world, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { Util } from "../util";
import { PlayerHandler } from "../player_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class RepelModifier extends Modifier {
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
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.repel.cooldown");
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
        return "§sRepel";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Use your ability to knock players in a radius away!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let repelDamage = ScoreboardManager.getTrackedObjective("modifier_settings.repel.damage");
        return "Upon using your modifier ability, all players in a radius will be knocked back and dealt " + repelDamage + " damage.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.repel.enabled") != 0;
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
        return ModifierTypes.REPEL;
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
            player.sendMessage("Repel has already been consumed.");
            return;
        }

        let radius = ScoreboardManager.getTrackedObjective("modifier_settings.repel.radius");
        let kbPower = ScoreboardManager.getTrackedObjective("modifier_settings.repel.knockback_power");
        let repelDamage = ScoreboardManager.getTrackedObjective("modifier_settings.repel.damage");

        let playersNearby = Util.getPlayersInRadius(world.getAllPlayers(), player.location, radius, player.dimension.id).filter((pl) => pl.id != player.id);

        // player.sendMessage("Radius: " + radius);
        // player.sendMessage("Players in radius: " + JSON.stringify(playersNearby.map((pl) => pl.name)));

        playersNearby.forEach((pl) => {
            let raycastDirection = PlayerHandler.directionTo(player.location, pl.location);
            let raycast = player.dimension.getBlockFromRay(player.location, raycastDirection, { includePassableBlocks: false, includeLiquidBlocks: false});
                        
            let blockedFlag = raycast != null && raycast.block != null && false;
            if (!blockedFlag) {
                // hits player
                let knockbackDirection = PlayerHandler._normalize(PlayerHandler.subtractVectors(pl.location, player.location));
                // pl.sendMessage(PlayerHandler.vecToString(PlayerHandler.subtractVectors(pl.location, bomb.location)));
                // pl.sendMessage(PlayerHandler.vecToString(knockbackDirection));
                // let distanceToBombCenterScale = (bombRadius - bombDistance) / bombRadius;
                // let knockbackFalloff = .1 + (bombKnockback - .3) * Math.max(.5, distanceToBombCenterScale);
                let knockback = PlayerHandler.scaleVector(knockbackDirection, kbPower);
                if (repelDamage > 0) {
                    pl.applyDamage(repelDamage);
                }
                pl.applyKnockback({x: knockback.x, z: knockback.z}, .6);
            }
        });
        SoundManager.playSoundEffect(world.getAllPlayers().filter((pl) => PlayerHandler.distanceBetweenLocations(pl, player) < 40), SoundEffectType.REPEL_BURST);

        player.sendMessage("§s§oRepeled players!");
        ChatManager.sendDeadPlayersMessage("§s§o" + player.name + " repeled nearby players!", LogItemType.ABILITY_MESSAGE);
        ScoreboardManager.addScoreboardObjective(player, "player.modifier_used", 1);

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
        form.title("Repel Settings");

        form.divider();
        form.label("Repel is a universal modifier that gives a one-time use ability to knock players in a radius away.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.repel.enabled") != 0;
        form.toggle("Repel Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.repel.cooldown");
        form.slider("Repel Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of repel.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("modifier_settings.repel.radius");
        form.slider("Repel Radius", 1, 10, { defaultValue: abilityUses }); // 6
        form.label("The block radius of repel.");
        
        let kbPower = ScoreboardManager.getTrackedObjective("modifier_settings.repel.knockback_power");
        form.slider("Knockback Power Multiplier", 1, 10, { defaultValue: kbPower }); // 6
        form.label("The multiplier on the knockback dealt from radius.");

        let repelDamage = ScoreboardManager.getTrackedObjective("modifier_settings.repel.damage");
        form.slider("Repel Damage", 0, 10, { defaultValue: repelDamage }); // 6
        form.label("The amount of damage repel will do to hit players.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.repel.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.repel.cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.repel.radius", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.repel.knockback_power", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("modifier_settings.repel.damage", r.formValues[10]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.repel.cooldown");
        let radius = ScoreboardManager.getTrackedObjective("modifier_settings.repel.radius");
        let kbPower = ScoreboardManager.getTrackedObjective("modifier_settings.repel.knockback_power");
        let repelDamage = ScoreboardManager.getTrackedObjective("modifier_settings.repel.damage");

        let description = "Repel is a universal modifier that grants the player a one-time use ability to knock nearby players away.";
        description += "\n\nCooldown: " + cooldownTime + " seconds.";
        description += "\nRadius: " + radius + " blocks.";
        description += "\nKnockback Multiplier: " + kbPower;
        description += "\nDamage: " + (repelDamage / 2) + " hearts";
        return description;
    }
}
"use strict";

import { world, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { PlayerHandler } from "../player_handler";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";
import { SettingsHandler } from "../settings_handler";
import { DeathHandler } from "../death_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class SentryModifier extends Modifier {
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
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.cooldown");
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
        return ModifierAlignment.KILLERS;
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
        return "§tSentry";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Shoot a laser to catch fleeing enemies!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        let damageDealt = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.damage_dealt");
        return "Your ability fires a laser in a line until it hits a block. All players caught in the line will take " + (damageDealt / 2) + " hearts of damage.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.sentry.enabled") != 0;
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
        return ModifierTypes.SENTRY;
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
            player.sendMessage("Sentry has already been consumed.");
            return;
        }
        
        // ability effect
        let playerLocation = PlayerHandler.addVectors(player.location, {x:0,y:.05,z:0});
        let laserDistance = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.range");
        let lookingDirection = PlayerHandler.addVectors(player.getViewDirection(), {x:0, y:.05, z:0});
        let finalBlock = player.dimension.getBlockFromRay(playerLocation, lookingDirection, {includePassableBlocks: false, maxDistance: laserDistance});
        let finalLocation = finalBlock ? finalBlock.block.location : null;
        // if (finalBlock == null) {
        //     player.sendMessage("First block too far, pulling closer");
        //     finalLocation = PlayerHandler.addVectors(playerLocation, PlayerHandler.scaleVector(lookingDirection, laserDistance));
        // }
        let currentSearchLocation = PlayerHandler.addVectors(playerLocation, lookingDirection);
        while (PlayerHandler.distanceBetweenLocations(currentSearchLocation, playerLocation) < laserDistance) {
            let blockAtLocation = player.dimension.getBlock({x:Math.round(currentSearchLocation.x),y:Math.round(currentSearchLocation.y),z:Math.round(currentSearchLocation.z)});
            if (blockAtLocation.isSolid) {
                // player.sendMessage("Stopped at block " + blockAtLocation.typeId + " at location " + PlayerHandler.vecToString(blockAtLocation.location));
                break;
            }
            currentSearchLocation = PlayerHandler.addVectors(currentSearchLocation, lookingDirection);
        }
        world.getAllPlayers().forEach((pl) => {
            PlayerHandler.spawnParticlesBetweenPoints(pl, playerLocation, currentSearchLocation, {red:1,blue:0,green:0,alpha:1}, 5);
        });
        // player.sendMessage(PlayerHandler.vecToString(currentSearchLocation));

        let allPlayers = world.getAllPlayers();
        let livingPlayers = allPlayers.filter((pl) => {
            let isAliveFlag = pl.id != player.id && !DeathHandler.consideredDead(pl);
            if (isAliveFlag) {
                let closeToLine = SentryModifier.getDistanceToLine(lookingDirection, playerLocation, pl.location) < 1;
                // let distanceToEnd = PlayerHandler.distanceBetweenLocations(pl.location, currentSearchLocation);
                let distanceToStart = PlayerHandler.distanceBetweenLocations(pl.location, playerLocation)
                return closeToLine && distanceToStart < laserDistance;
            }
            return false;
        });
        SoundManager.playSoundEffect(world.getAllPlayers(), SoundEffectType.SENTRY_LASER);

        // allPlayers.forEach((pl) => {
        //     let distanceToLine = SentryModifier.getDistanceToLine(lookingDirection, playerLocation, pl.location);
        //     player.sendMessage(pl.name + " distance to line: " + distanceToLine);
        // });
        // let entities = player.dimension.getEntitiesFromRay(playerLocation, lookingDirection, { includeLiquidBlocks: false, includePassableBlocks: false, excludeGameModes: [GameMode.Spectator, GameMode.Creative], excludeNames:[player.name]});
        
        let damage = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.damage_dealt");
        livingPlayers.forEach((hit) => {
            if (hit.typeId == "minecraft:player") {
                hit.applyDamage(damage);
            }
        });
        
        player.sendMessage("§t§oHit " + livingPlayers.length + " players!");
        ChatManager.sendDeadPlayersMessage("§t§o" + player.name + " fired a laser and hit " + livingPlayers.length + " players!", LogItemType.ABILITY_MESSAGE);
        // // sets cooldown
        ScoreboardManager.addScoreboardObjective(player, "player.modifier_used", 1);
    }

    /**
     * 
     * @param {Vector3} forwardDirection 
     * @param {Vector3} pointOnLine
     * @param {Vector3} pointOffLine
     */
    static getDistanceToLine(forwardDirection, pointOnLine, pointOffLine) {
        let AP = PlayerHandler.subtractVectors(pointOffLine, pointOnLine);
        return PlayerHandler._magnitude(PlayerHandler.crossProduct(AP, forwardDirection)) / PlayerHandler._magnitude(forwardDirection);
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
        form.title("Sentry Settings");

        form.divider();
        form.label("Sentry is a killer modifier that grants a one-time ability to fire a long-distance laser to damage players.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.enabled") != 0;
        form.toggle("Sentry Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.cooldown");
        form.slider("Laser Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of laser in seconds.");
        
        let damageDealt = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.damage_dealt");
        form.slider("Laser Damage", 1, 20, { defaultValue: damageDealt }); // 6
        form.label("The amount of damage the laser does, in half hearts.");
        
        let laserRange = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.range");
        form.slider("Laser Range", 5, 50, { valueStep: 5, defaultValue: laserRange }); // 8
        form.label("The max number of blocks the laser can go.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.sentry.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.sentry.cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.sentry.damage_dealt", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.sentry.range", r.formValues[8]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.cooldown");
        let damageDealt = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.damage_dealt");
        let laserRange = ScoreboardManager.getTrackedObjective("modifier_settings.sentry.range");

        let description = "Sentry is a killer modifier that lets the user fire a laser to deal damage.";
        description += "\n\nCooldown: " + cooldownTime + " seconds.";
        description += "\nLaser Damage: " + (damageDealt / 2) + " hearts.";
        description += "\nLaser Range: " + laserRange + " blocks.";
        return description;
    }
}
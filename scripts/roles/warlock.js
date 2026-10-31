"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class WarlockRole extends MurdererRole {

    static castTag = "inCast";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        // system.runInterval(EscapistRole.spawnParticlesAtMark, 20);
        super.initialize();
        system.runInterval(() => {
            let allWarlocks = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.WARLOCK);
            allWarlocks.forEach((pl) => {
                if (!pl.hasTag(WarlockRole.castTag)) {
                    ScoreboardManager.addScoreboardObjective(pl, "role_settings.warlock.time_for_max_charge", 1);
                    let maxChargeTime = ScoreboardManager.getTrackedObjective("role_settings.warlock.time_for_max_charge");
                    let currentChargeTime = ScoreboardManager.getScoreboardObjective(pl, "role_settings.warlock.time_for_max_charge");
                    
                    let percentCharge = Math.floor(currentChargeTime / 20) / maxChargeTime;
                    let maxCastDuration = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_increase_time");
                
                    let castTime = Math.floor(Util.lerp(0, maxCastDuration, Math.min((currentChargeTime / 20) / maxChargeTime, 1)));
                    pl.onScreenDisplay.setActionBar("§9Charge: " + Math.min(100, Math.floor(percentCharge.toFixed(2) * 100)) + "\% (" + castTime + " seconds)");
                    // let xpNeededForLevel = pl.totalXpNeededForNextLevel;
                    // let goalPercent = percentCharge * xpNeededForLevel;
                    // let extraXP = goalPercent - pl.xpEarnedAtCurrentLevel;
                    // pl.sendMessage("Adding " + extraXP + " exp");
                    // pl.runCommand("xp ")
                    // pl.addExperience(extraXP);
                    // pl.sendMessage("Currently " + Math.floor(currentChargeTime / 20) + "/" + maxChargeTime + " seconds into charge.");
                    // if (percentCharge < 1.01) {
                    //     let goalLevel = Math.min(100, Math.floor(percentCharge * 100));
                    //     // pl.sendMessage("Goal Level: " + percentCharge * 100);
                    //     if (pl.level < goalLevel) {
                    //         pl.addLevels(1);
                    //     }
                    //     if (pl.level != goalLevel) {
                    //         // pl.sendMessage("Level does not match " + goalLevel + "/" + pl.level);
                    //         pl.resetLevel();
                    //         pl.addLevels(goalLevel);
                    //     }
                    //     else {
                    //         // pl.sendMessage("Levels match");
                    //     }
                    //     // pl.level = ;
                    //     // pl.addLevels();
                    // }
                }
            });
            // world.getAllPlayers().forEach((pl) => pl.stopSound("random.levelup"));
        }, 1);
        world.beforeEvents.entityHurt.subscribe(async (event) => {
            let warlock = event.damageSource.damagingEntity;
            if (warlock != null && warlock.typeId == "minecraft:player" && RoleManager.getPlayerRole(warlock).getRoleType() == RoleTypes.WARLOCK && warlock.hasTag("inCast")) {
                let currentHitCount = ScoreboardManager.getScoreboardObjective(warlock, "role_settings.warlock.damage_per_hit");
                currentHitCount++;
                system.run(() => {
                    ScoreboardManager.addScoreboardObjective(warlock, "role_settings.warlock.damage_per_hit", 1);
                })
                
                // calculate the extra damage
                let baseDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.base_extra_damage");
                let perHitDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_per_hit");
                let extraDamage = baseDamage + Math.floor(currentHitCount * perHitDamage / 10);
                // warlock.sendMessage("You are dealing " + extraDamage + " extra damage for a total of " + (event.damage + extraDamage));
                event.damage += extraDamage;
                warlock.sendMessage("§9Dealt " + extraDamage + " extra damage, now hit " + (currentHitCount) + " times this cast!");
            }
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.warlock.cast_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.warlock.ability_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setScoreboardObjective(player, "role_settings.warlock.time_for_max_charge", 0);
        ScoreboardManager.setScoreboardObjective(player, "role_settings.warlock.damage_per_hit", 0);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        // ScoreboardManager.setScoreboardObjective(player, "player.mark_used", 0);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.MURDERER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§wWarlock";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Charge up your ability and snowball with extra damage!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your ability will give you extra damage every time you hit someone. However to compensate, in order to get a large amount of time with the ability up, you have to wait after your cooldown. If you activate your ability before you reach max charge, your ability will activate for a shorter amount of time.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.warlock.enabled") != 0;
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
        return RoleTypes.WARLOCK;
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
     * Converts the dimension to a number for identification.
     * 
     * @param {string} dimensionID the dimension's identifier.
     * @return {number} the respective number for the dimension.
     */
    static dimToID(dimensionID) {
        switch (dimensionID) {
            case "minecraft:overworld":
                return 0
            case "minecraft:nether":
                return 1
            case "minecraft:the_end":
                return 2
            default:
                return -1
        }
    }

    /**
     * Converts a dimension's number id to its string ID. 
     * 
     * @param {number} dimID the numerical id associated with the dimension.
     * @return {string} the identifier for the dimension.
     */
    static dimensionIDToString(dimID) {
        switch (dimID) {
            case 0:
                return "minecraft:overworld"
            case 1:
                return "minecraft:nether"
            case 2:
                return "minecraft:the_end"
            default:
                return "null"
        }
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player
     */
    activateAbility(player) {
        if (player.isSneaking) {
            let maxChargeTime = ScoreboardManager.getTrackedObjective("role_settings.warlock.time_for_max_charge");
            let maxCastDuration = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_increase_time");
            let currentTime = ScoreboardManager.getScoreboardObjective(player, "role_settings.warlock.time_for_max_charge");
        
            let castTime = Math.floor(Util.lerp(0, maxCastDuration, Math.min((currentTime / 20) / maxChargeTime, 1)));
            player.sendMessage("§9You'd get " + castTime + " seconds of cast time if you activate your ability.");
            return;
        }
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
            
            // ability effect
            ScoreboardManager.setScoreboardObjective(player, "role_settings.warlock.damage_per_hit", 0);
            player.addTag(WarlockRole.castTag);
            
            let maxChargeTime = ScoreboardManager.getTrackedObjective("role_settings.warlock.time_for_max_charge");
            let maxCastDuration = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_increase_time");
            let currentTime = ScoreboardManager.getScoreboardObjective(player, "role_settings.warlock.time_for_max_charge");
        
            let castTime = Math.floor(Util.lerp(0, maxCastDuration, Math.min((currentTime / 20) / maxChargeTime, 1)));
            system.runTimeout(() => {
                player.removeTag(WarlockRole.castTag);
                player.sendMessage("§9Cast has ended.");
                let baseDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.base_extra_damage");
                let perHitDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_per_hit");
                let currentHitCount = ScoreboardManager.getScoreboardObjective(player, "role_settings.warlock.damage_per_hit");
                let extraDamage = baseDamage + Math.floor(currentHitCount * perHitDamage / 10);
                ChatManager.sendDeadPlayersMessage("§9§o" + player.name + "'s cast ended. They had " + extraDamage + " extra damage.", LogItemType.ABILITY_MESSAGE);
                
                ScoreboardManager.setScoreboardObjective(player, "role_settings.warlock.time_for_max_charge", 0);
                let escapistCooldown = ScoreboardManager.getTrackedObjective("role_settings.warlock.ability_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, escapistCooldown);
            }, castTime * 20);



            
            // ability activate message
            SoundManager.playSoundEffect([player], SoundEffectType.WARLOCK_START_CAST);
            player.sendMessage("§9You have cast for " + castTime + " seconds!");
            ChatManager.sendDeadPlayersMessage("§9§o" + player.name + " used cast, gaining " + castTime + " seconds.", LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            let escapistCooldown = ScoreboardManager.getTrackedObjective("role_settings.warlock.ability_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, escapistCooldown);
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
        form.title("Warlock Settings");

        form.divider();
        form.label("The warlock is a murderer role that can charge its ability up to get its effects for longer. The Warlock's ability allows it to gain extra damage on each of its hits.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.warlock.enabled") != 0;
        form.toggle("Warlock Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.warlock.ability_cooldown");
        form.slider("Base Cast Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The forced cooldown of the cast action as usual.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.warlock.cast_uses");
        form.slider("Cast Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times cast can be used. -1 is infinite uses");
        
        let maxChargeTime = ScoreboardManager.getTrackedObjective("role_settings.warlock.time_for_max_charge");// 8
        form.slider("Max Charge Time", SettingsHandler.powerAbilityCooldownMin, 600, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: maxChargeTime })
        form.label("The amount of time it takes to reach max charge. Cooldown is included. For example, if this value was 300 (5 minutes), it would take 5 minutes to reach max charge. Base cooldown means the warlock cannot use their ability for at least that time."); // 6
        
        let warlockDamageIncrease = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_increase_time");
        form.slider("Cast Duration (Max Charge)", 5, 30, { defaultValue: warlockDamageIncrease }); // 10
        form.label("The amount of time the cast effect will last at max charge. After the base cooldown has worn off, the time will be linearly calculated based how far in the max cooldown the warlock is. For example, if max cooldown is 300 (5 minutes) and this value is 10, at 150 seconds the Warlock will get Cast for 5 seconds."); // 6
        
        let baseDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.base_extra_damage");
        form.slider("Base Damage", 0, 5, { valueStep: 1, defaultValue: baseDamage }) // 12;
        form.label("The base extra damage the warlock gets in cast.");
        
        let perHitDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_per_hit");
        form.slider("Extra Damage Per Hit", 5, 50, { valueStep: 5, defaultValue: perHitDamage }); // 14
        form.label("The amount of damage the warlock gets per hit. This value is in half of half hearts. For example, 15 would be 1.5 extra half hearts of damage per hit."); // 6
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.warlock.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.warlock.ability_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.warlock.cast_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.warlock.time_for_max_charge", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.warlock.damage_increase_time", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.warlock.base_extra_damage", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.warlock.damage_per_hit", r.formValues[14]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.warlock.ability_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.warlock.cast_uses");
        let maxChargeTime = ScoreboardManager.getTrackedObjective("role_settings.warlock.time_for_max_charge");// 8
        let warlockDamageIncrease = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_increase_time");
        let baseDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.base_extra_damage");
        let perHitDamage = ScoreboardManager.getTrackedObjective("role_settings.warlock.damage_per_hit");

        let description = "The Warlock is a murderer who is able to accumulate damage. They may use their Cast ability anytime after their cooldown is over, but if they wait even longer they'll get a longer time. During cast, they get extra damage every hit.";
        description += "\n\nCast Cooldown: " + markCooldown + " seconds.";
        description += "\nCast Uses: " + abilityUses;
        description += "\nTime for Max Cast Charge: " + maxChargeTime;
        description += "\nAbility Time at Max Cast Uses: " + warlockDamageIncrease;
        description += "\nBase Cast Damage: " + baseDamage;
        description += "\nDamage per hit: " + perHitDamage;
        return description;
    }
}
"use strict";

import { world, system, Player, EntityHurtBeforeEvent } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { RoleAssignment } from "../role_assignment";
import { PlayerHandler } from "../player_handler";
import { ModifierAssignment } from "../modifier_assignment";
import { ModifierManager } from "../modifier_manager";
import { ModifierTypes } from "../modifier";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class TempestRole extends MurdererRole {

    static ABILITY_COUNT_INDEX_PROPERTY = "killsSoFar";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
        if (!DeathHandler.onDeathSignal.isConnected(TempestRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(TempestRole.onPlayerDeath);
        }
        // world.afterEvents.entityDie.subscribe(async (event) => {
        //     let killer = event.damageSource.damagingEntity;
        //     if (killer != null && killer.typeId == "minecraft:player" && RoleManager.getPlayerRole(killer).getRoleType() == RoleTypes.TEMPEST) {
        //         TempestRole.onPlayerDeath(null, killer);
        //     }   
        // });
        world.beforeEvents.entityHurt.subscribe(TempestRole.onEntityHurt);
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            let tempests = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TEMPEST);
            tempests.forEach((pl) => {
                let timer = TempestRole.getKillTimerTime(pl);
                let secondsLeft = Math.ceil(timer / 20);
                let minutesLeft = Math.floor(secondsLeft / 60);
                // pl.sendMessage("Minutes left: " + minutesLeft);
                let secondsToShow = secondsLeft - (minutesLeft * 60);
                let message = "§cTime Left: " + minutesLeft + ":" + secondsToShow.toString().padStart(2, '0');
                if (timer < 0) {
                    message = "§cOut of time. Kill to Reset.";
                }
                pl.onScreenDisplay.setActionBar(message)
                let hideAndSeekOn = ScoreboardManager.getTrackedObjective("role_settings.tempest.hide_and_seek") == 1;
                if (hideAndSeekOn) {
                    world.getAllPlayers().forEach((p) => p.onScreenDisplay.setActionBar(message));
                    if (timer == (60 * 20 * 2.5) || timer == (60 * 20 * 4.5) || timer == (60 * 20 * .5) || timer == (60 * 20 * .25)) {
                        let nonTempests = PlayerHandler.sortPlayersWithoutRole(allPlayers, [RoleTypes.TEMPEST]);
                        nonTempests = nonTempests.filter((p) => !p.hasTag("hiderFound"));
                        nonTempests.forEach((hider) => {
                            allPlayers.forEach((p) => p.sendMessage("Distance from " + pl.name + " to " + hider.name + " is " + PlayerHandler.distanceBetweenLocations(pl.location, hider.location).toFixed(2)));
                        }) ;
                    }
                    if (timer == (60 * 20 * 1) || timer == (60 * 20 * 3)) {
                        let nonTempests = PlayerHandler.sortPlayersWithoutRole(allPlayers, [RoleTypes.TEMPEST]);
                        nonTempests = nonTempests.filter((p) => !p.hasTag("hiderFound"));
                        nonTempests.forEach((hider) => {
                            allPlayers.forEach((p) => p.sendMessage(hider.name + "'s Y Level is " + hider.location.y.toFixed(1)));
                        }) ;
                    }
                    if (timer == (20 * 30)) {
                        allPlayers.forEach((p) => {
                            p.sendMessage("The original tempest now has Radar!");
                        });
                        ModifierAssignment.setPlayerModifier(pl, ModifierManager.getMatchingModifier(ModifierTypes.RADAR.id));
                    }
                    if (timer % (60 * 20) == 0) {
                        world.sendMessage(minutesLeft + " minutes left!");
                    }
                }
                

                
                ScoreboardManager.addScoreboardObjective(pl, "role_settings.tempest.kill_timer_length", -1);
                ScoreboardManager.addScoreboardObjective(pl, "role_settings.tempest.electricity_cooldown", -1);
                ScoreboardManager.addScoreboardObjective(pl, "role_settings.tempest.teleport_cooldown", -1);
                ScoreboardManager.addScoreboardObjective(pl, "role_settings.tempest.thorns_duration", -1);
                ScoreboardManager.addScoreboardObjective(pl, "role_settings.tempest.tesla_duration", -1);
                if (ScoreboardManager.getScoreboardObjective(pl, "role_settings.tempest.electricity_cooldown") == 0) {
                    pl.sendMessage("§9Your electric abilities are ready! Crouch and use your ability to activate them!");
                }
                if (ScoreboardManager.getScoreboardObjective(pl, "role_settings.tempest.teleport_cooldown") == 0) {
                    pl.sendMessage("§9Teleport is ready!");
                }
            });
        }, 1);
        RoleAssignment.afterRolesAssigned.subscribe(() => {
            let hideAndSeekOn = ScoreboardManager.getTrackedObjective("role_settings.tempest.hide_and_seek") == 1;
            if (hideAndSeekOn) {
                let tempest = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.TEMPEST);
                let otherPlayers = PlayerHandler.sortPlayersWithoutRole(world.getAllPlayers(), [RoleTypes.TEMPEST, RoleTypes.SOUL]).map((p) => p.name);
                let message = tempest[0].name + " is the seeker! The hiders are " + Util.formatStringList(otherPlayers, ", ", true);
                world.getAllPlayers().forEach((pl) => pl.sendMessage(message));
            }
        });
    }

    /**
     * 
     * @param {EntityHurtBeforeEvent} event 
     */
    static onEntityHurt(event) {
        let hideAndSeekOn = ScoreboardManager.getTrackedObjective("role_settings.tempest.hide_and_seek") == 1;
        if (hideAndSeekOn && event.hurtEntity.typeId == "minecraft:player" && !event.hurtEntity.hasTag("hiderFound") && event.damageSource.damagingEntity != null && (RoleManager.getPlayerRole(event.damageSource.damagingEntity).getRoleType() == RoleTypes.TEMPEST || event.damageSource.damagingEntity.hasTag("hiderFound"))) {
            system.run(() => {
                event.hurtEntity.addTag("hiderFound");
                world.sendMessage(event.hurtEntity.name + " was tagged!");
            });
        }

        let tempest = event.hurtEntity;
        if (tempest != null && tempest.typeId == "minecraft:player" && RoleManager.getPlayerRole(tempest).getRoleType() == RoleTypes.TEMPEST) {
            if (TempestRole.isAbilityUnlocked(tempest, TempestAbility.ELECTRIC_THORNS) && ScoreboardManager.getScoreboardObjective(tempest, "role_settings.tempest.thorns_duration") > 0) {
                let thornsPlayer = event.damageSource.damagingEntity;
                if (thornsPlayer != null) {
                    let thornsDamage = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_damage");
                    system.run(() => thornsPlayer.applyDamage(thornsDamage));
                    // tempest.sendMessage("");
                }
            }
        }

        tempest = event.damageSource.damagingEntity;
        if (tempest != null && RoleManager.getPlayerRole(tempest).getRoleType() == RoleTypes.TEMPEST) {
            if (TempestRole.isAbilityUnlocked(tempest, TempestAbility.TESLA_BURST) && ScoreboardManager.getScoreboardObjective(tempest, "role_settings.tempest.tesla_duration") > 0) {
                let origin = event.hurtEntity.location;
                let teslaRadius = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_radius");
                let teslaDamage = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_splash_damage");

                let allPlayers = world.getAllPlayers();
                let playingPlayers = PlayerHandler.getPlayingPlayers(allPlayers);
                let playersToDamage = [];

                playingPlayers.forEach((pl) => {
                    if (DeathHandler.consideredDead(pl) || pl.id == tempest.id) {
                        return;
                    }
                
                    if (PlayerHandler.distanceBetweenLocations(origin, pl.location) <= teslaRadius) {
                        playersToDamage.push(pl);
                    }
                });

                system.run(() => {
                    playersToDamage.forEach((pl) => {
                        pl.applyDamage(teslaDamage);
                        SoundManager.playSoundEffect(allPlayers, SoundEffectType.TEMPEST_ZAP, pl.location);
                    });
                    
                    tempest.sendMessage("§9Dealt splash damage to " + playersToDamage.length + " players");
                });
            }
        }
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} tempest 
     */
    static onPlayerDeath(playerWhoDied, tempest) {
        if (tempest != null) {
            let killerRole = RoleManager.getPlayerRole(tempest);
            if (killerRole.getRoleType() == RoleTypes.TEMPEST) {
                // killer is tempest, check timer
                let timerLeft = TempestRole.getKillTimerTime(tempest);
                let previousCount = TempestRole.getCurrentAbilityCount(tempest);
                TempestRole.resetKillTimer(tempest);
                let killedWithinTimer = timerLeft >= 0;
                
                if (killedWithinTimer) {
                    TempestRole.incrementAbilityCount(tempest);
                    SoundManager.playSoundEffect([tempest], SoundEffectType.TEMPEST_KILL);
                }
                
                let newAbilityCount = TempestRole.getCurrentAbilityCount(tempest);
                if (previousCount != newAbilityCount) {
                    // increment ability
                    let nextAbility = TempestRole.getAbilityOfIndex(newAbilityCount);
                    if (nextAbility != null) {
                        // new ability is unlocked
                        tempest.sendMessage("§9You've unlocked the ability " + nextAbility.display + "! " + nextAbility.description);
                        ChatManager.sendDeadPlayersMessage("§9" + tempest.name + " unlocked the " + nextAbility.display + "§9 ability", LogItemType.ABILITY_MESSAGE);
                    }
                }

                if (TempestRole.isAbilityUnlocked(tempest, TempestAbility.ABSORPTION) && killedWithinTimer) {
                    // absorption ability
                    let absorptionAmplifier = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_amplifier");
                    let absorptionPerKill = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_is_per_kill") != 0;
                    if (absorptionPerKill || TempestRole.getAbilityOfIndex(newAbilityCount) == TempestAbility.ABSORPTION) {
                        tempest.removeEffect("minecraft:absorption");
                        tempest.addEffect("minecraft:absorption", 20000000, {showParticles:false, amplifier:absorptionAmplifier});
                        // tempest.sendMessage("Gaining absorption");
                        ChatManager.sendDeadPlayersMessage("§9§o" + tempest.name + " got new absorption..", LogItemType.ABILITY_MESSAGE);
                    }
                }
            }
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(TempestRole.ABILITY_COUNT_INDEX_PROPERTY, 0);
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", -1);
        TempestRole.resetKillTimer(player);
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
        return "§9Tempest";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Kill within your timer to gain new abilities!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "If you kill within the timer at the bottom of the screen, you will gain a new ability! If not, kill to reset the timer.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.tempest.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
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
        return RoleTypes.TEMPEST;
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
     * 
     * @param {*} player 
     * @returns {number} time left, in ticks
     */
    static getKillTimerTime(player) {
        return ScoreboardManager.getScoreboardObjective(player, "role_settings.tempest.kill_timer_length");
    }

    static resetKillTimer(player) {
        let killTimerLength = ScoreboardManager.getTrackedObjective("role_settings.tempest.kill_timer_length");
        ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.kill_timer_length", killTimerLength*6*20);
    }


    /**
     * 
     * @param {Player} player 
     */
    static getCurrentAbilityCount(player) {
        return player.getDynamicProperty(TempestRole.ABILITY_COUNT_INDEX_PROPERTY);
    }

    /**
     * 
     * @param {Player} player 
     */
    static incrementAbilityCount(player) {
        player.setDynamicProperty(TempestRole.ABILITY_COUNT_INDEX_PROPERTY, TempestRole.getCurrentAbilityCount(player)+1);
    }

    /**
     * Gets the ability corresponding to the given index, based on what abilities are enabled.
     * Ability order (if all enabled) is Absorption -> Teleport -> Electric Thorns -> Tesla Burst
     * @param {number} abilityCount the index of ability to get, starting at 1
     * @returns {TempestAbility} may return null if no new ability is unlocked.
     */
    static getAbilityOfIndex(abilityCount) {
        let abilities = TempestRole.getEnabledAbilities();

        return abilities[abilityCount-1];
    }

    /**
     * 
     * @param {Player} player 
     * @param {TempestAbility} ability
     */
    static isAbilityUnlocked(player, ability) {
        return TempestRole.getCurrentAbilityCount(player) > TempestRole.getEnabledAbilities().indexOf(ability);
    }

    static getEnabledAbilities() {
        let absorptionEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_enabled") != 0;
        let teleportEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_enabled") != 0; // 15
        let thornsEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_enabled") != 0;
        let teslaEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_enabled") != 0;

        let abilities = [];
        if (absorptionEnabled) {
            abilities.push(TempestAbility.ABSORPTION);
        }
        if (teleportEnabled) {
            abilities.push(TempestAbility.TELEPORT);
        }
        if (thornsEnabled) {
            abilities.push(TempestAbility.ELECTRIC_THORNS);
        }
        if (teslaEnabled) {
            abilities.push(TempestAbility.TESLA_BURST);
        }
        return abilities
    }

    static isAbilityEnabled(tempestAbility) {
        let scoreboard = "";
        switch (tempestAbility) {
            case TempestAbility.ABSORPTION:
                scoreboard = "role_settings.tempest.absorption_enabled";
                break;
            case TempestAbility.TELEPORT:
                scoreboard = "role_settings.tempest.teleport_enabled";
                break;
            case TempestAbility.ELECTRIC_THORNS:
                scoreboard = "role_settings.tempest.thorns_enabled";
                break;
            case TempestAbility.TESLA_BURST:
                scoreboard = "role_settings.tempest.tesla_enabled";
                break;
        }
        return ScoreboardManager.getTrackedObjective(scoreboard) != 0;
    }

    

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player 
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
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // activate electric effects
            let hasElectricAbility = (TempestRole.isAbilityUnlocked(player, TempestAbility.ELECTRIC_THORNS) || TempestRole.isAbilityUnlocked(player, TempestAbility.TESLA_BURST));
            if (player.isSneaking && hasElectricAbility) {
                let playerElectricityCooldown = ScoreboardManager.getScoreboardObjective(player, "role_settings.tempest.electricity_cooldown");
                if (playerElectricityCooldown > 0) {
                    player.sendMessage("§cYour electric abilities are still on cooldown for " + Math.ceil(playerElectricityCooldown / 20) + " seconds.");
                    return;
                }

                player.sendMessage("§9Your electric abilities are active!");
                if (TempestRole.isAbilityUnlocked(player, TempestAbility.ELECTRIC_THORNS)) {
                    let thornsDuration = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_duration");
                    ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.thorns_duration", thornsDuration*20);
                }
                if (TempestRole.isAbilityUnlocked(player, TempestAbility.TESLA_BURST)) {
                    let teslaDuration = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_duration");
                    ScoreboardManager.setScoreboardObjective(player, "role_settings.tempest.tesla_duration", teslaDuration*20);
                }
                ChatManager.sendDeadPlayersMessage("§9§o" + player.name + "'s electric abilities are active!", LogItemType.ABILITY_MESSAGE);

                let electricityCooldown = ScoreboardManager.getTrackedObjective("role_settings.tempest.electricity_cooldown");
                TempestRole.setScoreboardCooldown(player, "role_settings.tempest.electricity_cooldown", electricityCooldown);
            }
            // activate teleport
            else if (TempestRole.isAbilityUnlocked(player, TempestAbility.TELEPORT)) {
                // check cooldown
                let playerTeleportCooldown = ScoreboardManager.getScoreboardObjective(player, "role_settings.tempest.teleport_cooldown");
                if (playerTeleportCooldown > 0) {
                    player.sendMessage("§cTeleport is still on cooldown for " + Math.ceil(playerTeleportCooldown / 20) + " seconds.");
                    return;
                }

                // ability effect
                let viewDirection = player.getViewDirection();
                if (viewDirection.y < 0 && viewDirection.y > -.3) {
                    viewDirection.y = 0;
                }
                
                let teleportBlock = player.location;
                let playerDimension = player.dimension;
                let teleportDistance = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_distance"); // 15
                for (let i = 0; i < teleportDistance; i++) {
                    let nextBlock = PlayerHandler.addVectors(teleportBlock, viewDirection);
                    if (!playerDimension.getBlock(nextBlock).isAir) {
                        break;
                    }
                    teleportBlock = nextBlock;
                }
                player.teleport(teleportBlock);

                // ability activate message
                player.sendMessage("§9Teleported forward!");
                ChatManager.sendDeadPlayersMessage("§9§o" + player.name + " teleported at " + PlayerHandler.vecToString(teleportBlock), LogItemType.ABILITY_MESSAGE);

                let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_cooldown");
                TempestRole.setScoreboardCooldown(player, "role_settings.tempest.teleport_cooldown", teleportCooldown);
            }
            else {
                if (hasElectricAbility) {
                    player.sendMessage("§9Make sure you crouch to activate your electric abilities!");
                }
                else {
                    player.sendMessage("§9You don't have any abilities unlocked!");
                }
            }
        }
    }

    /**
     * 
     * @param {Player} player 
     * @param {string} scoreboardObj 
     * @param {number} cooldownTime in seconds
     */
    static setScoreboardCooldown(player, scoreboardObj, cooldownTime) {
        let currentCooldown = ScoreboardManager.getScoreboardObjective(player, scoreboardObj);
        let defaultMult = ScoreboardManager.getScoreboardObjective(player, "player.default_cooldown_multiplier") / 100;
        let multiplier = ScoreboardManager.getScoreboardObjective(player, "player.cooldown_multiplier") / 100;
        let newCooldown = cooldownTime * 20 * multiplier * defaultMult;
        if (currentCooldown < newCooldown) {
            ScoreboardManager.setScoreboardObjective(player, scoreboardObj, newCooldown);
            if (multiplier != 1) {
                player.sendMessage("Your cooldown was multiplied by " + multiplier + "x");
            }
            
            ScoreboardManager.setScoreboardObjective(player, "player.cooldown_multiplier", defaultMult);
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
        form.title("Tempest Settings");

        form.divider();
        form.label("The Tempest is a murderer role with a kill timer. Every time they kill within the time, they unlock a new ability.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.enabled") != 0;
        form.toggle("Tempest Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let killTimerLength = ScoreboardManager.getTrackedObjective("role_settings.tempest.kill_timer_length");
        form.slider("Kill Timer Length", 10, 100, { valueStep: 5, defaultValue: killTimerLength });
        form.label("The amount of time in minutes * 10 the kill timer is. For example, 45 would be 4.5 minutes.");

        form.label("There are 4 abilities: Absorption, Teleport, Electric Thorns, and Tesla Burst. They will be unlocked in that order, however, if one is disabled, they will be shifted up to compensate.");
        form.divider();

        // 8
        let absorptionEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_enabled") != 0;
        form.toggle("Absorption Enabled", { defaultValue: absorptionEnabled, tooltip: "Upon first kill, Tempest will gain absorption" });
        form.label("If the absorption ability is enabled.");
        
        let absorptionAmplifier = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_amplifier");
        form.slider("Absorption Amplifier", 0, 4, { defaultValue: absorptionAmplifier }); // 10
        form.label("The level of absorption gained. Each level is 2 hearts, starting at 2 hearts for amplifier 0.");
        
        let absorptionPerKill = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_is_per_kill") != 0;
        form.toggle("Absorption is Per Kill", { defaultValue: absorptionPerKill }); // 12
        form.label("If after unlocking absorption, absorption is given every kill, even outside of the kill timer.");
        
        form.divider();
        
        let teleportEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_enabled") != 0; // 15
        form.toggle("Teleport Enabled", { defaultValue: teleportEnabled, tooltip: "The Tempest will teleport a short distance forward, not through blocks." });
        form.label("If the teleport ability is enabled.");
        
        // 17
        let teleportDistance = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_distance"); // 15
        form.slider("Teleport Distance", 1, 10, { defaultValue: teleportDistance });
        form.label("If the teleport ability is enabled.");
        
        // 19
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_cooldown");
        form.slider("Teleport Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: teleportCooldown });
        form.label("The ability cooldown of the teleport ability. Separate from the electricity abilities.");
        
        form.divider();
        
        // 22
        let electricityCooldown = ScoreboardManager.getTrackedObjective("role_settings.tempest.electricity_cooldown");
        form.slider("Electricity Abilities Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: electricityCooldown });
        form.label("The last two abilities, electric thorns and tesla burst, share a cooldown, and are activated separately from teleport. These abilities are activated by clicking the ability while crouching.");
        
        // 24
        let thornsEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_enabled") != 0;
        form.toggle("Electric Thorns Enabled", { defaultValue: thornsEnabled, tooltip: "Upon activation, any player hitting the tempest will take some extra damage." }); // 6
        form.label("If the Electric Thorns ability is enabled");
        
        // 26
        let thornsDuration = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_duration");
        form.slider("Thorns Duration", 3, 30, { defaultValue: thornsDuration }); // 6
        form.label("The amount of time in seconds Electric Thorns lasts.");
        
        // 28
        let thornsDamage = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_damage");
        form.slider("Thorns Damage", 1, 10, { defaultValue: thornsDamage }); // 6
        form.label("The amount of damage dealt back to the attacker.");
        
        // 30
        let teslaEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_enabled") != 0;
        form.toggle("Tesla Burst Enabled", { defaultValue: teslaEnabled, tooltip: "Upon activation, every time the Tempest hits someone, players in a radius take extra damage." }); // 6
        form.label("If the Tesla Burst ability is enabled");
        
        // 32
        let teslaDuration = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_duration");
        form.slider("Tesla Duration", 3, 30, { defaultValue: teslaDuration }); // 6
        form.label("The amount of time in seconds Tesla Burst lasts.");
        
        // 34
        let teslaRadius = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_radius");
        form.slider("Tesla Radius", 1, 20, { defaultValue: teslaRadius }); // 6
        form.label("The radius of the splash damage of Tesla Burst.");
        
        // 36
        let teslaDamage = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_splash_damage");
        form.slider("Tesla Damage", 1, 10, { defaultValue: teslaDamage }); // 6
        form.label("The amount of damage dealt to surrounding players during Tesla Burst.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.tempest.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.tempest.kill_timer_length", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.absorption_enabled", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.absorption_amplifier", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.absorption_is_per_kill", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.teleport_enabled", r.formValues[15] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.teleport_distance", r.formValues[17]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.teleport_cooldown", r.formValues[19]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.electricity_cooldown", r.formValues[22]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.thorns_enabled", r.formValues[24] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.thorns_duration", r.formValues[26]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.thorns_damage", r.formValues[28]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.tesla_enabled", r.formValues[30] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.tesla_duration", r.formValues[32]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.tesla_radius", r.formValues[34]);
            ScoreboardManager.setTrackedObjective("role_settings.tempest.tesla_splash_damage", r.formValues[36]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let killTimerLength = ScoreboardManager.getTrackedObjective("role_settings.tempest.kill_timer_length");
        let absorptionEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_enabled") != 0;
        let absorptionAmplifier = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_amplifier");
        let absorptionPerKill = ScoreboardManager.getTrackedObjective("role_settings.tempest.absorption_is_per_kill") != 0;
        let teleportEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_enabled") != 0; // 15
        let teleportDistance = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_distance"); // 15
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.tempest.teleport_cooldown");
        let electricityCooldown = ScoreboardManager.getTrackedObjective("role_settings.tempest.electricity_cooldown");
        let thornsEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_enabled") != 0;
        let thornsDuration = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_duration");
        let thornsDamage = ScoreboardManager.getTrackedObjective("role_settings.tempest.thorns_damage");
        let teslaEnabled = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_enabled") != 0;
        let teslaDuration = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_duration");
        let teslaRadius = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_radius");
        let teslaDamage = ScoreboardManager.getTrackedObjective("role_settings.tempest.tesla_splash_damage");

        let description = "Tempest is a murderer role that has a timer for kills. If they kill within their timer, they unlock new abilities.";
        description += "\nKill Timer: " + (killTimerLength / 10) + " minutes.";

        description += "\n\nAbility 1: Absorption. When you kill within the timer, gain absorption.";
        description += "\nAbsorption Enabled: " + absorptionEnabled;
        description += "\nAbsorption Amplifier: " + absorptionAmplifier;
        description += "\nAbsorption Per Kill: " + absorptionPerKill;

        description += "\n\nAbility 2: Teleport. Warp a few blocks forward, but not through walls. Activate with a normal right click.";
        description += "\nTeleport Enabled: " + teleportEnabled;
        description += "\nTeleport Distance: " + teleportDistance;
        description += "\nTeleport Cooldown: " + teleportCooldown + " seconds.";

        description += "\n\nAbility 3: Electric Thorns (Electric Ability). When someone hits you, deal 1 thorns damage. Activate electric abilities by crouching.";
        description += "\nElectric Thorns Enabled: " + thornsEnabled;
        description += "\nElectric Thorns Duration: " + thornsDuration + " seconds.";
        description += "\nElectric Thorns Damage: " + thornsDamage;
        description += "\nElectric Abilities Cooldown: " + electricityCooldown + " seconds.";

        description += "\n\nAbility 4: Tesla Burst (Electric Ability). When you hit someone, deal 2 damage to all players in a radius. Activate electric abilities by crouching.";
        description += "\nTesla Burst Enabled: " + teslaEnabled;
        description += "\nTesla Burst Duration: " + teslaDuration + " seconds.";
        description += "\nTesla Burst Splash Radius: " + teslaRadius;
        description += "\nTesla Burst Damage: " + teslaDamage;

        return description;
    }
}

export const TempestAbility = Object.freeze({
    ABSORPTION: { display: "Absorption", description: "Gain Absorption Every Kill!" },
    TELEPORT: { display: "Teleport", description: "Teleport Forward on Ability Use!" },
    ELECTRIC_THORNS: { display: "Electric Thorns", description: "Reflect Damage when hit on Crouch Ability Use!" },
    TESLA_BURST: { display: "Tesla Burst", description: "Deal Splash Damage to Players on Crouch Ability Use!" }
});
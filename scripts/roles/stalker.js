"use strict";

import { world, system, Player, Entity, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class StalkerRole extends Role {

    static MARKED_TARGETS_PROPERTY = "markedTargets";
    static CURRENT_STALK_ID_PROPERTY = "currentStalker";
    static STALK_TIMER_SCOREBOARD = "role_settings.stalker.before_stalk_duration";
    static STALK_PHASE_PROPERTY = "currentStalkPhase";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(StalkerRole._updateTimers, 1);
        system.runInterval(StalkerRole._updateStalkerLines, 5);
        system.runInterval(StalkerRole.drawStalkerDots, 5);
        world.afterEvents.entityDie.subscribe(async (event) => {
            let deadPlayer = event.deadEntity;
            let deadRole = RoleManager.getPlayerRole(deadPlayer);
            if (deadRole != null && deadRole.getRoleType() == RoleTypes.STALKER) {
                StalkerRole.endStalk(deadPlayer);
                let targetID = deadPlayer.getDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY);
                if (targetID != -1) {
                    let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
                    targetPlayer.sendMessage("§jYou feel a weight lifted off your shoulders. You may speak again...");
                    targetPlayer.removeEffect("minecraft:darkness");
                    ChatManager.sendDeadPlayersMessage("§j§o" + deadPlayer.name + "'s stalk of " + targetPlayer.name + " has ended.", LogItemType.ABILITY_MESSAGE);
                }
            }
            let allPlayers = world.getAllPlayers();
            let stalkers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.STALKER);
            stalkers.forEach((pl) => {
                let targetID = pl.getDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY);
                let stalkPhase = pl.getDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY);
                if (stalkPhase != 0 && targetID == ScoreboardManager.getPlayerID(deadPlayer)) {
                    StalkerRole.endStalk(pl);
                    pl.sendMessage("§jYour target died so your stalk has ended.");
                    ChatManager.sendDeadPlayersMessage("§j§o" + pl.name + "'s stalk has ended.", LogItemType.ABILITY_MESSAGE);
                }
            });
        });
        world.beforeEvents.entityHurt.subscribe(async (event) => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            let stalker = event.hurtEntity;
            let playerRole = RoleManager.getPlayerRole(stalker);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.STALKER) {
                let stalkPhase = stalker.getDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY);
                if (stalkPhase == 2) {
                    let targetID = stalker.getDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY);
                    let hittingPlayer = event.damageSource.damagingEntity;
                    if (hittingPlayer != null && targetID != -1 && targetID == ScoreboardManager.getPlayerID(hittingPlayer)) {
                        event.damage = 1;
                    }
                }
            }
        });
        super.initialize();
    }
    
    static drawStalkerDots() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let stalkers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.STALKER);

        let playersToShow = PlayerHandler.getPlayersThatSee(allPlayers, ParticleVisibilityType.STALKER_MARK);

        stalkers.forEach((stalker) => {
            let dotOffset = {x: 0, y: 2.4, z: 0 };

            let stalkerTag = StalkerRole._readTargetTag(stalker);

            stalkerTag.forEach((stalkedPlayerID) => {
                let stalkedPlayer = ScoreboardManager.getPlayerWithID(stalkedPlayerID);
                if (stalkedPlayer != null) {
                    let spawnLocation = PlayerHandler.addVectors(stalkedPlayer.location, dotOffset);

                    let settings = new MolangVariableMap();
                    settings.setColorRGBA('variable.color', {red:0,blue:0,green:0,alpha:1});
                    settings.setFloat('variable.dust_lifetime', .5);

                    let showPlayers = playersToShow.concat([stalker]);
                    showPlayers.forEach((showPl) => {
                        showPl.spawnParticle("umm:line_draw", spawnLocation, settings);
                    });

                }
            }); 
        });
    }

    static _updateTimers() {
        let allPlayers = world.getAllPlayers();
        let stalkers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.STALKER);
        stalkers.forEach((pl) => {
            let stalkPhase = pl.getDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY);
            if (stalkPhase == 0) {
                return;
            }

            let stalkTime = ScoreboardManager.getScoreboardObjective(pl, StalkerRole.STALK_TIMER_SCOREBOARD);

            ScoreboardManager.addScoreboardObjective(pl, StalkerRole.STALK_TIMER_SCOREBOARD, -1);

            if (stalkPhase == 2 && stalkTime == 40 * 20) {            
                let targetID = pl.getDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY);
                let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
                SoundManager.playSoundEffect([targetPlayer], SoundEffectType.STALKER_AMBIENCE);
                targetPlayer.stopSound("record.13");
                return;
            }
            
            if (stalkTime == 1) {
                // advance phase
                let targetID = pl.getDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY);
                let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
                if (targetPlayer == null || DeathHandler.consideredDead(targetPlayer)) {
                    pl.sendMessage("§jYour target has disappeared...");
                    ChatManager.sendDeadPlayersMessage("§j§o" + pl.name + "'s target is offline or dead. Their stalking phase has ended.");
                    StalkerRole.endStalk(pl);
                    return;
                }

                if (stalkPhase == 1) {
                    let stalkDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.stalk_duration");
                    pl.setDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY, 2);
                    ScoreboardManager.setScoreboardObjective(pl, StalkerRole.STALK_TIMER_SCOREBOARD, stalkDuration * 20);
    
                    let invisEnabled = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_enabled") != 0;
                    let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_duration");
                    let invisEnabledMessage = invisEnabled ? " You can turn invisible for " + invisDuration + " seconds by using your ability during stalk." : "";
                    pl.sendMessage("§jThe stalk has begun... you have " + stalkDuration + " seconds of stalk time." + invisEnabledMessage);
                    targetPlayer.sendMessage("§j§oYou feel as though someone is following you.");
                    targetPlayer.addEffect("minecraft:darkness", (stalkDuration - 1) * 20);
                    targetPlayer.addEffect("minecraft:slowness", (stalkDuration - 1) * 20, {amplifier: 1});
                    SoundManager.playSoundEffect([targetPlayer], SoundEffectType.STALKER_START);
                    ChatManager.sendDeadPlayersMessage("§j§o" + pl.name + "'s stalk of " + targetPlayer.name + " has begun.", LogItemType.ABILITY_MESSAGE);
                }
                else if (stalkPhase == 2) {
                    StalkerRole.endStalk(pl);
                    pl.sendMessage("§jYour stalk has ended...");
                    targetPlayer.sendMessage("§jYou feel a weight lifted off your shoulders. You may speak again...");
                    ChatManager.sendDeadPlayersMessage("§j§o" + targetPlayer.name + "'s stalk of " + targetPlayer.name + " has ended.", LogItemType.ABILITY_MESSAGE);
                }
            }
        });
    }

    static _updateStalkerLines() {
        let allPlayers = world.getAllPlayers();
        let stalkers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.STALKER);
        stalkers.forEach((pl) => {
            let stalkPhase = pl.getDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY);

            if (stalkPhase == 2) {
                // draw line to target
                let targetID = pl.getDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY);
                let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
                PlayerHandler.spawnParticlesBetweenPoints(pl, pl.location, targetPlayer.location, {red:0, green:0, blue:0, alpha: 1}, 5/20);
            }
        });
    }

    /**
     * 
     * @param {Player} stalker 
     */
    static endStalk(stalker) {
        stalker.setDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY, -1);
        stalker.setDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY, 0);
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_stalk_count");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.stalker.mark_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY, -1);
        player.setDynamicProperty(StalkerRole.MARKED_TARGETS_PROPERTY, "[]");
        player.setDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY, 0);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.NEUTRAL_KILLER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§jStalker";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Interact with players twice to take them out easily!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Interacting with a player twice lets you stalk them. While a player is stalked, they will be unable to deal damage to you and you will have a line drawn to their location.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.stalker.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.STALKER;
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
     * @param {Player} player 
     * @param {string} removeMessage
     * @returns {boolean} if a tag was successfully removed.
     */
    static removeTargetTagForPlayer(player, removeMessage) {
        let stalkers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.STALKER);
        stalkers.forEach((shadow) => {
            if (StalkerRole.removePlayerFromTargetTag(shadow, player) && removeMessage != null && removeMessage != "") {
                shadow.sendMessage(removeMessage);
            }
        });
    }

    /**
     * Removes a player from a stalker's tag.
     * @param {Player} stalker 
     * @param {Player} player 
     * @returns whether the tag has that player or not
     */
    static removePlayerFromTargetTag(stalker, player) {
        let playerID = ScoreboardManager.getPlayerID(player);
        let stalkTag = StalkerRole._readTargetTag(stalker);
        if (stalkTag.includes(playerID)) {
            stalkTag.splice(stalkTag.indexOf(playerID), 1);
            stalker.setDynamicProperty(StalkerRole.MARKED_TARGETS_PROPERTY, JSON.stringify(stalkTag));
            return true;
        }
        return false;
    }

    /**
     * Adds a player to the stalker's mark, if not already there.
     * @param {Player} stalker 
     * @param {Player} newPlayer 
     * @returns {boolean} if the player was successfully added.
     */
    static addPlayerToTargetTag(stalker, newPlayer) {
        let playerID = ScoreboardManager.getPlayerID(newPlayer);
        let stalkTag = StalkerRole._readTargetTag(stalker);
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_targets");
        if (!stalkTag.includes(playerID) && (stalkTag.length < maxMarked || maxMarked == -1)) {
            stalkTag.push(playerID);
            stalker.setDynamicProperty(StalkerRole.MARKED_TARGETS_PROPERTY, JSON.stringify(stalkTag));
            // cryomancer.sendMessage("§cMarking player");
            return true;
        }
        return false;
    }

    /**
     * Returns the number of players marked by a stalker
     * @param {Player} stalker 
     */
    static playerCountMarkedByStalker(stalker) {
        return StalkerRole._readTargetTag(stalker).length;
    }

    /**
     * Returns if the player has already been marked by the stalker
     * @param {Player} stalker 
     * @param {Player} newPlayer
     */
    static isPlayerInTargetsTag(stalker, newPlayer) {
        if (newPlayer == null) {
            return true;
        }
        let playerID = ScoreboardManager.getPlayerID(newPlayer);
        return playerID >= 0 && StalkerRole._readTargetTag(stalker).includes(playerID);
    }

    /**
     * Reads the tag of the stalker.
     * @param {Player} stalker 
     * @returns {number[]} a list of player ids who are marked by the stalker
     */
    static _readTargetTag(stalker) {
        return JSON.parse(stalker.getDynamicProperty(StalkerRole.MARKED_TARGETS_PROPERTY));
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player 
     */
    activateAbility(player) {
        let invisEnabled = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_enabled") != 0;

        let phase = player.getDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY);
        if (invisEnabled && phase == 2 && player.getEffect("minecraft:invisibility") == null) {
            let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_duration");
            player.addEffect("minecraft:invisibility", invisDuration * 20, {showParticles: false});
            ScoreboardManager.setPlayerActionCooldown(player, invisDuration + 5, false);
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        if (otherEntity.typeId != "minecraft:player") {
            return;
        }
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        let phase = player.getDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY);
        if (phase != 0) {
            player.sendMessage("You cannot start a new stalk while stalking!");
            return;
        }

        if (chargesRemaining != 0) {
            if (DeathHandler.consideredDead(otherEntity)) {
                player.sendMessage("That player is out of the game.");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            let isInMark = StalkerRole.isPlayerInTargetsTag(player, otherEntity);

            if (isInMark) {
                // start stalk
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + chargesRemaining + " stalks remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }


                let beforeInteract = PlayerHandler.beforePlayerInteract;
                beforeInteract.resetSignal();
                beforeInteract.interactType = InteractTypes.STALKER_BEGIN_STALK;
                let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.stalker.mark_cooldown");
                let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
                if (cancelInteraction) {
                    player.sendMessage("§j§oYou were unable to stalk " + otherEntity.name);
                    ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " tried to stalk " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                    ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? markCooldown : beforeInteract.failCooldown);
                    return;
                }

                // setting ids
                let targetID = ScoreboardManager.getPlayerID(otherEntity);
                player.setDynamicProperty(StalkerRole.CURRENT_STALK_ID_PROPERTY, targetID);
                player.setDynamicProperty(StalkerRole.STALK_PHASE_PROPERTY, 1);
                
                let beforeStalkDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.before_stalk_duration");
                ScoreboardManager.setScoreboardObjective(player, StalkerRole.STALK_TIMER_SCOREBOARD, beforeStalkDuration * 20);
                
                let stalkingRemovesTargets = ScoreboardManager.getTrackedObjective("role_settings.stalker.stalking_remove_targets") != 0;
                if (stalkingRemovesTargets) {
                    player.setDynamicProperty(StalkerRole.MARKED_TARGETS_PROPERTY, "[]");
                }

                let startingInvis = ScoreboardManager.getTrackedObjective("role_settings.stalker.starting_invisibility_duration");
                player.addEffect("minecraft:invisibility", startingInvis * 20, {showParticles: false});

                otherEntity.sendMessage("§j§oA shiver runs down your spine..... You may no longer speak...");
                otherEntity.addEffect("minecraft:darkness", 20 * (beforeStalkDuration / 3), {showParticles: false});
                player.addEffect("minecraft:weakness", 20 * (beforeStalkDuration - 1), {showParticles: false});
                player.sendMessage("§jStarted stalking " + otherEntity.name + ". Stalking starts in " + beforeStalkDuration + " seconds.");
                SoundManager.playSoundEffect([otherEntity], SoundEffectType.INFECTION_EERIE);
                SoundManager.playSoundEffect([player], SoundEffectType.STALKER_BEGIN_STALK);
                
                ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " started stalking " + otherEntity.name + ".", LogItemType.ABILITY_MESSAGE);            
                PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.STALKER_BEGIN_STALK);
                ScoreboardManager.setPlayerActionCooldown(player, beforeStalkDuration, false);
                player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
                return;
            }
            else {
                // mark new player
                let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_targets");
                if (maxMarked != -1 && StalkerRole.playerCountMarkedByStalker(player) >= maxMarked) {
                    ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                    player.sendMessage("§j§oYou've marked the maximum number of players already! (" + maxMarked + ")");
                    return;
                }
                
                let beforeInteract = PlayerHandler.beforePlayerInteract;
                beforeInteract.resetSignal();
                beforeInteract.interactType = InteractTypes.STALKER_TARGET_MARK;
                let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.stalker.mark_cooldown");
                let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
                if (cancelInteraction) {
                    player.sendMessage("§j§oYou were unable to mark " + otherEntity.name);
                    ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " tried to mark " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                    ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? markCooldown : beforeInteract.failCooldown);
                    return;
                }

                StalkerRole.addPlayerToTargetTag(player, otherEntity);
                player.sendMessage("§j§oMarked " + otherEntity.name + " as a target.");
                ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " marked " + otherEntity.name + " as a stalker target.", LogItemType.ABILITY_MESSAGE);            
                PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.STALKER_TARGET_MARK);
            }


            // activate ability 

            // ability effect

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.stalker.mark_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
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
        form.title("Stalker Settings");

        form.divider();
        form.label("The Stalker is a neutral killing role that can stalk players by interacting with them twice. They can mark people in mass and then mark someone again to stalk them. When stalking, first the target is notified and the stalker gets invis. After a short timer, stalking begins, during which the stalker cannot be damaged by the stalked, and the stalker can see where the stalked is at all times.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.stalker.enabled") != 0;
        form.toggle("Stalker Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.stalker.mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of marking. Also the cooldown after a stalk ends.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_stalk_count");
        form.slider("Max Stalk Count", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the stalker can stalk players. -1 is infinite uses");
        
        let maxTargets = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_targets");
        form.slider("Max Target Count", -1, world.getAllPlayers().length+3, { defaultValue: maxTargets }); // 8
        form.label("The max number of people that can be marked to be a target. -1 is infinite players");
        
        let stalkingRemovesTargets = ScoreboardManager.getTrackedObjective("role_settings.stalker.stalking_remove_targets") != 0;
        form.toggle("Stalk Removes Targets", { defaultValue: stalkingRemovesTargets }); // 10
        form.label("If true, all players will be cleared of being a target when the stalker starts stalking someone");
        
        let startingInvis = ScoreboardManager.getTrackedObjective("role_settings.stalker.starting_invisibility_duration");
        form.slider("Stalk Starting Invis", 0, 15, { defaultValue: startingInvis }); // 12
        form.label("The time in seconds of the invisibility that is given at the start of stalking.");
        
        let beforeStalkDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.before_stalk_duration");
        form.slider("Before Stalk Duration", 0, 30, { valueStep: 5, defaultValue: beforeStalkDuration }); // 14
        form.label("The time in seconds of phase 1 of stalking, where the effect is not active but the target has been notified.");
        
        let stalkDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.stalk_duration");
        form.slider("Stalk Duration", 30, 120, { valueStep: 5, defaultValue: stalkDuration }); // 16
        form.label("The duration of the main stalk phase. The player being stalked deals 1 damage to the stalker at this time. Recommended to be at least 40 seconds for sound effects.");
        
        let invisEnabled = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_enabled") != 0;
        form.toggle("Invisibility Action Enabled", { defaultValue: invisEnabled }); // 18
        form.label("If true, allows the stalker to use their ability to gain invisibility for a small time.");
        
        let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_duration");
        form.slider("Invis Action Duration", 5, 120, { valueStep: 5, defaultValue: invisDuration }); // 20
        form.label("The duration of the invisibility gained from the invisibility action, if enabled.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.stalker.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.stalker.mark_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.max_stalk_count", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.max_targets", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.stalking_remove_targets", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.starting_invisibility_duration", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.before_stalk_duration", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.stalk_duration", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.invisibility_action_enabled", r.formValues[18] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.stalker.invisibility_action_duration", r.formValues[20]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.stalker.mark_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_stalk_count");
        let maxTargets = ScoreboardManager.getTrackedObjective("role_settings.stalker.max_targets");
        let stalkingRemovesTargets = ScoreboardManager.getTrackedObjective("role_settings.stalker.stalking_remove_targets") != 0;
        let startingInvis = ScoreboardManager.getTrackedObjective("role_settings.stalker.starting_invisibility_duration");
        let beforeStalkDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.before_stalk_duration");
        let stalkDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.stalk_duration");
        let invisEnabled = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_enabled") != 0;
        let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.stalker.invisibility_action_duration");

        let description = "Stalker is a neutral killer that is able to interact with player twice to stalk them. Stalking has two phases. During the first, the stalked player will be notified and have some small prep time. During the second phase, the stalked player can't deal damage to the stalker and the stalker has a line drawn towards the stalked player. The Stalker can turn invisible during phase 2.";
        description += "\n\nMark (prep and start) Cooldown: " + cooldownTime + " seconds";
        description += "\nMax Stalk Uses: " + abilityUses;
        description += "\nMax Targets: " + maxTargets;
        description += "\nStalking Remove Targets: " + stalkingRemovesTargets;
        description += "\nInvis upon Stalk Duration: " + startingInvis + " seconds";
        description += "\nPhase 1 Duration (Notify): " + beforeStalkDuration + " seconds";
        description += "\nPhase 2 Duration (Stalk): " + stalkDuration + " seconds";
        description += "\nInvis Ability (Stalk): " + invisEnabled;
        description += "\nInvis Ability Duration: " + invisDuration;
        return description;
    }
}
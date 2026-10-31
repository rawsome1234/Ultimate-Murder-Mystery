"use strict";

import { world, system, Player, Entity, PlayerHotbarSelectedSlotChangeAfterEvent, EntityHurtAfterEvent, EntityHitEntityAfterEvent, EquipmentSlot } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class GhostWriterRole extends MurdererRole {

    static TASK_TIME_SCOREBOARD = "role_settings.ghost_writer.write_cooldown";
    static START_TASK_LOCATION = "starting_location";
    static TASK_TARGET_PLAYER_ID_PROPERTY = "target_ID";
    static ASSIGNED_TASK_PROPERTY = "assigned_task";
    static GET_PUNCHED_TASK_GOAL_PUNCHES = "goal_punches";
    static PUNCHED_PLAYERS_PROPERTY = "punched_players";
    static TRAVEL_DISTANCE_PROPERTY = "distance_traveled";
    static GHOST_WRITER_ID_PROPERTY = "ghost_writer";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(GhostWriterRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(GhostWriterRole.onPlayerDeath);
        }
        system.runInterval(GhostWriterRole._updateTaskTimes, 1);
        world.afterEvents.entityHitEntity.subscribe(GhostWriterRole._onEntityHitEntity)
        super.initialize();
    }

    static _updateTaskTimes() {
        let playersWithTasks = world.getAllPlayers().filter((pl) => !DeathHandler.consideredDead(pl) && GhostWriterRole.getTaskID(pl) >= 0);
        playersWithTasks.forEach((pl) => {
            let timer = ScoreboardManager.getScoreboardObjective(pl, GhostWriterRole.TASK_TIME_SCOREBOARD);
            let secondsLeft = Math.ceil(timer / 20);
            let minutesLeft = Math.floor(secondsLeft / 60);
            // pl.sendMessage("Minutes left: " + minutesLeft);
            let secondsToShow = secondsLeft - (minutesLeft * 60);
            let message = "§tTask Time Left: " + minutesLeft + ":" + secondsToShow.toString().padStart(2, '0');
            if (timer == 0) {
                message = "§cOut of time. Kill to Reset.";
                pl.onScreenDisplay.setActionBar(message);
                GuessingManager.killGuessedPlayer(pl);
                GhostWriterRole.finishTask(pl, false);
                return;
            }
            pl.onScreenDisplay.setActionBar(message);
            GhostWriterRole.updatePlayerTasks(pl);
            
            ScoreboardManager.addScoreboardObjective(pl, GhostWriterRole.TASK_TIME_SCOREBOARD, -1);
        });
    }

    static updatePlayerTasks(player) {
        let task = GhostWriterRole.getTaskID(player);
        if (task == GhostWriterTasks.BE_NEAR_PLAYERS_TASK.id) {
            // check proximity
            let alivePlayers = world.getAllPlayers().filter((pl) => ScoreboardManager.getPlayerID(pl) >= 0 && !DeathHandler.consideredDead(pl) && pl.id != player.id);
            let nearPlayers = Util.getPlayersInRadius(alivePlayers, player.location, GhostWriterTasks.BE_NEAR_PLAYERS_TASK.radius);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Player is near " + nearPlayers.length + " players"))
            let playersRequired = player.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
            if (nearPlayers.length >= playersRequired) {
                GhostWriterRole.finishTask(player, true);
            }
        }
        if (task == GhostWriterTasks.TRAVEL_BLOCKS_TASK.id) {
            // check distance traveled
            let previousLocation = player.getDynamicProperty(GhostWriterRole.START_TASK_LOCATION);
            let distanceBetweenLocations = PlayerHandler.distanceBetweenLocations(previousLocation, player.location);
            player.setDynamicProperty(GhostWriterRole.START_TASK_LOCATION, player.location);
            let distanceSoFar = player.getDynamicProperty(GhostWriterRole.TRAVEL_DISTANCE_PROPERTY);
            player.setDynamicProperty(GhostWriterRole.TRAVEL_DISTANCE_PROPERTY, distanceSoFar + distanceBetweenLocations);

            let distanceToTraveled = player.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
            if (distanceBetweenLocations + distanceSoFar >= distanceToTraveled) {
                GhostWriterRole.finishTask(player, true);
            }
        }
    }

    /**
     * 
     * @param {EntityHitEntityAfterEvent} event 
     */
    static _onEntityHitEntity(event) {
        let punchedPlayer = event.hitEntity;
        let hittingPlayer = event.damagingEntity;

        if (punchedPlayer.typeId != "minecraft:player" || hittingPlayer.typeId != "minecraft:player") {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("One punch was not a player"));
            return;
        }

        // if (hittingPlayer.getComponent("equippable").getEquipment(EquipmentSlot.Mainhand) != null) {
        //     // world.getAllPlayers().forEach((pl) => pl.sendMessage("Not holding empty hand"));
        //     return;
        // }
        
        let taskType = GhostWriterRole.getTaskID(punchedPlayer);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Hit player task: " + taskType));
        if (taskType != null && taskType == GhostWriterTasks.GET_PUNCHED_TASK.id) {
            // GET PUNCHED PROGRESS
            let hittingPlayerID = punchedPlayer.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
            if (hittingPlayerID == ScoreboardManager.getPlayerID(hittingPlayer)) {
                let punchesLeft = punchedPlayer.getDynamicProperty(GhostWriterRole.GET_PUNCHED_TASK_GOAL_PUNCHES);
                punchesLeft--;
                punchedPlayer.setDynamicProperty(GhostWriterRole.GET_PUNCHED_TASK_GOAL_PUNCHES, punchesLeft);
                punchedPlayer.sendMessage("Successfully hit! " + punchesLeft + " punches left!");
                if (punchesLeft <= 0) {
                    GhostWriterRole.finishTask(punchedPlayer, true);
                }
            }
        }
        taskType = GhostWriterRole.getTaskID(hittingPlayer);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Punching player task: " + taskType));
        if (taskType != null && taskType == GhostWriterTasks.PUNCH_PLAYERS_TASK.id) {
            // PUNCH PLAYERS PROGRESS
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Processing punch"));
            let punchedPlayers = JSON.parse(hittingPlayer.getDynamicProperty(GhostWriterRole.PUNCHED_PLAYERS_PROPERTY));
            let punchedID = ScoreboardManager.getPlayerID(punchedPlayer);
            if (!punchedPlayers.includes(punchedID)) {
                // add to punch list
                punchedPlayers.push(punchedID);
                hittingPlayer.setDynamicProperty(GhostWriterRole.PUNCHED_PLAYERS_PROPERTY, JSON.stringify(punchedPlayers));

                let playersToPunch = hittingPlayer.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY)
                let playersRemaining = playersToPunch - punchedPlayers.length;
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("New player! now at " + punchedPlayers.length));
                hittingPlayer.sendMessage("Successful hit! " + playersRemaining + " players remaining!");
                if (playersRemaining <= 0) {
                    GhostWriterRole.finishTask(hittingPlayer, true);
                }
            }
        }
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let resetOnKill = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.writing_cooldown_resets_on_kill") != 0;
        if (killer != null && killer.typeId == "minecraft:player" && ScoreboardManager.getPlayerID(killer) != -1) {
            let playerRole = RoleManager.getPlayerRole(killer);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.GHOST_WRITER && resetOnKill) {
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_cooldown");
                ScoreboardManager.setPlayerActionCooldown(killer, actionCooldown);
                killer.sendMessage("§tAfter that kill, your write cooldown has reset.");
            }
        }
        let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let deadPlayerID = ScoreboardManager.getPlayerID(playerWhoDied);
        livingPlayers.forEach((pl) => {
            let taskType = GhostWriterRole.getTaskID(pl);
            if (taskType != null && taskType == GhostWriterTasks.GET_PUNCHED_TASK) {
                let hittingPlayerID = pl.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
                if (hittingPlayerID == deadPlayerID) {
                    GhostWriterRole.finishTask(pl, true)
                } 
            }
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§tGhost Writer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Write onto ghost bodies to send players tasks!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Right click a ghost body with your ability to send a player a task. Your cooldown for writing is reset when you kill.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return true;
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
        return RoleTypes.GHOST_WRITER;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0 && otherEntity.typeId == "umm:ghost_body") {
            if (!GhostManager.canInteractWithGhosts(player, otherEntity)) {
                player.sendMessage("§tAlready wrote about that ghost!");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }

            let targetPlayers = world.getAllPlayers().filter((pl) => {
                return pl.id != player.id && !DeathHandler.consideredDead(pl) && GhostWriterRole.getTaskID(pl) < 0 && RoleManager.getPlayerRole(pl).getAlignment() != RoleAlignment.MURDERER;
            });
            if (targetPlayers.length < 1) {
                player.sendMessage("There's no players to give tasks!");
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }
            
            // ability effect
            let targetPlayer = targetPlayers[ScoreboardManager.rollRandomNumber(0, targetPlayers.length)];
            let taskType = GhostWriterRole.createAndAssignTask(player, targetPlayer);
            // otherEntity.remove();
            GhostManager.markAsInteracted(player, otherEntity);
            GhostManager.onGhostInteract.emit(player, otherEntity);
            world.getAllPlayers().forEach((pl) => PlayerHandler.spawnParticlesBetweenPoints(pl, player.location, targetPlayer.location, {red:0,green:0,blue:1,alpha:1}, 10));
            
            // ability activate message
            player.sendMessage("§t§oWrote " + GhostWriterRole._getWriteFlavorText() + " and sent a task to " + targetPlayer.name);
            ChatManager.sendDeadPlayersMessage("§t§o" + player.name + " gave " + targetPlayer.name + " a " + taskType.task_name + " task.", LogItemType.ABILITY_MESSAGE);
            SoundManager.playSoundEffect([player], SoundEffectType.GHOST_WRITER_WRITE);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    static getTaskID(player) {
        let property = player.getDynamicProperty(GhostWriterRole.ASSIGNED_TASK_PROPERTY);
        return property == null ? -1 : property;
    }

    /**
     * 
     * @param {Player} targetPlayer 
     * @param {boolean} successful 
     */
    static finishTask(targetPlayer, successful) {
        targetPlayer.setDynamicProperty(GhostWriterRole.ASSIGNED_TASK_PROPERTY, -1);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Completing task!"));
        let ghostWriterID = targetPlayer.getDynamicProperty(GhostWriterRole.GHOST_WRITER_ID_PROPERTY);
        let ghostWriter = ScoreboardManager.getPlayerWithID(ghostWriterID);
        if (ghostWriter != null) {
            let successMessage = successful ? "completed" : "failed";
            let message = "§t§o" + targetPlayer.name + " " + successMessage + " their task.";
            ghostWriter.sendMessage(message);
        }
        if (successful) {
            targetPlayer.sendMessage("§3You completed your task!");
            SoundManager.playSoundEffect([targetPlayer], SoundEffectType.PLAYER_COMPLETE_TASK);
        }
    }

    /**
     * 
     * @param {Player} ghostWriter 
     * @param {Player} targetPlayer 
     */
    static createAndAssignTask(ghostWriter, targetPlayer) {
        let targetPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers()).filter((pl) => {
            return pl.id != ghostWriter.id && pl.id != targetPlayer.id;
        });
        let taskTypes = [GhostWriterTasks.GET_PUNCHED_TASK, GhostWriterTasks.BE_NEAR_PLAYERS_TASK, GhostWriterTasks.PUNCH_PLAYERS_TASK, GhostWriterTasks.TRAVEL_BLOCKS_TASK];
        taskTypes = taskTypes.filter((t) => t.players_required <= targetPlayers.length && t.enabled);
        let taskOfChoice = taskTypes[ScoreboardManager.rollRandomNumber(0, taskTypes.length)];
        let interactionTarget = targetPlayers.length > 0 ? targetPlayers[ScoreboardManager.rollRandomNumber(0, targetPlayers.length)] : null;
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Assigning task " + taskOfChoice.task_name + " from " + targetPlayers.length + " targets: target " + (interactionTarget == null ? "none" : interactionTarget.name)));
        let taskTime = GhostWriterRole.getTaskTime(targetPlayer, taskOfChoice, interactionTarget);
        targetPlayer.setDynamicProperty(GhostWriterRole.ASSIGNED_TASK_PROPERTY, taskOfChoice.id);
        targetPlayer.setDynamicProperty(GhostWriterRole.GHOST_WRITER_ID_PROPERTY, ScoreboardManager.getPlayerID(ghostWriter));
        GhostWriterRole.setTaskTarget(targetPlayer, taskOfChoice, interactionTarget);
        ScoreboardManager.setScoreboardObjective(targetPlayer, GhostWriterRole.TASK_TIME_SCOREBOARD, taskTime*20);
        GhostWriterRole.sendTaskMessage(targetPlayer, taskOfChoice, interactionTarget);
        SoundManager.playSoundEffect([targetPlayer], SoundEffectType.PLAYER_RECEIVE_TASK);
        targetPlayer.setDynamicProperty(GhostWriterRole.START_TASK_LOCATION, targetPlayer.location);
        return taskOfChoice;
    }

    /**
     * 
     * @param {Player} targetPlayer 
     * @param {GhostWriterTasks} task 
     * @param {Player?} interactionTarget 
     */
    static setTaskTarget(targetPlayer, task, interactionTarget) {
        switch (task) {
            case GhostWriterTasks.GET_PUNCHED_TASK:
                let targetID = ScoreboardManager.getPlayerID(interactionTarget);
                targetPlayer.setDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY, targetID);
                targetPlayer.setDynamicProperty(GhostWriterRole.GET_PUNCHED_TASK_GOAL_PUNCHES, task.value);
                break;
            case GhostWriterTasks.PUNCH_PLAYERS_TASK:
            case GhostWriterTasks.BE_NEAR_PLAYERS_TASK:
                let allLivingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers()).filter((p) => p.id != targetPlayer.id);
                let punchablePlayers = Math.max(Math.floor(task.value * allLivingPlayers.length), 1);
                targetPlayer.setDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY, punchablePlayers);
                targetPlayer.setDynamicProperty(GhostWriterRole.PUNCHED_PLAYERS_PROPERTY, "[]");
                break;
            case GhostWriterTasks.TRAVEL_BLOCKS_TASK:
                targetPlayer.setDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY, task.value);
                targetPlayer.setDynamicProperty(GhostWriterRole.TRAVEL_DISTANCE_PROPERTY, 0);
                break;
        }
    }

    /**
     * Gets the amount of time a task will take.
     * @param {Player} targetPlayer 
     * @param {GhostWriterTasks} task 
     * @param {Player?} interactionTarget 
     */
    static getTaskTime(targetPlayer, task, interactionTarget) {
        let baseTime = task.time;
        switch (task) {
            case GhostWriterTasks.GET_PUNCHED_TASK:
                baseTime += (PlayerHandler.distanceBetweenLocations(targetPlayer.location, interactionTarget.location) * task.time_per_block);
                break;
            case GhostWriterTasks.PUNCH_PLAYERS_TASK:
                    let allLivingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers()).filter((p) => p.id != targetPlayer.id);
                let furthestPlayer = allLivingPlayers.reduce((p1, p2) => {
                    let p1Distance = PlayerHandler.distanceBetweenLocations(p1.location, targetPlayer.location);
                    let p2Distance = PlayerHandler.distanceBetweenLocations(p2.location, targetPlayer.location);
                    return p1Distance > p2Distance ? p1 : p2;
                });
                baseTime += (PlayerHandler.distanceBetweenLocations(targetPlayer.location, furthestPlayer.location) * task.time_per_block);
                break;
            default:
                break;
        }
        return baseTime;
    }

    /**
     * 
     * @param {Player} player 
     * @param {GhostWriterTasks} taskType 
     * @param {Player?} interactionTarget
     */
    static sendTaskMessage(player, taskType, interactionTarget) {
        let taskMessage = "" + taskType.display_name;
        switch (taskType) {
            case GhostWriterTasks.GET_PUNCHED_TASK:
                taskMessage = taskMessage.replace("<P>", interactionTarget.name).replace("<X>", taskType.value);
                break;
            case GhostWriterTasks.BE_NEAR_PLAYERS_TASK:
                let playerCount = player.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
                taskMessage = taskMessage.replace("<r>", taskType.radius).replace("<X>", playerCount);
                break;
            case GhostWriterTasks.PUNCH_PLAYERS_TASK:
                let uniquePlayers = player.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
                taskMessage = taskMessage.replace("<X>", uniquePlayers);
                break;
            case GhostWriterTasks.TRAVEL_BLOCKS_TASK:
                let distanceReq = player.getDynamicProperty(GhostWriterRole.TASK_TARGET_PLAYER_ID_PROPERTY);
                taskMessage = taskMessage.replace("<X>", distanceReq);
        }
        player.sendMessage("§3You've been assigned a task by a Ghost Writer! " + taskMessage);
    }

    static _getWriteFlavorText() {
        let texts = ["a nice story", "an evil tale", "a 30 chapter novel", "an extensive essay"];
        return texts[ScoreboardManager.rollRandomNumber(0, texts.length)];
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Ghost Writer Settings");

        form.divider();
        form.label("The ghost writer is a murderer role that is able to write on a ghost body to force another player to complete a task. If the player fails the task, they die.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.enabled") != 0;
        form.toggle("Ghost Writer Enabled", { defaultValue: roleEnabled }); // 2
        
        form.divider();
        
        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_cooldown");
        form.slider("Write Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of writing.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_uses");
        form.slider("Write Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times write can be used. -1 is infinite uses");
        
        let writingConsumesGhost = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.writing_consumes_ghost") != 0;
        form.toggle("Writing Cleans Ghost", { defaultValue: writingConsumesGhost }); // 8
        form.label("If writing removes a ghost body.");
        
        let resetOnKill = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.writing_cooldown_resets_on_kill") != 0;
        form.toggle("Reset On Kill", { defaultValue: resetOnKill }); // 10
        form.label("If true, will reset the Write cooldown when the Ghost Writer kills.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.ghost_writer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.ghost_writer.write_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost_writer.write_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.ghost_writer.writing_consumes_ghost", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.ghost_writer.writing_cooldown_resets_on_kill", r.formValues[10] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.write_uses");
        let writingConsumesGhost = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.writing_consumes_ghost") != 0;
        let resetOnKill = ScoreboardManager.getTrackedObjective("role_settings.ghost_writer.writing_cooldown_resets_on_kill") != 0;

       let description = "The ghost writer is a murderer that is able to send a player a task by interacting with a ghost. If the player fails that task, they die.";
       description += "\n\nWrite Cooldown: " + cooldownTime + " seconds.";
       description += "\nWrite Uses: " + abilityUses;
       description += "\nWriting Consumes the Ghost: " + writingConsumesGhost;
       description += "\nKilling Resets Cooldown: " + resetOnKill;
       return description;
    }
}

export const GhostWriterTasks = Object.freeze({
    GET_PUNCHED_TASK: { id: 0, task_name: "Get Punched", display_name: "Get punched By <P> <X> times.", value: 3, players_required: 1, time: 30, time_per_block: .34, enabled: true },
    BE_NEAR_PLAYERS_TASK: { id: 1, task_name: "Be Near Players", display_name: "Be within <r> blocks of <X> players.", value: .4, players_required: 1, time: 45, radius: 3, enabled: true },
    PUNCH_PLAYERS_TASK: { id: 2, task_name: "Punch Players", display_name: "Punch <X> unique players.", value: .4, players_required: 1, time: 30, time_per_block: .34, enabled: false },
    TRAVEL_BLOCKS_TASK: { id: 3, task_name: "Travel Blocks", display_name: "Travel <X> blocks.", players_required: 0, value: 80, time: 20, enabled: false }
});
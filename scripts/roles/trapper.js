"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class TrapperRole extends InnocentRole {

    static TRAP_TIME_SCOREBOARD = "role_settings.trapper.trap_uptime";
    static TRAP_LOCATION_PROPERTY = "spellLocation";
    static TRAP_DIMENSION_PROPERTY = "spellDimension";
    static TRAPPED_PLAYERS_PROPERTY = "trappedPlayers";
    static TIME_IN_TRAP_PROPERTY = "timeInTrap";
    static IS_IN_TRAP_PROPERTY = "isInTrap";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
        system.runInterval(TrapperRole._updateTrapTimers, 1);
        system.runInterval(TrapperRole._updateTrapDetection, 5);
        system.runInterval(TrapperRole._spawnTrapParticles, 20);
    }

    static _updateTrapTimers() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let trappers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TRAPPER);
        let trappersWithTrap = trappers.filter((tr) => !DeathHandler.consideredDead(tr) && tr.getDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY) != null);
        trappersWithTrap.forEach((trapper) => {
            ScoreboardManager.addScoreboardObjective(trapper, TrapperRole.TRAP_TIME_SCOREBOARD, -1);
            let trapTime = ScoreboardManager.getScoreboardObjective(trapper, TrapperRole.TRAP_TIME_SCOREBOARD);

            if (trapTime == 0) {
                // end trap & send message
                TrapperRole.endTrap(trapper);
                return;
            }
        });
    }

    static _updateTrapDetection() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let trappers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TRAPPER);
        let trappersWithTrap = trappers.filter((tr) => !DeathHandler.consideredDead(tr) && tr.getDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY) != null);
        
        allPlayers.forEach((pl) => {
            pl.setDynamicProperty(TrapperRole.IS_IN_TRAP_PROPERTY, false);
        });
        
        trappersWithTrap.forEach((trapper) => {
            let trapLocation = trapper.getDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY);
            let trapDim = trapper.getDynamicProperty(TrapperRole.TRAP_DIMENSION_PROPERTY);
            let trapRadius = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_radius");

            let alivePlayers = world.getAllPlayers().filter((pl) => ScoreboardManager.getScoreboardObjective(pl, "player.player_id") >= 0 && !DeathHandler.consideredDead(pl));
            let playersInTrap = Util.getPlayersInRadius(alivePlayers, trapLocation, trapRadius, trapDim);

            let playersCaughtInTrap = JSON.parse(trapper.getDynamicProperty(TrapperRole.TRAPPED_PLAYERS_PROPERTY)); 
            let initialLength = playersCaughtInTrap.length;
            let trapInteractType = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_interact_type");
            playersInTrap.forEach((inTrap) => {
                let playerID = ScoreboardManager.getPlayerID(inTrap);
                // if not in this trap
                if (!playersCaughtInTrap.includes(playerID)) {
                    // check if they're in any trap
                    let hasBeenInTrap = inTrap.getDynamicProperty(TrapperRole.IS_IN_TRAP_PROPERTY);
                    let timeInTrap = inTrap.getDynamicProperty(TrapperRole.TIME_IN_TRAP_PROPERTY);
                    if (!hasBeenInTrap) {
                        inTrap.setDynamicProperty(TrapperRole.IS_IN_TRAP_PROPERTY, true);
                        inTrap.setDynamicProperty(TrapperRole.TIME_IN_TRAP_PROPERTY, timeInTrap + 5);
                        timeInTrap += 5;
                    }
                    let inTrapTime = ScoreboardManager.getTrackedObjective("role_settings.trapper.time_in_trap_to_catch");
                    if (timeInTrap < inTrapTime * 20) {
                        return;
                    }
                    
                    if (trapInteractType == 1) {
                        playersCaughtInTrap.push(playerID);
                        trapper.sendMessage("§gSomeone entered your trap.");
                        SoundManager.playSoundEffect([trapper], SoundEffectType.BASIC_MARK);
                    }
                    if (trapInteractType == 2) {
                        let beforeInteract = PlayerHandler.beforePlayerInteract;
                        beforeInteract.resetSignal();
                        beforeInteract.interactType = InteractTypes.TRAPPER_CATCH;
                        PlayerHandler.beforePlayerInteract.emitInteract(trapper, inTrap);
                        if (PlayerHandler.beforePlayerInteract.cancel) {
                            // trapper.sendMessage()
                            return;
                        }
                        SoundManager.playSoundEffect([trapper], SoundEffectType.BASIC_MARK);
                        playersCaughtInTrap.push(playerID);
                        trapper.sendMessage("§g" + inTrap.name + " entered your trap.");
                    }
                    ChatManager.sendDeadPlayersMessage("§g" + inTrap.name + " entered " + trapper.name + "'s trap.", LogItemType.ABILITY_MESSAGE);
                }
            });

            // trapper.sendMessage("Originally had " + initialLength + " players in trap, now have " + playersCaughtInTrap.length);
            if (initialLength != playersCaughtInTrap.length) {
                trapper.setDynamicProperty(TrapperRole.TRAPPED_PLAYERS_PROPERTY, JSON.stringify(playersCaughtInTrap));
            }
        });

        allPlayers.forEach((pl) => {
            let isInTrap = pl.getDynamicProperty(TrapperRole.IS_IN_TRAP_PROPERTY);
            if (!isInTrap) {
                pl.setDynamicProperty(TrapperRole.TIME_IN_TRAP_PROPERTY, 0);
            }
        });
    }

    static _spawnTrapParticles() {
        if (world.getAllPlayers().length <= 0) {
            return;
        }
        let trappers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.TRAPPER);
        let trappersWithTrap = trappers.filter((trap) => !DeathHandler.consideredDead(trap) && trap.getDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY) != null);
        let trapRadius = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_radius");
        let playersCanSeeTrap = PlayerHandler.getPlayersThatSee(world.getAllPlayers(), ParticleVisibilityType.TRAPPER_TRAP_RADIUS);

        let particleSettings = new MolangVariableMap();
        particleSettings.setColorRGBA('variable.color', {red:1,blue:0,green:(150/255),alpha:1});
        particleSettings.setFloat('variable.dust_lifetime', 1);
        
        trappersWithTrap.forEach((trapper) => {
            let trapLocation = trapper.getDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY);
            let trapDim = trapper.getDynamicProperty(TrapperRole.TRAP_DIMENSION_PROPERTY);
            let toShow = playersCanSeeTrap.concat([trapper]);
            // spawn bomb particles
            let particleLocations = [PlayerHandler.addVectors(trapLocation, {x:0,y:.5,z:0})];
            for (let i = -trapRadius; i < trapRadius; i++) {
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:i,y:-trapRadius,z:trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:i,y:trapRadius,z:trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:i,y:-trapRadius,z:-trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:i,y:trapRadius,z:-trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:trapRadius,y:i,z:trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:-trapRadius,y:i,z:trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:trapRadius,y:i,z:-trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:-trapRadius,y:i,z:-trapRadius}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:trapRadius,y:trapRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:trapRadius,y:-trapRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:-trapRadius,y:trapRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(trapLocation, {x:-trapRadius,y:-trapRadius,z:i}));
            }
            
            if (particleLocations.length > 0) {
                toShow.forEach((player) => {
                    if (player.dimension.id != trapDim) {
                        return;
                    }
                    try {    
                        particleLocations.forEach((loc) => player.spawnParticle("umm:line_draw", loc, particleSettings));
                    }
                    catch (e) {
                        return;
                    }
                });
            }
        });
    }

    /**
     * 
     * @param {Player} trapper 
     */
    static endTrap(trapper) {
        trapper.setDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY, null);
        let playerIDsInTrap = JSON.parse(trapper.getDynamicProperty(TrapperRole.TRAPPED_PLAYERS_PROPERTY));
        let playersInTrap = playerIDsInTrap.map((id) => ScoreboardManager.getPlayerWithID(id));
        playersInTrap = playersInTrap.filter((pl) => pl != null);

        // interact with each player
        let beforeInteract = PlayerHandler.beforePlayerInteract;
        beforeInteract.resetSignal();
        beforeInteract.interactType = InteractTypes.TRAPPER_CATCH;
        // removes players that shouldn't be interacted with
        playersInTrap = playersInTrap.filter((pl) => {
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.TRAPPER_CATCH;
            PlayerHandler.beforePlayerInteract.emitInteract(trapper, pl);
            return !PlayerHandler.beforePlayerInteract.cancel;
        });

        Util.shuffle(playersInTrap);

        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_placement_cooldown");
        if (playersInTrap.length <= 0) {
            trapper.sendMessage("§gYour trap caught no players.");
            ChatManager.sendDeadPlayersMessage("§g" + trapper.name + "'s trap caught no one.", LogItemType.ABILITY_MESSAGE);
            ScoreboardManager.setPlayerActionCooldown(trapper, actionCooldown);
            return;
        }
        let playerRoles = playersInTrap.map((pl) => Util.removeColorCodes(RoleManager.getPlayerRole(pl).getDisplayName()));
        Util.shuffle(playerRoles);

        let playerNamesMessage = "Players in the trap: " + Util.formatStringList(playersInTrap.map((pl) => pl.name), ", ", true) + ". ";
        let rolesMessage = "Roles in the trap: " + Util.formatStringList(playerRoles, ", ", true) + ". ";
        let message = "§gYour trap has ended! "
        let deadMessage = "§g" + trapper.name + "'s trap has ended. "
        SoundManager.playSoundEffect([trapper], SoundEffectType.SPY_INFO_RETURN);
        
        let infoToGive = ScoreboardManager.getTrackedObjective("role_settings.trapper.info_to_give");
        if (infoToGive > 0) {
            message += playerNamesMessage;
            deadMessage += playerNamesMessage;
        }
        if (infoToGive != 1) {
            message += rolesMessage;
            deadMessage += rolesMessage;
        }
        playersInTrap.forEach((pl) => {
            PlayerHandler.afterPlayerInteract.emitInteract(trapper, pl, InteractTypes.TRANSPORTER_TELEPORT);
        })
        trapper.sendMessage(message);
        ChatManager.sendDeadPlayersMessage(deadMessage, LogItemType.ABILITY_MESSAGE);
        ScoreboardManager.setPlayerActionCooldown(trapper, actionCooldown);
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_placement_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY, null);
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
        return "§gTrapper";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Place a trap to detect player's roles when they walk through it!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Placing down a trap will detect all players who walk through that area. When the trap expires, you will be sent a message containing information about those players.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.trapper.enabled") != 0;
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
        return RoleTypes.TRAPPER;
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
        let trapLocation = player.getDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY);
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0 && trapLocation == null) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            let currentLocation = player.location;
            let dimensionID = player.dimension.id;

            // ability effect
            player.setDynamicProperty(TrapperRole.TRAP_LOCATION_PROPERTY, currentLocation);
            player.setDynamicProperty(TrapperRole.TRAP_DIMENSION_PROPERTY, dimensionID);
            player.setDynamicProperty(TrapperRole.TRAPPED_PLAYERS_PROPERTY, "[]");
            let trapUptime = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_uptime");
            ScoreboardManager.setScoreboardObjective(player, TrapperRole.TRAP_TIME_SCOREBOARD, trapUptime*20);

            // ability activate message
            player.sendMessage("§gPlaced a trap at " + PlayerHandler.vecToString(currentLocation, 0));
            ChatManager.sendDeadPlayersMessage("§g§o" + player.name + " placed a trap at " + PlayerHandler.vecToString(currentLocation, 0), LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, trapUptime+1, false);
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
        form.title("Trapper Settings");

        form.divider();
        form.label("The trapper is an innocent role that can place traps to get player's roles who go into it.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.trapper.enabled") != 0;
        form.toggle("Trapper Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_placement_cooldown");
        form.slider("Trap Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of placing a trap. Cooldown resets upon a trap expiring.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_uses");
        form.slider("Trap Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times trap can be used. -1 is infinite uses");
        
        let trapRadius = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_radius");
        form.slider("Trap Radius", 1, 20, { defaultValue: trapRadius }); // 8
        form.label("The radius of the trap.");
        
        let trapUptime = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_uptime");
        form.slider("Trap Uptime", 15, 180, { valueStep: 5, defaultValue: trapUptime }); // 10
        form.label("The amount of time in seconds that the trap lasts before expiring. The trapper cannot place another trap until their current one expires.");
        
        let inTrapTime = ScoreboardManager.getTrackedObjective("role_settings.trapper.time_in_trap_to_catch");
        form.slider("In Trap Time", 0, 15, { defaultValue: inTrapTime }); // 12
        form.label("The amount of time in seconds a player has to be in a trap for them to get caught in it.");
        
        let interactTypes = ["None", "Send Message", "Message with Player Name"]
        let trapInteractType = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_interact_type");
        form.dropdown("Player Trap Message Type", interactTypes, { defaultValueIndex: trapInteractType }); // 14
        form.label("What happens when a new player enters the trap. §lNone§r means nothing will happen. §lSend Message§r will send the trapper a notification someone has touched their trap. §lMessage with Player Name§r will notify the trapper of who has touched their trap.");
        
        let informTypes = ["Roles", "Players", "Players & Roles"]
        let infoToGive = ScoreboardManager.getTrackedObjective("role_settings.trapper.info_to_give");
        form.dropdown("Info to Give", informTypes, { defaultValueIndex: infoToGive }); // 16
        form.label("The information to give the trapper when their trap expires. §lRoles§r will send the role names of the players that were in the trap. §lPlayers§r will send the names of the players. §lPlayers & Roles§r will send both.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.trapper.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.trapper.trap_placement_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.trapper.trap_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.trapper.trap_radius", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.trapper.trap_uptime", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.trapper.time_in_trap_to_catch", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.trapper.trap_interact_type", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.trapper.info_to_give", r.formValues[16]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_placement_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_uses");
        let trapRadius = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_radius");
        let trapUptime = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_uptime");
        let inTrapTime = ScoreboardManager.getTrackedObjective("role_settings.trapper.time_in_trap_to_catch");
        let interactTypes = ["None", "Send Message", "Message with Player Name"]
        let trapInteractType = ScoreboardManager.getTrackedObjective("role_settings.trapper.trap_interact_type");
        let informTypes = ["Roles", "Players", "Players & Roles"]
        let infoToGive = ScoreboardManager.getTrackedObjective("role_settings.trapper.info_to_give");

        let description = "The Trapper is an innocent role that is able to place traps that will detect players and their roles when they walk through them.";
        description += "\n\nTrap Cooldown: " + cooldownTime + " seconds.";
        description += "\nTrap Uses: " + abilityUses;
        description += "\nTrap Radius: " + trapRadius;
        description += "\nTrap Uptime: " + trapUptime + " seconds.";
        description += "\nTime in Trap to Catch: " + inTrapTime + " seconds.";
        description += "\nNotification Type: " + interactTypes[trapInteractType];
        description += "\nInfo to Give: " + informTypes[infoToGive];
        return description;
    }
}
"use strict";

import { world, system, Player, Entity, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";

export class JesterRole extends Role {

    static JESTER_HAS_WIN_PROPERTY = "hasWin";
    static JESTER_RECENT_GHOST_ID_PROPERTY = "ghostPlayerID";
    static JESTER_TELEPORT_TIMER_SCOREBOARD = "role_settings.jester.time_to_teleport";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!GuessingManager.onGuessSubmit.isConnected(JesterRole.onGuessSubmit)) {
            GuessingManager.onGuessSubmit.subscribe(JesterRole.onGuessSubmit)
        }
        if (!DeathHandler.onDeathSignal.isConnected(JesterRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(JesterRole.onPlayerDeath)
        }
        if (!GhostManager.onGhostSpawn.isConnected(JesterRole.onGhostSpawn)) {
            GhostManager.onGhostSpawn.subscribe(JesterRole.onGhostSpawn)
        }
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            let jesters = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.JESTER);
            jesters.forEach((pl) => {
                let currentTeleportTime = ScoreboardManager.getScoreboardObjective(pl, JesterRole.JESTER_TELEPORT_TIMER_SCOREBOARD);
                if (currentTeleportTime > 0) {
                    ScoreboardManager.addScoreboardObjective(pl, JesterRole.JESTER_TELEPORT_TIMER_SCOREBOARD, -1);
                }
                if (currentTeleportTime == 1) {
                    pl.sendMessage("§dYou can no longer teleport to the ghost.");
                }
            });
        }, 1);
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoGuessed 
     * @param {Player} playerWhoWasGuessed 
     * @param {Role} guessedRole 
     * @param {boolean} wasCorrect 
     */
    static onGuessSubmit(playerWhoGuessed, playerWhoWasGuessed, guessedRole, wasCorrect) {
        if (GuessingManager.onGuessSubmit.isGuessingModifier) {
            return;
        }
        let guessedPlayerRole = RoleManager.getPlayerRole(playerWhoWasGuessed);
        if (guessedPlayerRole != null && guessedPlayerRole.getRoleType() == RoleTypes.JESTER) {
            if (!wasCorrect) {
                // force correct and jester win
                playerWhoWasGuessed.setDynamicProperty(JesterRole.JESTER_HAS_WIN_PROPERTY, true);
                playerWhoWasGuessed.sendMessage("§dYou were guessed as " + guessedRole.getDisplayName() + "§r§d and win!");
                ChatManager.sendDeadPlayersMessage(playerWhoWasGuessed.name + " was guessed and wins!", LogItemType.ABILITY_MESSAGE);
                GuessingManager.onGuessSubmit.forceOppositeResult = true;
            }
            else {
                playerWhoWasGuessed.sendMessage("§dYou were guessed as Jester! It's over!");
            }
        }
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let playerRole = RoleManager.getPlayerRole(playerWhoDied);
        if (ScoreboardManager.isGameRunning() && playerRole != null && playerRole.getRoleType() == RoleTypes.JESTER && killer != null) {
            let killerRole = RoleManager.getPlayerRole(killer);
            if (!killerRole.getAlignment().is_killer) {
                playerWhoDied.setDynamicProperty(JesterRole.JESTER_HAS_WIN_PROPERTY, true);
                playerWhoDied.sendMessage("§dYou were killed by an innocent! You win!");
                ChatManager.sendDeadPlayersMessage("§d§o" + playerWhoDied.name + " was killed by an innocent and wins!", LogItemType.ABILITY_MESSAGE);
            }
            else {
                playerWhoDied.setDynamicProperty(JesterRole.JESTER_HAS_WIN_PROPERTY, false);
                playerWhoDied.sendMessage("§d§oYou were killed by a killer. You failed in your mission.");
                ChatManager.sendDeadPlayersMessage("§d§o" + playerWhoDied.name + " was killed by a murderer.", LogItemType.ABILITY_MESSAGE);
            }
        }
        if (killer != null) {
            let killerRole = RoleManager.getPlayerRole(killer);
            if (ScoreboardManager.isGameRunning() && killerRole != null && killerRole.getRoleType() == RoleTypes.JESTER) {
                killer.sendMessage("§d§oYou cannot kill as a jester. You've failed in your mission.");
                killer.setDynamicProperty(JesterRole.JESTER_HAS_WIN_PROPERTY, false);
                killer.kill();
            }
        }
    }

    /**
     * 
     * @param {Player} playerGhost 
     * @param {Entity} ghost 
     */
    static onGhostSpawn(playerGhost, ghost) {
        let canTeleport = ScoreboardManager.getTrackedObjective("role_settings.jester.can_teleport") != 0;
        let teleportDelay = ScoreboardManager.getTrackedObjective("role_settings.jester.teleport_delay_time");
        let teleportTime = ScoreboardManager.getTrackedObjective("role_settings.jester.time_to_teleport");
        
        if (ScoreboardManager.isGameRunning() && canTeleport) {
            system.runTimeout(() => {
                let allPlayers = world.getAllPlayers();
                let jesters = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.JESTER);

                if (jesters.length == 0) {
                    return;
                }

                let playerID = ScoreboardManager.getPlayerID(playerGhost);
                jesters.forEach((pl) => {
                    pl.sendMessage("§dYou can teleport to a new body! To teleport, crouch and use your ability within " + teleportTime + " seconds.");
                    pl.setDynamicProperty(JesterRole.JESTER_RECENT_GHOST_ID_PROPERTY, playerID);
                    ScoreboardManager.setScoreboardObjective(pl, JesterRole.JESTER_TELEPORT_TIMER_SCOREBOARD, teleportTime * 20);
                });

                ChatManager.sendDeadPlayersMessage("§dJesters can teleport to a new ghost...", LogItemType.ABILITY_MESSAGE);
            }, teleportDelay * 20);
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(JesterRole.JESTER_HAS_WIN_PROPERTY, false);
        player.setDynamicProperty(JesterRole.JESTER_RECENT_GHOST_ID_PROPERTY, -1);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.NEUTRAL_INDEPENDENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§dJester";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Get yourself killed by an innocent player!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.jester.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return ScoreboardManager.getTrackedObjective("role_settings.jester.can_teleport") != 0;
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
        return RoleTypes.JESTER;
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
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            if (!player.isSneaking) {
                let map = new MolangVariableMap();
                map.setVector3("variable.aabb", {x:0, y:0, z:0});
                map.setFloat("max_lifetime", 5);
                let facingDirection = player.getViewDirection();
                
                let facingVector = PlayerHandler._normalize({x: facingDirection.x, y: 0, z: facingDirection.z});
                facingVector = PlayerHandler.scaleVector(facingVector, 2);
                facingVector = PlayerHandler.addVectors(facingVector, {x:0,y:.5,z:0});

                DeathHandler.spawnDeathParticles(PlayerHandler.addVectors(facingVector, player.location));

                player.sendMessage("§d§oSpawning death particles...");
                ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " spawned death particles.", LogItemType.ABILITY_MESSAGE);
            }
            else {
                let canTeleport = ScoreboardManager.getTrackedObjective("role_settings.jester.can_teleport") != 0;
                if (!canTeleport) {
                    return;
                }
                // teleport to body, if enabled
                let currentTeleportTime = ScoreboardManager.getScoreboardObjective(player, JesterRole.JESTER_TELEPORT_TIMER_SCOREBOARD);
                if (currentTeleportTime <= 0) {
                    // player.sendMessage("You'")
                    return;
                }

                let teleportDelay = ScoreboardManager.getTrackedObjective("role_settings.jester.teleport_time");
                let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.jester.invis_on_teleport");
                let ghostID = player.getDynamicProperty(JesterRole.JESTER_RECENT_GHOST_ID_PROPERTY);
                if (ghostID != -1) {
                    let ghostToTeleport = GhostManager.getPlayerGhost(ghostID);
                    if (ghostToTeleport == null) {
                        player.sendMessage("§d§oThe ghost you wanted to teleport to is missing.");
                        ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " tried to teleport to a ghost but it is missing.", LogItemType.ABILITY_MESSAGE);
                    }
                    else {
                        player.sendMessage("§dTeleporting in §l" + teleportDelay + "§r§d seconds...");
                        ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " is teleporting in §l" + teleportDelay + "§r§d§o seconds.", LogItemType.ABILITY_MESSAGE);
                        system.runTimeout(() => {
                            if (ghostToTeleport == null || !ghostToTeleport.isValid) {
                                player.sendMessage("§d§oThe ghost you wanted to teleport to is missing.");
                                ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " tried to teleport to a ghost but it is missing.", LogItemType.ABILITY_MESSAGE);
                                return;   
                            }

                            player.addEffect("minecraft:invisibility", invisDuration * 20, {showParticles: false});
                            player.teleport(PlayerHandler.addVectors(ghostToTeleport.location, {x:0,y:.5,z:0}), {dimension:ghostToTeleport.dimension, keepVelocity: false})
                            player.sendMessage("§dTeleported to ghost!");
                            ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " teleported to " + PlayerHandler.vecToString(ghostToTeleport.location) + ".", LogItemType.ABILITY_MESSAGE);
                        }, teleportDelay * 20);
                    }
                }
            }
            // ability effect
                            

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_cooldown");
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
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");
        let fakeInteractCharges = ScoreboardManager.getTrackedObjective("role_settings.jester.interact_grants_uses") != 0;
        let maxAbilityUses = ScoreboardManager.getTrackedObjective("role_settings.jester.max_uses");

        if (!fakeInteractCharges && chargesRemaining == 0) {
            player.sendMessage("§dYou can't interaction with anymore people.");
            return;
        }

        if (otherEntity.typeId == "minecraft:player" && (fakeInteractCharges || chargesRemaining != 0)) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.JESTER_FAKE_INTERACT;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§d§oYou were unable to interact with " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " tried to interact with " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            // activate ability 
            if (!fakeInteractCharges && chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }
            else if (fakeInteractCharges) {
                if (chargesRemaining >= maxAbilityUses || maxAbilityUses == -1) {
                    player.sendMessage("§d§oYou already have max ability uses.");
                }
                else {
                    player.sendMessage("§dYou now have " + (chargesRemaining+1) + " ability uses" + (chargesRemaining+1==maxAbilityUses ? " (max)" : "") + ".");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", 1);
                }
            }

            // ability effect
            
            // ability activate message
            player.sendMessage("§dInteracted with §r" + otherEntity.name + "§e.");
            ChatManager.sendDeadPlayersMessage("§d§o" + player.name + " interacted with " + otherEntity.name + ".", LogItemType.ABILITY_MESSAGE);
            
            // cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.JESTER_FAKE_INTERACT);
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
        return player.getDynamicProperty(JesterRole.JESTER_HAS_WIN_PROPERTY);
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Jester Settings");

        form.divider();
        form.label("The Jester is a neutral independent role whose goal is to get themselves killed by an innocent to win. They can spawn smoke particles, teleport to dead bodies, and send fake interactions to players.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.jester.enabled") != 0;
        form.toggle("Jester Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_cooldown");
        form.slider("Ability Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of the Jester, which can do several things.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_uses");
        form.slider("Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the jester can use their abilities. -1 is infinite uses");
        
        let fakeInteractCharges = ScoreboardManager.getTrackedObjective("role_settings.jester.interact_grants_uses") != 0;
        form.toggle("Interacting Grants Ability Uses", { defaultValue: fakeInteractCharges }); // 6
        form.label("If true, doing fake interactions with players will give the jester ability uses. If true, above settings becomes default uses and below is max uses.");
        
        let maxAbilityUses = ScoreboardManager.getTrackedObjective("role_settings.jester.max_uses");
        form.slider("Max Ability Uses", -1, 10, { defaultValue: maxAbilityUses }); // 6
        form.label("If §lInteracting Grants Ability Uses§r is true, this is the max uses the jester can have.");
        
        let canSeeGhosts = ScoreboardManager.getTrackedObjective("role_settings.jester.can_see_ghosts") != 0;
        form.toggle("Can See Ghosts", { defaultValue: canSeeGhosts }); // 6
        form.label("If true, the jester can see ghosts.");
        
        let canTeleport = ScoreboardManager.getTrackedObjective("role_settings.jester.can_teleport") != 0;
        form.toggle("Can Teleport To Dead Bodies", { defaultValue: canTeleport }); // 6
        form.label("If true, allows the ability for the jester to teleport to the most recent dead body for a short time.");
        
        let notifyDelay = ScoreboardManager.getTrackedObjective("role_settings.jester.teleport_delay_time");
        form.slider("Teleport Notification Delay", 0, 15, { defaultValue: notifyDelay }); // 6
        form.label("The amount of time in seconds before the jester is notified they can teleport to a new body. Their ability does nothing during this downtime.");
        
        let teleportTime = ScoreboardManager.getTrackedObjective("role_settings.jester.time_to_teleport");
        form.slider("Time for Teleport", 0, 15, { defaultValue: teleportTime }); // 6
        form.label("The amount of time in seconds the jester has to teleport to the ghost.");
        
        let teleportDelay = ScoreboardManager.getTrackedObjective("role_settings.jester.teleport_time");
        form.slider("Teleport Delay", 0, 10, { defaultValue: teleportDelay }); // 6
        form.label("The amount of time in seconds it takes for the jester to teleport.");
        
        let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.jester.invis_on_teleport");
        form.slider("Invisibility Duration on Teleport", 0, 10, { defaultValue: invisDuration }); // 6
        form.label("The time in seconds that the Jester gets invisibility upon teleporting. 0 disables invisibility.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.jester.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.jester.ability_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.jester.ability_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.jester.interact_grants_uses", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.jester.max_uses", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.jester.can_see_ghosts", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.jester.can_teleport", r.formValues[14] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.jester.teleport_delay_time", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.jester.time_to_teleport", r.formValues[18]);
            ScoreboardManager.setTrackedObjective("role_settings.jester.teleport_time", r.formValues[20]);
            ScoreboardManager.setTrackedObjective("role_settings.jester.invis_on_teleport", r.formValues[22]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.jester.ability_uses");
        let fakeInteractCharges = ScoreboardManager.getTrackedObjective("role_settings.jester.interact_grants_uses") != 0;
        let maxAbilityUses = ScoreboardManager.getTrackedObjective("role_settings.jester.max_uses");
        let canSeeGhosts = ScoreboardManager.getTrackedObjective("role_settings.jester.can_see_ghosts") != 0;
        let canTeleport = ScoreboardManager.getTrackedObjective("role_settings.jester.can_teleport") != 0;
        let notifyDelay = ScoreboardManager.getTrackedObjective("role_settings.jester.teleport_delay_time");
        let teleportTime = ScoreboardManager.getTrackedObjective("role_settings.jester.time_to_teleport");
        let teleportDelay = ScoreboardManager.getTrackedObjective("role_settings.jester.teleport_time");
        let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.jester.invis_on_teleport");

        let description = "The Jester is a neutral independent role whose goal is to get themselves killed by an innocent or guessed as any other role. If they die to a murderer, they lose. They can spawn death particles, fake interact with players, and teleport to ghosts.";
        description += "\n\nAbility Cooldown: " + cooldownTime + " seconds.";
        description += "\nInitial Ability Uses: " + abilityUses;
        description += "\nFake Interactions Give Uses: " + fakeInteractCharges;
        description += "\nMax Ability Uses: " + maxAbilityUses;
        description += "\nCan See Ghosts: " + canSeeGhosts;
        description += "\nCan Teleport to Ghosts: " + canTeleport;
        description += "\nNotification Delay: " + notifyDelay;
        description += "\nTime to Teleport to Ghost: " + teleportTime;
        description += "\nTeleport Delay: " + teleportDelay;
        description += "\nInvisibility Duration on TP: " + invisDuration;
        return description;
    }
}
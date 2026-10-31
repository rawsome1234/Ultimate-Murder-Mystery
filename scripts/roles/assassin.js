"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { NeutralIndependentRole } from "./neutral_independent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { ChatManager } from "../chat_manager";
import { RoleAssignment } from "../role_assignment";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { BuildPlayerHelpTagSignal } from "../signals/build_player_help_tag";

export class AssassinRole extends NeutralIndependentRole {

    static failureRoleTypes = [RoleTypes.INNOCENT, RoleTypes.AMNESIAC, RoleTypes.SURVIVOR, RoleTypes.JESTER, RoleTypes.TYCOON];
    static ASSASSIN_TARGET_TAG = "assassinTarget";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!RoleAssignment.afterRolesAssigned.isConnected(this.afterRolesAssigned)) {
            RoleAssignment.afterRolesAssigned.subscribe(this.afterRolesAssigned);
        }
        // if (!DeathHandler.onMurdererDeath.isConnected(this.onMurdererDeath)) {
        //     DeathHandler.onMurdererDeath.subscribe(this.onMurdererDeath);
        // }
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(AssassinRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(AssassinRole.buildPlayerTag)
        }
        super.initialize();
    }

    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        if (event.playerToBuild.hasTag(AssassinRole.ASSASSIN_TARGET_TAG)) {
            event.addStringToTag("§cX");
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // let actionUses = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_uses");
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_cooldown");
        // ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        ScoreboardManager.setScoreboardObjective(player, "player.set_alignment", 1);
        ScoreboardManager.setScoreboardObjective(player, "player.target_id", -1);
        ScoreboardManager.setScoreboardObjective(player, "player.meets_win", 0);
    }

    afterRolesAssigned() {
        let allPlayers = world.getAllPlayers();
        let assassins = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.ASSASSIN);
        // allPlayers[0].sendMessage(assassins.length + " assassins After roles assigned..");
        // let tellGuardRole = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.gets_told_defendee_role") != 0;
        // let tellDefenseHaveGuard = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.defendee_told_of_bodyguard") != 0;;
        let killerChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.killer_chance");

        let targetNotif = ScoreboardManager.getTrackedObjective("role_settings.assassin.who_is_notified_of_target");
        let tellTarget = targetNotif == 1 || targetNotif >= 4;
        let tellMurderers = targetNotif >= 2;
        let tellKillers = targetNotif >= 3 && targetNotif != 4;
        let tellAll = targetNotif == 6;

        assassins.forEach((ass) => {
            let possibleAlignments = [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT];
            let evilAlignments = [RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER];

            if (killerChance < 0) {
                possibleAlignments = possibleAlignments.concat(evilAlignments)
            }
            else if (ScoreboardManager.rollRandomNumber(0, 100) < killerChance) {
                // ass.sendMessage("Rolled evil roles");
                possibleAlignments = evilAlignments;
            }

            // ass.sendMessage("Choosing target from " + possibleAlignments.length + " alignments");
            let possiblePlayers = PlayerHandler.sortPlayersWithoutRole(PlayerHandler.sortPlayersWithAlignment(allPlayers, possibleAlignments), [RoleTypes.ASSASSIN]);
            if (possiblePlayers.length == 0) {
                ass.sendMessage("§oCould not find any players to make your target");
                return;
            }

            let randomPlayerIndex = ScoreboardManager.rollRandomNumber(0, possiblePlayers.length);
            let targetPlayer = possiblePlayers[randomPlayerIndex];
            // ass.sendMessage("Target is " + targetPlayer.name);
            let targetID = ScoreboardManager.getPlayerID(targetPlayer);
            ScoreboardManager.setScoreboardObjective(ass, "player.target_id", targetID);
            targetPlayer.addTag(AssassinRole.ASSASSIN_TARGET_TAG);

            ass.sendMessage("§cYour target is §l" + targetPlayer.name + "§r§c! Kill them after someone else has died to win.");

            if (tellTarget) {
                targetPlayer.sendMessage("§cLook out! You're the target of an assassin!");
            }
            let message = "§cAn assassin has §l" + targetPlayer.name + "§r§c as a target!";

            if (tellAll) {
                allPlayers.forEach((pl) => {
                    if (pl.id == targetPlayer.id) {
                        return;
                    }
                    sendMessage(message);
                });
            }
            else if (tellKillers) {
                PlayerHandler.sortPlayersWithAlignment(allPlayers, [RoleAlignment.MURDERER]).forEach((pl) => {
                    if (pl.id == targetPlayer.id) {
                        return;
                    }
                    sendMessage(message);
                });
            }
            else if (tellMurderers) {
                PlayerHandler.sortPlayersWithAlignment(allPlayers, [RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER]).forEach((pl) => {
                    if (pl.id == targetPlayer.id) {
                        return;
                    }
                    sendMessage(message);
                });
            }
        });
    }

    // target assigned at start, assassin must wait

    onMurdererDeath() {
        let allPlayers = world.getAllPlayers();
        let assassins = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.ASSASSIN);

        assassins.forEach((guard) => {
            guard.sendMessage("§c§oA murderer has died! You may now kill your target!");
            SoundManager.playSoundEffect([guard], SoundEffectType.BASIC_PLING);

            // ScoreboardManager.setScoreboardObjective(guessedPlayer, "player.meets_win", 1);
        });

    }

    /**
     * @param {Player} playerWhoDied
     * @param {Player?} killer
     */
    onPlayerDeath(playerWhoDied, killer) {
        let diedID = ScoreboardManager.getPlayerID(playerWhoDied);

        // successful killer
        if (killer != null) {
            let killerRole = RoleManager.getPlayerRole(killer);
            let killerTarget = ScoreboardManager.getScoreboardObjective(killer, "player.target_id");
            let anyoneHasDied = ScoreboardManager.getTrackedObjective("tracking.has_anyone_died");
            if (killerRole.getRoleType() == RoleTypes.ASSASSIN && killerTarget == diedID) {
                let assassinExecuted = ScoreboardManager.getTrackedObjective("role_settings.assassin.assassin_dies_on_early_kill") != 0;    
                if (anyoneHasDied >= 1) {
                    let alignmentChange = ScoreboardManager.getTrackedObjective("role_settings.assassin.success_alignment_change");
                    let alignmentChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.random_alignment_evil_chance");
                    ScoreboardManager.setScoreboardObjective(killer, "player.meets_win", 1);
                    
                    if (alignmentChange > 0) {
                        let becomesEvil = false;
                        let switchMessage = "";
                        // let targetAlignment = RoleAlignment.INNOCENT;
                        switch (alignmentChange) {
                            case 1:
                                // steals
                                let targetRole = RoleManager.getPlayerRole(playerWhoDied);
                                let targetAlignment = targetRole.getAlignment(playerWhoDied);
                                switchMessage = "stolen the alignment";
                                becomesEvil = [RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER].includes(targetAlignment);
                                break;
                            case 2:
                                // random
                                switchMessage = "been randomly assigned";
                                becomesEvil = ScoreboardManager.rollRandomNumber(0, 100) < alignmentChance;
                                break;
                        }

                        let newAlignment = becomesEvil ? RoleAlignment.MURDERER : RoleAlignment.INNOCENT;
                        ScoreboardManager.setScoreboardObjective(killer, "player.set_alignment", (becomesEvil ? 0 : 2));
                        killer.sendMessage("§cYou've killed your target! " + playerWhoDied.name + " was a(n) " + newAlignment.description.replace("_", " ") + ", meaning you've become " + newAlignment.description + "-aligned.");
                        ChatManager.sendDeadPlayersMessage("§c§o" + killer.name + " has killed their target and has " + switchMessage + " " + newAlignment.description + ".", LogItemType.ABILITY_MESSAGE);
                        if (MurdererRole.murdererChatEnabled() && becomesEvil) {
                            ScoreboardManager.setScoreboardObjective(killer, "player.has_murderer_channel_access", 1);
                        }
                        SoundManager.playSoundEffect([killer], SoundEffectType.AMNESIAC_REMEMBER);
                    }
                    else {                    
                        killer.sendMessage("§cYou've killed your target! Survive until the end of the round to win! Please do not reveal your role", LogItemType.ABILITY_MESSAGE);
                        ChatManager.sendDeadPlayersMessage("§c§o" + killer.name + " has killed their target!");
                    }
                }
                else if (assassinExecuted) {
                    killer.sendMessage("You killed your target too soon! As such, you will be killed!");
                    GuessingManager.killGuessedPlayer(killer);
                }
                else {
                    killer.sendMessage("You killed your target too soon! You're being reassigned...");
                    SoundManager.playSoundEffect([killer], SoundEffectType.TARGET_LOSS);
                    let failureRoleType = AssassinRole.failureRoleTypes[ScoreboardManager.getTrackedObjective("role_settings.assassin.failure_role_change")];
                    let roleToAssign = RoleManager.getMatchingRole(failureRoleType.id);
                    RoleAssignment.setPlayerRole(killer, roleToAssign);
                }
            }
        }


        let allPlayers = world.getAllPlayers();
        let assassins = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.ASSASSIN);
        assassins.forEach((ass) => {
            let killedTargetSuccessfully = ScoreboardManager.getScoreboardObjective(ass, "player.meets_win") == 1;
            let targetID = ScoreboardManager.getScoreboardObjective(ass, "player.target_id");
            // ass.sendMessage("Checking if target and dead ids are the same, " + targetID + ", " + diedID);
            // failed assassin
            if (!killedTargetSuccessfully) {
                if (targetID == diedID) {
                    let failureRoleType = AssassinRole.failureRoleTypes[ScoreboardManager.getTrackedObjective("role_settings.assassin.failure_role_change")];
                    let roleToAssign = RoleManager.getMatchingRole(failureRoleType.id);
                    system.runTimeout(() => {
                        if (!ScoreboardManager.isGameRunning()) {
                            return;
                        }
                        ass.sendMessage("§cYour target died! You failed your mission and have become a " + roleToAssign.getDisplayName());
                        
                        SoundManager.playSoundEffect([ass], SoundEffectType.TARGET_LOSS);
                        RoleAssignment.setPlayerRole(ass, roleToAssign);
                    }, 20);
                } 
                else if (ScoreboardManager.getTrackedObjective("tracking.has_anyone_died") == 1) {
                    ass.sendMessage("§cYou may now kill your target!");
                }
            }
        });
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        // 0 is murderer, 1 is NI, 2 is inno
        if (player == null) {
            return RoleAlignment.NEUTRAL_INDEPENDENT;
        }
        let alignmentValue = ScoreboardManager.getScoreboardObjective(player, "player.set_alignment");
        switch (alignmentValue) {
            case 0:
                return RoleAlignment.MURDERER;
            case 1:
                return RoleAlignment.NEUTRAL_INDEPENDENT;
            default:
                return RoleAlignment.INNOCENT;
        }
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§cAssassin";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Kill your target after a murderer has died!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your goal is to kill your target and survive until the end of the round. You may only kill your target afer another player dies, which you will be notified of.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.assassin.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return false;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.ASSASSIN;
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
     * 
     * @param {Player} guard
     */
    activateAbility(guard) {
        // let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        // if (chargesRemaining == 0) {
        //     guard.sendMessage("Out of ability uses!");
        //     return;
        // }

        // if (chargesRemaining != 0) {
        //     // ability effect
        //     let defendeeID = ScoreboardManager.getScoreboardObjective(guard, "player.target_id");
        //     let defendeePlayer = ScoreboardManager.getPlayerWithID(defendeeID);

        //     if (defendeePlayer == null || !defendeePlayer.hasTag("dead")) {
        //         guard.sendMessage("Your target is dead!");
        //         return;
        //     }

        //     // activate ability 
        //     if (chargesRemaining > 0) {
        //         ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
        //     }

        //     let protectLength = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_duration");

        //     defendeePlayer.addEffect("minecraft:resistance", protectLength * 20);

        //     // ability activate message
        //     guard.sendMessage("Guarded " + defendeePlayer.name + " for " + protectLength + " seconds.");
        //     defendeePlayer.sendMessage("Your Bodyguard is protecting you!");

        //     // sets cooldown
        //     let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_cooldown");
        //     ScoreboardManager.setPlayerActionCooldown(guard, actionCooldown);
        // }
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
        // let playerTargetID = ScoreboardManager.getScoreboardObjective(player, "player.target_id");
        // let targetPlayer = ScoreboardManager.getPlayerWithID(playerTargetID);
        if (player == null) {
            return false;
        }
        let playerAlive = !player.hasTag("dead");
        let meetsWin = ScoreboardManager.getScoreboardObjective(player, "player.meets_win") == 1;
        // let targetStillAlive = targetPlayer == null || !targetPlayer.hasTag("dead");
        if (playerAlive && meetsWin) {
            return true;
        }

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
        form.title("Assassin Settings");

        form.divider();
        form.label("The assassin is a neutral independent role that needs to kill their target and survive in order to win. They may only kill after somebody dies dies.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.assassin.enabled") != 0;
        form.toggle("Assassin Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        let killerChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.killer_chance");
        form.slider("Target Killer Chance", -5, 100, { valueStep: 5, defaultValue: killerChance }); // 4
        form.label("The chance that the target will be evil. -5 will be random between all players.");
        
        let notificationSettings = ScoreboardManager.getTrackedObjective("role_settings.assassin.who_is_notified_of_target");
        form.dropdown("Who is Notified", ["None", "Target", "Murderers", "Killers", "Murderers + Target", "Killers + Target", "All"], { defaultValue: notificationSettings }); // 6
        form.label("Who, in addition to the assassin, will be notified who the target is. Any Target option will let the target know they are a target. Murderers will tell murderers, killers will tell killers, all will tell all players.");
        
        let roleChange = ScoreboardManager.getTrackedObjective("role_settings.assassin.failure_role_change");
        form.dropdown("On Fail Role", AssassinRole.failureRoleTypes.map((v) => (RoleManager.getMatchingRole(v.id).getDisplayName())), { defaultValueIndex: roleChange }); // 8
        form.label("If the target dies to someone else before the assassin gets to them, the assassin will become this role, regardless of if it's enabled.");
        
        let assassinExecuted = ScoreboardManager.getTrackedObjective("role_settings.assassin.assassin_dies_on_early_kill") != 0;
        form.toggle("Assassin Dies On Early Kill", { defaultValueIndex: assassinExecuted }); // 10
        form.label("If this is true, the assassin will be withered if they kills their target before someone else dies.");
        
        let changeOptions = ["Off", "Steals Alignment", "Random Alignment"];
        let alignmentChange = ScoreboardManager.getTrackedObjective("role_settings.assassin.success_alignment_change");
        form.dropdown("Alignment Changes on Success", changeOptions, { defaultValueIndex: alignmentChange }); // 12
        form.label("If the assassin successfully kills their target, their alignment can change while still remaining the assassin role.\nOff: Disables this change.\nSteals Alignment: The assassin gains the alignment of their target after killing them.\nRandom Alignment: The assassin is randomly assigned to a different alignment.");
        
        let alignmentChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.random_alignment_evil_chance");
        form.slider("Evil Alignment Chance", 0, 100, { valueStep: 5, defaultValue: alignmentChance }); // 14
        form.label("The chance that the assassin will become murderer-aligned if the above setting is on 'Random Alignment'.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.assassin.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.assassin.killer_chance", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.assassin.who_is_notified_of_target", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.assassin.failure_role_change", r.formValues[8]);
            // player.sendMessage("" + r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.assassin.assassin_dies_on_early_kill", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.assassin.success_alignment_change", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.assassin.random_alignment_evil_chance", r.formValues[14]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} the full description of this role and its settings.
    */
   getRoleInformation() {
        let killerChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.killer_chance");
        let notificationSettings = ScoreboardManager.getTrackedObjective("role_settings.assassin.who_is_notified_of_target");
        let notificationParties = ["None", "Target", "Murderers", "Killers", "Murderers + Target", "Killers + Target", "All"];
        let notificationParty = notificationParties[notificationSettings];
        let roleChange = ScoreboardManager.getTrackedObjective("role_settings.assassin.failure_role_change");
        let failRoleType = AssassinRole.failureRoleTypes[roleChange];
        let failRole = RoleManager.getMatchingRole(failRoleType.id);
        let assassinExecuted = ScoreboardManager.getTrackedObjective("role_settings.assassin.assassin_dies_on_early_kill") != 0;
        let changeOptions = ["Off", "Steals Alignment", "Random Alignment"];
        let alignmentChange = ScoreboardManager.getTrackedObjective("role_settings.assassin.success_alignment_change");
        let alignmentChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.random_alignment_evil_chance");
        
        let description = "The assassin is a neutral role that needs to kill an assigned target. Their alignment can change after successfully killing their target.";
        description += "\n\nTarget is Killer Chance: " + killerChance + "%";
        description += "\nWho is Notified of Target: " + notificationParty;
        description += "\nFail Role: " + failRole.getDisplayName() + "§r";
        description += "\nAssassin Dies On Early Kill: " + assassinExecuted;
        description += "\nAlignment Changes on Success: " + changeOptions[alignmentChange];
        description += "\nRandom Evil Alignment Chance: " + alignmentChance;
        return description;
    }
}
"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class JailorRole extends InnocentRole {
    
    static JAILOR_JAILED_ID_PROPERTY = "toJail";
    static JAILOR_CHAT_ID_PROPERTY = "jailChatID";
    static JAILOR_TIME_SCOREBOARD = "player.mark_used";
    static JAILOR_WRONG_EXECUTE_PROPERTY = "canJail";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(JailorRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(JailorRole.onPlayerDeath);
        }
        system.runInterval(() => {
            JailorRole.runJailTimers();
        }, 1);
        super.initialize();
    }

    /**
     * 
     * @param {Player} player
     * @param {Player?} killer
     */
    static onPlayerDeath(player, killer) {
        let deadRole = RoleManager.getPlayerRole(player);
        if (deadRole.getRoleType() == RoleTypes.JAILOR && JailorRole.isHoldingJail(player)) {
            JailorRole.endJail(player, "", true);
        }

        let removeMessage = "§i§oThe person you starting jailing seems to have died...";
        let playerID = ScoreboardManager.getPlayerID(player);
        world.getAllPlayers().forEach((jailor) => {
            let playerRole = RoleManager.getPlayerRole(jailor);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.JAILOR) {
                if (JailorRole.getToJailID(jailor) == playerID) {
                    if (JailorRole.isHoldingJail(jailor)) {
                        JailorRole.endJail(jailor, "§iSomeone else seems to have taken care of your jailee...", false);
                    }
                    else if (removeMessage != null && removeMessage != "") {
                        jailor.sendMessage(removeMessage);
                        jailor.setDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY, null);
                    }
                }
            }
        });
        // let playerID = ScoreboardManager.getPlayerID(player);
        // let searchTag = ApothocaryRole.apothocaryMarkTag + playerID;
        // world.getAllPlayers().forEach((apoth) => {
        //     let playerRole = RoleManager.getPlayerRole(apoth);
        //     if (playerRole != null && playerRole.getRoleType() == RoleTypes.APOTHOCARY) {
        //         if (apoth.hasTag(searchTag)) {
        //             apoth.removeTag(searchTag);
        //             apoth.sendMessage("§4§oThe person you poisoned seems to have died to other causes...");
        //         }
        //     }
        // });
    }

    static runJailTimers() {
        let allPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let allJailors = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.JAILOR);
        allJailors.forEach((jailor) => {
            let jailTimeRemaining = ScoreboardManager.getScoreboardObjective(jailor, JailorRole.JAILOR_TIME_SCOREBOARD);
            if (jailTimeRemaining <= 0) {
                return;
            }

            if (jailTimeRemaining == 1) {
                this.endJail(jailor, "§iJail time is up! The player you jailed has been freed.", true);
                return
            }
            ScoreboardManager.addScoreboardObjective(jailor, JailorRole.JAILOR_TIME_SCOREBOARD, -1);

            let sendTimerMessages = ScoreboardManager.getTrackedObjective("role_settings.jailor.send_timer_messages") != 0;
            if (!sendTimerMessages) {
                return;
            }
            if (jailTimeRemaining == 20 * 15) {
                jailor.sendMessage("§i§o15 seconds left...");
            }
            if (jailTimeRemaining == 20 * 5) {
                jailor.sendMessage("§i§o5 seconds left...");
            }
        });
    }

    /**
     * Ends the jail session with the specified jailor and their jailee.
     * @param {Player} jailor 
     * @param {string} endJailMessage 
     * @param {boolean} endingNaturally whether the jail timer expired or if the jail is being cut short.
     */
    static endJail(jailor, endJailMessage, endingNaturally) {
        if (JailorRole.isHoldingJail(jailor)) {
            ScoreboardManager.setScoreboardObjective(jailor, JailorRole.JAILOR_TIME_SCOREBOARD, 0);
        }

        let targetID = JailorRole.getToJailID(jailor);
        let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
        let jailedNameMessage = "";
        if (targetPlayer != null) {
            ChatManager.revertPlayerChannel(targetPlayer);
            targetPlayer.removeTag(ChatManager.BLOCK_SHOUT_TAG);
            if (endingNaturally) {
                targetPlayer.sendMessage("§iYou've been freed from jail.");
            }
            jailedNameMessage = "of " + targetPlayer.name + " ";
        }
        
        jailor.setDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY, null);
        ChatManager.revertPlayerChannel(jailor);
        if (endJailMessage != null && endJailMessage != "") {
            jailor.sendMessage(endJailMessage);
            SoundManager.playSoundEffect([jailor, targetPlayer], SoundEffectType.JAIL_END);
        }
        ChatManager.sendDeadPlayersMessage("§i§o" + jailor.name + "'s jailing " + jailedNameMessage + "has ended.", LogItemType.ABILITY_MESSAGE);
        
        let jailCooldown = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_cooldown");
        ScoreboardManager.setPlayerActionCooldown(jailor, jailCooldown);
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // this role uses player.mark_used as a timer for jail time
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        ScoreboardManager.setScoreboardObjective(player, JailorRole.JAILOR_TIME_SCOREBOARD, 0);
        player.setDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY, null);
        player.setDynamicProperty(JailorRole.JAILOR_WRONG_EXECUTE_PROPERTY, false);

        // makes jailor chat
        let chatID = ChatManager.requestChannelID();
        player.setDynamicProperty(JailorRole.JAILOR_CHAT_ID_PROPERTY, chatID);
        // ChatManager.registerPlayerToChat(player, chatID);
        ChatManager.givePlayerChatIdentity(player, chatID, "Jailor");
        ChatManager.setChannelColor(chatID, "i");
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
        return "§iJailor";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Jail players and execute them if they are evil!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let timeBeforeJail = ScoreboardManager.getTrackedObjective("role_settings.jailor.time_before_jail");
        let jailTime = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_time");
        let onFail = ScoreboardManager.getTrackedObjective("role_settings.jailor.on_fail");
        let wrongMessage = ["nothing will happen.", "you will be unable to execute again.", "you will be unable to jail again.", "you will be withered as well."][onFail];
        return "§iRight click a player to mark them as a person to jail. After a " + timeBeforeJail + " second cooldown, you may use your ability again (in the air) to pull them to jail. At anytime during the " + jailTime + " seconds they are in jail, you may use your ability to execute them. If you are wrong, " + wrongMessage;
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.jailor.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.JAILOR;
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
     * If the player has a jail started, returns the ID of the player to jail.
     * @param {Player} player 
     * @returns {number}
     */
    static getToJailID(player) {
        return player.getDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY);
    }

    /**
     * Returns if the player, assumed to be a jailor, has someone in jail.
     * @param {Player} player 
     * @returns 
     */
    static isHoldingJail(player) {
        return ScoreboardManager.getScoreboardObjective(player, JailorRole.JAILOR_TIME_SCOREBOARD) > 0;
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
        
        let targetID = JailorRole.getToJailID(player);
        // player.sendMessage("Found tag on player " + tag);
        if (targetID == null) {
            player.sendMessage("§iRight click a player to start jailing them.");
            return;
        }
        if (chargesRemaining != 0) {
            // execute effect
            let onFail = ScoreboardManager.getTrackedObjective("role_settings.jailor.on_fail");
            let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);

            if (JailorRole.isHoldingJail(player)) {
                if (onFail == 1 && player.getDynamicProperty(JailorRole.JAILOR_WRONG_EXECUTE_PROPERTY)) {
                    player.sendMessage("§iYou cannot execute anymore!");
                    ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                    return;
                }

                if (targetPlayer == null) {
                    player.sendMessage("§iSomething went wrong with executing that player. Try jailing again (player error).");
                    JailorRole.endJail(player, "", false);
                    return;
                }

                JailorRole.endJail(player, "§iYou executed " + targetPlayer.name + "!", false);
                SoundManager.playSoundEffect([player], SoundEffectType.JAIL_END);
                // SoundManager.playSoundEffect([player, tar], SoundEffectType.BASIC_PLING);
                targetPlayer.sendMessage("§iYou got executed!");
                SoundManager.playSoundEffect([targetPlayer], SoundEffectType.GUESSED_PLAYER);
                GuessingManager.killGuessedPlayer(targetPlayer);

                let targetRole = RoleManager.getPlayerRole(targetPlayer);
                // jailor killed a non-killer
                if ([RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT].includes(targetRole.getAlignment())) {
                    player.setDynamicProperty(JailorRole.JAILOR_WRONG_EXECUTE_PROPERTY, true);
                    
                    ChatManager.sendDeadPlayersMessage("§i§o" + player.name + " incorrectly executed " + targetPlayer.name + " in jail.", LogItemType.ABILITY_MESSAGE);
                    let playerMessage = "§iYou killed an innocent player!";
                    switch (onFail) {
                        case 1:
                            // prevent execute
                            playerMessage = playerMessage + " You can still jail but you cannot execute anymore players.";
                            break;
                        case 2:
                            // prevent use
                            playerMessage = playerMessage + " You may not jail for the rest of this game.";
                            break;
                        case 3:
                            // kill jailor
                            GuessingManager.killGuessedPlayer(player);
                            break;
                    }
                    player.sendMessage(playerMessage);
                }
                else {
                    ChatManager.sendDeadPlayersMessage("§i§o" + player.name + " correctly executed " + targetPlayer.name + " in jail.", LogItemType.ABILITY_MESSAGE);
                    player.sendMessage("§4§oYou correctly executed " + targetPlayer.name);
                }
                return;
            }
            
            // ability effect
            if (targetPlayer == null) {
                player.sendMessage("§iSomething went wrong with jailing that player. Try marking a new player (player error).");
                player.setDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY, null);
                return;
            }

            // jail effect
            let jailTime = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_time");
            ChatManager.pullPlayerToChat(player, player.getDynamicProperty(JailorRole.JAILOR_CHAT_ID_PROPERTY));
            ChatManager.pullPlayerToChat(targetPlayer, player.getDynamicProperty(JailorRole.JAILOR_CHAT_ID_PROPERTY));
            ScoreboardManager.setScoreboardObjective(player, JailorRole.JAILOR_TIME_SCOREBOARD, jailTime * 20);
            targetPlayer.addTag(ChatManager.BLOCK_SHOUT_TAG);
            SoundManager.playSoundEffect([player, targetPlayer], SoundEffectType.JAIL_ACTIVATE);
            // targetPlayer.addEffect("minecraft:wither", 20000000, {showParticles: true, amplifier:255});
            // world.getAllPlayers().forEach((pl) => {
            //     PlayerHandler.spawnParticlesBetweenPoints(pl, player.location, targetPlayer.location, {red:0,green:1,blue:0,alpha:1}, 5);
            // })
            
            // ability activate message
            player.sendMessage("§iPulled §l" + targetPlayer.name + "§r§i into jail. Message with them in chat to get information. Your identity is concealed from them. Clicking your ability again will execute them.");
            targetPlayer.sendMessage("§i§oYou've been pulled into jail! You must stop speaking, if in a voice chat. Message in chat to defend yourself!");
            ChatManager.sendDeadPlayersMessage("§i§o" + player.name + " pulled " + targetPlayer.name + " into jail.", LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            // let invisCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_kill_cooldown");
            // ScoreboardManager.setPlayerActionCooldown(player, invisCooldown);
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
        
        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }
        
        let onFail = ScoreboardManager.getTrackedObjective("role_settings.jailor.on_fail");
        if (onFail >= 2 && !player.getDynamicProperty(JailorRole.JAILOR_WRONG_EXECUTE_PROPERTY)) {
            player.sendMessage("§iYou cannot jail for the rest of the game.");
            return;
        }
        
        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player" && player.getDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY) == null) {
            // ability effect
            let otherID = ScoreboardManager.getPlayerID(otherEntity);

            if (otherID == -1) {
                player.sendMessage("§iThat player is not in the game.");
                return;
            }

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.JAILOR_MARK;
            let jailCooldown = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                SoundManager.playSoundEffect([player], SoundEffectType.INTERACT_BLOCKED);
                player.sendMessage("§i§oYou were unable to jail " + otherEntity.name);
                ChatManager.sendDeadPlayersMessage("§i§o" + player.name + " tried to jail " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? jailCooldown : beforeInteract.failCooldown);
                return;
            }
            
            player.setDynamicProperty(JailorRole.JAILOR_JAILED_ID_PROPERTY, otherID);
            SoundManager.playSoundEffect([player], SoundEffectType.JAILOR_START_JAILING);
            
            // ability activate message
            player.sendMessage("§iYou started jailing " + otherEntity.name + ". You can jail them anytime after your cooldown is up.");
            ChatManager.sendDeadPlayersMessage("§i§o" + player.name + " started jailing " + otherEntity.name + ".", LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            let timeBeforeJail = ScoreboardManager.getTrackedObjective("role_settings.jailor.time_before_jail");
            ScoreboardManager.setPlayerActionCooldown(player, timeBeforeJail);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.JAILOR_MARK);
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
        form.title("Jailor Settings");

        form.divider();
        form.label("The jailor is an innocent who is able to pull people into a private chat, during with the jailed player may not speak. The jailor can execute a jailed player at any time, although it will prevent them from jailing anymore people.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.jailor.enabled") != 0;
        form.toggle("Jailor Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_cooldown");
        form.slider("Jail Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of jail at the start of the game and after a person gets released from jail.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_uses");
        form.slider("Jail Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times jail can be used. -1 is infinite uses");

        let timeBeforeJail = ScoreboardManager.getTrackedObjective("role_settings.jailor.time_before_jail");
        form.slider("Time Until Jail", 15, 90, { defaultValue: timeBeforeJail, valueStep: 5  }); // 8
        form.label("The time in seconds before the jailor can pull their marked player into jail.");
        
        let jailTime = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_time");
        form.slider("Time in Jail", 15, 90, { defaultValue: jailTime, valueStep: 5 }); // 10
        form.label("The time in seconds that a player being in jail lasts.");
        
        let failTypes = ["None", "Prevent Execute", "Prevent Jail", "Kill Jailor"];
        let onFail = ScoreboardManager.getTrackedObjective("role_settings.jailor.on_fail");
        form.dropdown("On Incorrect Execute", failTypes, { defaultValueIndex: onFail }); // 12
        form.label("If the jailor kills a non-killing role, then this effect will occur.\nPrevent Execute: The Jailor can still jail but cannot kill the person in jail.\nPrevent Jail: The Jailor loses their ability to jail anyone.\nKill Jailor: The Jailor and the person they executed both get withered.");
        
        let sendTimerMessages = ScoreboardManager.getTrackedObjective("role_settings.jailor.send_timer_messages") != 0;
        form.toggle("Time Until Jail", { defaultValue: sendTimerMessages }); // 8
        form.label("If true, the jailor will be notified when there is 15 and 5 seconds remaining in the jail timer.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.jailor.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.jailor.jail_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.jailor.jail_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.jailor.time_before_jail", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.jailor.jail_time", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.jailor.on_fail", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.jailor.send_timer_messages", r.formValues[14] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_uses");
        let timeBeforeJail = ScoreboardManager.getTrackedObjective("role_settings.jailor.time_before_jail");
        let jailTime = ScoreboardManager.getTrackedObjective("role_settings.jailor.jail_time");
        let failTypes = ["None", "Prevent Execute", "Prevent Jail", "Kill Jailor"];
        let onFail = ScoreboardManager.getTrackedObjective("role_settings.jailor.on_fail");
        let sendTimerMessages = ScoreboardManager.getTrackedObjective("role_settings.jailor.send_timer_messages") != 0;

        let description = "The Jailor is an innocent role who can pull people into a private chat and execute them if they think the jailed player is evil.";
        description += "\n\nJail Cooldown Time: " + cooldownTime + " seconds";
        description += "\nJail Uses: " + abilityUses;
        description += "\nTime Before Jail: " + timeBeforeJail + " seconds";
        description += "\nTime in Jail: " + jailTime + " seconds";
        description += "\nFailed Execute Event: " + failTypes[onFail];
        description += "\nSend Timer Messages: " + sendTimerMessages;
        return description;
    }
}
"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { BuildPlayerHelpTagSignal } from "../signals/build_player_help_tag";
import { ModifierManager } from "../modifier_manager";
import { LoversModifier } from "../modifiers/lovers";

export class SerialKillerRole extends Role {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
        let freq = 0;
        system.runInterval(() => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            freq = (freq + 1) % 2;
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("note.hat"));
            let showTargetActionbar = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.target_on_actionbar") != 0;
            let serialKillers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SERIAL_KILLER);
            serialKillers.forEach((killer) => {
                let targetID = SerialKillerRole.getTargetID(killer);
                let target = ScoreboardManager.getPlayerWithID(targetID);
                if (target == null) {
                    return;
                }
                let playerDistance = PlayerHandler.distanceBetweenLocations(killer.location, target.location);
                let midFreq = (playerDistance < 20 && freq == 1);
                let closeFreq = (playerDistance < 7);
                if (midFreq || closeFreq) {
                    killer.playSound("note.hat", {location:target.location});
                }
                if (closeFreq) {
                    killer.onScreenDisplay.setActionBar("§aSUPER CLOSE!!");
                }
                else if (midFreq) {
                    killer.onScreenDisplay.setActionBar("§2Distance: Medium");
                }
                else {
                    killer.onScreenDisplay.setActionBar("§2Distance: Far");
                }
            });
        }, 5);
        if (!DeathHandler.onDeathSignal.isConnected(SerialKillerRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(SerialKillerRole.onPlayerDeath);
        }
        if (!PlayerHandler.afterPlayerInteract.isConnected(SerialKillerRole.healFromCleric)) {
            PlayerHandler.afterPlayerInteract.subscribe(SerialKillerRole.healFromCleric)
        }
        if (!DeathHandler.buildPlayerTag.isConnected(SerialKillerRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(SerialKillerRole.buildPlayerTag)
        }
    }

    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        let serialKillerTargets = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SERIAL_KILLER).map((serial) => {
            return SerialKillerRole.getTargetID(serial);
        });
        if (!event.isEndgame && serialKillerTargets.includes(ScoreboardManager.getPlayerID(event.playerToBuild))) {
            event.addStringToTag("§2X");
        }
    }

    /**
     * 
     * @param {Player} playerWhoInteracts 
     * @param {Player} playerWhoIsBeingInteracted 
     * @param {interactType} interactType 
     */
    static healFromCleric(playerWhoInteracts, playerWhoIsBeingInteracted, interactType) {
        if (interactType == InteractTypes.CLERIC_HEAL) {
            let serialKillers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SERIAL_KILLER);
            serialKillers.forEach((killer) => {
                let targetID = SerialKillerRole.getTargetID(killer);
                let target = ScoreboardManager.getPlayerWithID(targetID);
                // if there's no target OR the target is not the healed player
                if (target == null || target.id != playerWhoIsBeingInteracted.id) {
                    return;
                }
                
                killer.sendMessage("§2Your target has been changed.");
                SerialKillerRole.assignTarget(killer, playerWhoIsBeingInteracted);
            });
        }
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let allPlayers = world.getAllPlayers();
        let serialKillers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.SERIAL_KILLER);
        let playerDiedRole = RoleManager.getPlayerRole(playerWhoDied);

        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
        // let shouldNotify = ScoreboardManager.getTrackedObjective("role_settings.necromancer.notify_on_delay_reset") != 0;
        // let resetType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.delay_reset_type");
        if (killer != null) {
            let killerRole = RoleManager.getPlayerRole(killer);
            if (killerRole.getRoleType() == RoleTypes.SERIAL_KILLER && !killer.hasTag("dead")) {
                let targetID = SerialKillerRole.getTargetID(killer);
                let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
                // let playerWasSummoned = summonedPlayer != null && summonedPlayer.id == playerWhoDied.id;
                if (targetPlayer == null) {
                    // catches if the target is null
                }
                // target properly killed
                else if (playerWhoDied.id == targetPlayer.id) {
                    killer.sendMessage("§2You killed your target!");
                    playerWhoDied.sendMessage("§2You were the target of " + killer.name);
                    SerialKillerRole.assignTarget(killer, targetPlayer);
                    return;
                    // assign new target
                }
                else if (playerWhoDied != null && playerDiedRole.getAlignment() != RoleAlignment.MURDERER && playerDiedRole.getAlignment() != RoleAlignment.NEUTRAL_KILLER) {
                    killer.sendMessage("§2That player wasn't your target!");
                    ChatManager.sendDeadPlayersMessage("§2§o" + killer.name + " killed the wrong target");
                    GuessingManager.killGuessedPlayer(killer);
                    return;
                }
            }
        }

        
        let startAfterFirstDeath = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.start_after_first_death") != 0;
        let anyoneDied = ScoreboardManager.getTrackedObjective("tracking.has_anyone_died");
        serialKillers.forEach((serial) => {
            let targetID = SerialKillerRole.getTargetID(serial);
            let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
            if (targetPlayer == null) {
                let message = "§2Your target has mysteriously disappeared. You have been assigned a new target.";
                if (anyoneDied <= 1 && startAfterFirstDeath) {
                    message = "§2You have been assigned your first target.";
                }
                serial.sendMessage(message);
                SerialKillerRole.assignTarget(serial, null);
                return;
            }
            if (targetPlayer != null && (targetPlayer.id == playerWhoDied.id || targetPlayer.hasTag("dead"))) {
                serial.sendMessage("§2Someone else killed your target (" + playerWhoDied.name + "). You have been assigned a new target.");
                // assign new target
                SerialKillerRole.assignTarget(serial, targetPlayer);
                return;
            }
        });
    }

    /**
     * 
     * @param {Player} killer 
     * @param {Player} exceptionPlayer If set, will filter out the exception player, unless there is only 1 other player in the game.
     */
    static assignTarget(killer, exceptionPlayer) {
        let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let killerMod = ModifierManager.getPlayerModifier(killer);
        let loverID = killerMod != null && killerMod.getModifierType().LOVERS ? LoversModifier.getLoverID(killer) : -1;
        livingPlayers = livingPlayers.filter((pl) => pl != null && pl.id != killer.id && ScoreboardManager.getPlayerID(pl) != loverID);
        if (livingPlayers.length == 0) {
            killer.sendMessage("No targets remain.");
            WinConditionManager.requestWin([killer], new SerialKillerRole(), "");
            return;
        }
        if (livingPlayers.length > 1 && exceptionPlayer != null) {
            livingPlayers = livingPlayers.filter((pl) => exceptionPlayer.id != pl.id);
        }
        let targetIndex = ScoreboardManager.rollRandomNumber(0, livingPlayers.length);
        let target = livingPlayers[targetIndex];
        ChatManager.sendDeadPlayersMessage("§2§o" + killer.name + "'s target is now " + target.name, LogItemType.ABILITY_MESSAGE);
        ScoreboardManager.setScoreboardObjective(killer, "player.target_id", ScoreboardManager.getPlayerID(target));
        killer.sendMessage("You have a new target.");
    }

    static getTargetID(killer) {
        return ScoreboardManager.getScoreboardObjective(killer, "player.target_id");
    } 

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // let actionUses = ScoreboardManager.getTrackedObjective("role_settings.detective.action_uses");
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
        // ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
        let startAfterFirstDeath = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.start_after_first_death") != 0;
        if (!startAfterFirstDeath) {
            SerialKillerRole.assignTarget(player, null);
        }
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
        return "Serial Killer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Listen for sounds to figure out who your current target is and kill them one by one!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "A random player will be chosen as your target, which is the only player you may kill (except other killers if you are attacked). That player will have tick sounds played on them. Figure out who they are and kill them. After killing your target, a new target will be selected until you're the last one standing.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.serial_killer.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.SERIAL_KILLER;
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

            // ability effect

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.detective.cooldown_time");
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
        form.title("Serial Killer Settings");

        form.divider();
        form.label("The Serial Killer is a neutral killing role that has to kill everyone. They get one target at a time, which they must find by listening to sounds.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.enabled") != 0;
        form.toggle("Serial Killer Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        let showTargetActionbar = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.target_on_actionbar") != 0;
        form.toggle("Target Sounds on Actionbar", { defaultValue: showTargetActionbar })
        form.label("If true, the distance to the target will be shown on the actionbar.");
        
        let startAfterFirstDeath = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.start_after_first_death") != 0;
        form.toggle("Start After First Death", { defaultValue: startAfterFirstDeath })
        form.label("If true, the serial killer will not receive their first target until after the first player dies.");
        // 4
        // // let targetCount = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.target_count");
        // form.slider("Target Count", 1, 10, { defaultValue: targetCount })
        // form.label("The number of targets the serial killer will have at any given time.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.serial_killer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            // ScoreboardManager.setTrackedObjective("role_settings.serial_killer.target_count", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.serial_killer.target_on_actionbar", r.formValues[4] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.serial_killer.start_after_first_death", r.formValues[6] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let showTargetActionbar = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.target_on_actionbar") != 0;
        let startAfterFirstDeath = ScoreboardManager.getTrackedObjective("role_settings.serial_killer.start_after_first_death") != 0;

        let description = "The Serial Killer is a neutral killer that is assigned an anonymous target they must discover and kill. Their target has sound effects playing on them.";
        description += "\n\nSound Displays on Actionbar: " + showTargetActionbar;
        description += "\nActive After First Death: " + startAfterFirstDeath;
        return description;
    }
}
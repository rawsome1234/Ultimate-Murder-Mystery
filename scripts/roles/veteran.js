"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class VeteranRole extends InnocentRole {

    static ALERT_SCOREBOARD = "role_settings.veteran.alert_duration";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(VeteranRole.updateVeteranAlerts, 1);
        if (!PlayerHandler.beforePlayerInteract.isConnected(VeteranRole.beforeInteract)) {
            PlayerHandler.beforePlayerInteract.subscribe(VeteranRole.beforeInteract);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoInteracts 
     * @param {Player} playerWhoIsBeingInteracted 
     * @param {InteractTypes} interactType 
     */
    static beforeInteract(playerWhoInteracts, playerWhoIsBeingInteracted, interactType) {
        let interactRole = RoleManager.getPlayerRole(playerWhoIsBeingInteracted);
        interactType = PlayerHandler.beforePlayerInteract.interactType;
        let alertAllInteracts = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_on_all_interacts") != 0;
        let interactIsCaughtByAlert = alertAllInteracts || (interactType != null && interactType.is_negative);
        let playerIsVeteran = interactRole != null && !DeathHandler.consideredDead(playerWhoIsBeingInteracted) && interactRole.getRoleType() == RoleTypes.VETERAN;
        let alertIsUp = VeteranRole.isAlertUp(playerWhoIsBeingInteracted);
        if (playerIsVeteran && alertIsUp && interactIsCaughtByAlert) {
            // activate alert
            let defenseType = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_defense_type");

            if (defenseType == 0) {
                playerWhoIsBeingInteracted.sendMessage("§e§oSomeone interacted with you.");
                SoundManager.playSoundEffect([playerWhoIsBeingInteracted], SoundEffectType.VETERAN_ALERT_ACTIVATE);
                ChatManager.sendDeadPlayersMessage("§e§o" + playerWhoInteracts.name + "'s interaction notified " + playerWhoIsBeingInteracted.name, LogItemType.ABILITY_MESSAGE);
            }
            else if (defenseType == 1) {
                PlayerHandler.beforePlayerInteract.cancel = true;
                // playerWhoIsBeingInteracted.sendMessage("Someone interacted with you.");
            }
            else {
                PlayerHandler.beforePlayerInteract.cancel = true;
                SoundManager.playSoundEffect([playerWhoIsBeingInteracted], SoundEffectType.VETERAN_ALERT_ACTIVATE);
                playerWhoIsBeingInteracted.sendMessage("§e§oSomeone tried to interact with you but it was cancelled by Alert.");
            }
        }
    }

    static isAlertUp(player) {
        return ScoreboardManager.getScoreboardObjective(player, VeteranRole.ALERT_SCOREBOARD) > 0;
    }

    static updateVeteranAlerts() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let veterans = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.VETERAN);
        veterans.forEach((vet) => {
            let alertTime = ScoreboardManager.getScoreboardObjective(vet, VeteranRole.ALERT_SCOREBOARD);
            if (alertTime > 0) {
                ScoreboardManager.addScoreboardObjective(vet, VeteranRole.ALERT_SCOREBOARD, -1);
            }
            if (alertTime == 1) {
                // end vet
                vet.sendMessage("§eYou're no longer on alert.");
                ChatManager.sendDeadPlayersMessage("§e§o" + vet.name + "'s alert has ended.", LogItemType.ABILITY_MESSAGE);
                SoundManager.playSoundEffect([vet], SoundEffectType.VETERAN_ALERT_END);
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_cooldown");
                ScoreboardManager.setPlayerActionCooldown(vet, actionCooldown);
            }
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        return "§eVeteran";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Go on alert and detect players who interact with you!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let defenseType = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_defense_type");
        let alertDisplays = ["notify you when someone interacts with you", "cancel interactions with you", "notify you and block interactions"]
        return "Using your ability will start Alert, which will " + alertDisplays[defenseType] + ".";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.veteran.enabled");
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
        return RoleTypes.VETERAN;
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
        if (VeteranRole.isAlertUp(player)) {
            player.sendMessage("You already have alert active.");
            ScoreboardManager.setPlayerActionCooldown(player, 5, false);
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
                player.sendMessage("You have " + chargesRemaining + " alerts remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }
            
            // ability effect
            let alertDuration = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_duration");
            ScoreboardManager.setScoreboardObjective(player, VeteranRole.ALERT_SCOREBOARD, alertDuration * 20);
            SoundManager.playSoundEffect([player], SoundEffectType.VETERAN_START_ALERT);

            // ability activate message
            player.sendMessage("§eYou're alert is up for " + alertDuration + " seconds.");
            ChatManager.sendDeadPlayersMessage("§e§o" + player.name + "'s alert is up for " + alertDuration + " seconds.", LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, alertDuration+1, false);
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
        form.title("Veteran Settings");

        form.divider();
        form.label("The Veteran is an innocent role who can use their ability to receive notifications or block negative interactions towards them.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.veteran.enabled") != 0;
        form.toggle("Veteran Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_cooldown");
        form.slider("Alert Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of alert.");
        
        let alertUses = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_uses");
        form.slider("Alert Ability Uses", -1, 10, { defaultValue: alertUses }); // 6
        form.label("The number of times alert can be used. -1 is infinite uses");
        
        let alertDuration = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_duration");
        form.slider("Alert Duration", 5, 120, { valueStep: 5, defaultValue: alertDuration }); // 6
        form.label("The number of seconds alert lasts.");
        
        let alertAllInteracts = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_on_all_interacts") != 0;
        form.toggle("All Interacts Trigger Alert", { defaultValue: alertAllInteracts }); // 6
        form.label("If true, all interacts will be caught by alert. If false, only negative interactions will be caught (murderer & neutral killer).");
        
        let alertDefenseTypes = ["Notify Veteran", "Block Interaction", "Block and Notify"];
        let defenseType = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_defense_type");
        form.dropdown("Alert Defense Type", alertDefenseTypes, { defaultValueIndex: defenseType }); // 6
        form.label("What the Alert ability does. §lNotify Veteran§r will notify the player when a negative interaction occurs. §lBlock Interaction§r will block the interaction from occuring. §lBlock and Notify§r will block the interaction and notify the veteran.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.veteran.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.veteran.alert_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.veteran.alert_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.veteran.alert_duration", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.veteran.alert_on_all_interacts", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.veteran.alert_defense_type", r.formValues[12]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_cooldown");
        let alertUses = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_uses");
        let alertDuration = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_duration");
        let alertAllInteracts = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_on_all_interacts") != 0;
        let alertDefenseTypes = ["Notify Veteran", "Block Interaction", "Block and Notify"];
        let defenseType = ScoreboardManager.getTrackedObjective("role_settings.veteran.alert_defense_type");

        let description = "Veteran is an innocent role that can use their ability to go on Alert. While on alert, they can block or be notified on interactions, depending on the settings.";
        description += "\n\nAlert Cooldown: " + cooldownTime + " seconds.";
        description += "\nAlert Uses: " + alertUses;
        description += "\nAlert Duration: " + alertDuration + " seconds.";
        description += "\nAlert Activates on All Interacts: " + alertAllInteracts;
        description += "\nAlert Activation Types: " + alertDefenseTypes[defenseType];
        return description;
    }
}
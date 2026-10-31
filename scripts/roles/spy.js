"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class SpyRole extends InnocentRole {
    static bugTag = "bugged";
    static bugProperty = "detectingBug";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!PlayerHandler.afterPlayerInteract.isConnected(SpyRole.afterPlayerInteract)) {
            PlayerHandler.afterPlayerInteract.subscribe(SpyRole.afterPlayerInteract);
        }
        super.initialize();
    }
    
    static afterPlayerInteract(playerWhoInteracts, playerWhoIsBeingInteracted, interactType) {
        if (playerWhoIsBeingInteracted != null && ScoreboardManager.getPlayerID(playerWhoIsBeingInteracted) >= 0) {
            SpyRole.addInteractToPlayer(playerWhoIsBeingInteracted, playerWhoInteracts);
        }
    }

    /**
     * 
     * @param {Player} spy 
     * @param {Player} bugged 
     */
    static addBugToPlayer(spy, bugged) {
        bugged.addTag(SpyRole.bugTag + ScoreboardManager.getPlayerID(spy));
        spy.setDynamicProperty(SpyRole.bugProperty + ScoreboardManager.getPlayerID(bugged), "");
        // spy.addTag("detectingBug" + );
    }

    /**
     * Adds an interaction to a bugged player
     * @param {Player} bugged 
     * @param {Player} playerInteracting 
     */
    static addInteractToPlayer(bugged, playerInteracting) {
        let interactedID = ScoreboardManager.getPlayerID(playerInteracting);
        bugged.getTags().forEach((tag) => {
            // if it's a bug tag
            if (tag.startsWith(SpyRole.bugTag)) {
                // gets the spy
                let buggedID = ScoreboardManager.getPlayerID(bugged);
                let respectiveSpyID = parseInt(tag.substring(SpyRole.bugTag.length));
                let respectiveSpy = ScoreboardManager.getPlayerWithID(respectiveSpyID);

                // add bug to spy
                let interactions = respectiveSpy.getDynamicProperty(SpyRole.bugProperty + buggedID);
                interactions = interactions == "" ? interactedID.toString() : interactions.concat("," + interactedID);
                respectiveSpy.setDynamicProperty(SpyRole.bugProperty + ScoreboardManager.getPlayerID(bugged), interactions);
                
                let notifyOnInteract = ScoreboardManager.getTrackedObjective("role_settings.spy.notify_on_interact") != 0;
                if (notifyOnInteract) {
                    respectiveSpy.sendMessage("§e§oSomeone interacted with " + bugged.name + "...");
                }
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Added " + playerInteracting.name + " as an interacting player. Now is " + interactions));
            }
        });
        // bugged.addTag(SpyRole.bugTag + ScoreboardManager.getPlayerID(spy));
        // spy.addTag("detectingBug" + ScoreboardManager.getPlayerID(bugged));
    }

    /**
     * 
     * @param {Player} bugged 
     * @param {Player} spyToRemove 
     * @returns {string} a string of a list of players that interacted with the bugged player
     */
    static removeBugFromPlayer(bugged, spyToRemove) {
        let searchTag = SpyRole.bugTag + ScoreboardManager.getPlayerID(spyToRemove);
        bugged.removeTag(searchTag);
        let interactedPlayerIDs = spyToRemove.getDynamicProperty(SpyRole.bugProperty + ScoreboardManager.getPlayerID(bugged));
        return interactedPlayerIDs;
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_cooldown");
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
        return "§eSpy";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Place a bug on players to see who interacts with them!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_time");
        return "Click a player to give them a bug. After " + abilityUses + " seconds you will get a list of players who have interacted with that player.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.spy.enabled") != 0;
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
        return RoleTypes.SPY;
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

        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player") {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.SPY_PLACE_BUG;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                SoundManager.playSoundEffect([player], SoundEffectType.INTERACT_BLOCKED);
                player.sendMessage("§e§oYou were unable to bug " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " tried to bug " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            let bugTime = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_time");
            SpyRole.addBugToPlayer(player, otherEntity);
            system.runTimeout(() => {
                let interactedString = SpyRole.removeBugFromPlayer(otherEntity, player);
                if (interactedString == "") {
                    player.sendMessage("§e§oNo one interacted with " + otherEntity.name + " in the last " + bugTime + " seconds.");
                    ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " learned no one has interacted with " + otherEntity.name, LogItemType.ABILITY_MESSAGE);
                    return;
                }
                
                let interactedStringIDs = interactedString.split(",");
                let interactedPlayers = interactedStringIDs.map((strID) => ScoreboardManager.getPlayerWithID(parseInt(strID)));
                
                Util.shuffle(interactedPlayers);
                SoundManager.playSoundEffect([player], SoundEffectType.SPY_INFO_RETURN);
                let playerList = Util.formatStringList(interactedPlayers.map((player) => player.name), ", ", true);
                let endingOfMessage = "he players that interacted with §a" + otherEntity.name + "§e are " + playerList;
                player.sendMessage("§e§oT" + endingOfMessage);
                ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " found that t" + endingOfMessage, LogItemType.ABILITY_MESSAGE);
            }, bugTime * 20);

            // ability activate message
            player.sendMessage("§ePlaced a bug on " + otherEntity.name);
            ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " placed a bug on " + otherEntity.name, LogItemType.ABILITY_MESSAGE);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.SPY_PLACE_BUG);
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
        form.title("Spy Settings");

        form.divider();
        form.label("The spy is an innocent player that can place a bug onto players to detect who interacts with them.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.spy.enabled") != 0;
        form.toggle("Spy Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_cooldown");
        form.slider("Bug Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of bugging a player.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_uses");
        form.slider("Bug Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times bug can be used. -1 is infinite uses");
        
        let bugTime = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_time");
        form.slider("Bug Time", 15, 90, { valueStep: 5, defaultValue: bugTime }); // 8
        form.label("The amount of time before the bug returns information to the spy.");

        let notifyOnInteract = ScoreboardManager.getTrackedObjective("role_settings.spy.notify_on_interact") != 0;
        form.toggle("Notify Spy on Interact", { valueStep: 5, defaultValue: notifyOnInteract }); // 10
        form.label("Whether to notify the spy when a player is interacted with while their bug is on them.");
        

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.spy.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.spy.bug_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.spy.bug_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.spy.bug_time", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.spy.notify_on_interact", r.formValues[10] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_uses");
        let bugTime = ScoreboardManager.getTrackedObjective("role_settings.spy.bug_time");
        let notifyOnInteract = ScoreboardManager.getTrackedObjective("role_settings.spy.notify_on_interact") != 0;

        let description = "The spy is an innocent role that is able to place a bug on people that will return the names of people that have interacted with the specified player.";
        
        description += "\n\nBug Cooldown: " + cooldownTime + " seconds";
        description += "\nBug Uses: " + abilityUses;
        description += "\nBug Time: " + bugTime + " seconds";
        description += "\nSpy is Notifed on Interact: " + notifyOnInteract;
        return description;
    }
}
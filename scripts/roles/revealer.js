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

export class RevealerRole extends InnocentRole {

    static revealerMarkTag = "revealerMark";

    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        super.giveToPlayer(player);
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_charges");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);

        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_cooldown");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
    }

    /**
     * @param {Player} player
     */
    onPlayerDeath(player, killer) {
        let playerTags = player.getTags();
        // player.sendMessage("Checking tags..");
        playerTags.forEach((tag) => {
            if (tag.substring(0, RevealerRole.revealerMarkTag.length) == RevealerRole.revealerMarkTag) {
                let remaining = tag.substring(RevealerRole.revealerMarkTag.length);
                let revealerPlayer = ScoreboardManager.getPlayerWithID(parseInt(remaining));
                let playerRole = RoleManager.getPlayerRole(player);
                
                let revealKiller = ScoreboardManager.getTrackedObjective("role_settings.revealer.reveal_gives_killer_role") != 0;
                let killerMessage = "";
                if (revealKiller) {
                    if (killer == null) {
                        killerMessage = " They did not directly die to a player.";
                    }
                    else {
                        let killerRole = RoleManager.getPlayerRole(killer);
                        killerMessage = killerRole != null ? " Their killer's role was §r" + killerRole.getDisplayName() + "§r§e." : " They did not directly die to a player.";
                    }
                }
                let deadKillerMessage = revealKiller && killer != null ? " and of " + killer.name : "";
                SoundManager.playSoundEffect([player], SoundEffectType.DEATH_NOTIFICATION);
                
                revealerPlayer.sendMessage("§e" + player.name + " has died! Their role was §r" + playerRole.getDisplayName() + "§r§e." + killerMessage);
                ChatManager.sendDeadPlayersMessage("§e§o" + revealerPlayer.name + " learned the role of " + player.name + deadKillerMessage + ".", LogItemType.ABILITY_MESSAGE);
                // player.sendMessage(remaining);

                if (ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_death_gives_back_charge") != 0) {
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", 1);
                    PlayerHandler.updateRoleActionVisual(revealerPlayer);
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
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§eRevealer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Mark players to learn their role when they die!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Mark players with your ability. When marked players die, you'll get told their role.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.revealer.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.REVEALER;
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
            player.sendMessage("§eYou can't mark anymore people.");
            return;
        }

        if (otherEntity.typeId == "minecraft:player" && chargesRemaining != 0) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.REVEALER_MARK;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§e§oYou were unable to mark " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " tried to mark " + otherEntity.name + " for revealing but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }
            
            let playerID = ScoreboardManager.getPlayerID(player);
            if (playerID < 0) {
                player.sendMessage("That player is not playing!");
                return;
            }

            let revealerTag = RevealerRole.revealerMarkTag + playerID;

            if (otherEntity.hasTag(revealerTag)) {
                player.sendMessage("You've already marked that player!");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            otherEntity.addTag(revealerTag);
            
            
            // ability activate message
            player.sendMessage("§eMarked §r" + otherEntity.name + "§e.");
            ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " marked " + otherEntity.name + " to be revealed.", LogItemType.ABILITY_MESSAGE);
            
            // cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.REVEALER_MARK);
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
        form.title("Revealer Settings");

        form.divider();
        form.label("An innocent role that is able to mark people. When a marked player dies, the revealer will be told the role of that player.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.revealer.enabled") != 0;
        form.toggle("Revealer Enabled", { defaultValue: roleEnabled }); // 2

        // 3
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, 300, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The cooldown between marking players.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_charges");
        form.slider("Mark Ability Uses", -1, 10, { defaultValue: abilityUses }); // 5
        form.label("The number of times mark can be used. -1 is infinite uses");
        
        let deathCharge = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_death_gives_back_charge") != 0;
        form.toggle("Marked Death Redeems Mark", { defaultValue: deathCharge }); // 7
        form.label("If a person dies with revealer mark, the revealer will get their mark back.");
        
        let revealKiller = ScoreboardManager.getTrackedObjective("role_settings.revealer.reveal_gives_killer_role") != 0;
        form.toggle("Reveal Gives Killer Role", { defaultValue: revealKiller }); // 9
        form.label("If true, the revealer will be told the role of the killer in addition to the role of the marked player.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.revealer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.revealer.mark_cooldown", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("role_settings.revealer.mark_charges", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("role_settings.revealer.mark_death_gives_back_charge", r.formValues[7] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.revealer.reveal_gives_killer_role", r.formValues[9] ? 1 : 0);
            // player.sendMessage("" + callback);
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_charges");
        let deathCharge = ScoreboardManager.getTrackedObjective("role_settings.revealer.mark_death_gives_back_charge") != 0;
        let revealKiller = ScoreboardManager.getTrackedObjective("role_settings.revealer.reveal_gives_killer_role") != 0;

        let description = "The revealer is an innocent who can get the roles of marked players after they die.";
        description += "\n\nMark Cooldown: " + cooldownTime + " seconds.";
        description += "\nMark Uses: " + abilityUses;
        description += "\nDead Player Gives Back Mark: " + deathCharge;
        description += "\nReveal Gives Killer Role: " + revealKiller;
        return description;
    }
}
"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class JanitorRole extends MurdererRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(JanitorRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(JanitorRole.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        if (killer != null && killer.typeId == "minecraft:player" && ScoreboardManager.getPlayerID(killer) != -1) {
            let playerRole = RoleManager.getPlayerRole(killer);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.JANITOR) {
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_cooldown");
                ScoreboardManager.setPlayerActionCooldown(killer, actionCooldown);
                killer.sendMessage("§uAfter that kill, your clean cooldown has reset.");
            }
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_cooldown");
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
        return "§uJanitor";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Clean up ghost bodies after death to prevent players from using them!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Right click a ghost body with your ability to remove it. Your cooldown for cleaning is reset when you kill.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.janitor.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
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
        return RoleTypes.JANITOR;
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
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            let playerID = ScoreboardManager.getScoreboardObjective(otherEntity, "ghost.ghost_player_id");
            let ghostPlayer = ScoreboardManager.getPlayerWithID(playerID);
            let ghostName = ghostPlayer != null && ghostPlayer.isValid ? ghostPlayer.name + "'s" : "a";
            GhostManager.onGhostInteract.emit(player, otherEntity);
            otherEntity.remove();
            SoundManager.playSoundEffect([player], SoundEffectType.JANITOR_CLEAN);
            
            // ability activate message
            player.sendMessage("§u§oCleaned the ghost up!");
            ChatManager.sendDeadPlayersMessage("§u§o" + player.name + " removed " + ghostName + " ghost.", LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Janitor Settings");

        form.divider();
        form.label("The janitor is a murderer role that is able to remove ghost bodies.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.janitor.enabled") != 0;
        form.toggle("Janitor Enabled", { defaultValue: roleEnabled }); // 2
        
        form.divider();
        
        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_cooldown");
        form.slider("Clean Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of cleaning. This will also be the cooldown after the janitor kills.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_uses");
        form.slider("Clean Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times clean can be used. -1 is infinite uses");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.janitor.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.janitor.clean_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.janitor.clean_uses", r.formValues[6]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
       let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_cooldown");
       let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.janitor.clean_uses");

       let description = "The janitor is a murderer role that is able to remove ghost bodies.";
       description += "\n\nCooldown Time: " + cooldownTime + " seconds.";
       description += "\nClean Uses: " + abilityUses;
       return description;
    }
}
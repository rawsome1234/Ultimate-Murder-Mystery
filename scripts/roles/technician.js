"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { PortalManager } from "../portal_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class TechnicianRole extends MurdererRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.technician.ability_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.technician.spawn_portal_cooldown");
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
        return RoleAlignment.MURDERER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§uTechnician";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Spawn portals that murderers can teleport between!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your ability spawns a portal where you stand. Once there are at least 2 portals, clicking one will teleport you to a random portal.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.technician.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
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
        return RoleTypes.TECHNICIAN;
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
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            let spawnLocation = player.location;// player.isInWater ? PlayerHandler.addVectors(player.location, {x:0,y:1,z:0}) : player.location;
            // ability effect
            PortalManager.addPortal(spawnLocation, player.dimension.id, player);

            // ability activate message
            SoundManager.playSoundEffect([player], SoundEffectType.BASIC_PLING);
            player.sendMessage("§uSpawned a portal!");
            ChatManager.sendDeadPlayersMessage("§u§o" + player.name + " placed a portal at " + PlayerHandler.vecToString(spawnLocation), LogItemType.ABILITY_MESSAGE);
            // player.sendMessage("§u§o" + player.name + " placed a portal at " + PlayerHandler.vecToString(spawnLocation));

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.technician.spawn_portal_cooldown");
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
        form.title("Technician Settings");

        form.divider();
        form.label("The technician is a murderer role who can spawn portals for murderers to use. Right clicking a portal will teleport the user to another random portal and give them short invisibility.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.technician.enabled") != 0;
        form.toggle("Technician Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.technician.spawn_portal_cooldown");
        form.slider("Spawn Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of spawning portals.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.technician.ability_uses");
        form.slider("Spawn Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times a portal can be spawned. -1 is infinite uses");
        
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.technician.teleport_cooldown_time"); // 8
        form.slider("Teleport Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: teleportCooldown })
        form.label("The amount of time in seconds after a player uses a portal that they can teleport using a portal again.");
        
        let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.technician.invisibility_duration");
        form.slider("Invisibility Time", 0, 10, { defaultValue: invisDuration }) // 10
        form.label("The amount of time in seconds that a teleporter gets invisibility.");
        
        let options = ["Murderers", "All Killers", "All Players"];
        let whoCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_default");
        form.dropdown("Who Can See Portals", options, {defaultValueIndex: whoCanSee}) // 12
        form.label("What players can see and use portals after being placed.");
        
        let viewChangeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.view_change_time");
        form.slider("Portal View Change Time", -5, 300, { valueStep: 5, defaultValue: viewChangeTime }) // 14
        form.label("The amount of time in seconds before more people can see portals. -5 disables this.");
        
        let whoCanSeeOvertime = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_overtime");
        form.dropdown("Who Can See Portals Over Time", options, { defaultValueIndex: whoCanSeeOvertime }) // 16
        form.label("If enabled (see above), these are the players that will see portals after a time.");
        
        let seeingAllowsUse = ScoreboardManager.getTrackedObjective("role_settings.technician.seeing_allows_use") != 0;
        form.toggle("Seeing Portals Allows Use", { defaultValue: seeingAllowsUse }); // 18
        form.label("Whether players that see portals after some time are allowed to use them.");
        
        let deadPlayersCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.dead_players_see_portals") != 0;
        form.toggle("Dead Players See Portals", { defaultValue: deadPlayersCanSee }); // 20
        form.label("Whether dead players can see portals or not.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.technician.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.technician.spawn_portal_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.ability_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.teleport_cooldown_time", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.invisibility_duration", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.who_can_see_portals_default", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.view_change_time", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.who_can_see_portals_overtime", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.technician.seeing_allows_use", r.formValues[18] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.technician.dead_players_see_portals", r.formValues[20] ? 1 : 0);

            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.technician.spawn_portal_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.technician.ability_uses");
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.technician.teleport_cooldown_time"); // 8
        let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.technician.invisibility_duration");
        let whoCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals");
        let deadPlayersCanSee = ScoreboardManager.getTrackedObjective("role_settings.technician.dead_players_see_portals") != 0;
        let viewChangeTime = ScoreboardManager.getTrackedObjective("role_settings.technician.view_change_time");
        let whoCanSeeOvertime = ScoreboardManager.getTrackedObjective("role_settings.technician.who_can_see_portals_overtime");
        let seeingAllowsUse = ScoreboardManager.getTrackedObjective("role_settings.technician.seeing_allows_use") != 0;

        let description = "The technician is a murderer that is able to spawn portals for use by other players. Clicking a portal will teleport you to a random other portal.";
        description += "\n\nSpawn Portal Cooldown: " + cooldownTime + " seconds.";
        description += "\nSpawn Uses: " + abilityUses;
        description += "\nPortal Cooldown: " + teleportCooldown + " seconds.";
        description += "\nInvisibility Time: " + invisDuration + " seconds.";
        description += "\nWho Can See Portals: " + ["Murderers", "All Killers", "All Players"][whoCanSee];
        description += "\nView Change Time: " + viewChangeTime + " seconds.";
        description += "\nWho Can See Portals After Timer: " + ["Murderers", "All Killers", "All Players"][whoCanSeeOvertime];
        description += "\nSeeing Portal Allows Use: " + seeingAllowsUse;
        description += "\nDead Players See Portals: " + deadPlayersCanSee;
        return description;
    }
}
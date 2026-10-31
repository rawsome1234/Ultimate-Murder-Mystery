"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { GhostManager } from "../ghost_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { LogItemType } from "../logs/game_log";

export class GravewalkerRole extends InnocentRole {

    static GRAVEWALKER_GHOST_IDS_PROPERTY = "ghostIDs";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!GhostManager.onGhostInteract.isConnected(GravewalkerRole.onGhostInteract)) {
            GhostManager.onGhostInteract.subscribe(GravewalkerRole.onGhostInteract);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerInteracting 
     * @param {Entity} ghost 
     */
    static onGhostInteract(playerInteracting, ghost) {
        let markedGhostsGivesNotifications = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.gets_interact_notifications") != 0;
        let revealName = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.reveal_interacter_name") != 0;

        if (!markedGhostsGivesNotifications) {
            return;
        }

        let allPlayers = world.getAllPlayers();
        let gravewalkers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.GRAVEWALKER);

        gravewalkers.forEach((walker) => {
            let markedGhosts = GravewalkerRole._readGhostTag(walker);
            if (markedGhosts.includes(ghost.id)) {
                let playerName = revealName ? playerInteracting.name : "A player"
                walker.sendMessage("§j§o" + playerName + " interacted with a marked ghost...");
                ChatManager.sendDeadPlayersMessage("§j§o" + walker.name + " was informed of an interaction.", LogItemType.ABILITY_MESSAGE);
            }
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_uses");
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.mark_cooldown");
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, Math.min(markCooldown, teleportCooldown));
        player.setDynamicProperty(GravewalkerRole.GRAVEWALKER_GHOST_IDS_PROPERTY, "[]");
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
        return "§jGravewalker";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Mark ghosts and teleport between them!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Crouch and interact with a ghost to mark it. Right click a ghost to teleport to a random other ghost that you've marked.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.gravewalker.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return true;
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
        return RoleTypes.GRAVEWALKER;
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

    static getGhostsFromList(walker) {
        GravewalkerRole._validateGhostTag(walker);
        return GravewalkerRole._readGhostTag(walker).map((id) => GhostManager.getGhostFromID(id));
    }

    /**
     * 
     * @param {Player} walker 
     * @param {Entity} ghost 
     */
    static hasMarkedGhost(walker, ghost) {
        GravewalkerRole._validateGhostTag(walker);
        return GravewalkerRole._readGhostTag(walker).includes(ghost.id);
    }   

    /**
     * 
     * @param {Player} walker 
     * @param {Entity} ghost 
     */
    static addGhostToList(walker, ghost) {
        GravewalkerRole._validateGhostTag(walker);
        let ids = GravewalkerRole._readGhostTag(walker);
        if (ids.includes(ghost.id)) {
            return false;
        }
        ids.push(ghost.id);
        walker.setDynamicProperty(GravewalkerRole.GRAVEWALKER_GHOST_IDS_PROPERTY, JSON.stringify(ids));
    }

    /**
     * 
     * @param {Player} walker 
     */
    static _validateGhostTag(walker) {
        let ids = GravewalkerRole._readGhostTag(walker);
        let validatedIDs = ids.filter((id) => GhostManager.getGhostFromID(id) != null);
        if (validatedIDs.length != ids.length) {
            walker.setDynamicProperty(GravewalkerRole.GRAVEWALKER_GHOST_IDS_PROPERTY, JSON.stringify(validatedIDs));
        }
    }

    /**
     * 
     * @param {Player} walker 
     * @returns {number[]}
     */
    static _readGhostTag(walker) {
        return JSON.parse(walker.getDynamicProperty(GravewalkerRole.GRAVEWALKER_GHOST_IDS_PROPERTY));
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
        if (otherEntity != null && otherEntity.isValid && otherEntity.typeId != "umm:ghost_body") {
            return;
        }

        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("You're out of teleport uses!");
            return;
        }

        if (chargesRemaining != 0) {

            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
            if (player.isSneaking) {
                // mark ghost
                if (GravewalkerRole.hasMarkedGhost(player, otherEntity)) {
                    player.sendMessage("§j§oYou've already marked this ghost!");
                    ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                    return;
                }
                
                let maxGhostsMarked = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.max_ghosts_marked");
                if (GravewalkerRole.getGhostsFromList(player).length >= maxGhostsMarked) {
                    player.sendMessage("§j§oYou've already marked the max number of ghosts! (" + maxGhostsMarked + ")");
                    ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                    return;
                }

                GravewalkerRole.addGhostToList(player, otherEntity);
                player.sendMessage("§j§oMarked that ghost for teleporting!");
                SoundManager.playSoundEffect([player], SoundEffectType.BASIC_MARK);
                ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " marked a ghost at " + PlayerHandler.vecToString(otherEntity.location) + ".");

                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.mark_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            }
            else {
                // teleport
                // activate ability 
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + (chargesRemaining-1) + " teleports remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }

                if (!GravewalkerRole.hasMarkedGhost(player, otherEntity)) {
                    player.sendMessage("§j§oYou've haven't marked that ghost yet!");
                    ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                    return;
                }


                let allGhosts = GravewalkerRole.getGhostsFromList(player);

                if (allGhosts.length == 1) {
                    player.sendMessage("§j§oYou only have this ghost marked!");
                    ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                    return;
                }
                let ghostsCanTPTo = allGhosts.filter((g) => g.id != otherEntity.id);
                let randomGhost = ghostsCanTPTo[ScoreboardManager.rollRandomNumber(0, ghostsCanTPTo.length)];

                let teleportLocation = PlayerHandler.addVectors(randomGhost.location, { x:0, y:.5, z:0 });
                let invisibilityTime = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.invis_on_teleport_duration");
                
                system.run(() => {
                    player.teleport(teleportLocation);
                    if (invisibilityTime > 0) {
                        player.addEffect("minecraft:invisibility", invisibilityTime * 20, { showParticles: true });
                    }
                    player.sendMessage("§jTeleported to a random ghost!");
                    SoundManager.playSoundEffect([player], SoundEffectType.PORTAL_USE);
                    ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " teleported to a ghost at " + PlayerHandler.vecToString(player.location), LogItemType.ABILITY_MESSAGE);
                });
                
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            }
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
        form.title("Gravewalker Settings");

        form.divider();
        form.label("The Gravewalker is an innocent who can mark ghosts and teleport between them.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.enabled") != 0;
        form.toggle("Gravewalker Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The ability cooldown after marking ghosts.");
        
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_cooldown");
        form.slider("Teleport Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: teleportCooldown })
        form.label("The ability cooldown after teleporting between marked ghosts.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_uses");
        form.slider("Teleport Uses", -1, 10, { defaultValue: abilityUses }); // 8
        form.label("The number of times teleport can be used. -1 is infinite uses");
        
        let markedGhostsGivesNotifications = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.gets_interact_notifications") != 0;
        form.toggle("Ghosts Notify on Interact", { defaultValue: markedGhostsGivesNotifications }); // 8
        form.label("If true, the gravewalker will be notified when a ghost is interacted with.");
        
        let revealName = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.reveal_interacter_name") != 0;
        form.toggle("Reveal Name", { defaultValue: revealName }); // 8
        form.label("If true, the gravewalker will be notified of the name of the player who interacted with the ghost.");
        
        let maxGhostsMarked = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.max_ghosts_marked");
        form.slider("Max Ghosts Marked", 2, 10, { defaultValue: maxGhostsMarked }); // 10
        form.label("The maximum number of ghosts the gravewalker can have marked at once.");
        
        let invisOnTeleport = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.invis_on_teleport_duration");
        form.slider("Invis Duration on Teleport", 0, 10, { defaultValue: invisOnTeleport }); // 12
        form.label("The time in seconds the gravewalker gets invisibility after warping between ghosts.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.mark_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.teleport_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.teleport_uses", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.gets_interact_notifications", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.reveal_interacter_name", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.max_ghosts_marked", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.gravewalker.invis_on_teleport_duration", r.formValues[16]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.mark_cooldown");
        let teleportCooldown = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.teleport_uses");
        let markedGhostsGivesNotifications = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.gets_interact_notifications") != 0;
        let revealName = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.reveal_interacter_name") != 0;
        let maxGhostsMarked = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.max_ghosts_marked");
        let invisOnTeleport = ScoreboardManager.getTrackedObjective("role_settings.gravewalker.invis_on_teleport_duration");

        let description = "The Gravewalker is an innocent role that can mark ghosts to teleport between them and get notifications about who interacts with them.";
        description += "\n\nMark Cooldown: " + markCooldown + " seconds.";
        description += "\nTeleport Cooldown: " + teleportCooldown + " seconds.";
        description += "\nTeleport Uses: " + abilityUses;
        description += "\nReceives Interact Notifs: " + markedGhostsGivesNotifications;
        description += "\nNotifs Have Player Name: " + revealName;
        description += "\nMax Ghosts Marked: " + maxGhostsMarked;
        description += "\nInvisibility Duration on Teleport: " + invisOnTeleport;
        return description;
    }
}
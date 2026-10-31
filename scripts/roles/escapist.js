"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class EscapistRole extends MurdererRole {
    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(EscapistRole.spawnParticlesAtMark, 20);
        super.initialize();
    }

    static spawnParticlesAtMark() {
        let escapists = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.ESCAPIST);
        escapists.forEach((esc) => {
            let hasMark = ScoreboardManager.getScoreboardObjective(esc, "player.mark_used");
            if (hasMark > 0) {
                let locX = ScoreboardManager.getScoreboardObjective(esc, "respawn_pos.x")+.5;
                let locY = ScoreboardManager.getScoreboardObjective(esc, "respawn_pos.y")+.5;
                let locZ = ScoreboardManager.getScoreboardObjective(esc, "respawn_pos.z")+.5;
                let locDim = ScoreboardManager.getScoreboardObjective(esc, "respawn_pos.dim");

                let dimension = null;
                try {
                    dimension = world.getDimension(EscapistRole.dimensionIDToString(locDim));
                }
                catch (e) {
                    return;
                }

                let location = {x:locX,y:locY,z:locZ};
                if (!dimension.isChunkLoaded(location)) {
                    return;
                }

                let map = new MolangVariableMap();
                map.setColorRGBA('variable.color', {red:1,green:0,blue:0,alpha:1});
                map.setFloat('variable.dust_lifetime', 2);
                map.setFloat('variable.particle_random', Math.random());
                map.setFloat('variable.size_multiplier', 1);

                let playersToShow = PlayerHandler.getPlayersThatSee(world.getAllPlayers(), ParticleVisibilityType.ESCAPIST_RECALL_PARTICLE);
                playersToShow.push(esc);

                playersToShow.forEach((pl) => {
                    pl.spawnParticle("umm:footprints", {x:locX,y:locY,z:locZ}, map);
                });
            }

            // player.teleport({x:locX, y:locY, z:locZ}, { dimension: world.getDimension(EscapistRole.dimensionIDToString(locDim)) });
            
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.escapist.escape_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.teleport_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        ScoreboardManager.setScoreboardObjective(player, "player.mark_used", 0);
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
        return "§cEscapist";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Mark a location and teleport back to it.";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can mark a location using your ability and then click again to teleport back to that location.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.escapist.enabled") != 0;
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
        return RoleTypes.ESCAPIST;
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
     * Converts the dimension to a number for identification.
     * 
     * @param {string} dimensionID the dimension's identifier.
     * @return {number} the respective number for the dimension.
     */
    static dimToID(dimensionID) {
        switch (dimensionID) {
            case "minecraft:overworld":
                return 0
            case "minecraft:nether":
                return 1
            case "minecraft:the_end":
                return 2
            default:
                return -1
        }
    }

    /**
     * Converts a dimension's number id to its string ID. 
     * 
     * @param {number} dimID the numerical id associated with the dimension.
     * @return {string} the identifier for the dimension.
     */
    static dimensionIDToString(dimID) {
        switch (dimID) {
            case 0:
                return "minecraft:overworld"
            case 1:
                return "minecraft:nether"
            case 2:
                return "minecraft:the_end"
            default:
                return "null"
        }
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player
     */
    activateAbility(player) {
        let hasMark = ScoreboardManager.getScoreboardObjective(player, "player.mark_used");
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (!hasMark) {
            ScoreboardManager.setScoreboardObjective(player, "player.mark_used", 1);
            let playerLocation = player.location;
            ScoreboardManager.setScoreboardObjective(player, "respawn_pos.x", playerLocation.x);
            ScoreboardManager.setScoreboardObjective(player, "respawn_pos.y", playerLocation.y);
            ScoreboardManager.setScoreboardObjective(player, "respawn_pos.z", playerLocation.z);
            ScoreboardManager.setScoreboardObjective(player, "respawn_pos.dim", EscapistRole.dimToID(player.dimension.id));
            player.sendMessage("§4Marked a location.");
            SoundManager.playSoundEffect([player], SoundEffectType.BASIC_MARK);
            ChatManager.sendDeadPlayersMessage("§c§o" + player.name + " marked their escape to " + PlayerHandler.vecToString({x:playerLocation.x,y:playerLocation.y,z:playerLocation.z}), LogItemType.ABILITY_MESSAGE);

            let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.mark_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, markCooldown);
            return;
        }
        
        ScoreboardManager.setScoreboardObjective(player, "player.mark_used", 0);
        
        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }
            
            // ability effect
            let locX = ScoreboardManager.getScoreboardObjective(player, "respawn_pos.x")+.5;
            let locY = ScoreboardManager.getScoreboardObjective(player, "respawn_pos.y")+.5;
            let locZ = ScoreboardManager.getScoreboardObjective(player, "respawn_pos.z")+.5;
            let locDim = ScoreboardManager.getScoreboardObjective(player, "respawn_pos.dim");

            player.teleport({x:locX, y:locY, z:locZ}, { dimension: world.getDimension(EscapistRole.dimensionIDToString(locDim)) });
            
            // ability activate message
            player.sendMessage("§4You've recalled to your mark...");
            SoundManager.playSoundEffect([player], SoundEffectType.ESCAPIST_RECALL);
            ChatManager.sendDeadPlayersMessage("§c§o" + player.name + " recalled to " + PlayerHandler.vecToString({x:locX,y:locY,z:locZ}), LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            let escapistCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.teleport_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, escapistCooldown);
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
        form.title("Escapist Settings");

        form.divider();
        form.label("The escapist is a murderer role that can mark a location and recall back to it at a future time.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.escapist.enabled") != 0;
        form.toggle("Escapist Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The cooldown of the recall action after marking.");
        
        let escapistCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.teleport_cooldown");
        form.slider("Recall Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: escapistCooldown })
        form.label("The ability cooldown of the recall action after using recall. Also the initial cooldown."); // 6
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.escapist.escape_uses");
        form.slider("Recall Ability Uses", -1, 10, { defaultValue: abilityUses }); // 8
        form.label("The number of times recall can be used. Mark is a free action. -1 is infinite uses");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.escapist.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.escapist.mark_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.escapist.teleport_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.escapist.escape_uses", r.formValues[8]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.mark_cooldown");
        let escapistCooldown = ScoreboardManager.getTrackedObjective("role_settings.escapist.teleport_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.escapist.escape_uses");

        let description = "The escapist is a murderer that is able to mark a location and teleport back to it.";
        description += "\n\nMark Cooldown: " + markCooldown + " seconds.";
        description += "\nRecall Cooldown: " + escapistCooldown + " seconds.";
        description += "\nRecall Uses: " + abilityUses;
        return description;
    }
}
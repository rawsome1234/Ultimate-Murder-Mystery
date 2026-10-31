"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class ApothocaryRole extends MurdererRole {

    static apothocaryMarkTag = "poisoned";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(ApothocaryRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(ApothocaryRole.onPlayerDeath);
        }
        system.runInterval(ApothocaryRole.drawPoisonedParticlesOnPlayers, 5);
        
        super.initialize();
    }

    static drawPoisonedParticlesOnPlayers() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let apothocaries = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.APOTHOCARY);
        let playersToSee = PlayerHandler.getPlayersThatSee(allPlayers, ParticleVisibilityType.APOTHOCARY_MARKED);
        let lifetime = 5;
        apothocaries.forEach((apoth) => {
            let poisonedTag = ApothocaryRole.getApothocaryMarkFromPlayer(apoth);
            if (poisonedTag != null) {
                // ability effect
                let targetID = parseInt(poisonedTag.substring(ApothocaryRole.apothocaryMarkTag.length));
                if (targetID == null) {
                    return;
                }

                let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
                if (targetPlayer == null) {
                    return;
                }
                let map = new MolangVariableMap();
                map.setColorRGBA('variable.color', {red:0,green:1,blue:0,alpha:1});
                map.setFloat('variable.dust_lifetime', lifetime);
                map.setFloat('variable.particle_random', Math.random());
                map.setFloat('variable.size_multiplier', 1);

                let showPlayers = playersToSee.concat([apoth]);

                showPlayers.forEach((pl) => {
                    pl.spawnParticle("umm:footprints", PlayerHandler.addVectors(targetPlayer.location, {x:0,y:2.5,z:0}), map);
                });
            }
        });
        // allPlayers.forEach((drawing) => {
        //     let id = ScoreboardManager.getPlayerID(drawing);
        //     if (drawing.hasTag("dead") || drawing.hasTag("AFK") || id < 0) {
        //         return;
        //     }
        //     let drawLocation = drawing.location;
        //     let map = new MolangVariableMap();
        //     map.setColorRGBA('variable.color', InvestigatorRole.getPlayerFootprintColor(drawing));
        //     map.setFloat('variable.dust_lifetime', lifetime);
        //     map.setFloat('variable.particle_random', Math.random());
        //     map.setFloat('variable.size_multiplier', sizeMult);
        //     // map.setFloat('variable.particle_lifetime', 100);

        //     investigators.forEach((invest) => {
        //         invest.spawnParticle("umm:footprints", drawLocation, map);
        //     });
        // });
    }

    /**
     * 
     * @param {Player} player
     * @param {Player?} killer
     */
    static onPlayerDeath(player, killer) {
        let removeMessage = "§4§oThe person you poisoned seems to have died to other causes...";
        ApothocaryRole.removeApothocaryTagForPlayer(player, removeMessage);
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

    /**
     * 
     * @param {Player} player 
     * @param {string} removeMessage
     * @returns {boolean} if a tag was successfully removed.
     */
    static removeApothocaryTagForPlayer(player, removeMessage) {
        let playerID = ScoreboardManager.getPlayerID(player);
        let searchTag = ApothocaryRole.apothocaryMarkTag + playerID;
        world.getAllPlayers().forEach((apoth) => {
            let playerRole = RoleManager.getPlayerRole(apoth);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.APOTHOCARY) {
                if (apoth.hasTag(searchTag)) {
                    apoth.removeTag(searchTag);
                    if (removeMessage != null && removeMessage != "") {
                        apoth.sendMessage(removeMessage);
                    }
                }
            }
        });
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.apothocary.mark_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_kill_cooldown");
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
        return "§aApothocary";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Poison players and activate it from a distance!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can poison player by clicking them, then you can poison them. Poisoning them will give them incurable lethal poison, but will also a draw a line between them and you.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.apothocary.enabled") != 0;
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
        return RoleTypes.APOTHOCARY;
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
        
        let tag = ApothocaryRole.getApothocaryMarkFromPlayer(player);
        // player.sendMessage("Found tag on player " + tag);
        if (tag == null) {
            player.sendMessage("§aRight click a player to poison them.");
            return;
        }
        if (chargesRemaining != 0) {
            player.removeTag(tag);
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }
            
            // ability effect
            let targetID = parseInt(tag.substring(ApothocaryRole.apothocaryMarkTag.length));
            if (targetID == null) {
                player.sendMessage("§aSomething went wrong with activating the poison. Try marking a new player (id error).")
                return;
            }

            let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
            if (targetPlayer == null) {
                player.sendMessage("§aSomething went wrong with activating the poison. Try marking a new player (player error).")
                return;
            }

            // effect
            let lineDuration = ScoreboardManager.getTrackedObjective("role_settings.apothocary.line_duration");
            targetPlayer.addEffect("minecraft:wither", 20000000, {showParticles: true, amplifier:255});
            world.getAllPlayers().forEach((pl) => {
                PlayerHandler.spawnParticlesBetweenPoints(pl, player.location, targetPlayer.location, {red:0,green:1,blue:0,alpha:1}, lineDuration);
            })
            SoundManager.playSoundEffect([targetPlayer], SoundEffectType.GUESSED_PLAYER);
            SoundManager.playSoundEffect([player], SoundEffectType.APOTHOCARY_POISON_TARGET);
            
            // ability activate message
            player.sendMessage("§aActivated the poison on §l" + targetPlayer.name + "§r§a.");
            targetPlayer.sendMessage("§2§oPoison in your veins has been activated.");
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " activated the poison in " + targetPlayer.name, LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            let invisCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_kill_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, invisCooldown);
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
        
        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player" && ApothocaryRole.getApothocaryMarkFromPlayer(player) == null) {
            // ability effect
            let otherID = ScoreboardManager.getPlayerID(otherEntity);

            if (otherID == -1) {
                player.sendMessage("§oThat player is not in the game.");
                return;
            }

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.APOTHOCARY_MARK;
            let invisCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_mark_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§a§oYou were unable to poison " + otherEntity.name);
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to poison " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? invisCooldown : beforeInteract.failCooldown);
                return;
            }
            
            player.addTag(ApothocaryRole.apothocaryMarkTag + otherID);
            SoundManager.playSoundEffect([player], SoundEffectType.APOTHOCARY_MARK);
            
            // ability activate message
            player.sendMessage("You poisoned " + otherEntity.name);
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " marked " + otherEntity.name + " with poison.", LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, invisCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.APOTHOCARY_MARK);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    /**
     * If the tag exists, returns the apothocary mark tag from a player
     * @param {Player} player 
     * @returns {String} the full tag or null if none found
     */
    static getApothocaryMarkFromPlayer(player) {
        let allTags = player.getTags();
        for (let i = 0; i < allTags.length; i++) {
            let testTag = allTags[i];
            if (testTag.startsWith(ApothocaryRole.apothocaryMarkTag)) {
                return testTag;
            }
        }
        return null;
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
        form.title("Apothocary Settings");

        form.divider();
        form.label("The apothocary is a murderer role that can poison someone and activate the poison from a distance.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.apothocary.enabled") != 0;
        form.toggle("Apothocary Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The ability cooldown after marking a player.");
        
        let killCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_kill_cooldown");
        form.slider("Poison Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: killCooldown })
        form.label("The ability cooldown after setting to kill a player. Also the initial cooldown.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.apothocary.mark_uses");
        form.slider("Poison Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the apothocary can poison. Marking is free. -1 is infinite uses");
        
        let lineDuration = ScoreboardManager.getTrackedObjective("role_settings.apothocary.line_duration");
        form.slider("Line Duration", 1, 15, { defaultValue: lineDuration }); // 6
        form.label("The number of seconds the line between the Apothocary and the victim lasts.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.apothocary.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.apothocary.post_mark_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.apothocary.post_kill_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.apothocary.mark_uses", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.apothocary.line_duration", r.formValues[10]);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_mark_cooldown");
        let killCooldown = ScoreboardManager.getTrackedObjective("role_settings.apothocary.post_kill_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.apothocary.mark_uses");

        let description = "The apothocary is a murderer role that can poison someone and activate the poison from a distance.";
        description += "\n\nMark Cooldown: " + markCooldown + " seconds.";
        description += "\nPost Poison Cooldown: " + killCooldown + " seconds.";
        description += "\nPoison Uses: " + abilityUses;
        return description;
    }
}
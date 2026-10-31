"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { LoversModifier } from "../modifiers/lovers";

export class ShadowmancerRole extends Role {

    static shadowmancerMarkedProperty = "shadowMarked";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(ShadowmancerRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(ShadowmancerRole.onPlayerDeath);
        }
        system.runInterval(ShadowmancerRole.drawShadowDots, 5);
        // system.runInterval(ShadowmancerRole.runFreezeTimer, 1);
        if (!DeathHandler.buildPlayerTag.isConnected(ShadowmancerRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(ShadowmancerRole.buildPlayerTag)
        }
        
        super.initialize();
    }

    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        let shadowmancers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SHADOWMANCER);
        let marks = [];
        shadowmancers.forEach((shadow) => {
            marks.concat(ShadowmancerRole._readShadowTag(shadow));
        });
        if (!event.isEndgame && marks.includes(ScoreboardManager.getPlayerID(event.playerToBuild))) {
            event.addStringToTag("§jS");
        }
    }

    static runFreezeTimer() {
        // let allPlayers = world.getAllPlayers();
        // let playingPlayers = PlayerHandler.getPlayingPlayers(allPlayers);
        // playingPlayers.forEach((frozen) => {
        //     let freezeTime = ScoreboardManager.getScoreboardObjective(frozen, "role_settings.cryomancer.freeze_timer");
        //     if (freezeTime > 0) {
        //         ScoreboardManager.addScoreboardObjective(frozen, "role_settings.cryomancer.freeze_timer", -1);

        //         // freeze effect
        //         frozen.clearVelocity();
        //         frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
        //         let freezeCamera = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freezes_camera") != 0;
        //         if (freezeCamera) {
        //             frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
        //         }
        //         // frozen.sendMessage("Freezing");
        //         frozen.addEffect("minecraft:slowness", 3, {amplifier: 5});
        //         // frozen.onScreenDisplay.setHudVisibility
        //     }
        //     if (freezeTime == 1) {
        //         frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
        //         frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
        //         // frozen.sendMessage("Unfreezing");
        //     }
        // });
    }

    /**
     * 
     * @param {Player} shadow 
     */
    static killShadowedPlayers(shadow) {
        let shadowTag = ShadowmancerRole._readShadowTag(shadow);
        shadowTag.forEach((playerID) => {
            let player = ScoreboardManager.getPlayerWithID(playerID);
            player.removeEffect("minecraft:darkness");
            if (player != null && !DeathHandler.consideredDead(player)) {
                player.teleport({x:player.location.x, y:-69, z:player.location.z}, {keepVelocity: false});
            }
        });
    }

    static drawShadowDots() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let shadowmancers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.SHADOWMANCER);
        let playersCanSeeShadow = PlayerHandler.getPlayersThatSee(allPlayers, ParticleVisibilityType.SHADOWMANCER_MARKED_PLAYERS);
        
        let dotOffset = {x: 0, y: 2.4 + (.5), z: 0 };
        shadowmancers.forEach((shadow) => {
            let playersToShow = playersCanSeeShadow.concat([shadow]);
            let shadowTag = ShadowmancerRole._readShadowTag(shadow);

            shadowTag.forEach((shadowPlayerID) => {
                let shadowedPlayer = ScoreboardManager.getPlayerWithID(shadowPlayerID);
                if (shadowedPlayer != null) {
                    let spawnLocation = PlayerHandler.addVectors(shadowedPlayer.location, dotOffset);

                    let settings = new MolangVariableMap();
                    settings.setColorRGBA('variable.color', {red:0,blue:0,green:0,alpha:1});
                    settings.setFloat('variable.dust_lifetime', .5);

                    try {
                        playersToShow.forEach((showPl) => {
                            showPl.spawnParticle("umm:line_draw", spawnLocation, settings);
                        });
                    }
                    catch (e) {
                        return;
                    }
                }
            }); 
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
        let shadowmancers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SHADOWMANCER);
        shadowmancers.forEach((shadow) => {
            if (!ShadowmancerRole.isPlayerInShadowTag(shadow) && ShadowmancerRole.getShadowlessPlayers(shadow).length == 1) {
                ShadowmancerRole.fireDarknessEffect(shadow, true, false, null);
            }
        });
        // let removeMessage = "§j§oA person you  has died...";
        ShadowmancerRole.removeShadowTagForPlayer(player, "");
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

    static getShadowlessPlayers(shadow) {
        let shadowTag = ShadowmancerRole._readShadowTag(shadow);
        let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let loverID = LoversModifier.getLoverID(shadow);
        return livingPlayers.filter((pl) => {
            let playerID = ScoreboardManager.getPlayerID(pl);
            let playerNotInTag = !shadowTag.includes(playerID);
            let playerIsNotLover = playerID != loverID;
            return playerNotInTag && playerIsNotLover && pl.id != shadow.id;
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {string} removeMessage
     * @returns {boolean} if a tag was successfully removed.
     */
    static removeShadowTagForPlayer(player, removeMessage) {
        let shadowmancers = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.SHADOWMANCER);
        shadowmancers.forEach((shadow) => {
            if (ShadowmancerRole.removePlayerFromShadowTag(shadow, player) && removeMessage != null && removeMessage != "") {
                shadow.sendMessage(removeMessage);
            }
        });
    }

    /**
     * Removes a player from a shadowmancer's tag.
     * @param {Player} shadow 
     * @param {Player} player 
     * @returns whether the tag has that player or not
     */
    static removePlayerFromShadowTag(shadow, player) {
        let playerID = ScoreboardManager.getPlayerID(player);
        let shadowTag = ShadowmancerRole._readShadowTag(shadow);
        if (shadowTag.includes(playerID)) {
            shadowTag.splice(shadowTag.indexOf(playerID), 1);
            shadow.setDynamicProperty(ShadowmancerRole.shadowmancerMarkedProperty, JSON.stringify(shadowTag));
            return true;
        }
        return false;
    }

    /**
     * Adds a player to the shadowmancer's mark, if not already there.
     * @param {Player} shadow 
     * @param {Player} newPlayer 
     * @returns {boolean} if the player was successfully added.
     */
    static addPlayerToShadowTag(shadow, newPlayer) {
        let playerID = ScoreboardManager.getPlayerID(newPlayer);
        let shadowTag = ShadowmancerRole._readShadowTag(shadow);
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.max_marked_players");
        if (!shadowTag.includes(playerID) && (shadowTag.length < maxMarked || maxMarked == -1)) {
            shadowTag.push(playerID);
            shadow.setDynamicProperty(ShadowmancerRole.shadowmancerMarkedProperty, JSON.stringify(shadowTag));
            // cryomancer.sendMessage("§cMarking player");
            return true;
        }
        return false;
    }

    /**
     * Returns the number of players marked by a shadowmancer
     * @param {Player} shadow 
     */
    static playerCountMarkedByShadowmancer(shadow) {
        return ShadowmancerRole._readShadowTag(shadow).length;
    }

    /**
     * Returns if the player has already been marked by the shadowmancer
     * @param {Player} shadow 
     * @param {Player} newPlayer
     */
    static isPlayerInShadowTag(shadow, newPlayer) {
        if (newPlayer == null) {
            return true;
        }
        let playerID = ScoreboardManager.getPlayerID(newPlayer);
        return playerID >= 0 && ShadowmancerRole._readShadowTag(shadow).includes(playerID);
    }

    /**
     * Reads the tag of the shadowmancer.
     * @param {Player} shadow 
     * @returns {number[]} a list of player ids who are marked by the shadowmancer
     */
    static _readShadowTag(shadow) {
        return JSON.parse(shadow.getDynamicProperty(ShadowmancerRole.shadowmancerMarkedProperty));
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(ShadowmancerRole.shadowmancerMarkedProperty, "[]");
        super.giveToPlayer(player);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§jShadowmancer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Mark players to pull everyone into shadow!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Mark players with shadows by clicking them. Shortly after, players with shadows will be given darkness. Once you mark everyone, use your ability to send them to the void and win!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.NEUTRAL_KILLER;
    }

    getGuessAlignments() {
        return [];
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.SHADOWMANCER;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} shadow
     */
    activateAbility(shadow) {
        let unmarked = ShadowmancerRole.getShadowlessPlayers(shadow);
        if (unmarked.length == 0) {
            ShadowmancerRole.killShadowedPlayers(shadow);
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
        
        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player") {
            // ability effect
            let otherID = ScoreboardManager.getPlayerID(otherEntity);

            if (otherID == -1) {
                player.sendMessage("§oThat player is not in the game.");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            if (ShadowmancerRole.isPlayerInShadowTag(player, otherEntity)) {
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                player.sendMessage("§j§oThat player is already marked.");
                return;
            }
            
            let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.max_marked_players");
            if (maxMarked != -1 && ShadowmancerRole.playerCountMarkedByShadowmancer(player) >= maxMarked) {
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                player.sendMessage("§jYou've marked the maximum number of players already! (" + maxMarked + ")");
                return;
            }

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.SHADOWMANCER_MARK;
            let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§j§oYou were unable to mark " + otherEntity.name);
                ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " tried to mark " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? markCooldown : beforeInteract.failCooldown);
                return;
            }
            
            if (chargesRemaining > 0) {
                shadow.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(shadow, "player.action_charges", -1);
            }

            if (!ShadowmancerRole.addPlayerToShadowTag(player, otherEntity)) {
                player.sendMessage("§jSomething went wrong with marking that player");
            }   
            else {
                // ability activate message
                player.sendMessage("§jYou marked " + otherEntity.name + " with shadows.");
                ChatManager.sendDeadPlayersMessage("§j§o" + player.name + " marked " + otherEntity.name + " with shadows.", LogItemType.ABILITY_MESSAGE);
                
                let giveAllDarkness = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.marked_players_get_darkness") != 0;
                ShadowmancerRole.fireDarknessEffect(player, giveAllDarkness, true, otherEntity);

                if (ShadowmancerRole.getShadowlessPlayers(player).length == 0) {
                    player.sendMessage("§jUse your ability one more time to send players to the void!");
                }
            }
            
            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, markCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.SHADOWMANCER_MARK);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    /**
     * 
     * @param {Player} shadow 
     * @param {boolean} giveToAll 
     * @param {boolean} useDelay 
     * @param {Player} newPlayer a newly marked player. Always gets darkness
     */
    static fireDarknessEffect(shadow, giveToAll, useDelay, newPlayer) {
        let shadowTag = ShadowmancerRole._readShadowTag(shadow);
        let darknessDelay = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.darkness_delay");
        let darknessDuration = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.darkness_duration");
        let penultimateDelay = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.penultimate_darkness_delay");
        let messageOnPenultimate = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.message_on_penultimate_player") != 0;

        let playersLeft = ShadowmancerRole.getShadowlessPlayers(shadow);
        // second to last player marked
        if (playersLeft.length <= 1) {
            darknessDelay = penultimateDelay;
            if (messageOnPenultimate) {
                world.sendMessage("§j§oThe shadows have almost taken over...");
            }
        }

        if (!useDelay) {
            darknessDelay = 0;
        }

        if (shadowTag.length <= 1) {
            return;
        }

        system.runTimeout(() => {
            shadow.sendMessage("§j§oShadows have been pulsed...");
            if (giveToAll) {
                shadowTag.forEach((shadowPlayerID) => {
                    let player = ScoreboardManager.getPlayerWithID(shadowPlayerID);
                    if (player != null) {
                        player.addEffect("minecraft:darkness", darknessDuration*20, {showParticles: false});
                    }
                });
            }
            else {
                newPlayer.addEffect("minecraft:darkness", darknessDuration*20, {showParticles: false})
            }
        }, darknessDelay * 20);
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
        form.title("Shadowmancer Settings");

        form.divider();
        form.label("The shadowmancer is a neutral killer that can mark players with shadows. If all players are marked with shadows, they will all get dropped into the void. When the shadowmancer marks a new player, all players with shadows will get darkness.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.enabled") != 0;
        form.toggle("Shadowmancer Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The ability cooldown after marking a player with shadows.");
        
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.max_marked_players");
        form.slider("Max Shadowed Players", -1, 10, { defaultValue: maxMarked }); // 6
        form.label("The max number of players that can be inflicted with shadows at a given time. -1 is all players.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_uses");
        form.slider("Mark Uses", -1, 10, { defaultValue: abilityUses }); // 8
        form.label("The number of times the shadowmancer can mark. -1 is infinite uses");
        
        // let markGrantsInvis = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_grants_invis") != 0;
        // form.toggle("Mark Give Shadow Invisibility", { defaultValue: markGrantsInvis }); // 10
        // form.label("If true, the shadowmancer gains invisibility when killing.");
        
        // let invisDuration = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.invis_duration");
        // form.slider("Invisibility Duration", 1, 15, { defaultValue: invisDuration }); // 12
        // form.label("The duration of invisibility given to the shadowmancer, in seconds.");
        
        let markedGetDarkness = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.marked_players_get_darkness") != 0;
        form.toggle("All Marked Get Darkness", { defaultValue: markedGetDarkness }); // 10
        form.label("If true, all marked players will get darkness when a new player is marked.");
        
        let darknessDelay = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.darkness_delay");
        form.slider("Darkness Delay", 0, 60, { defaultValue: darknessDelay }); // 12
        form.label("If all players get darkness, the delay before darkness is actually given.");
        
        let darknessTime = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.darkness_duration");
        form.slider("Darkness Time", 5, 30, { defaultValue: darknessTime }); // 14
        form.label("The amount of time players have darkness for, in seconds.");
        
        let penultimateDelay = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.penultimate_darkness_delay");
        form.slider("Penultimate Darkness Delay", 0, 60, { defaultValue: penultimateDelay }); // 16
        form.label("The delay before players get darkness if there is only one person left to mark");
        
        let messageOnPenultimate = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.message_on_penultimate_player") != 0;
        form.toggle("Send Message on Penultimate", { defaultValue: messageOnPenultimate }); // 18
        form.label("If true, will send a message in chat when darkness is emitted from the second to last player.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.mark_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.max_marked_players", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.mark_uses", r.formValues[8]);
            // ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.mark_grants_invis", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.marked_players_get_darkness", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.darkness_delay", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.darkness_duration", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.penultimate_darkness_delay", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.shadowmancer.message_on_penultimate_player", r.formValues[18] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_cooldown");
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.max_marked_players");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.mark_uses");
        let markedGetDarkness = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.marked_players_get_darkness") != 0;
        let darknessDelay = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.darkness_delay");
        let darknessTime = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.darkness_duration");
        let penultimateDelay = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.penultimate_darkness_delay");
        let messageOnPenultimate = ScoreboardManager.getTrackedObjective("role_settings.shadowmancer.message_on_penultimate_player") != 0;

        let description = "The shadowmancer is a neutral killer that marks players with darkness. If all players are marked, another ability use will send everyone to the void.";
        description += "\n\nShadow Mark Cooldown: " + markCooldown + " seconds.";
        description += "\nMax Shadow Players: " + maxMarked + " players.";
        description += "\nShadow Mark Uses: " + abilityUses;
        description += "\nAll Marked Get Darkness: " + markedGetDarkness;
        description += "\nDelay for Darkness: " + darknessDelay + " seconds.";
        description += "\nDarkness Duration: " + darknessTime + " seconds";
        description += "\nDarkness Delay on Penultimate Mark: " + penultimateDelay;
        description += "\nSend Penultimate Message: " + messageOnPenultimate;
        return description;
    }
}
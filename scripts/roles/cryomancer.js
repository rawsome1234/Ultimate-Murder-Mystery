"use strict";

import { world, system, Player, MolangVariableMap, EntityHitEntityAfterEvent, InputPermissionCategory, EquipmentSlot } from "@minecraft/server";
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

export class CryomancerRole extends MurdererRole {

    static cryomancerIDProperty = "freezeReady";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(CryomancerRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(CryomancerRole.onPlayerDeath);
        }
        world.afterEvents.entityHitEntity.subscribe(CryomancerRole.onPlayerHit);
        system.runInterval(CryomancerRole.drawIceDots, 5);
        system.runInterval(CryomancerRole.runFreezeTimer, 1);
        
        super.initialize();
    }

    static runFreezeTimer() {
        let allPlayers = world.getAllPlayers();
        let playingPlayers = PlayerHandler.getPlayingPlayers(allPlayers);
        playingPlayers.forEach((frozen) => {
            let freezeTime = ScoreboardManager.getScoreboardObjective(frozen, "role_settings.cryomancer.freeze_timer");
            if (freezeTime > 0) {
                ScoreboardManager.addScoreboardObjective(frozen, "role_settings.cryomancer.freeze_timer", -1);

                // freeze effect
                frozen.clearVelocity();
                frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
                let freezeCamera = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freezes_camera") != 0;
                if (freezeCamera) {
                    frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
                }
                // frozen.sendMessage("Freezing");
                frozen.addEffect("minecraft:slowness", 3, {amplifier: 5});
                // frozen.onScreenDisplay.setHudVisibility
            }
            if (freezeTime == 1) {
                frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
                frozen.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
                // frozen.sendMessage("Unfreezing");
            }
        });
    }

    static drawIceDots() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let cryos = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.CRYOMANCER);
        let murderers = PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), [RoleAlignment.MURDERER]);

        let playersToShow = PlayerHandler.getPlayersThatSee(allPlayers, ParticleVisibilityType.CRYOMANCER_MARKED_PLAYERS).concat(murderers);
        cryos.sort((a, b) => ScoreboardManager.getPlayerID(a) > ScoreboardManager.getPlayerID(b));

        let cryoCount = 0;
        cryos.forEach((cryomancer) => {
            let dotOffset = {x: 0, y: 2.4 + (.5 * cryoCount), z: 0 };
            cryoCount += 1;

            let cryoTag = CryomancerRole._readCryoTag(cryomancer);

            cryoTag.forEach((frostedPlayerID) => {
                let frostedPlayer = ScoreboardManager.getPlayerWithID(frostedPlayerID);
                if (frostedPlayer != null) {
                    let spawnLocation = PlayerHandler.addVectors(frostedPlayer.location, dotOffset);

                    let settings = new MolangVariableMap();
                    settings.setColorRGBA('variable.color', {red:0,blue:1,green:0,alpha:1});
                    settings.setFloat('variable.dust_lifetime', .5);

                    playersToShow.forEach((showPl) => {
                        showPl.spawnParticle("umm:line_draw", spawnLocation, settings);
                    });

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
     * @param {EntityHitEntityAfterEvent} event 
     */
    static onPlayerHit(event) {
        // event.damagingEntity.sendMessage("Damage");
        let punchFreesPlayers = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.players_free_frozen") != 0;

        if (!punchFreesPlayers) {
            return;
        }

        let punchedPlayer = event.hitEntity;
        let hittingPlayer = event.damagingEntity;
        
        let freezeTime = ScoreboardManager.getScoreboardObjective(punchedPlayer, "role_settings.cryomancer.freeze_timer");
        if (hittingPlayer.typeId == "minecraft:player" && hittingPlayer.getComponent("equippable").getEquipment(EquipmentSlot.Mainhand) == null && freezeTime > 1) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Speeding up"));
            ScoreboardManager.setScoreboardObjective(punchedPlayer, "role_settings.cryomancer.freeze_timer", 2);
        }
    }

    /**
     * 
     * @param {Player} player
     * @param {Player?} killer
     */
    static onPlayerDeath(player, killer) {
        // let removeMessage = "§3§oA person you frosted has died...";
        CryomancerRole.removeCryoTagForPlayer(player, "");
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
    static removeCryoTagForPlayer(player, removeMessage) {
        world.getAllPlayers().forEach((cryomancer) => {
            let playerRole = RoleManager.getPlayerRole(cryomancer);
            if (playerRole != null && playerRole.getRoleType() == RoleTypes.CRYOMANCER) {
                if (CryomancerRole.removePlayerFromCryoTag(cryomancer, player) && removeMessage != null && removeMessage != "") {
                    cryomancer.sendMessage(removeMessage);
                }
            }
        });
    }

    /**
     * Removes a player from a cryomancer's tag.
     * @param {Player} cryomancer 
     * @param {Player} player 
     * @returns whether the tag has that player or not
     */
    static removePlayerFromCryoTag(cryomancer, player) {
        let playerID = ScoreboardManager.getPlayerID(player);
        let cryoTag = CryomancerRole._readCryoTag(cryomancer);
        if (cryoTag.includes(playerID)) {
            cryoTag.splice(cryoTag.indexOf(playerID), 1);
            cryomancer.setDynamicProperty(CryomancerRole.cryomancerIDProperty, JSON.stringify(cryoTag));
            return true;
        }
        return false;
    }

    /**
     * Adds a player to the cryomancer's mark, if not already there.
     * @param {Player} cryomancer 
     * @param {Player} newPlayer 
     * @returns {boolean} if the player was successfully added.
     */
    static addPlayerToCryoTag(cryomancer, newPlayer) {
        let playerID = ScoreboardManager.getPlayerID(newPlayer);
        let cryoTag = CryomancerRole._readCryoTag(cryomancer);
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.max_marked_players");
        if ((cryoTag.length < maxMarked || maxMarked == -1) && !cryoTag.includes(playerID)) {
            cryoTag.push(playerID);
            cryomancer.setDynamicProperty(CryomancerRole.cryomancerIDProperty, JSON.stringify(cryoTag));
            // cryomancer.sendMessage("§cMarking player");
            return true;
        }
        return false;
    }

    /**
     * Returns the number of players marked by a cryomancer
     * @param {Player} cryomancer 
     */
    static playersMarkedByCryomancer(cryomancer) {
        return CryomancerRole._readCryoTag(cryomancer).length;
    }

    /**
     * Returns if the player has already been marked by the cryomancer
     * @param {Player} cryomancer 
     * @param {Player} newPlayer
     */
    static playerInCryoTag(cryomancer, newPlayer) {
        let playerID = ScoreboardManager.getPlayerID(newPlayer);
        return CryomancerRole._readCryoTag(cryomancer).includes(playerID);
    }

    /**
     * Reads the tag of the cryomancer.
     * @param {Player} cryomancer 
     * @returns {number[]} a list of player ids who are marked by the cryomancer
     */
    static _readCryoTag(cryomancer) {
        return JSON.parse(cryomancer.getDynamicProperty(CryomancerRole.cryomancerIDProperty));
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(CryomancerRole.cryomancerIDProperty, "[]");
        super.giveToPlayer(player);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§bCryomancer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Cast a spell on people and freeze them at once!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "You can mark players with frost by right clicking them. You can freeze any frosted players in a radius by using your ability!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.cryomancer.enabled") != 0;
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
        return RoleTypes.CRYOMANCER;
    }

    /**
     * 
     * @param {Player} player
     * @param {number} freezeTime  
     */
    static freezePlayer(player, freezeTime) {
        player.sendMessage("§bYou've been frozen!");
        ScoreboardManager.setScoreboardObjective(player, "role_settings.cryomancer.freeze_timer", freezeTime * 20);
        SoundManager.playSoundEffect([player], SoundEffectType.CRYOMANCER_FREEZE);
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} cryomancer
     */
    activateAbility(cryomancer) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(cryomancer, "player.action_charges");

        if (chargesRemaining == 0) {
            cryomancer.sendMessage("Out of ability uses!");
            return;
        }
        
        // let tag = ApothocaryRole.getApothocaryMarkFromPlayer(cryomancer);
        // player.sendMessage("Found tag on player " + tag);
        if (CryomancerRole.playersMarkedByCryomancer(cryomancer) <= 0) {
            cryomancer.sendMessage("§bRight click a player to frost them.");
            return;
        }

        if (chargesRemaining != 0) {
            // player.removeTag(tag);
            // activate ability 
            if (chargesRemaining > 0) {
                cryomancer.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(cryomancer, "player.action_charges", -1);
            }
            
            // ability effect
            // let targetID = parseInt(tag.substring(ApothocaryRole.apothocaryMarkTag.length));
            // if (targetID == null) {
            //     cryomancer.sendMessage("§aSomething went wrong with activating the poison. Try marking a new player (id error).")
            //     return;
            // }

            // let targetPlayer = ScoreboardManager.getPlayerWithID(targetID);
            // if (targetPlayer == null) {
            //     cryomancer.sendMessage("§aSomething went wrong with activating the poison. Try marking a new player (player error).")
            //     return;
            // }

            // freeze players
            let cryoTag = CryomancerRole._readCryoTag(cryomancer);
            let freezeRadius = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_radius");
            let freezeTime = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_timer");
            let playersFrozen = 0;
            cryoTag.forEach((playerID) => {
                let playerToFreeze = ScoreboardManager.getPlayerWithID(playerID);
                let distanceToCryomancer = PlayerHandler.distanceBetweenLocations(cryomancer.location, playerToFreeze.location);
                if (freezeRadius == -1 || distanceToCryomancer < freezeRadius) {
                    // freeze player
                    playersFrozen += 1;
                    CryomancerRole.freezePlayer(playerToFreeze, freezeTime);
                    CryomancerRole.removePlayerFromCryoTag(cryomancer, playerToFreeze);
                }
            });

            let freezeClearsMarks = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.clears_all_players") != 0;
            if (freezeClearsMarks) {
                cryomancer.setDynamicProperty(CryomancerRole.cryomancerIDProperty, "[]");
            }

            // effect
            // targetPlayer.addEffect("minecraft:wither", 20000000, {showParticles: true, amplifier:255});
            // world.getAllPlayers().forEach((pl) => {
            //     PlayerHandler.spawnParticlesBetweenPoints(pl, cryomancer.location, targetPlayer.location, {red:0,green:1,blue:0,alpha:1}, 5);
            // })
            
            // ability activate message
            cryomancer.sendMessage("§bFroze §l" + playersFrozen + "§r§b players.");;
            ChatManager.sendDeadPlayersMessage("§b§o" + cryomancer.name + " froze " + playersFrozen + " players.", LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            let postFreezeCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_cooldown");
            ScoreboardManager.setPlayerActionCooldown(cryomancer, postFreezeCooldown);
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

            if (CryomancerRole.playerInCryoTag(player, otherEntity)) {
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                player.sendMessage("§b§oThat player is already marked.");
                return;
            }
            
            let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.max_marked_players");
            if (maxMarked != -1 && CryomancerRole.playersMarkedByCryomancer(player) >= maxMarked) {
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                player.sendMessage("§bYou've marked the maximum number of players already! (" + maxMarked + ")");
                return;
            }

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.CRYOMANCER_MARK;
            let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.mark_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§b§oYou were unable to mark " + otherEntity.name);
                ChatManager.sendDeadPlayersMessage("§b§o" + player.name + " tried to mark " + otherEntity.name + " for freezing but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? markCooldown : beforeInteract.failCooldown);
                return;
            }

            if (!CryomancerRole.addPlayerToCryoTag(player, otherEntity)) {
                player.sendMessage("§bSomething went wrong with marking that player");
            }   
            else {
                // ability activate message
                SoundManager.playSoundEffect([player], SoundEffectType.BASIC_MARK);
                player.sendMessage("§bYou marked " + otherEntity.name + " with frost.");
                ChatManager.sendDeadPlayersMessage("§b§o" + player.name + " marked " + otherEntity.name + " with frost.", LogItemType.ABILITY_MESSAGE);
            }
            
            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, markCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.CRYOMANCER_MARK);
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
        form.title("Cryomancer Settings");

        form.divider();
        form.label("The cryomancer is a murderer role that marks people with frost and then can freeze all frosted players in an area around them.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.enabled") != 0;
        form.toggle("Cryomancer Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.mark_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: markCooldown })
        form.label("The ability cooldown after marking a player with frost.");
        
        let killCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_cooldown");
        form.slider("Freeze Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: killCooldown })
        form.label("The ability cooldown after freezing players. Also the initial cooldown.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_uses");
        form.slider("Freeze Uses", -1, 10, { defaultValue: abilityUses }); // 8
        form.label("The number of times the cryomancer can freeze. Marking is free. -1 is infinite uses");
        
        let freezeTime = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_timer");
        form.slider("Freeze Time", 3, 30, { defaultValue: freezeTime }); // 10
        form.label("The amount of time players are frozen for, in seconds.");
        
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.max_marked_players");
        form.slider("Max Frosted Players", -1, 10, { defaultValue: maxMarked }); // 12
        form.label("The max number of players that can be inflicted with frost at a given time. -1 is all players.");
        
        let freezeRadius = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_radius");
        form.slider("Freeze Radius", -1, 20, { defaultValue: freezeRadius }); // 14
        form.label("The radius of frosted players which will be frozen when the cryomancer uses freeze. -1 is infinite");
        
        let freezeCamera = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freezes_camera") != 0;
        form.toggle("Freezes Camera", { defaultValue: freezeCamera }); // 16
        form.label("If true, a frozen player will not be able to move their camera.");
        
        let punchFreesPlayers = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.players_free_frozen") != 0;
        form.toggle("Punch Frees Frozen Player", { defaultValue: punchFreesPlayers }); // 18
        form.label("If true, punching a player with an empty hand will unfreeze them. Swords will not.");
        
        let freezeClearsMarks = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.clears_all_players") != 0;
        form.toggle("Freeze Clears All Players", { defaultValue: freezeClearsMarks }); // 20
        form.label("If true, after freezing nearby players, all frosted players will be cleared of their frosted status, regardless of distance.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.mark_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.freeze_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.freeze_uses", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.freeze_timer", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.max_marked_players", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.freeze_radius", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.freezes_camera", r.formValues[16] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.players_free_frozen", r.formValues[18] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.cryomancer.clears_all_players", r.formValues[20] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let markCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.mark_cooldown");
        let killCooldown = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_uses");
        let freezeTime = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_timer");
        let maxMarked = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.max_marked_players");
        let freezeRadius = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freeze_radius");
        let freezeCamera = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.freezes_camera") != 0;
        let punchFreesPlayers = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.players_free_frozen") != 0;
        let freezeClearsMarks = ScoreboardManager.getTrackedObjective("role_settings.cryomancer.clears_all_players") != 0;

        let description = "The cryomancer is a murderer role that can mark many people with frost and later freeze all frosted players in an area.";
        description += "\n\nFrost Mark Cooldown: " + markCooldown + " seconds.";
        description += "\nPost Frost Cooldown: " + killCooldown + " seconds.";
        description += "\nFrost Uses: " + abilityUses;
        description += "\nPlayer Freeze Time: " + freezeTime + " seconds.";
        description += "\nMax Frosted Players: " + maxMarked + " players.";
        description += "\nFreeze Radius: " + freezeRadius;
        description += "\nFreeze Locks Camera: " + freezeCamera;
        description += "\nPunch Unfreezes Players: " + punchFreesPlayers;
        description += "\nFreeze Clears All Frosted Players: " + freezeClearsMarks;
        return description;
    }
}
"use strict";

import { world, system, Player, GameMode, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { ChatManager } from "../chat_manager";
import { ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { BuildPlayerHelpTagSignal } from "../signals/build_player_help_tag";

export class VampireRole extends Role {

    static VAMPIRE_INFECT_TAG = "convertedToVampire";
    static IN_VAMP_CHAT_TAG = "inVampireChat";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(() => {
            let allPlayers = world.getAllPlayers();
            let vampires = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.VAMPIRE);
            let infectedPlayers = PlayerHandler.sortPlayersByTag(allPlayers, VampireRole.VAMPIRE_INFECT_TAG);
            let playersThatCanSeeVampParticles = PlayerHandler.getPlayersThatSee(allPlayers, ParticleVisibilityType.VAMPIRE_INFECTED_PLAYERS);

            // allPlayers.forEach((pl) => pl.sendMessage("vampires: " + JSON.stringify(vampires.map((p) => p.name))));
            // allPlayers.forEach((pl) => pl.sendMessage("infected: " + JSON.stringify(infectedPlayers.map((p) => p.name))));
            // allPlayers.forEach((pl) => pl.sendMessage("dead: " + JSON.stringify(deadPlayers.map((p) => p.name))));
            
            // infected players is now only living infected players
            infectedPlayers = infectedPlayers.filter((pl) => ScoreboardManager.getPlayerID(pl) >= 0 && pl.hasTag(ChatManager.BLOCK_DEAD_MESSAGES_TAG));
            // dead players covers previously infected players
            let playersToShowParticles = vampires.concat(playersThatCanSeeVampParticles, infectedPlayers);
            let particlePlayers = vampires.concat(infectedPlayers);

            // allPlayers.forEach((pl) => pl.sendMessage("Players to show: " + JSON.stringify(playersToShowParticles.map((p) => p.name))));
            // allPlayers.forEach((pl) => pl.sendMessage("Particle Players: " + JSON.stringify(particlePlayers.map((p) => p.name))));
            
            let settings = new MolangVariableMap();
            settings.setColorRGBA('variable.color', {red:0,blue:0,green:0,alpha:1});
            settings.setFloat('variable.dust_lifetime', .5);
            
            playersToShowParticles.forEach((showPlayer) => {
                // showPlayer.sendMessage("Showing vamp pa/rticles");
                particlePlayers.forEach((particleLocation) => {
                    try {
                        showPlayer.spawnParticle("umm:line_draw", PlayerHandler.addVectors(particleLocation.location, {x:0,y:2.4,z:0}), settings);
                    }
                    catch (e) {
                    }
                });
            });
            
        }, 2);
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(VampireRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(VampireRole.buildPlayerTag)
        }
        super.initialize();
    }

    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        if (event.playerToBuild.hasTag(VampireRole.VAMPIRE_INFECT_TAG)) {
            event.addStringToTag("§hV");
        }
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    onPlayerDeath(playerWhoDied, killer) {
        let allPlayers = world.getAllPlayers();
        let vampires = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.VAMPIRE);
        // if (vampires.length == 0) {
        //     return;
        // }
        // playerWhoDied.removeTag("necromancerSummon");
        let playerDiedRole = RoleManager.getPlayerRole(playerWhoDied);
        let killedIsInfected = playerWhoDied.hasTag(VampireRole.VAMPIRE_INFECT_TAG);
        let deadPlayers = allPlayers.filter((pl) => DeathHandler.consideredDead(pl));
        let infectedPlayers = PlayerHandler.sortPlayersByTag(allPlayers, VampireRole.VAMPIRE_INFECT_TAG);
        infectedPlayers = infectedPlayers.filter((pl) => ScoreboardManager.getPlayerID(pl) >= 0);

        let killInfectedOnDeath = ScoreboardManager.getTrackedObjective("role_settings.vampire.kill_other_vamps_on_alpha_death") != 0;
        if (vampires.length == 0 && playerDiedRole.getRoleType() == RoleTypes.VAMPIRE) {
            infectedPlayers.forEach((pl) => {
                if (pl.hasTag(VampireRole.IN_VAMP_CHAT_TAG)) {
                    pl.sendMessage("The last living Vampire died!");
                    pl.kill();
                }
            });
        }

        // check for vampire win
        let playingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
        // killer.sendMessage("There are " + vampires.length + " vampires");
        if (playingPlayers.length == vampires.length && vampires.length != 0) {
            // killer.sendMessage("Requesting win");
            WinConditionManager.requestWin(playingPlayers.concat(infectedPlayers), new VampireRole(), "");
            return;
        }

        if (killedIsInfected) {
            playerWhoDied.removeTag(ChatManager.BLOCK_DEAD_MESSAGES_TAG);
            playerWhoDied.removeTag(VampireRole.IN_VAMP_CHAT_TAG);
            playerWhoDied.sendMessage("You are now officially dead.");
        }
        else if (killer != null && vampires.length > 0) {
            let killerRole = RoleManager.getPlayerRole(killer);
            if (killerRole.getRoleType() == RoleTypes.VAMPIRE) {
                let cannotInfectFirst = ScoreboardManager.getTrackedObjective("role_settings.vampire.cannot_infect_first") != 0;
                
                if (cannotInfectFirst && ScoreboardManager.getTrackedObjective("tracking.dead_count") == 0) {
                    killer.sendMessage("No one else has died yet, so that player was not infected.");
                    return;
                }

                let infectedCount = infectedPlayers.length;
                
                let maxInfected = ScoreboardManager.getTrackedObjective("role_settings.vampire.max_vampire_count");
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Current infected: " + infectedCount + " max infected: " + maxInfected));
                if ((maxInfected > infectedCount || maxInfected == -1) && playerDiedRole.getRoleType() != RoleTypes.VAMPIRE) {
                    playerWhoDied.addTag(VampireRole.VAMPIRE_INFECT_TAG);
                    playerWhoDied.addTag(ChatManager.BLOCK_DEAD_MESSAGES_TAG);
                    playerWhoDied.addTag(VampireRole.IN_VAMP_CHAT_TAG);
                    DeathHandler.onDeathSignal.sendMessages = false;
                    system.run(() => {
                        WinConditionManager.teleportPlayerToSpawn(playerWhoDied);
                        playerWhoDied.setGameMode(GameMode.Adventure);
                        VampireRole.addPlayerToVampireChat(playerWhoDied);
                    });
                    let vampirePlayers = infectedPlayers.concat(PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.VAMPIRE));
                    vampirePlayers.forEach((pl) => {
                        pl.sendMessage(playerWhoDied.name + " is now a vampire!");
                    });
                    SoundManager.playSoundEffect(vampirePlayers.concat([playerWhoDied]), SoundEffectType.VAMPIRE_BITE);
                    playerWhoDied.sendMessage("You are now a vampire! Currently the vampires are " + Util.formatStringList(vampirePlayers.map((pl) => pl.name), ", ", true));
                }
            }
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        // let actionUses = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_count");
        // let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
        // ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        // ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
        VampireRole.addPlayerToVampireChat(player);
    }

    /**
     * 
     * @param {Player} player 
     */
    static addPlayerToVampireChat(player) {
        let vampireChatID = ScoreboardManager.getTrackedObjective("role_settings.vampire.chat_id");
        if (vampireChatID == -1) {
            vampireChatID = ChatManager.requestChannelID();
            ScoreboardManager.setTrackedObjective("role_settings.vampire.chat_id", vampireChatID);
            ChatManager.setChannelColor(vampireChatID, "j");
        }
        ChatManager.registerPlayerToChat(player, vampireChatID);
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

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§hVampire";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Killing players converts them to be a vampire with you! Take over the game!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "As a vampire, killing a player will make them into a vampire.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.vampire.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return false;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.VAMPIRE;
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
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            
            // ability activate message
            
            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
    }

    /**
     * 
     * @param {Player} necromancer 
     */
    static getSummoned(necromancer) {
        let summonedID = necromancer.getDynamicProperty(NecromancerRole.SUMMONED_PLAYER_ID_PROPERTY);
        if (summonedID != null) {
            return ScoreboardManager.getPlayerWithID(summonedID);
        }
        return null;
    }

    /**
     * 
     * @returns {Player}
     */
    static getRandomDeadPlayer() {
        let allPlayers = world.getAllPlayers();
        let deadPlayers = allPlayers.filter((pl) => pl.hasTag("dead") && ScoreboardManager.getPlayerID(pl) >= 0);
        
        if (deadPlayers.length == 0) {
            return null;
        }

        let randomPlayer = ScoreboardManager.rollRandomNumber(0, deadPlayers.length);
        return deadPlayers[randomPlayer];
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
        form.title("Vampire Settings");

        form.divider();
        form.label("The vampire is a neutral killing role who is able to convert players into vampires after killing them.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.vampire.enabled") != 0;
        form.toggle("Vampire Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let maxVampCount = ScoreboardManager.getTrackedObjective("role_settings.vampire.max_vampire_count");
        form.slider("Max Convert Count", -1, 10, { defaultValue: maxVampCount })
        form.label("The max number of non-vampires that may be converted. If this is -1 then the whole lobby can be converted.");
        
        let canInfectFirst = ScoreboardManager.getTrackedObjective("role_settings.vampire.cannot_infect_first") != 0;
        form.toggle("Cannot Infect First Kill", { defaultValue: canInfectFirst }); // 6
        form.label("If the first kill is by a vampire and this is true, the player will die and not be converted.");
        
        let killInfectedOnDeath = ScoreboardManager.getTrackedObjective("role_settings.vampire.kill_other_vamps_on_alpha_death") != 0;
        form.toggle("Kill Infected On Vampire Death", { defaultValue: killInfectedOnDeath }); // 6
        form.label("If true, when the last vampire role dies, all infected players will be killed.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.vampire.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }

            ScoreboardManager.setTrackedObjective("role_settings.vampire.max_vampire_count", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.vampire.cannot_infect_first", r.formValues[6] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.vampire.kill_other_vamps_on_alpha_death", r.formValues[8] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let maxVampCount = ScoreboardManager.getTrackedObjective("role_settings.vampire.max_vampire_count");
        let canInfectFirst = ScoreboardManager.getTrackedObjective("role_settings.vampire.cannot_infect_first") != 0;
        let killInfectedOnDeath = ScoreboardManager.getTrackedObjective("role_settings.vampire.kill_other_vamps_on_alpha_death") != 0;

        let description = "The Vampire is a neutral killing role that converts the players they kill onto their team.";
        description += "\n\nMax Vampire Count: " + maxVampCount;
        description += "\nFirst Kill Cannot Infects: " + canInfectFirst;
        description += "\nKill Infected on Vamp Death: " + killInfectedOnDeath;
        return description;
    }
}
"use strict";

import { world, system, Player, GameMode } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { GhostManager } from "../ghost_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class NecromancerRole extends MurdererRole {

    static SUMMONED_PLAYER_ID_PROPERTY = "summonedPlayer";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    onPlayerDeath(playerWhoDied, killer) {
        if (playerWhoDied.hasTag("necromancerSummon")) {
            DeathHandler.decrementBlockDeadCount(playerWhoDied);
            playerWhoDied.removeTag("necromancerSummon");
        }
        
        let allPlayers = world.getAllPlayers();
        let necromancers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.NECROMANCER);
        let playerDiedRole = RoleManager.getPlayerRole(playerWhoDied);
        
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
        let shouldNotify = ScoreboardManager.getTrackedObjective("role_settings.necromancer.notify_on_delay_reset") != 0;
        let resetType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.delay_reset_type");
        // if the killer is a necro
        if (killer != null) {
            let killerRole = RoleManager.getPlayerRole(killer);
            if (killerRole.getRoleType() == RoleTypes.NECROMANCER) {
                let summonedPlayer = NecromancerRole.getSummoned(killer);
                let playerWasSummoned = summonedPlayer != null && summonedPlayer.id != playerWhoDied.id;
                // summon is out, kill
                if (playerWasSummoned && playerDiedRole.getAlignment() != RoleAlignment.MURDERER && playerDiedRole.getAlignment() != RoleAlignment.NEUTRAL_KILLER) {
                    killer.sendMessage("§8You killed while your summon was out!");
                    GuessingManager.killGuessedPlayer(killer);
                }

                // reset type 0 (necro kills resets)
                if (resetType == 0) {
                    ScoreboardManager.setPlayerActionCooldown(killer, actionCooldown);
                    if (shouldNotify) {
                        killer.sendMessage("§8You killed someone, your cooldown has reset.");
                    }
                }
            }
        }
        
        if (playerDiedRole.getRoleType() == RoleTypes.NECROMANCER) {
            let summonedPlayer = NecromancerRole.getSummoned(playerWhoDied);
            if (summonedPlayer != null && !DeathHandler.consideredDead(summonedPlayer)) {
                summonedPlayer.sendMessage("§8Your necromancer died!");
                summonedPlayer.kill();
            }
        }
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Necromancers are " + JSON.stringify(necromancers.map((p) => p.name))));
        
        // notify of summon death
        necromancers.forEach((necro) => {
            let summonedPlayer = NecromancerRole.getSummoned(necro);
            // summonedPlayer.sendMessage("Checking if your necro ");
            if (summonedPlayer != null && summonedPlayer.id == playerWhoDied.id) {
                necro.setDynamicProperty(NecromancerRole.SUMMONED_PLAYER_ID_PROPERTY, -1);
                necro.sendMessage("§8§oYour summon died. You can kill again.");
                SoundManager.playSoundEffect([necro], SoundEffectType.DEATH_NOTIFICATION);
                return;
            }
        });
        
        // reset cooldown on any kill
        if (resetType == 1) {
            necromancers.forEach((necro) => {
                ScoreboardManager.setPlayerActionCooldown(necro, actionCooldown);
                if (shouldNotify) {
                    necro.sendMessage("§8§oSomeone just died, your cooldown has reset.");
                }
            });
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_count");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(NecromancerRole.SUMMONED_PLAYER_ID_PROPERTY, -1);
        super.giveToPlayer(player);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§8Necromancer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Revive a player to do your dirty work for you!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Use your ability to revive a player who is currently dead. The revived player will try to kill as many people as they can before being killed.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        let meetsGhostReq = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_type") < 2 || ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0
        return ScoreboardManager.getTrackedObjective("role_settings.necromancer.enabled") != 0 && meetsGhostReq && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.NECROMANCER;
    }

    /**
     * Whether this role can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    canSeeGhosts() {
        let summonType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_type");
        return summonType == 2;
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
            let summoned = NecromancerRole.getSummoned(player);
            if (summoned != null) {
                player.sendMessage("You already have " + summoned.name + " as your summon.");
                return;
            }

            // ability effect
            let summonType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_type");
            let ghostsEnabled = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;

            if (summonType == 0 || (!ghostsEnabled && summonType != 1)) {
                let randomPlayer = NecromancerRole.getRandomDeadPlayer();
                if (randomPlayer == null) {
                    player.sendMessage("§8No players to revive.");
                    ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                    return;
                }

                // activate ability 
                if (chargesRemaining > 0) {
                    player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                }
                
                // ability effect
                NecromancerRole.summonPlayerFromDead(player, randomPlayer);
                // sets cooldown
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            }
            else if (summonType == 1) {
                let deadPlayers = NecromancerRole.getDeadPlayers();
                if (deadPlayers.length <= 0) {
                    player.sendMessage("§8No players to revive.");
                    ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                    return;
                }

                let summonForm = new ModalFormData();
                summonForm.title("Summon a Player from the Dead");
                summonForm.label("Upon submitting this form, the player selected will be summoned from the dead.");
                summonForm.dropdown("Player To Summon", deadPlayers.map((pl) => pl.name));
                summonForm.show(player).then((r) => {
                    if (r.canceled) {
                        ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                        return;
                    }

                    let playerIndex = r.formValues[1];
                    let playerToSummon = deadPlayers[playerIndex];
                    let isDead = ChatManager.receivesDeadMessages(playerToSummon) && ScoreboardManager.getPlayerID(playerToSummon) >= 0;
                    if (!isDead) {
                        player.sendMessage("§8That person is no longer dead. This oversight does not count as a summon use.");
                        ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                        return;
                    }

                    // cost one charge
                    if (chargesRemaining > 0) {
                        player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                        ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
                    }

                    // ability effect
                    NecromancerRole.summonPlayerFromDead(player, playerToSummon);
                    
                    // sets cooldown
                    let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
                    ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
                });
            }
        }
    }

    static summonPlayerFromDead(necromancer, playerToSummon) {
        playerToSummon.addTag("necromancerSummon");
        DeathHandler.incrementBlockDeadCount(playerToSummon);
        playerToSummon.setGameMode(GameMode.Adventure);
        playerToSummon.removeEffect("invisibility");
        WinConditionManager.teleportPlayerToSpawn(playerToSummon);
        necromancer.setDynamicProperty(NecromancerRole.SUMMONED_PLAYER_ID_PROPERTY, ScoreboardManager.getPlayerID(playerToSummon));
        // ChatManager.pullPlayerToChat(randomPlayer, -1);
        ScoreboardManager.setScoreboardObjective(playerToSummon, "player.has_murderer_channel_access", 1);
        let murdererTeam = MurdererRole.getMurderers().filter((pl) => pl.id != necromancer.id && !pl.hasTag("dead"));
        
        
        SoundManager.playSoundEffect(murdererTeam.concat([necromancer, playerToSummon]), SoundEffectType.NECROMANCER_SUMMON);
        playerToSummon.sendMessage("§8You've been summoned by the Necromancer " + necromancer.name + " to kill as many people as you can. The murderer team is " + Util.formatStringList(murdererTeam.map((pl) => pl.name), ", ", true));
        necromancer.sendMessage("§8§oSummoned " + playerToSummon.name + " back from the dead to kill for you. §r§cYou may not kill while they are alive.");
        ChatManager.sendDeadPlayersMessage("§8" + necromancer.name + " summoned " + playerToSummon.name + " back from the dead.", LogItemType.ABILITY_MESSAGE);
    }

    static canSendMurdererMessages(player) {
        let summonHasChat = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_has_chat_access") != 0;
        return !player.hasTag("necromancerSummon") || summonHasChat;
    }

    /**
     * 
     * @param {Player} necromancer 
     */
    static getSummoned(necromancer) {
        let summonedID = necromancer.getDynamicProperty(NecromancerRole.SUMMONED_PLAYER_ID_PROPERTY);
        if (summonedID != -1) {
            return ScoreboardManager.getPlayerWithID(summonedID);
        }
        return null;
    }

    /**
     * Gets the list of dead players
     * @returns {Player[]}
     */
    static getDeadPlayers() {
        let allPlayers = world.getAllPlayers();
        let deadPlayers = allPlayers.filter((pl) => ChatManager.receivesDeadMessages(pl) && ScoreboardManager.getPlayerID(pl) >= 0);
        
        return deadPlayers;
    }

    /**
     * Gets a random dead player.
     * @returns {Player}
     */
    static getRandomDeadPlayer() {
        let deadPlayers = NecromancerRole.getDeadPlayers();
        
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
    activateAbilityOnEntity(player, potentialGhost) {
        let summonType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_type");
        let ghostsEnabled = ScoreboardManager.getTrackedObjective("settings.ghost_bodies.enabled") != 0;
        if (summonType != 2 || !ghostsEnabled) {
            return;
        }

        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (potentialGhost.typeId == "umm:ghost_body" && chargesRemaining != 0) {
            let playerID = ScoreboardManager.getScoreboardObjective(potentialGhost, "ghost.ghost_player_id");
            let ghostPlayer = ScoreboardManager.getPlayerWithID(playerID);
            let ghostName = ghostPlayer != null ? ghostPlayer.name : "This player";
            let isDead = ChatManager.receivesDeadMessages(ghostPlayer) && ScoreboardManager.getPlayerID(ghostPlayer) >= 0;
                    
            if (ghostPlayer == null || !isDead) {
                player.sendMessage("§8§o" + ghostName + " is no longer dead...");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }

            if (!GhostManager.canInteractWithGhosts(player, potentialGhost)) {
                player.sendMessage("§e§oYou've already summoned " + ghostName.toLowerCase() + "...");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            GhostManager.markAsInteracted(player, potentialGhost);

            NecromancerRole.summonPlayerFromDead(player, ghostPlayer);
            let summonClearsGhost = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_clears_ghost") != 0;
            if (summonClearsGhost) {
                potentialGhost.remove();
            }

            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
        form.title("Necromancer Settings");

        form.divider();
        form.label("The necromancer is a murderer who is able to summon another player to kill for them.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.necromancer.enabled") != 0;
        form.toggle("Necromancer Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
        form.slider("Summon Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of summon. Gets reset when someone dies.");
        
        let resetType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.delay_reset_type");
        form.dropdown("Delay Reset Type", ["Necromancer Kill", "Any Kill"], { defaultValue: resetType }); // 6
        form.label("When the cooldown of the necromancer gets reset. If Necromancer Kill, will only reset when the necromancer kills. If any kill, the cooldown will start when any player dies.");
        
        let notifyDelay = ScoreboardManager.getTrackedObjective("role_settings.necromancer.notify_on_delay_reset") != 0;
        form.toggle("Notify Necromancer On Delay Reset", { defaultValue: notifyDelay }); // 8
        form.label("Whether to tell the necromancer when their cooldown resets from the above.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_count");
        form.slider("Summon Ability Uses", -1, 10, { defaultValue: abilityUses }); // 10
        form.label("The number of times summon can be used. -1 is infinite uses. VERY POWERFUL, RECOMMENDED TO KEEP AT 1");
        
        let summonOptions = ["Random Dead Player", "Chosen Player", "Ghost"];
        let summonType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_type");
        form.dropdown("Summon Type", summonOptions, { defaultValueIndex: summonType }); // 12
        form.label("How the summon gets determines. §lRandom Dead Player§r will pick a random valid dead player and summon them back. §lChosen Player§r will bring up a menu of all dead players. §lGhost§r will require the necromancer to interact with a specific ghost body. If ghosts are disabled, this becomes Random Dead Player.");

        let summonHasChat = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_has_chat_access") != 0;
        form.toggle("Summon Has Murderer Chat", { defaultValue: summonHasChat }); // 14
        form.label("If true, the summon will be able to message in murderer chat. Otherwise, they may only read the messages.");

        let summonClearsGhost = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_clears_ghost") != 0;
        form.toggle("Summoning Clears Ghost", { defaultValue: summonClearsGhost }); // 14
        form.label("If true, summoning a player via ghost clears their ghost.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.necromancer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.summon_delay_after_kill", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.delay_reset_type", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.notify_on_delay_reset", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.summon_count", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.summon_type", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.summon_has_chat_access", r.formValues[14] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.necromancer.summon_clears_ghost", r.formValues[16] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_delay_after_kill");
        let resetType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.delay_reset_type");
        let notifyDelay = ScoreboardManager.getTrackedObjective("role_settings.necromancer.notify_on_delay_reset") != 0;
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_count");
        let summonHasChat = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_has_chat_access") != 0;
        let summonOptions = ["Random Dead Player", "Chosen Player", "Ghost"];
        let summonType = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_type");
        let summonClearsGhost = ScoreboardManager.getTrackedObjective("role_settings.necromancer.summon_clears_ghost") != 0;
        
        let description = "The Necromancer is a murderer who is able to summon a dead player to kill for them. While the summon is out, the necromancer may not kill. Their cooldown resets every time they kill.";
        description += "\n\nSummon Cooldown: " + cooldownTime + " seconds";
        description += "\nReset Type: " + ["Necromancer Kill", "Any Kill"][resetType] + " seconds";
        description += "\nNotify On Cooldown Reset: " + notifyDelay;
        description += "\nSummon Uses: " + abilityUses;
        description += "\nSummon Type: " + summonOptions[summonType];
        description += "\nSummon Can Use Murderer Chat: " + summonHasChat;
        description += "\nSummoning Clears Ghost: " + summonClearsGhost;
        return description;
    }
}
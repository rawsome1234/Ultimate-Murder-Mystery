"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { RoleManager } from "../role_manager";
import { WinConditionManager } from "../win_con_handler";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { LoversModifier } from "../modifiers/lovers";
import { AlignmentTypes } from "../sound/song_condition";

export class ArtemisRole extends Role {

    static IS_HUNTER_TAG = "isHunter";
    static IS_ANY_HUNTER_TAG = "isAnyHunter";
    static DEAD_HUNTERS_PROPERTY = "deadHunterCount";

        /**
         * Initializes this role. Meant for connecting to signals.
         */
    initialize() {
        super.initialize();
        if (!DeathHandler.onDeathSignal.isConnected(ArtemisRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(ArtemisRole.onPlayerDeath);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(ArtemisRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(ArtemisRole.buildPlayerTag)
        }
        system.runInterval(ArtemisRole.drawHunterDots, 5);
    }
    
    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        if (event.playerToBuild.hasTag(ArtemisRole.IS_ANY_HUNTER_TAG)) {
            event.addStringToTag("§aH");
        }
    }

    static drawHunterDots() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let livingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
        let artemi = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.ARTEMIS);
        let playersThatSee = PlayerHandler.getPlayersThatSee(allPlayers, ParticleVisibilityType.ARTEMIS_HUNTERS);

        let dotOffset = {x: 0, y: 2.4 + (.5), z: 0 };
        artemi.forEach((art) => {
            let playersToShow = playersThatSee.concat([art]);

            let playerID = ScoreboardManager.getPlayerID(art);
            let markTag = ArtemisRole.IS_HUNTER_TAG + playerID;
            let brandedPlayers = livingPlayers.filter((pl) => pl.hasTag(markTag) && pl.id != art.id);

            brandedPlayers.forEach((branded) => {
                if (branded != null) {
                    let spawnLocation = PlayerHandler.addVectors(branded.location, dotOffset);

                    let settings = new MolangVariableMap();
                    settings.setColorRGBA('variable.color', {red:0,blue:0,green:1,alpha:1});
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
     * @param {Player} player
     */
    static onPlayerDeath(player, killer) {
        let playerTags = player.getTags();
        // player.sendMessage("Checking tags..");
        playerTags.forEach((tag) => {
            if (tag.startsWith(ArtemisRole.IS_HUNTER_TAG)) {
                let remaining = tag.substring(ArtemisRole.IS_HUNTER_TAG.length);
                let artemisPlayer = ScoreboardManager.getPlayerWithID(parseInt(remaining));
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Artemis player id: " + remaining))
                // let playerRole = RoleManager.getPlayerRole(player);
                // artemisPlayer.sendMessage("§e" + player.name + " has died! Their role was §r" + playerRole.getDisplayName() + "§r§e.");
                // player.sendMessage(remaining);
                if (DeathHandler.consideredDead(artemisPlayer)) {
                    return;
                }
                
                if (ScoreboardManager.getTrackedObjective("role_settings.artemis.notify_on_hunter_death") != 0) {
                    artemisPlayer.sendMessage("§aOne of your hunters has died!");
                }
                
                let deadHunterThreshold = ScoreboardManager.getTrackedObjective("role_settings.artemis.hunter_dying_threshold");
                let huntersDead = player.getDynamicProperty(ArtemisRole.DEAD_HUNTERS_PROPERTY);
                huntersDead += 1;
                player.setDynamicProperty(ArtemisRole.DEAD_HUNTERS_PROPERTY, huntersDead);
                ChatManager.sendDeadPlayersMessage("§aOne of " + artemisPlayer.name + "'s hunters has died.");

                if (deadHunterThreshold != 0 && huntersDead == deadHunterThreshold && artemisPlayer.getEffect("minecraft:wither") == null) {
                    GuessingManager.killGuessedPlayer(artemisPlayer);
                    // ScoreboardManager.addScoreboardObjective(player, "player.action_charges", 1);
                    // PlayerHandler.updateRoleActionVisual(artemisPlayer);
                }
            }
        });

        let allPlayers = world.getAllPlayers();
        let artemis = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.ARTEMIS);
        artemis.forEach((pl) => {
            ArtemisRole.checkForWin(pl);
        });
    }

    static getUnbrandedPlayers(artemis) {
        let allPlayers = world.getAllPlayers();
        let livingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
        if (artemis != null && RoleManager.getPlayerRole(artemis).getRoleType() == RoleTypes.ARTEMIS) {
            let playerID = ScoreboardManager.getPlayerID(artemis);
            let markTag = ArtemisRole.IS_HUNTER_TAG + playerID;
            let unbrandedPlayers = livingPlayers.filter((pl) => !pl.hasTag(markTag) && pl.id != artemis.id);
            return unbrandedPlayers;
        }
        return [];
    }

    /**
     * Checks for an artemis' win.
     * @param {Player} artemis 
     */
    static checkForWin(artemis) {
        let artemisWinsWithInnos = ScoreboardManager.getTrackedObjective("role_settings.artemis.artemis_wins_with_innos") != 0;
        let artemisWinPercent = ScoreboardManager.getTrackedObjective("role_settings.artemis.percent_for_artemis_to_win");

        let unbrandedPlayers = ArtemisRole.getUnbrandedPlayers(artemis);
        let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
        let innocents = PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), [AlignmentTypes.INNOCENT]);
        let killers = PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), [AlignmentTypes.MURDERER, AlignmentTypes.NEUTRAL_KILLER]);
        
        if (artemis != null && RoleManager.getPlayerRole(artemis).getRoleType() == RoleTypes.ARTEMIS) {
            // check for win
            let winningAlignment = RoleAlignment.NEUTRAL_KILLER;
            let wins = false;
            let winningPlayers = [];
            let message = "";
            if (unbrandedPlayers == 0) {
                winningPlayers = livingPlayers;
                message = "The hunters won the game! They consisted of ";
                wins = true;
            }

            else if (killers.length == 1 && killers[0].id == artemis.id) {
                let percentRemaining = 1 - (unbrandedPlayers.length / livingPlayers.length);
                percentRemaining *= 100;
                wins = artemisWinsWithInnos || percentRemaining > artemisWinPercent;
                winningPlayers = innocents.concat([artemis]);
                if (percentRemaining <= artemisWinPercent) {
                    winningAlignment = RoleAlignment.INNOCENT;
                }
            }
            
            if (wins) {
                WinConditionManager.winningPlayers(livingwinningPlayersPlayers, RoleManager.getPlayerRole(artemis), message, winningAlignment);
            }
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(ArtemisRole.DEAD_HUNTERS_PROPERTY, 0);
        super.giveToPlayer(player);
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
        return "§aArtemis";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Brand people as your hunters and win with all of them!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Every player you mark is considered a hunter. You and your hunters win the game if there are no other players remaining.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.artemis.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.ARTEMIS;
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
        ArtemisRole.checkForWin(player);
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
            player.sendMessage("§aYou can't brand anymore people.");
            return;
        }
        
        if (otherEntity.typeId == "minecraft:player" && chargesRemaining != 0) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.ARTEMIS_BRAND;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§a§oYou were unable to brand " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to brand " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }
            
            let playerID = ScoreboardManager.getPlayerID(player);
            let otherPlayerID = ScoreboardManager.getPlayerID(otherEntity);
            if (otherPlayerID < 0) {
                player.sendMessage("That player is not playing!");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            let markTag = ArtemisRole.IS_HUNTER_TAG + playerID;

            if (otherEntity.hasTag(markTag)) {
                player.sendMessage("You've already branded that player!");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            let otherPlayerRole = RoleManager.getPlayerRole(otherEntity);
            if ([RoleAlignment.MURDERER, RoleAlignment.NEUTRAL_KILLER].includes(otherPlayerRole.getAlignment(otherEntity)) && ScoreboardManager.getTrackedObjective("role_settings.artemis.can_brand_killers") == 0 && LoversModifier.getLoverID(player) != otherPlayerID) {
                player.sendMessage("You were unable to brand that player.");
                ChatManager.sendDeadPlayersMessage(player.name + " tried to brand " + otherEntity.name + " but they're a killer...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
                player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            otherEntity.addTag(markTag);
            otherEntity.addTag(ArtemisRole.IS_ANY_HUNTER_TAG);
            
            // ability activate message
            player.sendMessage("§aBranded " + otherEntity.name + ".");
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " branded " + otherEntity.name + " as a hunter.", LogItemType.ABILITY_MESSAGE);
            
            if (ArtemisRole.getUnbrandedPlayers(player).length == 0) {
                ArtemisRole.checkForWin(player)
                // player.sendMessage("§a§lRight click your ability one more time to win!");
                // ChatManager.sendDeadPlayersMessage("§a§l§o" + player.name + " can win!", LogItemType.ABILITY_MESSAGE);
            }

            // cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.ARTEMIS_BRAND);
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
        form.title("Artemis Settings");

        form.divider();
        form.label("Artemis is a neutral killing role that recruits people to their hunters. The artemis can win early if their hunters are the only other players remaining. If too many hunters die, the artemis gets withered.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.artemis.enabled") != 0;
        form.toggle("Artemis Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_cooldown");
        form.slider("Brand Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of brand, which marks a player as a hunter.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_uses");
        form.slider("Brand Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times brand can be used. -1 is infinite uses");
        
        let hunterDyingTreshold = ScoreboardManager.getTrackedObjective("role_settings.artemis.hunter_dying_threshold");
        form.slider("Hunter Kill Threshold", 1, 10, { defaultValue: hunterDyingTreshold }); // 8
        form.label("The number of hunters that must die until the Artemis gets withered. 0 disables this mechanic");
        
        let canBrandKillers = ScoreboardManager.getTrackedObjective("role_settings.artemis.can_brand_killers") != 0;
        form.toggle("Can Brand Killers", { defaultValue: canBrandKillers }); // 10
        form.label("If true, the artemis can brand other killers as hunters.");
        
        let notifyHunterDeath = ScoreboardManager.getTrackedObjective("role_settings.artemis.notify_on_hunter_death") != 0;
        form.toggle("Notify on Hunter Death", { defaultValue: notifyHunterDeath }); // 12
        form.label("If true, the artemis will be messaged when a hunter dies.");

        let artemisWinsWithInnos = ScoreboardManager.getTrackedObjective("role_settings.artemis.artemis_wins_with_innos") != 0;
        form.toggle("Artemis Wins With Innocents", { defaultValue: artemisWinsWithInnos }); // 14
        form.label("If true, and the number of killers becomes just artemis, the game ends based on the lower percentage, either as an innocent win or an artemis win. If false, Artemis must mark at least the lower percent to win and the innocents must kill them.");
        
        let artemisWinPercent = ScoreboardManager.getTrackedObjective("role_settings.artemis.percent_for_artemis_to_win");
        form.slider("Artemis Win Percent", 0, 100, { defaultValue: artemisWinPercent }); // 16
        form.label("The percent of people that must be marked as hunter for artemis to win. For example, if 70 percent of living players are marked and this value is 70, it will be a neutral killer win. Lower and it will be an innocent win with artemis (see above)");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.artemis.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.artemis.brand_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.artemis.brand_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.artemis.hunter_dying_threshold", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.artemis.can_brand_killers", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.artemis.notify_on_hunter_death", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.artemis.artemis_wins_with_innos", r.formValues[14] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.artemis.percent_for_artemis_to_win", r.formValues[16]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.artemis.brand_uses");
        let hunterDyingTreshold = ScoreboardManager.getTrackedObjective("role_settings.artemis.hunter_dying_threshold");
        let canBrandKillers = ScoreboardManager.getTrackedObjective("role_settings.artemis.can_brand_killers") != 0;
        let notifyHunterDeath = ScoreboardManager.getTrackedObjective("role_settings.artemis.notify_on_hunter_death") != 0;
        let artemisWinsWithInnos = ScoreboardManager.getTrackedObjective("role_settings.artemis.artemis_wins_with_innos") != 0;
        let artemisWinPercent = ScoreboardManager.getTrackedObjective("role_settings.artemis.percent_for_artemis_to_win");

        let description = "Artemis is a neutral killer that can win early by marking players, called hunters. If Artemis and the hunters are the last players remaining, Artemis wins. If any hunter is killed, artemis dies.";
        description += "\n\nBrand Cooldown: " + cooldownTime + " seconds.";
        description += "\nBrand Uses: " + abilityUses;
        description += "\nHunter Kill Threshold: " + hunterDyingTreshold;
        description += "\nCan Brand Killers: " + canBrandKillers;
        description += "\nNotify on Hunter Death: " + notifyHunterDeath;
        description += "\nArtemis Wins With Innos: " + artemisWinsWithInnos;
        description += "\nWin Percentage: " + artemisWinPercent;
        return description;
    }
}
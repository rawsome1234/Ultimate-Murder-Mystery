"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { GuessingManager } from "../guessing_manager";
import { GhostManager } from "../ghost_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { RoleAssignment } from "../role_assignment";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { BuildPlayerHelpTagSignal } from "../signals/build_player_help_tag";

export class PlagueBearerRole extends Role {

    static INFECTION_TIME_SCOREBOARD = "role_settings.plague_bearer.stage_1_time_min";
    static INFECTION_STAGE_PROPERTY = "infectionStage";
    static GHOST_IS_INFECTED_PROPERTY = "isInfected";

    static BANNED_INFECT_INTERACT_TYPES = [];

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(PlagueBearerRole._runInfectionTimers, 1);
        if (!DeathHandler.onDeathSignal.isConnected(PlagueBearerRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(PlagueBearerRole.onPlayerDeath);
        }
        if (!GhostManager.onGhostInteract.isConnected(PlagueBearerRole.onGhostInteract)) {
            GhostManager.onGhostInteract.subscribe(PlagueBearerRole.onGhostInteract);
        }
        if (!GhostManager.onGhostSpawn.isConnected(PlagueBearerRole.onGhostSpawn)) {
            GhostManager.onGhostSpawn.subscribe(PlagueBearerRole.onGhostSpawn);
        }
        if (!PlayerHandler.afterPlayerInteract.isConnected(PlagueBearerRole.onPlayerInteract)) {
            PlayerHandler.afterPlayerInteract.subscribe(PlagueBearerRole.onPlayerInteract);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(PlagueBearerRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(PlagueBearerRole.buildPlayerTag)
        }
        RoleAssignment.afterRolesAssigned.subscribe(() => {
            world.getAllPlayers().forEach((pl) => pl.setDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY, 0));
        });
        PlagueBearerRole.BANNED_INFECT_INTERACT_TYPES = [InteractTypes.GLITCH_TELEPORT, InteractTypes.TRANSPORTER_TELEPORT, InteractTypes.TRAPPER_CATCH, InteractTypes.WITCH_SPELL];
        super.initialize();
    }

    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        if (event.playerToBuild.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0) {
            event.addStringToTag("§qI");
        }
    }

    static onPlayerDeath(playerWhoDied, killer) {
        if (playerWhoDied != null && playerWhoDied.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0) {
            playerWhoDied.setDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY, 6);
        }
    }

    /**
     * 
     * @param {Player} playerGhost 
     * @param {Entity} ghost 
     */
    static onGhostSpawn(playerGhost, ghost) {
        if (playerGhost.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0) {
            ghost.setDynamicProperty(PlagueBearerRole.GHOST_IS_INFECTED_PROPERTY, true);
        }
    }

    /**
     * 
     * @param {Player} playerGhost 
     * @param {Entity} ghost 
     */
    static onGhostInteract(playerInteracting, ghost) {
        let spreadType = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infection_spread_type");
        if (ghost != null && ghost.isValid && ghost.getDynamicProperty(PlagueBearerRole.GHOST_IS_INFECTED_PROPERTY) && spreadType != 0) {
            PlagueBearerRole.infectPlayer(playerInteracting);
            let ghostPlayerID = ScoreboardManager.getScoreboardObjective(ghost, "ghost.ghost_player_id");
            let ghostPlayer = ScoreboardManager.getPlayerWithID(ghostPlayerID);
            let ghostName = ghostPlayerID != -1 && ghostPlayer != null ? ghostPlayer.name + "'s ghost" : "a ghost";
            ChatManager.sendDeadPlayersMessage("§q§o" + playerInteracting.name + " caught the plague from" + ghostName + ".", LogItemType.ABILITY_MESSAGE);
        }
    }

    /**
     * 
     * @param {Player} playerWhoInteracts 
     * @param {Player} playerWhoIsBeingInteracted 
     * @param {*} interactType 
     */
    static onPlayerInteract(playerWhoInteracts, playerWhoIsBeingInteracted, interactType) {
        if (PlagueBearerRole.BANNED_INFECT_INTERACT_TYPES.includes(interactType)) {
            return;
        }

        let spreadType = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infection_spread_type");
        let interactionInfects = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.interaction_infects") != 0;
        let notifyOnInteract = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.notify_plague_on_interact") != 0;
        let sourceIsInfected = playerWhoInteracts.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0;
        let targetIsInfected = playerWhoIsBeingInteracted.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0;
        let targetRole = RoleManager.getPlayerRole(playerWhoIsBeingInteracted);
        if (interactionInfects && targetRole != null && targetRole.getRoleType() == RoleTypes.PLAGUE_BEARER && !sourceIsInfected) {
            PlagueBearerRole.infectPlayer(playerWhoInteracts);
            ChatManager.sendDeadPlayersMessage("§q§o" + playerWhoInteracts.name + " caught the plague by interacting with " + playerWhoIsBeingInteracted.name + ".", LogItemType.ABILITY_MESSAGE);
            if (notifyOnInteract) {
                playerWhoIsBeingInteracted.sendMessage("§q§o" + playerWhoInteracts.name + " caught the plague...");
            }
        }
        if (sourceIsInfected && !targetIsInfected && spreadType != 1) {
            PlagueBearerRole.infectPlayer(playerWhoIsBeingInteracted);
            ChatManager.sendDeadPlayersMessage("§q§o" + playerWhoInteracts.name + " spread the plague to " + playerWhoIsBeingInteracted.name + ".", LogItemType.ABILITY_MESSAGE);
        }
        if (targetIsInfected && !sourceIsInfected && spreadType != 0) {
            PlagueBearerRole.infectPlayer(playerWhoInteracts);
            ChatManager.sendDeadPlayersMessage("§q§o" + playerWhoIsBeingInteracted.name + " spread the plague to " + playerWhoInteracts.name + ".", LogItemType.ABILITY_MESSAGE);
        }
    }

    static _runInfectionTimers() {
        let allPlayers = world.getAllPlayers();
        allPlayers.forEach((pl) => {
            let stage = pl.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY);
            if (stage == 0 || stage == 6 || DeathHandler.consideredDead(pl)) {
                return;
            }

            let timeLeft = ScoreboardManager.getScoreboardObjective(pl, PlagueBearerRole.INFECTION_TIME_SCOREBOARD);
            ScoreboardManager.addScoreboardObjective(pl, PlagueBearerRole.INFECTION_TIME_SCOREBOARD, -1);

            if (timeLeft == 1) {
                PlagueBearerRole.advanceInfectionStage(pl, stage);
            }
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {number} currentStage 
     */
    static advanceInfectionStage(player, currentStage) {
        let progressionMin = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.progression_time_min");
        let progressionMax = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.progression_time_max");
        let nextStageTime = ScoreboardManager.rollRandomNumber(progressionMin, progressionMax);

        switch (currentStage) {
            case 1: // cough + 
                SoundManager.playSoundEffect([player], SoundEffectType.INFECTION_COUGH);
                break;
                case 2: // nausea + "you're not feel very good"
                player.addEffect("minecraft:nausea", 180, {showParticles: true});
                player.sendMessage("§q§oYou're not feeling very good...");
                SoundManager.playSoundEffect([player], SoundEffectType.INFECTION_RATTLE);
                ChatManager.sendDeadPlayersMessage("§q§o" + player.name + " is beginning to succumb to the plague...", LogItemType.ABILITY_MESSAGE);
                break;
            case 3: // nausea + "it's not looking good for you"
                player.addEffect("minecraft:nausea", 260, {amplifier: 3, showParticles: true});
                player.addEffect("minecraft:darkness", 300, {amplifier: 3, showParticles: true});
                player.sendMessage("§q§oIt's not looking good for you...");
                break;
            case 4: // darkness
                player.addEffect("minecraft:blindness", (nextStageTime + 5) * 20, {amplifier: 3, showParticles: true});
                SoundManager.playSoundEffect([player], SoundEffectType.INFECTION_EERIE, null, 2);
                break;
            case 5: // death + "You've been wrought by the plague..."
                GuessingManager.killGuessedPlayer(player);
                player.sendMessage("§q§oYou've been wrought by the plague...");
                SoundManager.playSoundEffect([player], SoundEffectType.INFECTION_WITHER, null, 2);
                ChatManager.sendDeadPlayersMessage("§q§o" + player.name + " has succumbed to the plague...", LogItemType.ABILITY_MESSAGE);
                player.setDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY, 6);
                PlagueBearerRole.ensureInfectedPlayer();
                return;
        }

        // player.sendMessage("You have " + nextStageTime + " seconds until the next stage.");
        ScoreboardManager.setScoreboardObjective(player, PlagueBearerRole.INFECTION_TIME_SCOREBOARD, nextStageTime * 20);
        player.setDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY, currentStage+1);
    }

    /**
     * 
     * @param {Player} player 
     */
    static clearPlayerOfInfection(player) {
        player.setDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY, 0);
        PlagueBearerRole.ensureInfectedPlayer();
    }

    static ensureInfectedPlayer() {
        let allPlayers = world.getAllPlayers();
        let livingPlayers = PlayerHandler.getLivingPlayers(allPlayers);
        let plaguebearers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.PLAGUE_BEARER);
        let playersWithInfection = livingPlayers.filter((pl) => pl.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0);
        let canReinfect = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.can_reinfect_if_no_infection") != 0;
        if (playersWithInfection == 0 && canReinfect) {
            plaguebearers.forEach((pl) => {
                let chargesRemaining = ScoreboardManager.getScoreboardObjective(pl, "player.action_charges");
                if (chargesRemaining < 1) {
                    ScoreboardManager.setScoreboardObjective(pl, "player.action_charges", 1);
                    pl.sendMessage("§qThe infection has run dry! You may infect another player.");
                    ChatManager.sendDeadPlayersMessage("§q§o" + pl.name + " can infect another player.", LogItemType.ABILITY_MESSAGE);
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
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_cooldown");
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
        return RoleAlignment.NEUTRAL_KILLER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§qPlaguebearer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Infect people and let it spread!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.enabled") != 0;
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
        return RoleTypes.PLAGUE_BEARER;
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
        // let infectedPlayers
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
            player.sendMessage("§qYou can't infect anymore people.");
            return;
        }

        if (otherEntity.typeId == "minecraft:player" && chargesRemaining != 0) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.PLAGUEBEARER_INFECT;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§q§oYou were unable to infect " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§q§o" + player.name + " tried to infect " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }
            
            let playerID = ScoreboardManager.getPlayerID(player);
            if (playerID < 0) {
                player.sendMessage("That player is not playing!");
                return;
            }

            if (otherEntity.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0) {
                player.sendMessage("That player is already infected.");
                ScoreboardManager.setPlayerActionCooldown(player, 3, false);
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            PlagueBearerRole.infectPlayer(otherEntity);

            // ability activate message
            player.sendMessage("§qInfected §r" + otherEntity.name + "§e.");
            ChatManager.sendDeadPlayersMessage("§q§o" + player.name + " infected " + otherEntity.name + " with the plague.", LogItemType.ABILITY_MESSAGE);
            SoundManager.playSoundEffect([player], SoundEffectType.PLAGUEBEARER_MARK);
            
            // cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.REVEALER_MARK);
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
     * 
     * @param {Player} player 
     */
    static infectPlayer(player) {
        let playerRole = RoleManager.getPlayerRole(player);
        let immuneToInfection = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.immune_to_infection") != 0;
        if (player.getDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY) > 0 || (immuneToInfection && playerRole != null && playerRole.getRoleType() == RoleTypes.PLAGUE_BEARER)) {
            return;
        }
        let stageOneMin = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.stage_1_time_min") * 6;
        let stageOneMax = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.stage_1_time_max") * 6;
        
        let dormantTime = ScoreboardManager.rollRandomNumber(stageOneMin, stageOneMax);
        ScoreboardManager.setScoreboardObjective(player, PlagueBearerRole.INFECTION_TIME_SCOREBOARD, dormantTime * 20);
        player.setDynamicProperty(PlagueBearerRole.INFECTION_STAGE_PROPERTY, 1);
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Plaguebearer Settings");

        form.divider();
        form.label("The Plaguebearer is a neutral killing role that spreads an infection to other players that will kill them after a time. The infection can be spread via interaction and ghosts.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.enabled") != 0;
        form.toggle("Plagebearer Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_cooldown");
        form.slider("Infect Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of infecting.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_uses");
        form.slider("Infect Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the plaguebearer can directly infect players. -1 is infinite uses");
        
        let immuneToInfection = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.immune_to_infection") != 0;
        form.toggle("Plaguebearer is Immune", { defaultValue: immuneToInfection }); // 6
        form.label("If true, the Plaguebearer will be immune to the infection.");
        
        let interactionInfects = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.interaction_infects") != 0;
        form.toggle("Getting Interacted Infects", { defaultValue: interactionInfects }); // 6
        form.label("If true, interacting with the plaguebearer will infect the player.");

        let notifyOnInteract = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.notify_plague_on_interact") != 0;
        form.toggle("Notify on Interact Infect", { defaultValue: notifyOnInteract }); // 6
        form.label("If true, the plaguebearer will be notified when someone gets infected from interacting with them.");
        
        let canReinfect = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.can_reinfect_if_no_infection") != 0;
        form.toggle("No Infected Redeems Ability", { defaultValue: canReinfect }); // 6
        form.label("If true and there are no players currently infected, the plaguebearer will get another ability use.");
        
        let spreadTypeStrings = ["Interact Source", "Interact Target", "Source & Target"];
        let spreadType = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infection_spread_type");
        form.dropdown("Spread Type", spreadTypeStrings, { defaultValueIndex: spreadType }); // 6
        form.label("How the infection spreads. §lInteract Source§r means that the infection spreads if the source of the interaction has it. §lInteract Target§r means that it spreads if the target of the interaction is infected. §lSource & Target§r means it spreads if the source or the target has it.");
        
        let stageOneMin = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.stage_1_time_min");
        form.slider("Hidden Stage Time (min)", 10, 100, { valueStep: 5, defaultValue: stageOneMin });
        form.label("The minimum amount of time in minutes * 10 the infection is dormant. For example, 45 would be 4.5 minutes.");
        
        let stageOneMax = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.stage_1_time_max");
        form.slider("Hidden Stage Time (max)", 10, 100, { valueStep: 5, defaultValue: stageOneMax });
        form.label("The maximum amount of time in minutes * 10 the infection is dormant. For example, 45 would be 4.5 minutes.");
        
        let progressionMin = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.progression_time_min");
        form.slider("Stage Progression Time (min)", 5, 60, { valueStep: 5, defaultValue: progressionMin });
        form.label("The minimum amount of time in seconds for each stage of infection to progress. There are 5 stages to progress through.");
        
        let progressionMax = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.progression_time_max");
        form.slider("Stage Progression Time (max)", 5, 60, { valueStep: 5, defaultValue: progressionMax });
        form.label("The maximum amount of time in seconds for each stage of infection to progress. There are 5 stages to progress through.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.infect_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.infect_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.immune_to_infection", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.interaction_infects", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.notify_plague_on_interact", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.can_reinfect_if_no_infection", r.formValues[14] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.infection_spread_type", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.stage_1_time_min", r.formValues[18]);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.stage_1_time_max", r.formValues[20]);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.progression_time_min", r.formValues[22]);
            ScoreboardManager.setTrackedObjective("role_settings.plague_bearer.progression_time_max", r.formValues[24]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infect_uses");
        let immuneToInfection = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.immune_to_infection") != 0;
        let interactionInfects = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.interaction_infects") != 0;
        let notifyOnInteract = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.notify_plague_on_interact") != 0;
        let canReinfect = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.can_reinfect_if_no_infection") != 0;
        let spreadTypeStrings = ["Interact Source", "Interact Target", "Source & Target"];
        let spreadType = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.infection_spread_type");
        let stageOneMin = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.stage_1_time_min");
        let stageOneMax = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.stage_1_time_max");
        let progressionMin = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.progression_time_min");
        let progressionMax = ScoreboardManager.getTrackedObjective("role_settings.plague_bearer.progression_time_max");

        let description = "The Plaguebearer is a neutral killer that is able to spread an infection that kills players after a short time. The infection spreads via interactions and ghosts.";
        description += "\n\nInfect Cooldown: " + cooldownTime + " seconds";
        description += "\nInfect Uses: " + abilityUses;
        description += "\nImmune to Infection: " + immuneToInfection;
        description += "\nInteracting Infects: " + interactionInfects;
        description += "\nNotify on Interact Infect: " + notifyOnInteract;
        description += "\nCan Reinfect if No Infected: " + canReinfect;
        description += "\nCan Reinfect if No Infected: " + canReinfect;
        description += "\nSpread Type: " + spreadTypeStrings[spreadType];
        description += "\nDormant Duration (min): " + stageOneMin + " seconds";
        description += "\nDormant Duration (max): " + stageOneMax + " seconds";
        description += "\nStage Progression (min): " + progressionMin + " seconds";
        description += "\nStage Progression (max): " + progressionMax + " seconds";
        return description;
    }
}
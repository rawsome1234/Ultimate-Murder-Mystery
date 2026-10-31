"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { BuildPlayerHelpTagSignal } from "../signals/build_player_help_tag";

export class AgentModifier extends Modifier {

    static TARGET_PLAYER_ID_PROPERTY = "targetPlayerID";
    static IS_AGENT_TARGET_TAG = "isAgentTarget";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        AgentModifier.updateLines();
        if (!DeathHandler.onDeathSignal.isConnected(AgentModifier.onDeathSignal)) {
            DeathHandler.onDeathSignal.subscribe(AgentModifier.onDeathSignal);
        }
        if (!PlayerHandler.afterPlayerInteract.isConnected(AgentModifier.afterInteract)) {
            PlayerHandler.afterPlayerInteract.subscribe(AgentModifier.afterInteract);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(AgentModifier.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(AgentModifier.buildPlayerTag)
        }
        super.initialize();
    }
    
    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        if (event.playerToBuild.hasTag(AgentModifier.IS_AGENT_TARGET_TAG)) {
            event.addStringToTag("§aT");
        }
    }

    static updateLines() {
        let currentTick = 0;
        system.runInterval(() => {
            if (!ScoreboardManager.isGameRunning()) {
                return;
            }
            let updateFrequencyType = ScoreboardManager.getTrackedObjective("modifier_settings.agent.update_frequency_type");
            let updateFrequency = 0;
            switch (updateFrequencyType) {
                case 0:
                    updateFrequency = 1;
                    break;
                case 1:
                    updateFrequency = 10;
                    break;
                case 2:
                    updateFrequency = 20;
                    break;
                case 3:
                    updateFrequency = 100;
                    break;
                default:
                    updateFrequency = 20;
                    break;
            }
            let changeColors = ScoreboardManager.getTrackedObjective("modifier_settings.agent.line_changes_colors") != 0;
            let hideLineIfClose = ScoreboardManager.getTrackedObjective("modifier_settings.agent.hide_if_close") != 0;

            let alphaStartDistance = ScoreboardManager.getTrackedObjective("modifier_settings.agent.line_alpha_start_distance");
            let alphaRequiresLineOfSight = ScoreboardManager.getTrackedObjective("modifier_settings.agent.alpha_requires_line_of_sight") != 0;

            if (currentTick == 0) {
                // draw line again
                let allPlayers = world.getAllPlayers();
                let agentPlayers = PlayerHandler.sortPlayersWithModifier(allPlayers, ModifierTypes.AGENT);
                
                agentPlayers.forEach((agentPlayer) => {
                    let targetPlayer = AgentModifier.getTargetPlayer(agentPlayer);

                    if (targetPlayer == null || targetPlayer.hasTag("dead")) {
                        // radarPlayer.sendMessage("No player found");
                        return;
                    }
                    let hasLineOfSight = PlayerHandler.hasLineOfSight(agentPlayer, targetPlayer.location, 10);
                    
                    let alpha = 1;
                    let distance = PlayerHandler.distanceBetweenLocations(targetPlayer.location, agentPlayer.location);
                    if (alphaStartDistance > 0 && (!alphaRequiresLineOfSight || hasLineOfSight)) {
                        alpha = Math.min(1, distance / alphaStartDistance);
                    }

                    let color = { red: 0, blue: 0, green: 1, alpha: alpha };

                    if (distance <= 5 && hideLineIfClose && hasLineOfSight) {
                        return;
                    }

                    if (changeColors) {
                        if (distance < 12) {
                            color = { red: 0, blue: 0, green: 1, alpha: 1 }; // green
                        }
                        else if (distance < 25) {
                            color = { red: 1, blue: 0, green: .86, alpha: 1 }; // yellow
                        }
                        else {
                            color = { red: 1, blue: 0, green: 0, alpha: 1 }; // red
                        }
                    }
                    PlayerHandler.spawnParticlesBetweenPoints(agentPlayer, agentPlayer.location, targetPlayer.location, color, updateFrequency / 20);
                });
            }

            currentTick = (currentTick + 1) % updateFrequency
        }, 1);
    }

    static onDeathSignal(playerWhoDied, killer) {
        let notifyOnDeath = ScoreboardManager.getTrackedObjective("modifier_settings.agent.notify_on_death") != 0;
        if (!notifyOnDeath) {
            return;
        }
        let allAgents = PlayerHandler.sortPlayersWithModifier(world.getAllPlayers(), ModifierTypes.AGENT);
        allAgents.forEach((agent) => {
            let agentTarget = AgentModifier.getTargetPlayer(agent);
            if (agentTarget != null && agentTarget.id == playerWhoDied.id) {
                agent.sendMessage("§a§oYour target died...");
            }
        });
    }

    /**
     * 
     * @param {Player} playerWhoInteracts 
     * @param {Player} playerWhoIsBeingInteracted 
     * @param {InteractTypes} interactType 
     */
    static afterInteract(playerWhoInteracts, playerWhoIsBeingInteracted) {
        let notifyOnInteractions = ScoreboardManager.getTrackedObjective("modifier_settings.agent.notify_on_interactions") != 0;
        if (!notifyOnInteractions) {
            return;
        }
        let allAgents = PlayerHandler.sortPlayersWithModifier(world.getAllPlayers(), ModifierTypes.AGENT);
        allAgents.forEach((agent) => {
            let agentTarget = AgentModifier.getTargetPlayer(agent);
            if (agentTarget.id == playerWhoInteracts.id) {
                agent.sendMessage("§a§oYour target interacted with someone...");
            }
            if (agentTarget.id == playerWhoIsBeingInteracted.id) {
                agent.sendMessage("§a§oSomeone interacted with your target...");
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
        AgentModifier.assignPlayerTarget(player);
        super.giveToPlayer(player);
    }

    /**
     * 
     * @param {Player} agent 
     */
    static assignPlayerTarget(agent) {
        let allPlayers = world.getAllPlayers();
        let killerChance = ScoreboardManager.getTrackedObjective("role_settings.assassin.killer_chance");

        let possibleAlignments = [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT];
        let evilAlignments = [RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER];

        if (killerChance < 0) {
            possibleAlignments = possibleAlignments.concat(evilAlignments)
        }
        else if (ScoreboardManager.rollRandomNumber(0, 100) < killerChance) {
            // ass.sendMessage("Rolled evil roles");
            possibleAlignments = evilAlignments;
        }

        // ass.sendMessage("Choosing target from " + possibleAlignments.length + " alignments");
        let possiblePlayers = PlayerHandler.getLivingPlayers(allPlayers).filter((pl) => pl.id != agent.id);
        if (possiblePlayers.length == 0) {
            agent.sendMessage("§aCould not find any players to make your target");
            return;
        }

        let randomPlayerIndex = ScoreboardManager.rollRandomNumber(0, possiblePlayers.length);
        let targetPlayer = possiblePlayers[randomPlayerIndex];
        targetPlayer.addTag(AgentModifier.IS_AGENT_TARGET_TAG);
        // ass.sendMessage("Target is " + targetPlayer.name);
        let targetID = ScoreboardManager.getPlayerID(targetPlayer);
        agent.setDynamicProperty(AgentModifier.TARGET_PLAYER_ID_PROPERTY, targetID);

        agent.sendMessage("§aYour target is §l" + targetPlayer.name + "§r§a.");
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.ALL;
    }

    /**
     * Gets the valid role types this modifier can be applied to.
     * 
     * @returns {RoleTypes[]}
     */
    getWhitelistedRoles() {
        return [];
    }

    /**
     * A list of role types that this modifier cannot apply to.
     * @returns {RoleTypes[]}
     */
    getBlacklistedRoles() {
        return [RoleTypes.TYCOON];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§aAgent";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Track another player's activity!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "Your target will have their location revealed to you at all times. Depending on settings, you'll also get notifications when they are involved with interactions and on their death.";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.agent.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    hasAbility(player) {
        return false;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.AGENT;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this modifier.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this modifier can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * 
     * @param {Player} agent 
     */
    static getTargetPlayer(agent) {
        let targetID = agent.getDynamicProperty(AgentModifier.TARGET_PLAYER_ID_PROPERTY);
        return ScoreboardManager.getPlayerWithID(targetID);
    }

    /**
     * Activates the ability of this modifier for the given player. Assumes
     * the player has this modifier.
     */
    activateAbility(player) {
    }

    /**
     * Activates the ability of this modifier for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
    }

    /**
     * Returns if this modifier has met its win condition.
     * If this is true, the player will win, even if they did not win by their role.
     * @param {Player} player
     * @param {RoleAlignment} winningAlignment 
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this modifier and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Agent Settings");

        form.divider();
        form.label("The Agent is a Universal modifier where a player is chosen as a target. The agent will receive notifications and have a line tracking that target's activity.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.agent.enabled") != 0;
        form.toggle("Agent Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let updateTypes = ["Constant (1 Tick)", "Frequent (10 ticks)", "Often (1 second)", "Rarely (5 seconds)"];
        let updateFrequency = ScoreboardManager.getTrackedObjective("modifier_settings.agent.update_frequency_type");
        form.dropdown("Update Frequency", updateTypes, { defaultValueIndex: updateFrequency })
        form.label("How often the line to the target updates.");
        
        let killerChance = ScoreboardManager.getTrackedObjective("modifier_settings.agent.killer_target_chance");
        form.slider("Target Killer Chance", -5, 100, { valueStep: 5, defaultValue: killerChance }); // 6
        form.label("The chance that the target will be evil. -5 will be random between all players.");
        
        let notifyOnDeath = ScoreboardManager.getTrackedObjective("modifier_settings.agent.notify_on_death") != 0;
        form.toggle("Notify On Death", { defaultValue: notifyOnDeath }); // 8
        form.label("If true, will notify the Agent when their target dies.");
        
        let notifyOnInteractions = ScoreboardManager.getTrackedObjective("modifier_settings.agent.notify_on_interactions") != 0;
        form.toggle("Notify On Interaction", { defaultValue: notifyOnInteractions }); // 8
        form.label("If true, will notify the Agent when their target interacts with players or is interacted with.");
        
        let updateColors = ScoreboardManager.getTrackedObjective("modifier_settings.agent.line_changes_colors") != 0;
        form.toggle("Change Line Colors", { defaultValue: updateColors }); // 8
        form.label("If true, the line will change color based on the distance to the target.");
        
        let alphaStartDistance = ScoreboardManager.getTrackedObjective("modifier_settings.agent.line_alpha_start_distance");
        form.slider("Alpha Distance", 0, 30, { defaultValue: alphaStartDistance }); // 6
        form.label("The distance the line will start becoming transparent. Gets more transparent the closer to the target you are.");

        let alphaRequiresLineOfSight = ScoreboardManager.getTrackedObjective("modifier_settings.agent.alpha_requires_line_of_sight") != 0;
        form.toggle("Alpha Requires Line of Sight", { defaultValue: alphaRequiresLineOfSight }); // 8
        form.label("If true, the line will only become transparent if the player has line of sight to their target.");

        let hideIfClose = ScoreboardManager.getTrackedObjective("modifier_settings.agent.hide_if_close") != 0;
        form.toggle("Hide Line If Close", { defaultValue: hideIfClose }); // 8
        form.label("If true, the line will hide within 5 blocks of the target, if there's line of sight.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.agent.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.update_frequency_type", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.killer_target_chance", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.notify_on_death", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.notify_on_interactions", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.line_changes_colors", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.line_alpha_start_distance", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.alpha_requires_line_of_sight", r.formValues[16] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("modifier_settings.agent.hide_if_close", r.formValues[18] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let updateTypes = ["Constant (1 Tick)", "Frequent (10 ticks)", "Often (1 second)", "Rarely (5 seconds)"];
        let updateFrequency = ScoreboardManager.getTrackedObjective("modifier_settings.agent.update_frequency_type");
        let killerChance = ScoreboardManager.getTrackedObjective("modifier_settings.agent.killer_target_chance");
        let notifyOnDeath = ScoreboardManager.getTrackedObjective("modifier_settings.agent.notify_on_death") != 0;
        let notifyOnInteractions = ScoreboardManager.getTrackedObjective("modifier_settings.agent.notify_on_interactions") != 0;
        let updateColors = ScoreboardManager.getTrackedObjective("modifier_settings.agent.line_changes_colors") != 0;
        let hideIfClose = ScoreboardManager.getTrackedObjective("modifier_settings.agent.hide_if_close") != 0;

        let description = "Agent is a universal modifier that will pick someone as a target. The agent will then get information on that target, such as their location and when they die.";
        description += "\n\nLine Update Frequency: " + updateTypes[updateFrequency];
        description += "\nKiller Chance: " + killerChance;
        description += "\nNotify on Death: " + notifyOnDeath;
        description += "\nNotify on Interaction: " + notifyOnInteractions;
        description += "\nLine Color Changes: " + updateColors;
        description += "\nHide Line When Close: " + hideIfClose;
        return description;
    }
}
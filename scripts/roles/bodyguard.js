"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { NeutralIndependentRole } from "./neutral_independent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { RoleAssignment } from "../role_assignment";
import { PlayerHandler } from "../player_handler";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { BuildPlayerHelpTagSignal } from "../signals/build_player_help_tag";

export class BodyguardRole extends NeutralIndependentRole {
    static failureRoleTypes = [RoleTypes.INNOCENT, RoleTypes.AMNESIAC, RoleTypes.SURVIVOR, RoleTypes.JESTER, RoleTypes.TYCOON];

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (!RoleAssignment.afterRolesAssigned.isConnected(this.afterRolesAssigned)) {
            RoleAssignment.afterRolesAssigned.subscribe(this.afterRolesAssigned);
        }
        if (!DeathHandler.onMurdererDeath.isConnected(this.onMurdererDeath)) {
            DeathHandler.onMurdererDeath.subscribe(this.onMurdererDeath);
        }
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(BodyguardRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(BodyguardRole.buildPlayerTag)
        }
        super.initialize();
    }

    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        let bodyguardTargets = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.BODYGUARD).map((guard) => {
            return ScoreboardManager.getScoreboardObjective(guard, "player.target_id");
        });
        if (bodyguardTargets.includes(ScoreboardManager.getPlayerID(event.playerToBuild))) {
            event.addStringToTag("§bB");
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
    }

    afterRolesAssigned() {
        let allPlayers = world.getAllPlayers();
        let bodyguards = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.BODYGUARD);
        let tellGuardRole = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.gets_told_defendee_role") != 0;
        let tellDefenseHaveGuard = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.defendee_told_of_bodyguard") != 0;;
        let killerChance = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.killer_chance");

        let baseMessage = "§bYou are defending {player}!";

        bodyguards.forEach((guard) => {
            let possibleAlignments = [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT];
            let evilAlignments = [RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER];

            if (killerChance < 0) {
                possibleAlignments = possibleAlignments.concat(evilAlignments);
            }
            else if (ScoreboardManager.rollRandomNumber(0, 100) < killerChance) {
                possibleAlignments = evilAlignments;
            }

            let possiblePlayers = PlayerHandler.sortPlayersWithoutRole(PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), possibleAlignments), [RoleTypes.BODYGUARD]);
            let randomPlayerIndex = ScoreboardManager.rollRandomNumber(0, possiblePlayers.length);
            let randomPlayer = possiblePlayers[randomPlayerIndex];

            let defendeeID = ScoreboardManager.getPlayerID(randomPlayer);
            ScoreboardManager.setScoreboardObjective(guard, "player.target_id", defendeeID);

            if (tellGuardRole) {
                let defendeeRole = RoleManager.getPlayerRole(randomPlayer);
                guard.sendMessage(baseMessage.replace("{player}", randomPlayer.name) + " They are the §r§l" + defendeeRole.getDisplayName() + "§r§b.");
            }
            else {
                guard.sendMessage(baseMessage.replace("{player}", randomPlayer.name));
            }

            if (tellDefenseHaveGuard) {
                randomPlayer.sendMessage("§bYou have a bodyguard!");
            }
        });
    }

    onMurdererDeath() {
        let allPlayers = world.getAllPlayers();
        let bodyguards = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.BODYGUARD);

        bodyguards.forEach((guard) => {
            guard.sendMessage("§oA murderer has died! Live until the end of the round to win!");

            ScoreboardManager.setScoreboardObjective(guard, "player.meets_win", 1);
        });

    }

    /**
     * @param {Player} playerWhoDied
     * @param {Player?} killer
     */
    onPlayerDeath(playerWhoDied, killer) {
        let allPlayers = world.getAllPlayers();
        let bodyguards = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.BODYGUARD);
        let diedID = ScoreboardManager.getPlayerID(playerWhoDied);
        bodyguards.forEach((guard) => {
            let murdererDied = ScoreboardManager.getScoreboardObjective(guard, "player.meets_win") == 1;
            let targetID = ScoreboardManager.getScoreboardObjective(guard, "player.target_id");

            // failed bodyguard
            if (targetID == diedID && !murdererDied) {
                let failureRoleType = BodyguardRole.failureRoleTypes[ScoreboardManager.getTrackedObjective("role_settings.bodyguard.failure_role_change")];
                let roleToAssign = RoleManager.getMatchingRole(failureRoleType.id);
                system.runTimeout(() => {
                    if (!ScoreboardManager.isGameRunning()) {
                        return;
                    }
                    guard.sendMessage("§bYour target died! You failed your mission and have become a " + roleToAssign.getDisplayName());
                    
                    SoundManager.playSoundEffect([guard], SoundEffectType.TARGET_LOSS);
                    RoleAssignment.setPlayerRole(guard, roleToAssign);
                }, 20);
            }
        });
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.NEUTRAL_INDEPENDENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§bBodyguard";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Defend your target until a murderer dies!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Your goal is to keep your target alive! You win if either they are alive at the end of the game, OR if YOU are still alive at the end of the game and you kept your target alive past the first murderer death.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.bodyguard.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
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
        return RoleTypes.BODYGUARD;
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
     * 
     * @param {Player} guard
     */
    activateAbility(guard) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(guard, "player.action_charges");

        if (chargesRemaining == 0) {
            guard.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // ability effect
            let defendeeID = ScoreboardManager.getScoreboardObjective(guard, "player.target_id");
            let defendeePlayer = ScoreboardManager.getPlayerWithID(defendeeID);

            if (defendeePlayer == null || defendeePlayer.hasTag("dead")) {
                guard.sendMessage("§bYour target is dead!");
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                guard.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(guard, "player.action_charges", -1);
            }

            let protectLength = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_duration");

            defendeePlayer.addEffect("minecraft:resistance", protectLength * 20);
            SoundManager.playSoundEffect([guard, defendeePlayer], SoundEffectType.BASIC_PLING);

            // ability activate message
            guard.sendMessage("§bGuarded " + defendeePlayer.name + " for " + protectLength + " seconds.");
            defendeePlayer.sendMessage("§bYour Bodyguard is protecting you!");

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_cooldown");
            ScoreboardManager.setPlayerActionCooldown(guard, actionCooldown);
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
        if (player == null) {
            return false;
        }
        let playerTargetID = ScoreboardManager.getScoreboardObjective(player, "player.target_id");
        let targetPlayer = ScoreboardManager.getPlayerWithID(playerTargetID);

        let playerAlive = !player.hasTag("dead");
        let murdererDied = ScoreboardManager.getScoreboardObjective(player, "player.meets_win") == 1;
        let targetStillAlive = targetPlayer == null || !targetPlayer.hasTag("dead");
        return targetStillAlive || (murdererDied && playerAlive);
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Bodyguard Settings");

        form.divider();
        form.label("The bodyguard is a neutral independent role that needs to keep a player alive.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.enabled") != 0;
        form.toggle("Bodyguard Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let tellRole = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.gets_told_defendee_role") != 0;
        form.toggle("Tell Role of Defendee", { defaultValue: tellRole });
        form.label("If enabled, will tell the bodyguard the role of their defendee.");
        
        let defendKillers = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.killer_chance");
        form.slider("Defendee Killer Chance", -5, 100, { valueStep: 5, defaultValue: defendKillers }); // 6
        form.label("The chance that the defendee will be evil. -5 will be random between all players.");
        
        let tellDefendee = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.defendee_told_of_bodyguard") != 0;
        form.toggle("Tell Defendee of Bodyguard", { defaultValue: tellDefendee }); // 8
        form.label("If enabled, the defendee will be notified they have a bodyguard.");
        
        let roleChange = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.failure_role_change");
        form.dropdown("On Fail Role", BodyguardRole.failureRoleTypes.map((v) => (RoleManager.getMatchingRole(v.id).getDisplayName())), { defaultValueIndex: roleChange }); // 10
        form.label("If the defendee dies before a murderer dies, the bodyguard will become this role, regardless of if it's enabled.");
        
        form.divider();
        
        form.label("Protect is the ability of the bodyguard and will give the defendee resistance.");
        
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_cooldown"); // 14
        form.slider("Protect Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of protect.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_uses")
        form.slider("Protect Ability Uses", -1, 10, { defaultValue: abilityUses }); // 16
        form.label("The number of times protect can be used. -1 is infinite uses");
        
        let abilityDuration = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_duration")
        form.slider("Protect Duration", 5, 30, { defaultValue: abilityDuration }); // 18
        form.label("The number of seconds the Bodyguard's defendee gains resistance");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.gets_told_defendee_role", r.formValues[4] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.killer_chance", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.defendee_told_of_bodyguard", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.failure_role_change", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.protect_cooldown", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.protect_uses", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.bodyguard.protect_duration", r.formValues[18]);
            
            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let tellRole = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.gets_told_defendee_role") != 0;
        let defendKillers = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.killer_chance");
        let tellDefendee = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.defendee_told_of_bodyguard") != 0;
        let roleChange = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.failure_role_change");
        let failRoleType = BodyguardRole.failureRoleTypes[roleChange];
        let failRole = RoleManager.getMatchingRole(failRoleType.id);

        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_cooldown"); // 14
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_uses");
        let abilityDuration = ScoreboardManager.getTrackedObjective("role_settings.bodyguard.protect_duration");
        let description = "The bodyguard is a neutral role who must keep another player alive until a murderer dies.";

        description += "\n\nKiller Chance: " + defendKillers + "%";
        description += "\nDefendee is Told of Bodyguard: " + tellDefendee;
        description += "\nFail Role: " + failRole.getDisplayName() + "§r";
        description += "\n\nProtect Settings";
        description += "\nCooldown: " + cooldownTime + " seconds.";
        description += "\nUses: " + abilityUses;
        description += "\nResistance Duration: " + abilityDuration + " seconds.";

        return description;
    }
}
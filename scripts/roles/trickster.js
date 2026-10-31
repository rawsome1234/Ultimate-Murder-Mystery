"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class TricksterRole extends Role {

    static DETECT_ACTIVE_PROPERTY = "detectActive";
    static DETECT_TIME_SCOREBOARD = "role_settings.trickster.detect_ability_duration";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(TricksterRole._updateDetectTimers, 1);
        super.initialize();
    }

    static _updateDetectTimers() {
        if (!ScoreboardManager.isGameRunning() || ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_active_type") != 1) {
            return;
        }
        let allPlayers = world.getAllPlayers();
        let tricksters = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TRICKSTER);
        tricksters.forEach((trickster) => {
            let detectTime = ScoreboardManager.getScoreboardObjective(trickster, TricksterRole.DETECT_TIME_SCOREBOARD);
            if (detectTime <= 0) {
                return;
            }

            ScoreboardManager.addScoreboardObjective(trickster, TricksterRole.DETECT_TIME_SCOREBOARD, -1);

            if (detectTime == 1) {
                // end detect & send message
                trickster.setDynamicProperty(TricksterRole.DETECT_ACTIVE_PROPERTY, false);
                trickster.sendMessage("§p§oDetect has finished.");
                ChatManager.sendDeadPlayersMessage("§p§o" + trickster.name + "'s detect has expired.", LogItemType.ABILITY_MESSAGE);
                SoundManager.playSoundEffect([trickster], SoundEffectType.DETECT_RUN, null, null, .3);

                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_cooldown");
                ScoreboardManager.setPlayerActionCooldown(trickster, actionCooldown);
                return;
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
        player.setDynamicProperty(TricksterRole.DETECT_ACTIVE_PROPERTY, false);
        let detectAbilityStatus = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_active_type");
        if (detectAbilityStatus == 2) {
            player.setDynamicProperty(TricksterRole.DETECT_ACTIVE_PROPERTY, true);
        }
        if (detectAbilityStatus == 1) {
            let actionUses = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_uses");
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_cooldown");
            ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§pTrickster";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "You're included in the murderer's list of other murderers! Don't get caught!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "At the beginning of the game, the murderers receive a list of all murderers, with you included! Try to blend in to the killers without knowing who they are!";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.trickster.enabled") != 0;
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
     * Whether the player can see particles of the specified type.
     * @param {Player} player 
     * @param {ParticleVisibilityType} particleType 
     */
    canSeeParticles(player, particleType) {
        let detectActive = player.getDynamicProperty(TricksterRole.DETECT_ACTIVE_PROPERTY);
        let particleIsRadius = (particleType == ParticleVisibilityType.BOMBER_GROUNDED_BOMB_RADIUS || particleType == ParticleVisibilityType.BOMBER_PLAYER_BOMB_PARTICLE || particleType == ParticleVisibilityType.ESCAPIST_RECALL_PARTICLE || particleType == ParticleVisibilityType.WITCH_SPELL_RADIUS);
        let particleIsMark = (particleType == ParticleVisibilityType.APOTHOCARY_MARKED || particleType == ParticleVisibilityType.CRYOMANCER_MARKED_PLAYERS);

        let showsRadius = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_shows_radius") != 0;
        let showsMarked = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_shows_marks") != 0;

        return detectActive && ((showsRadius && particleIsRadius) || (showsMarked && particleIsMark));
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_active_type") == 1;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.TRICKSTER;
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
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }
        
        let detectAbilityStatus = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_active_type");
        if (detectAbilityStatus != 1) {
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            player.setDynamicProperty(TricksterRole.DETECT_ACTIVE_PROPERTY, true);

            // ability activate message
            player.sendMessage("§p§oDetect has activated! You can now see murderer particles.");
            SoundManager.playSoundEffect([player], SoundEffectType.DETECT_RUN, null, null, .5);
            ChatManager.sendDeadPlayersMessage("§p§o" + player.name + " started using detect.", LogItemType.ABILITY_MESSAGE);

            let detectDuration = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_duration");
            ScoreboardManager.setScoreboardObjective(player, TricksterRole.DETECT_TIME_SCOREBOARD, (detectDuration+1) * 20);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, detectDuration+2);
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
        form.title("Trickster Settings");

        form.divider();
        form.label("The trickster is an innocent whose name is included in the list of murderers at the beginning of the game. They also can have the ability to see murderer ability particles.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.trickster.enabled") != 0;
        form.toggle("Trickster Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let disableMurdererChat = ScoreboardManager.getTrackedObjective("role_settings.trickster.disables_murderer_chat") != 0;
        form.toggle("Disable Murderer Chat", { defaultValue: disableMurdererChat })
        form.label("If true and there is a trickster in the game, the murderer chat will be disabled. If there is no trickster, the murderer will get a murderer chat if it's enabled.");
        
        let detectAbilityTypes = ["Off", "Ability Enabled", "Always Active"];
        let detectAbilityStatus = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_active_type");
        form.dropdown("Detect Ability Type", detectAbilityTypes, { defaultValueIndex: detectAbilityStatus })
        form.label("How and if the Trickster can see murderer abilities in the game. §lOff§r disables this ability. §lAbility Enabled§r attaches this to an ability the Trickster can activate. §lAlways Active§r makes the detect effect active the whole match, with no ability.");
        
        let showsRadius = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_shows_radius") != 0;
        form.toggle("Shows Radius", { defaultValue: showsRadius })
        form.label("If true, shows the particles for Bomber's grounded and player bombs, Escapist recall locations, and Witch's spells.");
        
        let showsMarked = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_shows_marks") != 0;
        form.toggle("Shows Marked", { defaultValue: showsMarked })
        form.label("If true, shows the particles for Apothocary marks and Cryomancer marks.");
        
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_cooldown");
        form.slider("Detect Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of detect, which while active will show the trickster murderer ability particles.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_uses");
        form.slider("Detect Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times detect can be used. -1 is infinite uses");
        
        let detectDuration = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_duration");
        form.slider("Detect Duration", 15, 120, { valueStep: 5, defaultValue: detectDuration }); // 6
        form.label("If §lDetect Ability Type§r is §lAbility Enabled§r, how long in seconds the detect ability lasts on use.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.trickster.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.trickster.disables_murderer_chat", r.formValues[4] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.trickster.detect_ability_active_type", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.trickster.detect_shows_radius", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.trickster.detect_shows_marks", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.trickster.detect_ability_cooldown", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.trickster.detect_ability_uses", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.trickster.detect_ability_duration", r.formValues[16]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let disableMurdererChat = ScoreboardManager.getTrackedObjective("role_settings.trickster.disables_murderer_chat") != 0;
        let detectAbilityTypes = ["Off", "Ability Enabled", "Always Active"];
        let detectAbilityStatus = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_active_type");
        let showsRadius = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_shows_radius") != 0;
        let showsMarked = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_shows_marks") != 0;
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_uses");
        let detectDuration = ScoreboardManager.getTrackedObjective("role_settings.trickster.detect_ability_duration");

        let description = "The trickster is an innocent who is included in the list of murderers at the start of the game. They may also have a detect ability that lets them see murderer ability particles.";
        description += "\n\nDisables Murderer Chat: " + disableMurdererChat;
        description += "\nDetect Ability Active: " + detectAbilityTypes[detectAbilityStatus];
        description += "\nDetect Shows Radius Particles: " + showsRadius;
        description += "\nDetect Shows Mark Particles: " + showsMarked;
        description += "\nDetect Ability Cooldown: " + cooldownTime + " seconds.";
        description += "\nDetect Ability Uses: " + abilityUses;
        description += "\nDetect Ability Duration: " + detectDuration + " seconds.";
        return description;
    }
}
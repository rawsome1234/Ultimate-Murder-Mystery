"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { OnActionUseSignal } from "../signals/on_action_use";
import { Util } from "../util";
import { TransporterRole } from "./transporter";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class GlitchRole extends Role {

    static HACKED_TAG = "glitchHacked";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
        if (!PlayerHandler.onActionUse.isConnected(GlitchRole.onAbilityUse)) {
            PlayerHandler.onActionUse.subscribe(GlitchRole.onAbilityUse);
        }
    }

    /**
     * 
     * @param {OnActionUseSignal} onActionUse 
     */
    static onAbilityUse(onActionUse) {
        let player = onActionUse.actionUsePlayer;
        if (player.hasTag(GlitchRole.HACKED_TAG)) {
            player.removeTag(GlitchRole.HACKED_TAG);
            onActionUse.cancel = true;
            SoundManager.playSoundEffect([player], SoundEffectType.BLOCK_ABILITY);
            let forcedCooldown = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_forced_cooldown");
            let normalString = "Something went wrong! You're on cooldown again for " + forcedCooldown + " seconds.";
            player.sendMessage("§a" + Util.randomlyObfuscate(normalString, .2, "§a"));
            ScoreboardManager.setPlayerActionCooldown(player, forcedCooldown);
        }
    }

    static clearHackedTag(player) {
        while (player.hasTag(GlitchRole.HACKED_TAG)) {
            player.removeTag(GlitchRole.HACKED_TAG);
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_cooldown");
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
        return "§aThe Glitch";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Hack into player's abilities and be the last one standing!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "As a neutral killer you are allowed to kill like a murderer. Your ability will disable a player's abilities when they try to use them.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.glitch.enabled") != 0;
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
        return RoleTypes.GLITCH;
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

        if (chargesRemaining != 0) {
            let transportablePlayers = TransporterRole.getTeleportablePlayers(world.getAllPlayers(), false);
            transportablePlayers = transportablePlayers.filter((pl) => pl.id != player.id);
            
            if (transportablePlayers.length == 0) {
                player.sendMessage("§aNo players to glitch with.");
                ScoreboardManager.setPlayerActionCooldown(player, 5, false);
                return;
            }

            let randomPlayerIndex = ScoreboardManager.rollRandomNumber(0, transportablePlayers.length);
            let randomPlayer = transportablePlayers[randomPlayerIndex];

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.GLITCH_TELEPORT;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.glitch.glitch_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, randomPlayer);
            if (cancelInteraction) {
                player.sendMessage("§aYou were unable to transport with the random player.");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to glitch with " + randomPlayer.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? 5 : beforeInteract.failCooldown);
                return;
            }
            
            // activate ability
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            TransporterRole.swapEntities(player, randomPlayer, false, true);
            SoundManager.playSoundEffect([player, randomPlayer], SoundEffectType.PLAYER_TRANSPORT);
            
            // ability activate message
            player.sendMessage("§aGlitched and swapped with " + randomPlayer.name);
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " glitched and swapped with " + randomPlayer.name, LogItemType.ABILITY_MESSAGE);
            
            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
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
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.GLITCH_HACK;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§aYou were unable to hack " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to hack " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            // activate ability
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            otherEntity.addTag(GlitchRole.HACKED_TAG);
            SoundManager.playSoundEffect([player], SoundEffectType.BASIC_MARK);

            // ability activate message
            player.sendMessage("§aHacked " + otherEntity.name + ". Next time they use their ability they'll be forced on cooldown.");
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " hacked " + otherEntity.name, LogItemType.ABILITY_MESSAGE);

            // sets cooldown
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
        form.title("The Glitch Settings");

        form.divider();
        form.label("The Glitch is a neutral killing role that acts as a swiss army knife. Their goal is to be the final faction standing in the lobby. They can hack players to disable their abilities.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.glitch.enabled") != 0;
        form.toggle("The Glitch Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_cooldown");
        form.slider("Hack Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of hack, which blocks a player from using their abilities next time they try to use them.");
        
        let gCooldownTime = ScoreboardManager.getTrackedObjective("role_settings.glitch.glitch_cooldown");
        form.slider("Glitch Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: gCooldownTime })
        form.label("The ability cooldown of glitch, which swaps The Glitch with a random living player and acts like it was the transporter.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_uses");
        form.slider("Hack Ability Uses", -1, 10, { defaultValue: abilityUses }); // 8
        form.label("The number of times hack can be used. -1 is infinite uses");
        
        let forcedCooldown = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_forced_cooldown");
        form.slider("Override Cooldown", 30, 180, { valueStep: 5, defaultValue: forcedCooldown }); // 10
        form.label("The cooldown that a hacked player will be forced to have.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.glitch.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.glitch.hack_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.glitch.glitch_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.glitch.hack_uses", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.glitch.hack_forced_cooldown", r.formValues[10]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_cooldown");
        let gCooldownTime = ScoreboardManager.getTrackedObjective("role_settings.glitch.glitch_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_uses");
        let forcedCooldown = ScoreboardManager.getTrackedObjective("role_settings.glitch.hack_forced_cooldown");
        
        let description = "The Glitch is a swiss-army knife Neutral Killer whose goal is to be the last one standing. They have two abilities, Hack (interact), which will disable a person's abilities when they next try to use them, and Glitch, which will swap The Glitch with a random player.";
        description += "\n\nHack Cooldown: " + cooldownTime + " seconds";
        description += "\nGlitch Cooldown: " + gCooldownTime + " seconds";
        description += "\nAbility Uses: " + abilityUses;
        description += "\nHacked Player Forced Cooldown: " + forcedCooldown + " seconds";
        return description;
    }
}
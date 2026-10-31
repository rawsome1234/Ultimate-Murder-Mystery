"use strict";

import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { ApothocaryRole } from "./apothocary";
import { BomberRole } from "./bomber";
import { GlitchRole } from "./glitch";
import { CryomancerRole } from "./cryomancer";
import { VampireRole } from "./vampire";
import { WitchRole } from "./witch";
import { LogItemType } from "../logs/game_log";
import { ShadowmancerRole } from "./shadowmancer";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { StalkerRole } from "./stalker";
import { PlagueBearerRole } from "./plague_bearer";

export class ClericRole extends Role {

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.cleric.action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.cleric.cooldown_time");
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
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§aCleric";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Heal players and prevent them from being interacted with!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Upon interacting with a player, you heal that player of any negative effects and prevent anyone from interacting with them for X seconds.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.cleric.enabled") != 0;
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
        return RoleTypes.CLERIC;
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

        if (chargesRemaining != 0 && otherEntity != null && otherEntity.typeId == "minecraft:player") {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.CLERIC_HEAL;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.cleric.cooldown_time");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                SoundManager.playSoundEffect([player], SoundEffectType.INTERACT_BLOCKED);
                player.sendMessage("§a§oYou were unable to heal " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to heal " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            let preventInteractTime = ScoreboardManager.getTrackedObjective("role_settings.cleric.prevent_interact_time");
            PlayerHandler.startBlockInteractTime(otherEntity, preventInteractTime);
            player.sendMessage("§aHealed " + otherEntity.name + ".");
            let notifyHealed = ScoreboardManager.getTrackedObjective("role_settings.cleric.healed_player_is_notified") != 0;
            SoundManager.playSoundEffect([player], SoundEffectType.CLERIC_HEAL);
            if (notifyHealed) {
                otherEntity.sendMessage("§aYou've been healed by a cleric...");
                SoundManager.playSoundEffect([otherEntity], SoundEffectType.CLERIC_HEAL);
            }

            ApothocaryRole.removeApothocaryTagForPlayer(otherEntity, "§aSomething healed your target...");
            BomberRole.removeBombFromPlayer(otherEntity);
            GlitchRole.clearHackedTag(otherEntity);
            WitchRole.clearCorruptTag(otherEntity);
            CryomancerRole.removeCryoTagForPlayer(otherEntity, "");
            ShadowmancerRole.removeShadowTagForPlayer(otherEntity, "");
            StalkerRole.removeTargetTagForPlayer(otherEntity, "");
            PlagueBearerRole.clearPlayerOfInfection(otherEntity);
            otherEntity.removeEffect("minecraft:wither");
            let instaKillVamps = ScoreboardManager.getTrackedObjective("role_settings.cleric.instakill_vamps") != 0;
            if (instaKillVamps && otherEntity.hasTag(VampireRole.VAMPIRE_INFECT_TAG)) {
                otherEntity.kill();
            } 

            // ability activate message
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " clericed " + otherEntity.name + ".", LogItemType.ABILITY_MESSAGE);

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.CLERIC_HEAL);
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
        form.title("Cleric Settings");

        form.divider();
        form.label("The Cleric is an innocent role that can interact with players to heal them from negative statuses and prevent them from being interacted with.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.cleric.enabled") != 0;
        form.toggle("Cleric Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.cleric.cooldown_time");
        form.slider("Heal Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of heal, in seconds.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.cleric.action_uses");
        form.slider("Heal Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times heal can be used. -1 is infinite uses");
        
        let preventInteract = ScoreboardManager.getTrackedObjective("role_settings.cleric.prevent_interact_time");
        form.slider("Prevent Interact Time", 15, 120, { valueStep: 5, defaultValue: preventInteract }); // 8
        form.label("The amount of time in seconds the healed player cannot be interacted with.");
        
        let notifyHealed = ScoreboardManager.getTrackedObjective("role_settings.cleric.healed_player_is_notified") != 0;
        form.toggle("Healed is Notified", { defaultValue: notifyHealed }); // 10
        form.label("If true, the player interacted with is notified.");
        
        let instaKillVamps = ScoreboardManager.getTrackedObjective("role_settings.cleric.instakill_vamps") != 0;
        form.toggle("Instant Kill Infected Vampires", { defaultValue: instaKillVamps }); // 12
        form.label("If true, if the cleric interacts with an infected vampire, it instantly kills them.");
        

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.cleric.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.cleric.cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.cleric.action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.cleric.prevent_interact_time", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.cleric.healed_player_is_notified", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.cleric.instakill_vamps", r.formValues[10] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.cleric.cooldown_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.cleric.action_uses");
        let preventInteract = ScoreboardManager.getTrackedObjective("role_settings.cleric.prevent_interact_time");
        let notifyHealed = ScoreboardManager.getTrackedObjective("role_settings.cleric.healed_player_is_notified") != 0;
        let instaKillVamps = ScoreboardManager.getTrackedObjective("role_settings.cleric.instakill_vamps") != 0;

        let description = "The Cleric is an innocent role that can interact with players to heal them from negative statuses and prevent them from being interacted with.";
        description += "\n\nHeal Uses: " + abilityUses;
        description += "\nHeal Cooldown: " + cooldownTime + " seconds.";
        description += "\nPrevent Interaction Time: " + preventInteract + " seconds.";
        description += "\nNotify Healed Player: " + notifyHealed;
        description += "\nInstakill Infected Vampires: " + instaKillVamps;
        return description;
    }
}
"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class MedicRole extends InnocentRole {

    static medicMarkTag = "hasMedic";
    static anyMedicTag = "hadMedic";

    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        if (!DeathHandler.buildPlayerTag.isConnected(MedicRole.buildPlayerTag)) {
            DeathHandler.buildPlayerTag.subscribe(MedicRole.buildPlayerTag)
        }
        // world.afterEvents.
        world.beforeEvents.entityHurt.subscribe(async (event) => {
            let damagedPlayer = event.hurtEntity;
            let healthComp = damagedPlayer.getComponent("minecraft:health");
            let entityHealth = healthComp.currentValue;

            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Health will be " + (entityHealth)));
            if (entityHealth <= 0 && !event.cancel) {
                let playerTags = damagedPlayer.getTags();
                // player.sendMessage("Checking tags..");
                for (let i = 0; i < playerTags.length; i++) {
                    let tag = playerTags[i];
                    if (tag.substring(0, MedicRole.medicMarkTag.length) == MedicRole.medicMarkTag) {
                        // revive player
                        let remaining = tag.substring(MedicRole.medicMarkTag.length);
                        let medicPlayer = ScoreboardManager.getPlayerWithID(parseInt(remaining));
                        
                        let medicHealth = ScoreboardManager.getTrackedObjective("role_settings.medic.medic_health");
                        event.damage = 0;
                        // damagedPlayer.
                        // event.damage = 0;
                        system.run(() => {
                            damagedPlayer.removeTag(tag);
                            healthComp.setCurrentValue(medicHealth+1);
                            let consumeNotif = ScoreboardManager.getTrackedObjective("role_settings.medic.who_is_notified_on_consume");
                            if (damagedPlayer.typeId == "minecraft:player" && consumeNotif > 0) {
                                damagedPlayer.sendMessage("§a§oA medic kept you alive!");
                            }
                            if (medicPlayer != null && consumeNotif != 1) {
                                medicPlayer.sendMessage("§a§oA medic of yours was consumed...");
                            }
                            SoundManager.playSoundEffect(world.getAllPlayers(), SoundEffectType.BASIC_PLING, damagedPlayer.location);
                            let medicPlayerName = medicPlayer != null ? "from " + medicPlayer.name : "";
                            ChatManager.sendDeadPlayersMessage("§a§o" + damagedPlayer.name + "'s medic " + medicPlayerName + " was consumed.");
                            damagedPlayer.applyDamage(1);
                            if (event.damageSource.damagingEntity != null) {
                                let knockbackDirection = PlayerHandler._normalize(PlayerHandler.subtractVectors(damagedPlayer.location, event.damageSource.damagingEntity.location));
                                let knockback = PlayerHandler.scaleVector(knockbackDirection, 2);
                                damagedPlayer.applyKnockback({x: knockback.x, z: knockback.z}, .3);
                            }
                        });
                        break;
                    }
                };
            }
        });
        super.initialize();
    }
    
    /**
     * 
     * @param {BuildPlayerHelpTagSignal} event 
     */
    static buildPlayerTag(event) {
        if (event.playerToBuild.hasTag(MedicRole.anyMedicTag)) {
            event.addStringToTag("§aM");
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        super.giveToPlayer(player);
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.medic.medic_uses");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);

        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.medic.mark_cooldown");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
    }

    /**
     * @param {Player} player
     */
    onPlayerDeath(player, killer) {
        let playerTags = player.getTags();
        // player.sendMessage("Checking tags..");
        for (let i = 0; i < playerTags.length; i++) {
            let tag = playerTags[i];
            if (tag.substring(0, MedicRole.medicMarkTag.length) == MedicRole.medicMarkTag) {
                let remaining = tag.substring(MedicRole.medicMarkTag.length);
                let medicPlayer = ScoreboardManager.getPlayerWithID(parseInt(remaining));
                let playerRole = RoleManager.getPlayerRole(player);
                // medicPlayer.sendMessage("§e" + player.name + " has died! Their role was §r" + playerRole.getDisplayName() + "§e.");
                // player.sendMessage(remaining);

                if (ScoreboardManager.getTrackedObjective("role_settings.medic.death_redeems_medic") != 0) {
                    SoundManager.playSoundEffect([player], SoundEffectType.DEATH_NOTIFICATION);
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", 1);
                    PlayerHandler.updateRoleActionVisual(medicPlayer);
                }
            }
        };
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
        return "§qMedic";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Give players protection to give an extra chance!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Mark players with your ability. If a marked player were to die, they were instead be set to X hearts.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.medic.enabled") != 0;
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
        return RoleTypes.MEDIC;
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
            player.sendMessage("§aYou can't medic anymore people.");
            return;
        }

        if (otherEntity.typeId == "minecraft:player" && chargesRemaining != 0) {
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.MEDIC_MARK;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.medic.mark_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§aYou were unable to medic " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " tried to medic " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            let playerID = ScoreboardManager.getPlayerID(player);
            otherEntity.addTag(MedicRole.medicMarkTag + playerID);
            otherEntity.addTag(MedicRole.anyMedicTag);
            SoundManager.playSoundEffect([player], SoundEffectType.BASIC_MARK);

            // ability activate message
            player.sendMessage("§aGave medic to §r" + otherEntity.name + "§a.");
            let notifyMedicedPlayer = ScoreboardManager.getTrackedObjective("role_settings.medic.player_who_is_mediced_notif");
            if (notifyMedicedPlayer != 0) {
                otherEntity.sendMessage("§a§oYou've been given a medic...");
                SoundManager.playSoundEffect([player], SoundEffectType.BASIC_PLING);
            }
            ChatManager.sendDeadPlayersMessage("§a§o" + player.name + " gave " + otherEntity.name + " medic.", LogItemType.ABILITY_MESSAGE);

            // cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.MEDIC_MARK);
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
        form.title("Medic Settings");

        form.divider();
        form.label("An innocent role that is able to give players protection. Protected players will be prevented from dying once.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.medic.enabled") != 0;
        form.toggle("Medic Enabled", { defaultValue: roleEnabled }); // 2

        // 3
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.medic.mark_cooldown");
        form.slider("Medic Cooldown", SettingsHandler.powerAbilityCooldownMin, 300, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The cooldown between giving players medic.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.medic.medic_uses");
        form.slider("Medic Ability Uses", -1, 10, { defaultValue: abilityUses }); // 5
        form.label("The number of times mark can be used. -1 is infinite uses");
        
        let deathCharge = ScoreboardManager.getTrackedObjective("role_settings.medic.death_redeems_medic") != 0;
        form.toggle("Mediced Death Redeems Mark", { defaultValue: deathCharge }); // 7
        form.label("If a person dies with revealer mark, the revealer will get their mark back.");
        
        let medicHealth = ScoreboardManager.getTrackedObjective("role_settings.medic.medic_health");
        form.slider("Medic Block Health", 1, 20, { defaultValue: medicHealth }); // 9
        form.label("The amount of health that a medic-ed player will be set to after preventing death.");
        
        let options = ["Medic", "Protected", "Medic & Protected"]
        let consumeNotif = ScoreboardManager.getTrackedObjective("role_settings.medic.who_is_notified_on_consume");
        form.dropdown("Medic Notification Settings", options, { defaultValue: consumeNotif }); // 11
        form.label("Who will get notified on a medic being consumed.");
        
        let medicedNotif = ScoreboardManager.getTrackedObjective("role_settings.medic.player_who_is_mediced_notif") != 0;
        form.toggle("Notify On Medic", { defaultValue: medicedNotif }); // 13
        form.label("If true, will notify a player when they receive medic.");
// scoreboard objectives add  dummy
// scoreboard objectives add  dummy
// scoreboard objectives add role_settings.medic.who_is_notified_on_consume dummy
// scoreboard objectives add role_settings.medic.player_who_is_mediced_notif dummy
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.medic.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.medic.mark_cooldown", r.formValues[3]);
            ScoreboardManager.setTrackedObjective("role_settings.medic.medic_uses", r.formValues[5]);
            ScoreboardManager.setTrackedObjective("role_settings.medic.death_redeems_medic", r.formValues[7] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.medic.medic_health", r.formValues[9]);
            ScoreboardManager.setTrackedObjective("role_settings.medic.who_is_notified_on_consume", r.formValues[11]);
            ScoreboardManager.setTrackedObjective("role_settings.medic.player_who_is_mediced_notif", r.formValues[13] ? 1 : 0);
            // player.sendMessage("" + callback);
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.medic.mark_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.medic.medic_uses");
        let deathCharge = ScoreboardManager.getTrackedObjective("role_settings.medic.death_redeems_medic") != 0;
        let medicHealth = ScoreboardManager.getTrackedObjective("role_settings.medic.medic_health");
        let consumeNotif = ScoreboardManager.getTrackedObjective("role_settings.medic.who_is_notified_on_consume");
        let medicedNotif = ScoreboardManager.getTrackedObjective("role_settings.medic.player_who_is_mediced_notif") != 0;

       let description = "The medic is an innocent who can give a player the medic status, which will revive them if they were to die.";
        description += "\n\nMedic Cooldown: " + cooldownTime + " seconds.";
        description += "\nMedic Uses: " + abilityUses;
        description += "\nDead Player Gives Back Medic: " + deathCharge;
        description += "\nRevive Health: " + medicHealth + " HP";
        description += "\nWho is Notified On Medic Use: " + ["Medic", "Protected", "Medic & Protected"][consumeNotif];
        description += "\nMediced Receives Notif: " + medicedNotif;
        return description;
    }
}